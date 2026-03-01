/**
 * Domino Board Layout Engine v3
 *
 * A deterministic, append-only, incremental layout engine for domino chains.
 *
 * Determinism contract:
 *   Layout = f(orderedMoveHistory, seed, turnPolicyVersion)
 *
 * Core design principles:
 *   1. Grid-snapped: all tile centers are exact multiples of 0.25.
 *   2. Connection-table driven: all geometry from precomputed lookup table.
 *   3. Append-only: once placed, a tile's position never changes.
 *   4. Collision-free: occupancy grid guarantees no overlaps.
 *   5. Deterministic: same inputs = same layout. Seeded PRNG for turn decisions only.
 *   6. Typed errors: placement failures return errors, never force-place.
 *
 * The engine is pure functions with zero DOM/browser dependencies.
 * It runs identically on server and client.
 */

import {
    Tile,
    DominoLayoutDirection,
    DominoTileLayout,
    DominoBoardLayoutV3,
    DominoLayoutPoint,
    DominoEndpoint,
    DominoLayoutMove,
    AABB,
    SeamDescriptor,
    LayoutPlacementError,
    LayoutResult,
} from "../types";

import {
    ConnectionOffset,
    lookupConnection,
    validNextDirections,
    getTileBBox,
    TileBBox,
    getRotation,
    reverseDirection,
    isHorizontalDir,
} from "./connectionTable";

// ============================================================================
// Constants
// ============================================================================

/** Current turn policy version. Bump when direction selection logic changes. */
export const TURN_POLICY_VERSION = 3;

/**
 * Target straight-run lengths. When the chain has placed this many
 * consecutive tiles along the same axis, it should turn.
 * Horizontal runs are longer to produce wide S-shapes.
 * Vertical runs are shorter for compact connectors.
 */
const TARGET_RUN_HORIZONTAL = 7;
const TARGET_RUN_VERTICAL = 3;

// ============================================================================
// Seeded RNG (FNV-1a hash + LCG)
// ============================================================================

function hashSeed(seed: string): number {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createSeededRng(seed: string): () => number {
    let state = hashSeed(seed) || 1;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

// ============================================================================
// Layout Hash (FNV-1a)
// ============================================================================

/**
 * Compute a deterministic hash of the layout for integrity verification.
 * Hash input: sorted tile entries + seed + turnPolicyVersion.
 */
export function computeLayoutHash(
    tileLayouts: Record<string, DominoTileLayout>,
    seed: string,
    turnPolicyVersion: number,
): string {
    const entries = Object.values(tileLayouts)
        .map((t) => `${t.id}:${t.x}:${t.y}:${t.direction}:${t.isDouble}`)
        .sort();
    const input = entries.join("|") + `||${seed}||${turnPolicyVersion}`;

    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

// ============================================================================
// Occupancy Grid
// ============================================================================

/**
 * An occupancy grid that tracks which 0.25×0.25 cells are occupied.
 * Keys are "x,y" strings for the bottom-left corner of each cell.
 * A tile occupies all cells that its bounding box covers.
 */
class OccupancyGrid {
    private cells = new Map<string, string>(); // cell key → tileId

    private static cellKey(x: number, y: number): string {
        return `${x},${y}`;
    }

    /**
     * Mark all cells occupied by a tile.
     */
    addTile(tileId: string, bbox: TileBBox): void {
        const minCX = Math.round((bbox.x - bbox.halfW) * 4) / 4;
        const maxCX = Math.round((bbox.x + bbox.halfW) * 4) / 4;
        const minCY = Math.round((bbox.y - bbox.halfH) * 4) / 4;
        const maxCY = Math.round((bbox.y + bbox.halfH) * 4) / 4;

        for (let cx = minCX; cx < maxCX; cx += 0.25) {
            for (let cy = minCY; cy < maxCY; cy += 0.25) {
                this.cells.set(OccupancyGrid.cellKey(cx, cy), tileId);
            }
        }
    }

    /**
     * Check if a tile bounding box would overlap any occupied cell.
     * Returns the list of tileIds that would be collided with.
     */
    checkCollision(bbox: TileBBox): string[] {
        const collisions = new Set<string>();
        const minCX = Math.round((bbox.x - bbox.halfW) * 4) / 4;
        const maxCX = Math.round((bbox.x + bbox.halfW) * 4) / 4;
        const minCY = Math.round((bbox.y - bbox.halfH) * 4) / 4;
        const maxCY = Math.round((bbox.y + bbox.halfH) * 4) / 4;

        for (let cx = minCX; cx < maxCX; cx += 0.25) {
            for (let cy = minCY; cy < maxCY; cy += 0.25) {
                const occupant = this.cells.get(OccupancyGrid.cellKey(cx, cy));
                if (occupant) {
                    collisions.add(occupant);
                }
            }
        }
        return [...collisions];
    }

    get occupiedCount(): number {
        return this.cells.size;
    }
}

/**
 * Build an occupancy grid from existing tile layouts.
 */
function buildOccupancyGrid(
    tileLayouts: Record<string, DominoTileLayout>,
): OccupancyGrid {
    const grid = new OccupancyGrid();
    for (const tl of Object.values(tileLayouts)) {
        const bbox = getTileBBox(tl.x, tl.y, tl.isDouble, tl.direction);
        grid.addTile(tl.id, bbox);
    }
    return grid;
}

// ============================================================================
// Bounds Computation
// ============================================================================

function computeBounds(tileLayouts: Record<string, DominoTileLayout>): AABB {
    const tiles = Object.values(tileLayouts);
    if (tiles.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const tl of tiles) {
        const bbox = getTileBBox(tl.x, tl.y, tl.isDouble, tl.direction);
        minX = Math.min(minX, bbox.x - bbox.halfW);
        maxX = Math.max(maxX, bbox.x + bbox.halfW);
        minY = Math.min(minY, bbox.y - bbox.halfH);
        maxY = Math.max(maxY, bbox.y + bbox.halfH);
    }
    return { minX, maxX, minY, maxY };
}

function expandBounds(bounds: AABB, bbox: TileBBox): AABB {
    return {
        minX: Math.min(bounds.minX, bbox.x - bbox.halfW),
        maxX: Math.max(bounds.maxX, bbox.x + bbox.halfW),
        minY: Math.min(bounds.minY, bbox.y - bbox.halfH),
        maxY: Math.max(bounds.maxY, bbox.y + bbox.halfH),
    };
}

// ============================================================================
// Direction Selection — Deterministic Soft Envelope
// ============================================================================

/**
 * Select the next direction for a tile appended to the chain.
 *
 * Candidate order (deterministic):
 *   1. Straight continuation
 *   2. Perpendicular A (determined by away-from-centroid rule)
 *   3. Perpendicular B (the other perpendicular)
 *
 * If the soft envelope says to prefer turns, candidates are reordered to:
 *   [perpA, straight, perpB]
 *
 * The first non-colliding candidate wins. No reverse direction.
 * No randomness in candidate selection — only in the turn-probability roll.
 *
 * @param rngSeed - Deterministic seed for this placement's turn decision.
 */
function selectDirection(
    endpoint: DominoEndpoint,
    bounds: AABB,
    grid: OccupancyGrid,
    isDouble: boolean,
    side: "left" | "right",
    rngSeed: string,
    straightRun: number = 1,
): {
    direction: DominoLayoutDirection;
    candidatesAttempted: Array<{
        direction: DominoLayoutDirection;
        centerX: number;
        centerY: number;
        collidedWith: string[];
    }>;
} | null {
    const straightDir = endpoint.direction;

    // Get the 3 valid next directions: [straight, perpCW, perpCCW]
    const [straight, perpCW, perpCCW] = validNextDirections(straightDir);

    // Determine perpendicular A vs B using away-from-centroid rule
    const centroidX = (bounds.minX + bounds.maxX) / 2;
    const centroidY = (bounds.minY + bounds.maxY) / 2;

    let perpA: DominoLayoutDirection;
    let perpB: DominoLayoutDirection;

    // Use seeded RNG to break ties when endpoint is exactly at centroid
    const tieRng = createSeededRng(rngSeed + ":tie");

    if (isHorizontalDir(straightDir)) {
        // Perpendicular axis is vertical (DOWN/UP)
        const signedDist = endpoint.y - centroidY;
        if (signedDist > 0) {
            // Endpoint is below centroid → prefer going DOWN (away)
            perpA = perpCW === "DOWN" ? perpCW : perpCCW;
            perpB = perpCW === "DOWN" ? perpCCW : perpCW;
        } else if (signedDist < 0) {
            perpA = perpCW === "UP" ? perpCW : perpCCW;
            perpB = perpCW === "UP" ? perpCCW : perpCW;
        } else {
            // Exactly at centroid — use seeded RNG to break tie
            if (tieRng() < 0.5) {
                perpA = perpCW === "DOWN" ? perpCW : perpCCW;
                perpB = perpCW === "DOWN" ? perpCCW : perpCW;
            } else {
                perpA = perpCW === "UP" ? perpCW : perpCCW;
                perpB = perpCW === "UP" ? perpCCW : perpCW;
            }
        }
    } else {
        // Perpendicular axis is horizontal (RIGHT/LEFT)
        const signedDist = endpoint.x - centroidX;
        if (signedDist > 0) {
            perpA = perpCW === "RIGHT" ? perpCW : perpCCW;
            perpB = perpCW === "RIGHT" ? perpCCW : perpCW;
        } else if (signedDist < 0) {
            perpA = perpCW === "LEFT" ? perpCW : perpCCW;
            perpB = perpCW === "LEFT" ? perpCCW : perpCW;
        } else {
            if (tieRng() < 0.5) {
                perpA = perpCW === "RIGHT" ? perpCW : perpCCW;
                perpB = perpCW === "RIGHT" ? perpCCW : perpCW;
            } else {
                perpA = perpCW === "LEFT" ? perpCW : perpCCW;
                perpB = perpCW === "LEFT" ? perpCCW : perpCW;
            }
        }
    }

    // Soft envelope check — uses straight-run count
    const rng = createSeededRng(rngSeed);
    const preferTurn = shouldTurnAtEnvelope(
        endpoint,
        straightDir,
        bounds,
        rng,
        straightRun,
    );

    // Build candidate list in priority order
    const candidates: DominoLayoutDirection[] = preferTurn
        ? [perpA, straight, perpB]
        : [straight, perpA, perpB];

    // Try each candidate
    const attempts: Array<{
        direction: DominoLayoutDirection;
        centerX: number;
        centerY: number;
        collidedWith: string[];
    }> = [];

    for (const dir of candidates) {
        let cx: number;
        let cy: number;

        if (side === "right") {
            // Forward append: nextCenter = endpointCenter + offset(endpoint→dir)
            const offset = lookupConnection(
                endpoint.direction,
                dir,
                endpoint.isDouble,
                isDouble,
            );
            if (!offset) continue;
            cx = endpoint.x + offset.dx;
            cy = endpoint.y + offset.dy;
        } else {
            // Backward prepend: newCenter = tailCenter - offset(dir→endpoint)
            const offset = lookupConnection(
                dir,
                endpoint.direction,
                isDouble,
                endpoint.isDouble,
            );
            if (!offset) continue;
            cx = endpoint.x - offset.dx;
            cy = endpoint.y - offset.dy;
        }

        const bbox = getTileBBox(cx, cy, isDouble, dir);
        const collisions = grid.checkCollision(bbox);

        if (collisions.length === 0) {
            return { direction: dir, candidatesAttempted: attempts };
        }

        attempts.push({
            direction: dir,
            centerX: cx,
            centerY: cy,
            collidedWith: collisions,
        });
    }

    // All candidates collide
    return null;
}

/**
 * Determines if the chain should turn based on how many consecutive
 * tiles have been placed along the current straight axis.
 *
 * Uses asymmetric target runs: longer horizontal (TARGET_RUN_HORIZONTAL)
 * and shorter vertical (TARGET_RUN_VERTICAL) to produce wide S-shapes.
 *
 * The turn probability ramps up as straightRun approaches the target.
 */
function shouldTurnAtEnvelope(
    _endpoint: DominoEndpoint,
    straightDir: DominoLayoutDirection,
    _bounds: AABB,
    rng: () => number,
    straightRun: number,
): boolean {
    const isHorizontal = straightDir === "RIGHT" || straightDir === "LEFT";
    const target = isHorizontal ? TARGET_RUN_HORIZONTAL : TARGET_RUN_VERTICAL;

    // ratio = how close we are to the target run length (0..1+)
    const ratio = straightRun / target;

    if (ratio < 0.5) {
        // Well below target — rarely turn (5% for organic variation)
        return rng() < 0.05;
    }
    if (ratio < 0.75) {
        // Approaching — moderate chance
        return rng() < 0.2;
    }
    if (ratio < 1.0) {
        // Near target — high chance
        return rng() < 0.6;
    }
    // At or past target — almost always turn
    return rng() < 0.95;
}

// ============================================================================
// Seam Computation
// ============================================================================

/**
 * Compute the seam descriptor for the connection between prevTile and nextTile.
 */
function computeSeam(
    prevLayout: DominoTileLayout,
    nextLayout: DominoTileLayout,
    offset: ConnectionOffset,
): SeamDescriptor {
    const seamWorldPos =
        offset.seamAxis === "x"
            ? prevLayout.x + offset.seamPos
            : prevLayout.y + offset.seamPos;

    // The center of the seam on the perpendicular axis
    const seamCenter =
        offset.seamAxis === "x"
            ? (prevLayout.y + nextLayout.y) / 2
            : (prevLayout.x + nextLayout.x) / 2;

    return {
        axis: offset.seamAxis,
        position: seamWorldPos,
        center: seamCenter,
        length: offset.seamLength,
        tileIds: [prevLayout.id, nextLayout.id],
    };
}

// ============================================================================
// Ghost Position Computation
// ============================================================================

/**
 * Compute ghost preview positions for both chain ends.
 * Uses isDouble=false for the ghost tile (generic preview),
 * with the direction chosen by the same selectDirection logic.
 */
function computeGhostPositions(
    head: DominoEndpoint,
    tail: DominoEndpoint,
    bounds: AABB,
    grid: OccupancyGrid,
    seed: string,
    tileCount: number,
    headStraightRun: number = 1,
    tailStraightRun: number = 1,
): {
    leftEndPos: DominoLayoutPoint | null;
    rightEndPos: DominoLayoutPoint | null;
} {
    if (tileCount === 0) {
        return { leftEndPos: null, rightEndPos: null };
    }

    // Right ghost (head end — forward append)
    let rightEndPos: DominoLayoutPoint | null = null;
    const rightResult = selectDirection(
        head,
        bounds,
        grid,
        false, // ghost uses regular tile dimensions
        "right",
        `${seed}:ghost:right:${tileCount}`,
        headStraightRun,
    );
    if (rightResult) {
        const offset = lookupConnection(
            head.direction,
            rightResult.direction,
            head.isDouble,
            false,
        );
        if (offset) {
            rightEndPos = {
                x: head.x + offset.dx,
                y: head.y + offset.dy,
                direction: rightResult.direction,
            };
        }
    }

    // Left ghost (tail end — backward prepend)
    let leftEndPos: DominoLayoutPoint | null = null;
    const leftResult = selectDirection(
        tail,
        bounds,
        grid,
        false,
        "left",
        `${seed}:ghost:left:${tileCount}`,
        tailStraightRun,
    );
    if (leftResult) {
        // For prepend: newCenter = tailCenter - ConnectionOffset(newDir, tailDir, ...)
        const offset = lookupConnection(
            leftResult.direction,
            tail.direction,
            false,
            tail.isDouble,
        );
        if (offset) {
            leftEndPos = {
                x: tail.x - offset.dx,
                y: tail.y - offset.dy,
                direction: leftResult.direction,
            };
        }
    }

    return { leftEndPos, rightEndPos };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize a layout with the first tile placed at the origin.
 *
 * @param tile - the first tile to place
 * @param seed - deterministic seed for RNG decisions
 * @returns A DominoBoardLayoutV3 with one tile
 */
export function initLayout(tile: Tile, seed: string): DominoBoardLayoutV3 {
    const rng = createSeededRng(`${seed}:init`);
    const isDouble = tile.left === tile.right;

    // First tile direction: seeded random, weighted toward RIGHT
    const roll = rng();
    const direction: DominoLayoutDirection =
        roll < 0.7
            ? "RIGHT"
            : roll < 0.85
              ? "LEFT"
              : roll < 0.925
                ? "DOWN"
                : "UP";

    const tileLayout: DominoTileLayout = {
        id: tile.id,
        x: 0,
        y: 0,
        rotation: getRotation(direction, isDouble),
        isDouble,
        direction,
    };

    const tileLayouts: Record<string, DominoTileLayout> = {
        [tile.id]: tileLayout,
    };

    const bbox = getTileBBox(0, 0, isDouble, direction);
    const bounds = computeBounds(tileLayouts);

    const endpoint: DominoEndpoint = {
        tileId: tile.id,
        x: 0,
        y: 0,
        direction,
        isDouble,
    };

    const grid = new OccupancyGrid();
    grid.addTile(tile.id, bbox);

    const moveHistory: DominoLayoutMove[] = [{ tileId: tile.id, side: "init" }];

    const ghostPositions = computeGhostPositions(
        endpoint,
        endpoint,
        bounds,
        grid,
        seed,
        1,
    );

    const layoutHash = computeLayoutHash(
        tileLayouts,
        seed,
        TURN_POLICY_VERSION,
    );

    return {
        seed,
        _turnPolicyVersion: TURN_POLICY_VERSION,
        _moveHistory: moveHistory,
        _layoutHash: layoutHash,
        tileLayouts,
        bounds,
        leftEndPos: ghostPositions.leftEndPos,
        rightEndPos: ghostPositions.rightEndPos,
        _head: { ...endpoint },
        _tail: { ...endpoint },
        _headStraightRun: 1,
        _tailStraightRun: 1,
        _seams: [],
        _layoutError: null,
    };
}

/**
 * Append a tile to one end of the chain layout.
 *
 * This is the core incremental operation. It:
 *   1. Reads the endpoint for the requested side
 *   2. Selects a direction (soft envelope + collision avoidance)
 *   3. Looks up the connection offset from the canonical table
 *   4. Computes the new tile position
 *   5. Verifies no overlap via occupancy grid
 *   6. Returns a LayoutResult (ok or error)
 *
 * @param prevLayout - the current layout
 * @param tile       - the tile to add
 * @param side       - "left" (prepend to tail) or "right" (append to head)
 * @returns LayoutResult — success with new layout, or error
 */
export function appendTile(
    prevLayout: DominoBoardLayoutV3,
    tile: Tile,
    side: "left" | "right",
): LayoutResult {
    const isDouble = tile.left === tile.right;
    const endpoint = side === "right" ? prevLayout._head : prevLayout._tail;
    const currentRun =
        side === "right"
            ? prevLayout._headStraightRun
            : prevLayout._tailStraightRun;
    const tileCount = Object.keys(prevLayout.tileLayouts).length;

    // Build occupancy grid from existing layouts
    const grid = buildOccupancyGrid(prevLayout.tileLayouts);

    // RNG seed for this placement's direction decision
    const rngSeed = `${prevLayout.seed}:dir:${tileCount}:${side}`;

    // Select direction
    const result = selectDirection(
        endpoint,
        prevLayout.bounds,
        grid,
        isDouble,
        side,
        rngSeed,
        currentRun,
    );

    if (!result) {
        // All candidates collide — return typed error
        // Re-run to capture the attempts for the error
        const errorAttempts = selectDirectionWithAttempts(
            endpoint,
            prevLayout.bounds,
            grid,
            isDouble,
            side,
            rngSeed,
            currentRun,
        );

        const error: LayoutPlacementError = {
            type: "PLACEMENT_FAILED",
            tileId: tile.id,
            side,
            moveIndex: tileCount,
            seed: prevLayout.seed,
            turnPolicyVersion: prevLayout._turnPolicyVersion,
            layoutHashBeforeFailure: prevLayout._layoutHash,
            candidatesAttempted: errorAttempts,
        };

        return { ok: false, error, previousLayout: prevLayout };
    }

    const { direction: newDir, candidatesAttempted: _ } = result;

    // Compute position using connection table
    let cx: number;
    let cy: number;
    let offset: ConnectionOffset;

    if (side === "right") {
        // Forward append: nextCenter = endpointCenter + offset
        const conn = lookupConnection(
            endpoint.direction,
            newDir,
            endpoint.isDouble,
            isDouble,
        )!;
        offset = conn;
        cx = endpoint.x + conn.dx;
        cy = endpoint.y + conn.dy;
    } else {
        // Backward prepend: newCenter = tailCenter - ConnectionOffset(newDir, tailDir, ...)
        const conn = lookupConnection(
            newDir,
            endpoint.direction,
            isDouble,
            endpoint.isDouble,
        )!;
        offset = conn;
        cx = endpoint.x - conn.dx;
        cy = endpoint.y - conn.dy;
    }

    // Build the new tile layout
    const newTileLayout: DominoTileLayout = {
        id: tile.id,
        x: cx,
        y: cy,
        rotation: getRotation(newDir, isDouble),
        isDouble,
        direction: newDir,
    };

    // Copy existing layouts + add new one
    const tileLayouts: Record<string, DominoTileLayout> = {
        ...prevLayout.tileLayouts,
        [tile.id]: newTileLayout,
    };

    // Update endpoint
    const newEndpoint: DominoEndpoint = {
        tileId: tile.id,
        x: cx,
        y: cy,
        direction: newDir,
        isDouble,
    };

    const head = side === "right" ? newEndpoint : prevLayout._head;
    const tail = side === "left" ? newEndpoint : prevLayout._tail;

    // Compute straight-run counts.
    // Same axis as endpoint → increment; different axis → reset to 1.
    const sameAxis =
        isHorizontalDir(newDir) === isHorizontalDir(endpoint.direction);
    const newRun = sameAxis ? currentRun + 1 : 1;
    const headStraightRun =
        side === "right" ? newRun : prevLayout._headStraightRun;
    const tailStraightRun =
        side === "left" ? newRun : prevLayout._tailStraightRun;

    // Update bounds
    const newBBox = getTileBBox(cx, cy, isDouble, newDir);
    const updatedBounds = expandBounds(prevLayout.bounds, newBBox);

    // Add tile to occupancy grid for ghost computation
    grid.addTile(tile.id, newBBox);

    // Compute seam for this connection
    const prevTileLayout =
        side === "right"
            ? prevLayout.tileLayouts[endpoint.tileId]
            : newTileLayout;
    const nextTileLayout =
        side === "right"
            ? newTileLayout
            : prevLayout.tileLayouts[endpoint.tileId];

    // For prepend, the connection goes: newTile → oldTail
    // The offset table entry is lookupConnection(newDir, oldTail.dir, newIsDouble, oldIsDouble)
    // For append, the connection goes: oldHead → newTile
    // The offset table entry is lookupConnection(oldHead.dir, newDir, oldIsDouble, newIsDouble)

    let seamOffset: ConnectionOffset;
    if (side === "right") {
        seamOffset = lookupConnection(
            endpoint.direction,
            newDir,
            endpoint.isDouble,
            isDouble,
        )!;
    } else {
        seamOffset = lookupConnection(
            newDir,
            endpoint.direction,
            isDouble,
            endpoint.isDouble,
        )!;
    }

    const newSeam = computeSeam(prevTileLayout, nextTileLayout, seamOffset);
    const seams = [...prevLayout._seams, newSeam];

    // Compute ghost positions
    const ghostPositions = computeGhostPositions(
        head,
        tail,
        updatedBounds,
        grid,
        prevLayout.seed,
        tileCount + 1,
        headStraightRun,
        tailStraightRun,
    );

    // Update move history
    const moveHistory: DominoLayoutMove[] = [
        ...prevLayout._moveHistory,
        { tileId: tile.id, side },
    ];

    // Compute layout hash
    const layoutHash = computeLayoutHash(
        tileLayouts,
        prevLayout.seed,
        prevLayout._turnPolicyVersion,
    );

    const layout: DominoBoardLayoutV3 = {
        seed: prevLayout.seed,
        _turnPolicyVersion: prevLayout._turnPolicyVersion,
        _moveHistory: moveHistory,
        _layoutHash: layoutHash,
        tileLayouts,
        bounds: updatedBounds,
        leftEndPos: ghostPositions.leftEndPos,
        rightEndPos: ghostPositions.rightEndPos,
        _head: head,
        _tail: tail,
        _headStraightRun: headStraightRun,
        _tailStraightRun: tailStraightRun,
        _seams: seams,
        _layoutError: null,
    };

    return { ok: true, layout };
}

/**
 * Replay a layout from a complete move history.
 * Produces the exact same layout as sequential appendTile calls.
 *
 * @param moveHistory - Ordered moves (first is 'init', rest are 'left'/'right')
 * @param tileMap     - Map of tileId → Tile for looking up tile data
 * @param seed        - Deterministic seed
 * @param turnPolicyVersion - Must match the version used to create the original layout
 * @returns LayoutResult — success or error at the failing move
 */
export function replayLayout(
    moveHistory: DominoLayoutMove[],
    tileMap: Record<string, Tile>,
    seed: string,
    turnPolicyVersion?: number,
): LayoutResult {
    if (moveHistory.length === 0) {
        const emptyLayout: DominoBoardLayoutV3 = {
            seed,
            _turnPolicyVersion: turnPolicyVersion ?? TURN_POLICY_VERSION,
            _moveHistory: [],
            _layoutHash: computeLayoutHash(
                {},
                seed,
                turnPolicyVersion ?? TURN_POLICY_VERSION,
            ),
            tileLayouts: {},
            bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            leftEndPos: null,
            rightEndPos: null,
            _head: {
                tileId: "",
                x: 0,
                y: 0,
                direction: "RIGHT",
                isDouble: false,
            },
            _tail: {
                tileId: "",
                x: 0,
                y: 0,
                direction: "RIGHT",
                isDouble: false,
            },
            _headStraightRun: 0,
            _tailStraightRun: 0,
            _seams: [],
            _layoutError: null,
        };
        return { ok: true, layout: emptyLayout };
    }

    // First move must be 'init'
    const firstMove = moveHistory[0];
    const firstTile = tileMap[firstMove.tileId];
    if (!firstTile) {
        throw new Error(
            `replayLayout: tile ${firstMove.tileId} not found in tileMap`,
        );
    }

    let layout = initLayout(firstTile, seed);

    // Override turnPolicyVersion if specified
    if (turnPolicyVersion !== undefined) {
        layout = { ...layout, _turnPolicyVersion: turnPolicyVersion };
    }

    // Replay subsequent moves
    for (let i = 1; i < moveHistory.length; i++) {
        const move = moveHistory[i];
        const tile = tileMap[move.tileId];
        if (!tile) {
            throw new Error(
                `replayLayout: tile ${move.tileId} not found in tileMap (move ${i})`,
            );
        }
        if (move.side !== "left" && move.side !== "right") {
            throw new Error(
                `replayLayout: invalid side "${move.side}" at move ${i}`,
            );
        }

        const result = appendTile(layout, tile, move.side);
        if (!result.ok) {
            return result;
        }
        layout = result.layout;
    }

    return { ok: true, layout };
}

/**
 * Backward-compatible wrapper: compute layout from an ordered tile chain.
 * Supports incremental append when previousLayout is available and exactly 1 new tile.
 * Falls back to replayLayout from moveHistory when available,
 * or full chain replay otherwise.
 *
 * @param tiles          - Ordered chain of tiles (left → right)
 * @param seed           - Deterministic seed
 * @param previousLayout - Previous v3 layout for incremental updates
 */
export function computeDominoBoardLayoutV3(
    tiles: Tile[],
    seed: string,
    previousLayout?: DominoBoardLayoutV3,
): LayoutResult {
    if (tiles.length === 0) {
        const emptyLayout: DominoBoardLayoutV3 = {
            seed,
            _turnPolicyVersion: TURN_POLICY_VERSION,
            _moveHistory: [],
            _layoutHash: computeLayoutHash({}, seed, TURN_POLICY_VERSION),
            tileLayouts: {},
            bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            leftEndPos: null,
            rightEndPos: null,
            _head: {
                tileId: "",
                x: 0,
                y: 0,
                direction: "RIGHT",
                isDouble: false,
            },
            _tail: {
                tileId: "",
                x: 0,
                y: 0,
                direction: "RIGHT",
                isDouble: false,
            },
            _headStraightRun: 0,
            _tailStraightRun: 0,
            _seams: [],
            _layoutError: null,
        };
        return { ok: true, layout: emptyLayout };
    }

    // If we have a previous layout with moveHistory, try incremental
    if (previousLayout && previousLayout._moveHistory.length > 0) {
        const prevCount = Object.keys(previousLayout.tileLayouts).length;
        const newCount = tiles.length;

        if (newCount - prevCount === 1) {
            // Exactly one new tile — find it and append
            const prevIds = new Set(Object.keys(previousLayout.tileLayouts));
            const newTile = tiles.find((t) => !prevIds.has(t.id));
            if (newTile) {
                const side: "left" | "right" =
                    tiles[0].id === newTile.id ? "left" : "right";
                return appendTile(previousLayout, newTile, side);
            }
        }

        // Count mismatch or can't find new tile — replay from history
        if (previousLayout._moveHistory.length === tiles.length) {
            // Same count, just replay
            const tileMap: Record<string, Tile> = {};
            for (const t of tiles) tileMap[t.id] = t;
            return replayLayout(
                previousLayout._moveHistory,
                tileMap,
                seed,
                previousLayout._turnPolicyVersion,
            );
        }
    }

    // No previous layout or can't reconcile — build from tile chain
    // Assume tiles are in chain order: all go to "right" end
    const tileMap: Record<string, Tile> = {};
    for (const t of tiles) tileMap[t.id] = t;

    const moveHistory: DominoLayoutMove[] = tiles.map((t, i) => ({
        tileId: t.id,
        side: i === 0 ? ("init" as const) : ("right" as const),
    }));

    return replayLayout(moveHistory, tileMap, seed, TURN_POLICY_VERSION);
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Re-run selectDirection to capture all attempt details for error reporting.
 */
function selectDirectionWithAttempts(
    endpoint: DominoEndpoint,
    bounds: AABB,
    grid: OccupancyGrid,
    isDouble: boolean,
    side: "left" | "right",
    rngSeed: string,
    straightRun: number = 1,
): Array<{
    direction: DominoLayoutDirection;
    centerX: number;
    centerY: number;
    collidedWith: string[];
}> {
    const straightDir = endpoint.direction;
    const [straight, perpCW, perpCCW] = validNextDirections(straightDir);

    const centroidX = (bounds.minX + bounds.maxX) / 2;
    const centroidY = (bounds.minY + bounds.maxY) / 2;

    let perpA: DominoLayoutDirection;
    let perpB: DominoLayoutDirection;

    // Use seeded RNG to break ties when endpoint is exactly at centroid
    const tieRng = createSeededRng(rngSeed + ":tie");

    if (isHorizontalDir(straightDir)) {
        const signedDist = endpoint.y - centroidY;
        if (signedDist > 0) {
            perpA = perpCW === "DOWN" ? perpCW : perpCCW;
            perpB = perpCW === "DOWN" ? perpCCW : perpCW;
        } else if (signedDist < 0) {
            perpA = perpCW === "UP" ? perpCW : perpCCW;
            perpB = perpCW === "UP" ? perpCCW : perpCW;
        } else {
            if (tieRng() < 0.5) {
                perpA = perpCW === "DOWN" ? perpCW : perpCCW;
                perpB = perpCW === "DOWN" ? perpCCW : perpCW;
            } else {
                perpA = perpCW === "UP" ? perpCW : perpCCW;
                perpB = perpCW === "UP" ? perpCCW : perpCW;
            }
        }
    } else {
        const signedDist = endpoint.x - centroidX;
        if (signedDist > 0) {
            perpA = perpCW === "RIGHT" ? perpCW : perpCCW;
            perpB = perpCW === "RIGHT" ? perpCCW : perpCW;
        } else if (signedDist < 0) {
            perpA = perpCW === "LEFT" ? perpCW : perpCCW;
            perpB = perpCW === "LEFT" ? perpCCW : perpCW;
        } else {
            if (tieRng() < 0.5) {
                perpA = perpCW === "RIGHT" ? perpCW : perpCCW;
                perpB = perpCW === "RIGHT" ? perpCCW : perpCW;
            } else {
                perpA = perpCW === "LEFT" ? perpCW : perpCCW;
                perpB = perpCW === "LEFT" ? perpCCW : perpCW;
            }
        }
    }

    const rng = createSeededRng(rngSeed);
    const preferTurn = shouldTurnAtEnvelope(
        endpoint,
        straightDir,
        bounds,
        rng,
        straightRun,
    );

    const candidates: DominoLayoutDirection[] = preferTurn
        ? [perpA, straight, perpB]
        : [straight, perpA, perpB];

    const attempts: Array<{
        direction: DominoLayoutDirection;
        centerX: number;
        centerY: number;
        collidedWith: string[];
    }> = [];

    for (const dir of candidates) {
        let cx: number;
        let cy: number;

        if (side === "right") {
            const offset = lookupConnection(
                endpoint.direction,
                dir,
                endpoint.isDouble,
                isDouble,
            );
            if (!offset) continue;
            cx = endpoint.x + offset.dx;
            cy = endpoint.y + offset.dy;
        } else {
            const offset = lookupConnection(
                dir,
                endpoint.direction,
                isDouble,
                endpoint.isDouble,
            );
            if (!offset) continue;
            cx = endpoint.x - offset.dx;
            cy = endpoint.y - offset.dy;
        }

        const bbox = getTileBBox(cx, cy, isDouble, dir);
        const collisions = grid.checkCollision(bbox);

        attempts.push({
            direction: dir,
            centerX: cx,
            centerY: cy,
            collidedWith: collisions,
        });
    }

    return attempts;
}
