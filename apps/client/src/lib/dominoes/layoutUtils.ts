/**
 * Dominoes Layout Utilities
 *
 * Geometry engine for calculating domino tile positions on the board.
 * Uses a "snake" algorithm that auto-turns when hitting boundaries or obstacles.
 *
 * UPDATED: Fixed L-shape, pip mismatch, and overlap bugs.
 * - L-Shape Fix: calculateRotation forces horizontal tiles when moving E/W
 * - Mismatch Fix: connectsOnHead determines 0 vs 180 rotation for correct pip facing
 * - Overlap Fix: getVisualBounds uses rotated dimensions for gap calculation
 */

import { Tile, BoardState } from "@family-games/shared";

// --- CONFIGURATION ---
export const TILE_W = 60; // Visual Width (Short edge)
export const TILE_H = 120; // Visual Height (Long edge)
export const GAP = 5; // Spacing between tiles
export const BOUNDARY = 700; // When to turn

export type Direction = "N" | "E" | "S" | "W";

/**
 * Visual representation of a placed tile with coordinates and rotation.
 * Extends the base Tile type with layout information.
 */
export interface PlacedTile extends Tile {
    pips: [number, number]; // [Head, Tail] - Head connects to previous tile
    x: number;
    y: number;
    rotation: number; // Visual CSS rotation (0, 90, 180, 270)
    isDouble: boolean;
    directionEntered: Direction; // Direction snake was moving when placed
    exitDirection: Direction; // Direction snake moves AFTER this tile
}

/** For backwards compatibility */
export type VisualTile = PlacedTile;

export interface PotentialMove {
    targetTileId: string;
    ghostTile: PlacedTile;
}

// --- 1. GEOMETRY HELPERS ---

/**
 * Returns the physical size of a tile based on its visual rotation.
 * If a tile is rotated 90deg, its "Width" on screen is actually TILE_H.
 */
function getVisualBounds(rotation: number): { width: number; height: number } {
    // Normalize 270 -> 90 for size purposes
    const isHorizontal = Math.abs(rotation % 180) === 90;
    return {
        width: isHorizontal ? TILE_H : TILE_W,
        height: isHorizontal ? TILE_W : TILE_H,
    };
}

// --- 2. ROTATION CALCULATOR (The Fix for Mismatches) ---
/**
 * Calculate the rotation for a tile based on movement direction and connection.
 *
 * Base Rotation Map: Defined so that the "Head" (pips[0]) is pointing
 * BACKWARDS towards the previous tile (The Connection Point).
 *
 * @param moveDir - Direction the snake is moving
 * @param isDouble - Whether this is a double tile
 * @param connectsOnHead - True if pips[0] matches the previous tile
 */
function calculateRotation(
    moveDir: Direction,
    isDouble: boolean,
    connectsOnHead: boolean,
): number {
    if (isDouble) {
        // Doubles are perpendicular to flow direction
        // N/S Flow -> Double is Horizontal (90)
        // E/W Flow -> Double is Vertical (0)
        return moveDir === "N" || moveDir === "S" ? 90 : 0;
    }

    // Standard Tiles - rotation depends on direction and which end connects
    switch (moveDir) {
        case "S": // Growing Down - connect to Top
            return connectsOnHead ? 0 : 180;
        // If connecting on Head, Head is Top (0). If Tail, Tail is Top (180).

        case "N": // Growing Up - connect to Bottom
            return connectsOnHead ? 180 : 0;
        // If connecting on Head, Head is Bottom (180).

        case "E": // Growing Right - connect to Left
            return connectsOnHead ? 270 : 90;
        // 270 puts Head on Left. 90 puts Head on Right.

        case "W": // Growing Left - connect to Right
            return connectsOnHead ? 90 : 270;
    }
}

// --- 3. NEXT POSITION CALCULATOR (The Fix for Overlaps) ---
/**
 * Calculate the next tile position based on previous tile and movement direction.
 * Uses rotated bounds for accurate spacing.
 */
function calculateNextPosition(
    prev: PlacedTile,
    nextRot: number,
    moveDir: Direction,
): { x: number; y: number } {
    // We need the distance from Center of Prev to Center of Next
    const prevBounds = getVisualBounds(prev.rotation);
    const nextBounds = getVisualBounds(nextRot);

    let distance = 0;

    // Logic: Half the dimension of Previous + Gap + Half dimension of Next
    if (moveDir === "E" || moveDir === "W") {
        distance = prevBounds.width / 2 + GAP + nextBounds.width / 2;
    } else {
        distance = prevBounds.height / 2 + GAP + nextBounds.height / 2;
    }

    // Apply Vector
    const pos = { x: prev.x, y: prev.y };
    switch (moveDir) {
        case "N":
            pos.y -= distance;
            break;
        case "S":
            pos.y += distance;
            break;
        case "E":
            pos.x += distance;
            break;
        case "W":
            pos.x -= distance;
            break;
    }

    return pos;
}

// --- 4. COLLISION & BOUNDS DETECTION ---
function isOutOfBounds(p: { x: number; y: number }): boolean {
    return Math.abs(p.x) > BOUNDARY || Math.abs(p.y) > BOUNDARY;
}

function isColliding(
    p: { x: number; y: number },
    board: PlacedTile[],
): boolean {
    // Radius check: If centers are closer than a tile's width, it's a collision
    return board.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < TILE_W);
}

// --- 5. SMART TURN LOGIC (The Fix for the "L" shape) ---
/**
 * Determines the best direction to move next, checking for collisions/bounds.
 * Tries straight first, then turns relative to current direction.
 */
function getNextDirection(prev: PlacedTile, board: PlacedTile[]): Direction {
    const currentDir = prev.exitDirection || prev.directionEntered;

    // 1. Predict Straight Position (use dummy rotation for test)
    const dummyRot = calculateRotation(currentDir, false, true);
    const straightPos = calculateNextPosition(prev, dummyRot, currentDir);

    // 2. Check collisions/bounds for Straight
    if (!isColliding(straightPos, board) && !isOutOfBounds(straightPos)) {
        return currentDir; // Keep going straight
    }

    // 3. If Blocked, Try Turns (Relative to current direction)
    // Logic: Try turning options based on current direction
    const turns: Record<Direction, Direction[]> = {
        N: ["E", "W"],
        S: ["E", "W"],
        E: ["S", "N"],
        W: ["S", "N"],
    };

    const options = turns[currentDir];

    for (const turnDir of options) {
        const turnRot = calculateRotation(turnDir, false, true);
        const turnPos = calculateNextPosition(prev, turnRot, turnDir);

        if (!isColliding(turnPos, board) && !isOutOfBounds(turnPos)) {
            return turnDir;
        }
    }

    // If trapped, default to straight (rare edge case - game over scenario)
    return currentDir;
}

// --- Helper: Get opposite direction ---
function getOppositeDirection(d: Direction): Direction {
    switch (d) {
        case "N":
            return "S";
        case "S":
            return "N";
        case "E":
            return "W";
        case "W":
            return "E";
    }
}

// --- MAIN EXPORTED FUNCTION ---
/**
 * Calculate position for a single tile placement.
 *
 * @param prevTile - The tile to connect to (null for first tile)
 * @param rawPips - The pip values [head, tail] of the tile being placed
 * @param matchValue - The pip value that connects to prevTile
 * @param board - Current board state for collision detection
 * @returns Placed tile with calculated position
 */
export function calculatePlacement(
    prevTile: PlacedTile | null,
    rawPips: [number, number],
    matchValue: number | null,
    board: PlacedTile[],
): PlacedTile {
    const isDouble = rawPips[0] === rawPips[1];

    // 1. ROOT TILE
    if (!prevTile) {
        return {
            id: "root",
            left: rawPips[0],
            right: rawPips[1],
            pips: rawPips,
            x: 0,
            y: 0,
            rotation: isDouble ? 90 : 0, // Root double horizontal
            isDouble,
            directionEntered: "S",
            exitDirection: "S",
        };
    }

    // 2. DETERMINE DIRECTION
    const moveDir = getNextDirection(prevTile, board);

    // 3. ORIENTATION (Heads vs Tails)
    // We need to know: Does pips[0] match, or pips[1]?
    const connectsOnHead = rawPips[0] === matchValue;

    // 4. CALCULATE ROTATION
    const rotation = calculateRotation(moveDir, isDouble, connectsOnHead);

    // 5. CALCULATE POSITION
    const { x, y } = calculateNextPosition(prevTile, rotation, moveDir);

    return {
        id: Math.random().toString(36).substr(2, 9),
        left: rawPips[0],
        right: rawPips[1],
        pips: rawPips, // Store RAW pips. Rotation handles the visual flip.
        x,
        y,
        rotation,
        isDouble,
        directionEntered: moveDir,
        exitDirection: moveDir, // Default, will be overridden by next move logic if needed
    };
}

/**
 * Convert backend BoardState to visual tiles with positions.
 * This is the main "translation" function.
 *
 * @param board - The board state from the server
 * @returns Array of placed tiles with x/y coordinates
 */
export function boardStateToVisualTiles(board: BoardState): PlacedTile[] {
    if (board.tiles.length === 0) return [];

    const result: PlacedTile[] = [];

    for (let i = 0; i < board.tiles.length; i++) {
        const tile = board.tiles[i];
        const prev = result[result.length - 1] ?? null;

        // Determine the connecting value (outer pip of previous tile)
        let matchValue: number | null = null;
        if (prev) {
            matchValue = getOuterPip(prev);
        }

        const rawPips: [number, number] = [tile.left, tile.right];
        const placed = calculatePlacement(prev, rawPips, matchValue, result);

        // Preserve the original tile id if available
        placed.id = tile.id;

        result.push(placed);
    }

    return result;
}

/**
 * Get the outer (non-connecting) pip value of a placed tile.
 * For doubles, both sides are the same so we just return pips[1].
 */
function getOuterPip(tile: PlacedTile): number {
    if (tile.isDouble) return tile.pips[0];
    // The outer pip is pips[1] (tail) - the end not used to connect
    return tile.pips[1];
}

/**
 * Get valid placement options for a tile in hand.
 *
 * @param tileInHand - The pip values of the tile in hand
 * @param openEnds - The open ends of the board with their values
 * @param boardState - Current placed tiles for collision detection
 * @returns Array of potential moves with ghost tiles
 */
export function getValidPlacements(
    tileInHand: [number, number],
    openEnds: { tile: PlacedTile; value: number }[],
    boardState: PlacedTile[],
): PotentialMove[] {
    const moves: PotentialMove[] = [];

    openEnds.forEach((end) => {
        // Check if tile can match this end
        if (tileInHand.includes(end.value)) {
            const placement = calculatePlacement(
                end.tile,
                tileInHand,
                end.value,
                boardState,
            );
            moves.push({
                targetTileId: end.tile.id,
                ghostTile: { ...placement, id: "ghost-" + end.tile.id },
            });
        }
    });

    return moves;
}

/**
 * Generate ghost tiles showing valid placement spots.
 * Legacy wrapper around getValidPlacements for backwards compatibility.
 *
 * @param selectedTile - The tile the player wants to place
 * @param board - Current board state from server
 * @param visualTiles - Pre-calculated visual tiles
 * @param canPlaceLeft - Whether tile can be placed on left end
 * @param canPlaceRight - Whether tile can be placed on right end
 * @returns Ghost tiles for left and/or right ends
 */
export function getGhostTiles(
    selectedTile: Tile,
    board: BoardState,
    visualTiles: PlacedTile[],
    canPlaceLeft: boolean,
    canPlaceRight: boolean,
): { left?: PlacedTile; right?: PlacedTile } {
    const result: { left?: PlacedTile; right?: PlacedTile } = {};
    const tileInHand: [number, number] = [
        selectedTile.left,
        selectedTile.right,
    ];

    if (visualTiles.length === 0) {
        // First tile - show ghost at center
        if (canPlaceLeft || canPlaceRight) {
            result.left = calculatePlacement(null, tileInHand, null, []);
            result.left.id = "ghost-left";
        }
        return result;
    }

    // Find the visual tiles at each end
    const firstVisualTile = visualTiles[0];
    const lastVisualTile = visualTiles[visualTiles.length - 1];

    // Ghost for LEFT end
    if (canPlaceLeft && board.leftEnd) {
        const leftDir = getOppositeDirection(firstVisualTile.directionEntered);
        const leftGhost = calculateGhostAtEnd(
            firstVisualTile,
            tileInHand,
            board.leftEnd.value,
            visualTiles,
            leftDir,
        );
        result.left = { ...leftGhost, id: "ghost-left" };
    }

    // Ghost for RIGHT end
    if (canPlaceRight && board.rightEnd) {
        const rightGhost = calculatePlacement(
            lastVisualTile,
            tileInHand,
            board.rightEnd.value,
            visualTiles,
        );
        result.right = { ...rightGhost, id: "ghost-right" };
    }

    return result;
}

/**
 * Calculate ghost position at the left end of the chain.
 */
function calculateGhostAtEnd(
    endTile: PlacedTile,
    rawPips: [number, number],
    connectingValue: number,
    board: PlacedTile[],
    dir: Direction,
): PlacedTile {
    const isDouble = rawPips[0] === rawPips[1];
    const connectsOnHead = rawPips[0] === connectingValue;
    const rot = calculateRotation(dir, isDouble, connectsOnHead);

    // Use proper dimension calculations
    const prevBounds = getVisualBounds(endTile.rotation);
    const nextBounds = getVisualBounds(rot);

    let distance = 0;
    if (dir === "E" || dir === "W") {
        distance = prevBounds.width / 2 + GAP + nextBounds.width / 2;
    } else {
        distance = prevBounds.height / 2 + GAP + nextBounds.height / 2;
    }

    const pos = { x: endTile.x, y: endTile.y };
    switch (dir) {
        case "N":
            pos.y -= distance;
            break;
        case "S":
            pos.y += distance;
            break;
        case "E":
            pos.x += distance;
            break;
        case "W":
            pos.x -= distance;
            break;
    }

    return {
        id: "ghost",
        left: rawPips[0],
        right: rawPips[1],
        pips: rawPips,
        x: pos.x,
        y: pos.y,
        rotation: rot,
        isDouble,
        directionEntered: dir,
        exitDirection: dir,
    };
}

/**
 * Calculate the bounding box of all tiles for viewport calculations.
 */
export function getBoundingBox(tiles: PlacedTile[]): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
} {
    if (tiles.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    }

    const xs = tiles.map((t) => t.x);
    const ys = tiles.map((t) => t.y);

    const minX = Math.min(...xs) - TILE_H;
    const maxX = Math.max(...xs) + TILE_H;
    const minY = Math.min(...ys) - TILE_H;
    const maxY = Math.max(...ys) + TILE_H;

    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}
