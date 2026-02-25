/**
 * Domino Board Layout Engine v2
 *
 * An append-only, incremental layout engine for domino chains.
 * Core design principles:
 *   1. Stability: once a tile is placed, its position never changes.
 *   2. Append-only: each new tile placement computes only the new tile's position.
 *   3. Collision-safe: no tile ever overlaps another.
 *   4. Natural snaking: soft spatial envelope with probabilistic turns, not hard bounce.
 *   5. Deterministic: same seed + same sequence = same layout.
 *   6. Doubles are crosswise (perpendicular to chain direction).
 *
 * The engine is pure functions with zero DOM/browser dependencies.
 * It runs identically on server and client.
 */

import {
    Tile,
    DominoLayoutDirection,
    DominoTileLayout,
    DominoBoardLayout,
    DominoLayoutPoint,
    DominoEndpoint,
} from "../types";

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
// Geometry helpers
// ============================================================================

/** Tile dimensions in logical units for overlap detection. */
function getTileBBox(
    x: number,
    y: number,
    isDouble: boolean,
    direction: DominoLayoutDirection,
): TileBBox {
    // A regular tile is 1.0 × 0.5 logical units (long axis × short axis).
    // A double is 0.5 × 0.5 (square, because it's turned crosswise).
    // In the layout coordinate system:
    //   Horizontal direction (RIGHT/LEFT): width=1.0(normal)/0.5(double), height=0.5(normal)/1.0(double)
    //   Vertical direction   (DOWN/UP):    width=0.5(normal)/1.0(double), height=1.0(normal)/0.5(double)
    const isHorizontal = direction === "RIGHT" || direction === "LEFT";

    let halfW: number;
    let halfH: number;

    if (isHorizontal) {
        halfW = isDouble ? 0.25 : 0.5;
        halfH = isDouble ? 0.5 : 0.25;
    } else {
        halfW = isDouble ? 0.5 : 0.25;
        halfH = isDouble ? 0.25 : 0.5;
    }

    return { x, y, halfW, halfH };
}

/** Compute CSS rotation in degrees for a tile. */
function getRotation(
    direction: DominoLayoutDirection,
    isDouble: boolean,
): number {
    if (direction === "RIGHT") return isDouble ? 90 : 0;
    if (direction === "LEFT") return isDouble ? 90 : 180;
    if (direction === "DOWN") return isDouble ? 0 : 90;
    if (direction === "UP") return isDouble ? 0 : 270;
    return 0;
}

/** The opposite direction. */
function reverseDirection(dir: DominoLayoutDirection): DominoLayoutDirection {
    switch (dir) {
        case "RIGHT":
            return "LEFT";
        case "LEFT":
            return "RIGHT";
        case "UP":
            return "DOWN";
        case "DOWN":
            return "UP";
    }
}

/** Is the direction horizontal? */
function isHorizontalDir(dir: DominoLayoutDirection): boolean {
    return dir === "RIGHT" || dir === "LEFT";
}

/** Get a perpendicular direction (positive rotation). */
function perpendicularCW(dir: DominoLayoutDirection): DominoLayoutDirection {
    switch (dir) {
        case "RIGHT":
            return "DOWN";
        case "DOWN":
            return "LEFT";
        case "LEFT":
            return "UP";
        case "UP":
            return "RIGHT";
    }
}

/** Get a perpendicular direction (negative rotation). */
function perpendicularCCW(dir: DominoLayoutDirection): DominoLayoutDirection {
    switch (dir) {
        case "RIGHT":
            return "UP";
        case "UP":
            return "LEFT";
        case "LEFT":
            return "DOWN";
        case "DOWN":
            return "RIGHT";
    }
}

// ============================================================================
// Connection socket math
// ============================================================================

/**
 * Where the "entry" socket is, relative to the tile center.
 * The entry socket is the point where this tile connects to the PREVIOUS tile
 * in the chain (i.e., the tile it was placed next to).
 */
function getEntryOffset(
    direction: DominoLayoutDirection,
    isDouble: boolean,
): { dx: number; dy: number } {
    // Entry is on the side the tile "came from" — opposite to its direction.
    switch (direction) {
        case "RIGHT":
            return { dx: isDouble ? -0.25 : -0.5, dy: 0 };
        case "LEFT":
            return { dx: isDouble ? 0.25 : 0.5, dy: 0 };
        case "DOWN":
            return { dx: 0, dy: isDouble ? -0.25 : -0.5 };
        case "UP":
            return { dx: 0, dy: isDouble ? 0.25 : 0.5 };
    }
}

/**
 * Where the "exit" socket is, relative to the tile center.
 * The exit socket is where the NEXT tile in the chain will connect.
 *
 * @param tileDir  - this tile's chain direction
 * @param nextDir  - the direction the chain continues toward
 * @param isDouble - whether this tile is a double
 */
function getExitOffset(
    tileDir: DominoLayoutDirection,
    nextDir: DominoLayoutDirection,
    isDouble: boolean,
): { dx: number; dy: number } {
    // Straight continuation
    if (tileDir === nextDir) {
        switch (tileDir) {
            case "RIGHT":
                return { dx: isDouble ? 0.25 : 0.5, dy: 0 };
            case "LEFT":
                return { dx: isDouble ? -0.25 : -0.5, dy: 0 };
            case "DOWN":
                return { dx: 0, dy: isDouble ? 0.25 : 0.5 };
            case "UP":
                return { dx: 0, dy: isDouble ? -0.25 : -0.5 };
        }
    }

    // Turn: tile goes in tileDir, next tile goes in nextDir (perpendicular)
    // The exit socket is at the corner where the two directions meet.
    let dx = 0;
    let dy = 0;

    // Horizontal → Vertical turn
    if (tileDir === "RIGHT") {
        dx = isDouble ? 0 : 0.25;
        dy =
            nextDir === "DOWN"
                ? isDouble
                    ? 0.5
                    : 0.25
                : isDouble
                  ? -0.5
                  : -0.25;
    } else if (tileDir === "LEFT") {
        dx = isDouble ? 0 : -0.25;
        dy =
            nextDir === "DOWN"
                ? isDouble
                    ? 0.5
                    : 0.25
                : isDouble
                  ? -0.5
                  : -0.25;
    }
    // Vertical → Horizontal turn
    else if (tileDir === "DOWN") {
        dy = isDouble ? 0 : 0.25;
        dx =
            nextDir === "RIGHT"
                ? isDouble
                    ? 0.5
                    : 0.25
                : isDouble
                  ? -0.5
                  : -0.25;
    } else if (tileDir === "UP") {
        dy = isDouble ? 0 : -0.25;
        dx =
            nextDir === "RIGHT"
                ? isDouble
                    ? 0.5
                    : 0.25
                : isDouble
                  ? -0.5
                  : -0.25;
    }

    return { dx, dy };
}

// ============================================================================
// Collision detection
// ============================================================================

interface TileBBox {
    x: number;
    y: number;
    halfW: number;
    halfH: number;
}

const COLLISION_CLEARANCE = 0.02; // small gap to avoid flush-edge false positives

function bboxOverlaps(a: TileBBox, b: TileBBox): boolean {
    return (
        Math.abs(a.x - b.x) < a.halfW + b.halfW - COLLISION_CLEARANCE &&
        Math.abs(a.y - b.y) < a.halfH + b.halfH - COLLISION_CLEARANCE
    );
}

function overlapsAny(bbox: TileBBox, existing: TileBBox[]): boolean {
    for (const other of existing) {
        if (bboxOverlaps(bbox, other)) return true;
    }
    return false;
}

// ============================================================================
// Bounds computation
// ============================================================================

interface AABB {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

function computeBounds(bboxes: TileBBox[]): AABB {
    if (bboxes.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const b of bboxes) {
        minX = Math.min(minX, b.x - b.halfW);
        maxX = Math.max(maxX, b.x + b.halfW);
        minY = Math.min(minY, b.y - b.halfH);
        maxY = Math.max(maxY, b.y + b.halfH);
    }
    return { minX, maxX, minY, maxY };
}

function boundsFromLayouts(layouts: Record<string, DominoTileLayout>): AABB {
    const bboxes: TileBBox[] = [];
    for (const layout of Object.values(layouts)) {
        bboxes.push(
            getTileBBox(layout.x, layout.y, layout.isDouble, layout.direction),
        );
    }
    return computeBounds(bboxes);
}

// ============================================================================
// Endpoint type — re-export from shared types
// ============================================================================

type Endpoint = DominoEndpoint;

// ============================================================================
// Internal mutable layout state (used during construction, frozen on export)
// ============================================================================

interface ChainLayoutState {
    seed: string;
    tileLayouts: Record<string, DominoTileLayout>;
    spatialIndex: TileBBox[];
    headEndpoint: Endpoint; // "right" end of chain — grows forward
    tailEndpoint: Endpoint; // "left" end of chain — grows backward
    /** RNG state hash for subsequent direction decisions */
    rngCounter: number;
}

// ============================================================================
// Direction selection — the "soft envelope" algorithm
// ============================================================================

/**
 * Select the next direction for a tile appended to the chain.
 *
 * Strategy:
 *   1. Prefer continuing straight if there's space.
 *   2. When approaching the soft envelope boundary, probabilistically turn.
 *   3. Always try to avoid collision. If straight collides, turn.
 *   4. Perpendicular turns go AWAY from the chain centroid (prevents loopback).
 *   5. Fallback: try all 4 directions. If all collide, force the least-bad option.
 */
function selectDirection(
    endpoint: Endpoint,
    spatialIndex: TileBBox[],
    bounds: AABB,
    rng: () => number,
    isDouble: boolean,
    side: "left" | "right",
): DominoLayoutDirection {
    const { direction: prevDir } = endpoint;

    // Direction candidates ordered by preference
    const candidates: DominoLayoutDirection[] = [];

    // 1. Straight continuation
    const straightDir = side === "right" ? prevDir : reverseDirection(prevDir);
    candidates.push(straightDir);

    // 2. Perpendicular options — prefer turning AWAY from chain centroid
    const centroidX = (bounds.minX + bounds.maxX) / 2;
    const centroidY = (bounds.minY + bounds.maxY) / 2;

    const perpCW = perpendicularCW(straightDir);
    const perpCCW = perpendicularCCW(straightDir);

    // Determine which perpendicular direction goes away from centroid
    if (isHorizontalDir(straightDir)) {
        // Turning perpendicular means going vertical
        // If we're above centroid, prefer going UP (away); if below, prefer DOWN
        if (endpoint.y > centroidY) {
            candidates.push(perpCW === "DOWN" ? perpCW : perpCCW);
            candidates.push(perpCW === "DOWN" ? perpCCW : perpCW);
        } else {
            candidates.push(perpCW === "UP" ? perpCW : perpCCW);
            candidates.push(perpCW === "UP" ? perpCCW : perpCW);
        }
    } else {
        // Turning perpendicular means going horizontal
        // If we're right of centroid, prefer going RIGHT (away); if left, prefer LEFT
        if (endpoint.x > centroidX) {
            candidates.push(perpCW === "RIGHT" ? perpCW : perpCCW);
            candidates.push(perpCW === "RIGHT" ? perpCCW : perpCW);
        } else {
            candidates.push(perpCW === "LEFT" ? perpCW : perpCCW);
            candidates.push(perpCW === "LEFT" ? perpCCW : perpCW);
        }
    }

    // 3. Reverse (last resort — not ideal but prevents failure)
    candidates.push(reverseDirection(straightDir));

    // Soft envelope check: should we prefer turning over going straight?
    const softEnvelopeHalf = 7; // target ±7 logical units from origin
    const shouldPreferTurn = shouldTurnAtEnvelope(
        endpoint,
        straightDir,
        softEnvelopeHalf,
        rng,
    );

    // If we should turn, move perpendicular candidates before straight
    if (shouldPreferTurn && candidates.length >= 3) {
        const straight = candidates[0];
        const perp1 = candidates[1];
        candidates[0] = perp1;
        candidates[1] = straight;
    }

    // Try each candidate — first non-colliding wins
    for (const dir of candidates) {
        const pos = computeNextPosition(endpoint, dir, isDouble, side);
        const bbox = getTileBBox(pos.x, pos.y, isDouble, dir);
        if (!overlapsAny(bbox, spatialIndex)) {
            return dir;
        }
    }

    // All candidates collide — use the straight direction anyway (will be caught by caller)
    return straightDir;
}

/**
 * Determines if the chain should turn based on soft envelope proximity.
 * Returns true when the endpoint is near or past the envelope boundary.
 * Uses probabilistic ramp: further past boundary = higher turn probability.
 */
function shouldTurnAtEnvelope(
    endpoint: Endpoint,
    straightDir: DominoLayoutDirection,
    envelopeHalf: number,
    rng: () => number,
): boolean {
    // How far along the straight axis are we relative to envelope?
    let position: number;
    switch (straightDir) {
        case "RIGHT":
            position = endpoint.x;
            break;
        case "LEFT":
            position = -endpoint.x;
            break;
        case "DOWN":
            position = endpoint.y;
            break;
        case "UP":
            position = -endpoint.y;
            break;
    }

    if (position < envelopeHalf * 0.6) {
        // Well within envelope — rarely turn (5% chance for organic variation)
        return rng() < 0.05;
    }
    if (position < envelopeHalf * 0.8) {
        // Approaching boundary — moderate chance to turn
        return rng() < 0.3;
    }
    if (position < envelopeHalf) {
        // Near boundary — high chance
        return rng() < 0.7;
    }
    // Past boundary — almost always turn
    return rng() < 0.95;
}

// ============================================================================
// Position computation
// ============================================================================

/**
 * Compute the position of a new tile placed next to the endpoint.
 *
 * @param endpoint - the chain endpoint we're extending from
 * @param newDir   - the direction the new tile will go
 * @param isDouble - whether the new tile is a double
 * @param side     - "right" = appending to head (forward), "left" = prepending to tail (backward)
 */
function computeNextPosition(
    endpoint: Endpoint,
    newDir: DominoLayoutDirection,
    isDouble: boolean,
    side: "left" | "right",
): { x: number; y: number } {
    if (side === "right") {
        // Forward append: exit from endpoint tile → entry of new tile
        const exit = getExitOffset(
            endpoint.direction,
            newDir,
            endpoint.isDouble,
        );
        const entry = getEntryOffset(newDir, isDouble);
        return {
            x: endpoint.x + exit.dx - entry.dx,
            y: endpoint.y + exit.dy - entry.dy,
        };
    } else {
        // Backward prepend: entry of endpoint tile → exit of new tile
        const entry = getEntryOffset(endpoint.direction, endpoint.isDouble);
        const exit = getExitOffset(newDir, endpoint.direction, isDouble);
        return {
            x: endpoint.x + entry.dx - exit.dx,
            y: endpoint.y + entry.dy - exit.dy,
        };
    }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize a layout with the first tile placed at the origin.
 *
 * @param tile - the first tile to place
 * @param seed - deterministic seed for RNG decisions
 * @returns A DominoBoardLayout with one tile
 */
export function initLayout(tile: Tile, seed: string): DominoBoardLayout {
    const rng = createSeededRng(seed);
    const isDouble = tile.left === tile.right;

    // First tile direction: seeded random, slight bias toward RIGHT for natural feel
    const roll = rng();
    const direction: DominoLayoutDirection =
        roll < 0.7
            ? "RIGHT"
            : roll < 0.85
              ? "LEFT"
              : roll < 0.925
                ? "DOWN"
                : "UP";

    const layout: DominoTileLayout = {
        id: tile.id,
        x: 0,
        y: 0,
        rotation: getRotation(direction, isDouble),
        isDouble,
        direction,
    };

    const tileLayouts: Record<string, DominoTileLayout> = {
        [tile.id]: layout,
    };

    const bbox = getTileBBox(0, 0, isDouble, direction);
    const bounds = computeBounds([bbox]);

    // Both endpoints point to the same tile initially
    const headEndpoint: Endpoint = {
        tileId: tile.id,
        x: 0,
        y: 0,
        direction,
        isDouble,
    };
    const tailEndpoint: Endpoint = {
        tileId: tile.id,
        x: 0,
        y: 0,
        direction,
        isDouble,
    };

    // Compute ghost positions for both ends
    const ghostPositions = computeGhostPositions(
        tileLayouts,
        headEndpoint,
        tailEndpoint,
        bounds,
        seed,
    );

    return {
        seed,
        tileLayouts,
        bounds,
        leftEndPos: ghostPositions.leftEndPos,
        rightEndPos: ghostPositions.rightEndPos,
        _head: headEndpoint,
        _tail: tailEndpoint,
    };
}

/**
 * Append a tile to one end of the chain layout.
 *
 * This is the core incremental operation. It:
 *   1. Reads the endpoint for the requested side
 *   2. Selects a direction (soft envelope + collision avoidance)
 *   3. Computes the new tile position
 *   4. Verifies no overlap
 *   5. Returns a new layout with the tile added (existing tiles unchanged)
 *
 * @param prevLayout - the current layout
 * @param tile       - the tile to add
 * @param side       - "left" (prepend to tail) or "right" (append to head)
 * @returns Updated DominoBoardLayout
 */
export function appendTile(
    prevLayout: DominoBoardLayout,
    tile: Tile,
    side: "left" | "right",
): DominoBoardLayout {
    const isDouble = tile.left === tile.right;

    // Extract endpoint metadata (present if layout was computed by this engine)
    const headEndpoint: Endpoint =
        prevLayout._head ?? reconstructEndpoint(prevLayout, "right");
    const tailEndpoint: Endpoint =
        prevLayout._tail ?? reconstructEndpoint(prevLayout, "left");

    const endpoint = side === "right" ? headEndpoint : tailEndpoint;

    // Rebuild spatial index from existing layouts
    const spatialIndex: TileBBox[] = [];
    for (const tl of Object.values(prevLayout.tileLayouts)) {
        spatialIndex.push(getTileBBox(tl.x, tl.y, tl.isDouble, tl.direction));
    }

    const bounds = prevLayout.bounds;

    // Create RNG seeded with the layout seed + tile count for determinism
    const tileCount = Object.keys(prevLayout.tileLayouts).length;
    const rng = createSeededRng(
        `${prevLayout.seed}:place:${tileCount}:${side}`,
    );

    // Select direction
    const newDir = selectDirection(
        endpoint,
        spatialIndex,
        bounds,
        rng,
        isDouble,
        side,
    );

    // Compute position
    const pos = computeNextPosition(endpoint, newDir, isDouble, side);

    // Verify no overlap (should be guaranteed by selectDirection, but double-check)
    const newBBox = getTileBBox(pos.x, pos.y, isDouble, newDir);
    if (overlapsAny(newBBox, spatialIndex)) {
        // Last resort: try all 4 directions explicitly
        const allDirs: DominoLayoutDirection[] = [
            "RIGHT",
            "DOWN",
            "LEFT",
            "UP",
        ];
        let fallbackDir: DominoLayoutDirection | null = null;
        let fallbackPos: { x: number; y: number } | null = null;
        for (const dir of allDirs) {
            const p = computeNextPosition(endpoint, dir, isDouble, side);
            const bb = getTileBBox(p.x, p.y, isDouble, dir);
            if (!overlapsAny(bb, spatialIndex)) {
                fallbackDir = dir;
                fallbackPos = p;
                break;
            }
        }
        if (fallbackDir && fallbackPos) {
            return buildLayoutResult(
                prevLayout,
                tile,
                fallbackPos,
                fallbackDir,
                isDouble,
                side,
                headEndpoint,
                tailEndpoint,
            );
        }
        // If absolutely everything collides, try nudging positions
        // in perpendicular/diagonal directions to find a non-colliding slot
        const nudgeAmounts = [0.5, 1.0, 1.5, 2.0];
        const nudgeVectors: [number, number][] = [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
        ];
        for (const amount of nudgeAmounts) {
            for (const dir of allDirs) {
                const basePos = computeNextPosition(
                    endpoint,
                    dir,
                    isDouble,
                    side,
                );
                for (const [ndx, ndy] of nudgeVectors) {
                    const nudgedPos = {
                        x: basePos.x + ndx * amount,
                        y: basePos.y + ndy * amount,
                    };
                    const bb = getTileBBox(
                        nudgedPos.x,
                        nudgedPos.y,
                        isDouble,
                        dir,
                    );
                    if (!overlapsAny(bb, spatialIndex)) {
                        return buildLayoutResult(
                            prevLayout,
                            tile,
                            nudgedPos,
                            dir,
                            isDouble,
                            side,
                            headEndpoint,
                            tailEndpoint,
                        );
                    }
                }
            }
        }
        // Absolute last resort: place at the originally computed position despite overlap
        return buildLayoutResult(
            prevLayout,
            tile,
            pos,
            newDir,
            isDouble,
            side,
            headEndpoint,
            tailEndpoint,
        );
    }

    return buildLayoutResult(
        prevLayout,
        tile,
        pos,
        newDir,
        isDouble,
        side,
        headEndpoint,
        tailEndpoint,
    );
}

/**
 * Compute full layout from scratch given an ordered chain of tiles.
 * Used for initial server-side computation when loading existing game state.
 * Places the first tile, then appends each subsequent tile to the right end.
 *
 * @param tiles - ordered chain (left-to-right)
 * @param seed  - deterministic seed
 * @returns Complete DominoBoardLayout
 */
export function computeFullLayout(
    tiles: Tile[],
    seed: string,
): DominoBoardLayout {
    if (tiles.length === 0) {
        return {
            seed,
            tileLayouts: {},
            bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            leftEndPos: null,
            rightEndPos: null,
        };
    }

    // Find the anchor tile (middle of chain) for balanced layout
    const anchorIndex = Math.floor(tiles.length / 2);

    // Place anchor tile at origin
    let layout = initLayout(tiles[anchorIndex], seed);

    // Expand forward (anchor+1 → end) — these go to the "right" end
    for (let i = anchorIndex + 1; i < tiles.length; i++) {
        layout = appendTile(layout, tiles[i], "right");
    }

    // Expand backward (anchor-1 → start) — these go to the "left" end
    for (let i = anchorIndex - 1; i >= 0; i--) {
        layout = appendTile(layout, tiles[i], "left");
    }

    return layout;
}

// ============================================================================
// Ghost position computation
// ============================================================================

/**
 * Compute ghost preview positions for both chain ends.
 * These indicate where the next tile would be placed on each side.
 */
function computeGhostPositions(
    tileLayouts: Record<string, DominoTileLayout>,
    head: Endpoint,
    tail: Endpoint,
    bounds: AABB,
    seed: string,
): {
    leftEndPos: DominoLayoutPoint | null;
    rightEndPos: DominoLayoutPoint | null;
} {
    const tileCount = Object.keys(tileLayouts).length;
    if (tileCount === 0) {
        return { leftEndPos: null, rightEndPos: null };
    }

    const spatialIndex: TileBBox[] = [];
    for (const tl of Object.values(tileLayouts)) {
        spatialIndex.push(getTileBBox(tl.x, tl.y, tl.isDouble, tl.direction));
    }

    // Right ghost (head end — forward)
    const rightRng = createSeededRng(`${seed}:ghost:right:${tileCount}`);
    const rightDir = selectDirection(
        head,
        spatialIndex,
        bounds,
        rightRng,
        false,
        "right",
    );
    const rightPos = computeNextPosition(head, rightDir, false, "right");

    // Left ghost (tail end — backward)
    const leftRng = createSeededRng(`${seed}:ghost:left:${tileCount}`);
    const leftDir = selectDirection(
        tail,
        spatialIndex,
        bounds,
        leftRng,
        false,
        "left",
    );
    const leftPos = computeNextPosition(tail, leftDir, false, "left");

    return {
        leftEndPos: { x: leftPos.x, y: leftPos.y, direction: leftDir },
        rightEndPos: { x: rightPos.x, y: rightPos.y, direction: rightDir },
    };
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Build the final layout result after placing a new tile.
 */
function buildLayoutResult(
    prevLayout: DominoBoardLayout,
    tile: Tile,
    pos: { x: number; y: number },
    direction: DominoLayoutDirection,
    isDouble: boolean,
    side: "left" | "right",
    prevHead: Endpoint,
    prevTail: Endpoint,
): DominoBoardLayout {
    const newTileLayout: DominoTileLayout = {
        id: tile.id,
        x: pos.x,
        y: pos.y,
        rotation: getRotation(direction, isDouble),
        isDouble,
        direction,
    };

    // Copy existing layouts + add new one
    const tileLayouts: Record<string, DominoTileLayout> = {
        ...prevLayout.tileLayouts,
        [tile.id]: newTileLayout,
    };

    // Update the endpoint that grew
    const newEndpoint: Endpoint = {
        tileId: tile.id,
        x: pos.x,
        y: pos.y,
        direction,
        isDouble,
    };

    const head = side === "right" ? newEndpoint : prevHead;
    const tail = side === "left" ? newEndpoint : prevTail;

    // Recompute bounds including new tile
    const newBBox = getTileBBox(pos.x, pos.y, isDouble, direction);
    const updatedBounds: AABB = {
        minX: Math.min(prevLayout.bounds.minX, newBBox.x - newBBox.halfW),
        maxX: Math.max(prevLayout.bounds.maxX, newBBox.x + newBBox.halfW),
        minY: Math.min(prevLayout.bounds.minY, newBBox.y - newBBox.halfH),
        maxY: Math.max(prevLayout.bounds.maxY, newBBox.y + newBBox.halfH),
    };

    // Compute ghost positions
    const ghostPositions = computeGhostPositions(
        tileLayouts,
        head,
        tail,
        updatedBounds,
        prevLayout.seed,
    );

    return {
        seed: prevLayout.seed,
        tileLayouts,
        bounds: updatedBounds,
        leftEndPos: ghostPositions.leftEndPos,
        rightEndPos: ghostPositions.rightEndPos,
        _head: head,
        _tail: tail,
    };
}

/**
 * Reconstruct an endpoint from the layout data when _head/_tail metadata is missing.
 * This happens when loading a saved layout that doesn't have the metadata.
 */
function reconstructEndpoint(
    layout: DominoBoardLayout,
    side: "left" | "right",
): Endpoint {
    // Use ghost position to infer endpoint from the nearest tile
    const ghostPos = side === "right" ? layout.rightEndPos : layout.leftEndPos;

    // Find the tile closest to the ghost position (that's the endpoint tile)
    const tiles = Object.values(layout.tileLayouts);
    if (tiles.length === 0) {
        return {
            tileId: "",
            x: 0,
            y: 0,
            direction: "RIGHT",
            isDouble: false,
        };
    }

    if (tiles.length === 1) {
        const t = tiles[0];
        return {
            tileId: t.id,
            x: t.x,
            y: t.y,
            direction: t.direction,
            isDouble: t.isDouble,
        };
    }

    // If we have ghost position, find the closest tile to it
    if (ghostPos) {
        let closest = tiles[0];
        let closestDist = Infinity;
        for (const t of tiles) {
            const dist =
                Math.abs(t.x - ghostPos.x) + Math.abs(t.y - ghostPos.y);
            if (dist < closestDist) {
                closestDist = dist;
                closest = t;
            }
        }
        return {
            tileId: closest.id,
            x: closest.x,
            y: closest.y,
            direction: closest.direction,
            isDouble: closest.isDouble,
        };
    }

    // No ghost position — pick the tile at the extremity
    let best = tiles[0];
    for (const t of tiles) {
        if (side === "right") {
            // Rightmost/bottommost tile
            if (t.x > best.x || (t.x === best.x && t.y > best.y)) {
                best = t;
            }
        } else {
            // Leftmost/topmost tile
            if (t.x < best.x || (t.x === best.x && t.y < best.y)) {
                best = t;
            }
        }
    }

    return {
        tileId: best.id,
        x: best.x,
        y: best.y,
        direction: best.direction,
        isDouble: best.isDouble,
    };
}

// ============================================================================
// Backward-compatible wrapper (drop-in replacement for old computeDominoBoardLayout)
// ============================================================================

/**
 * Drop-in replacement for the old `computeDominoBoardLayout`.
 * Supports incremental append when previousLayout has endpoint metadata,
 * otherwise computes full layout from scratch.
 *
 * @param tiles          - Ordered chain of tiles (left → right)
 * @param seed           - Deterministic seed
 * @param previousLayout - Previous layout for incremental updates
 */
export function computeDominoBoardLayout(
    tiles: Tile[],
    seed: string,
    previousLayout?: DominoBoardLayout,
): DominoBoardLayout {
    if (tiles.length === 0) {
        return {
            seed,
            tileLayouts: {},
            bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            leftEndPos: null,
            rightEndPos: null,
        };
    }

    // If no previous layout OR tile count difference > 1, compute from scratch
    const prevCount = previousLayout
        ? Object.keys(previousLayout.tileLayouts).length
        : 0;
    const newCount = tiles.length;

    if (!previousLayout || newCount - prevCount !== 1) {
        return computeFullLayout(tiles, seed);
    }

    // Incremental: exactly one new tile was added
    // Figure out which tile is new and which side it went on
    const prevIds = new Set(Object.keys(previousLayout.tileLayouts));
    const newTile = tiles.find((t) => !prevIds.has(t.id));

    if (!newTile) {
        // All tiles already in layout — no change needed
        return previousLayout;
    }

    // Determine side: if the new tile is at the start of tiles[], it's "left"; if at end, "right"
    const side: "left" | "right" =
        tiles[0].id === newTile.id ? "left" : "right";

    return appendTile(previousLayout, newTile, side);
}
