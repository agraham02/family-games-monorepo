/**
 * Dominoes Layout Utilities
 *
 * Geometry engine for calculating domino tile positions on the board.
 * Uses a "snake" algorithm that auto-turns when hitting boundaries or obstacles.
 */

import { Tile, BoardState } from "@family-games/shared";

// --- Constants ---
export const TILE_W = 50; // Width of a vertical tile
export const TILE_H = 100; // Height of a vertical tile
export const GAP = 4; // Visual gap between connected tiles
export const BOUNDARY_LIMIT = 600; // Trigger turn if x/y exceeds this (pixels)

export type Direction = "N" | "E" | "S" | "W";

/**
 * Visual representation of a placed tile with coordinates and rotation.
 * Extends the base Tile type with layout information.
 */
export interface VisualTile extends Tile {
    x: number;
    y: number;
    rotation: number; // 0, 90, 180, 270
    isDouble: boolean;
    directionEntered: Direction;
}

// --- Helper: Get Dimensions based on rotation ---
function getSize(rot: number, axis: "x" | "y"): number {
    const r = rot % 180;
    if (axis === "x") return r === 90 ? TILE_H : TILE_W;
    return r === 90 ? TILE_W : TILE_H;
}

// --- Helper: Axis lookup ---
function getAxis(d: Direction): "x" | "y" {
    return d === "E" || d === "W" ? "x" : "y";
}

// --- Helper: Vector Math ---
function applyVector(
    p: { x: number; y: number },
    d: Direction,
    dist: number,
): { x: number; y: number } {
    switch (d) {
        case "N":
            return { x: p.x, y: p.y - dist };
        case "S":
            return { x: p.x, y: p.y + dist };
        case "E":
            return { x: p.x + dist, y: p.y };
        case "W":
            return { x: p.x - dist, y: p.y };
    }
}

// --- Helper: Rotation Logic ---
function getFlowRotation(dir: Direction, isDouble: boolean): number {
    // 0=Vert, 90=Horiz.
    // Doubles are placed perpendicular to the chain
    if (isDouble) return dir === "E" || dir === "W" ? 0 : 90;

    switch (dir) {
        case "N":
            return 180; // Connector on Bottom
        case "S":
            return 0; // Connector on Top
        case "E":
            return 270; // Connector on Left
        case "W":
            return 90; // Connector on Right
    }
    return 0;
}

// --- Core: Collision Detection ---
function shouldTurn(p: { x: number; y: number }, board: VisualTile[]): boolean {
    // 1. Soft Boundary
    if (Math.abs(p.x) > BOUNDARY_LIMIT || Math.abs(p.y) > BOUNDARY_LIMIT) {
        return true;
    }
    // 2. Collision (Check radius around center)
    return board.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < TILE_W * 1.5);
}

// --- Core: Snake Strategy ---
function pickTurnDirection(prev: VisualTile): Direction {
    const { directionEntered: d } = prev;
    // Standard "Wind" logic
    if (d === "E" || d === "W") return "S"; // Try South first
    if (d === "S") return prev.x > 0 ? "W" : "E"; // Wind inwards
    return "E";
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

/**
 * Calculate position for a single tile placement.
 *
 * @param prevTile - The tile to connect to (null for first tile)
 * @param tile - The tile being placed
 * @param connectingValue - The pip value that connects to prevTile
 * @param board - Current board state for collision detection
 * @returns Visual tile with calculated position
 */
export function calculatePlacement(
    prevTile: VisualTile | null,
    tile: Tile,
    connectingValue: number | null,
    board: VisualTile[],
): VisualTile {
    const isDouble = tile.left === tile.right;

    // Determine which end connects (for orientation)
    // If left matches the connecting value, left is the connector
    // Otherwise right is the connector
    const leftConnects =
        connectingValue === null || tile.left === connectingValue;

    // 1. Root Tile (first tile on board)
    if (!prevTile) {
        return {
            ...tile,
            x: 0,
            y: 0,
            rotation: isDouble ? 90 : 0,
            isDouble,
            directionEntered: "S", // First tile "entered" from north, exits south
        };
    }

    // 2. Project Next Position (Straight line from previous)
    let dir = prevTile.directionEntered;
    let rot = getFlowRotation(dir, isDouble);

    // Distance = Half(Prev) + Gap + Half(Current)
    let dist =
        getSize(prevTile.rotation, getAxis(dir)) / 2 +
        GAP +
        getSize(rot, getAxis(dir)) / 2;
    let pos = applyVector({ x: prevTile.x, y: prevTile.y }, dir, dist);

    // 3. Handle Collision/Turn
    if (shouldTurn(pos, board)) {
        dir = pickTurnDirection(prevTile);
        rot = getFlowRotation(dir, isDouble);
        // Recalc distance/pos for new direction
        dist =
            getSize(prevTile.rotation, getAxis(dir)) / 2 +
            GAP +
            getSize(rot, getAxis(dir)) / 2;
        pos = applyVector({ x: prevTile.x, y: prevTile.y }, dir, dist);
    }

    return {
        ...tile,
        x: pos.x,
        y: pos.y,
        rotation: rot,
        isDouble,
        directionEntered: dir,
    };
}

/**
 * Convert backend BoardState to visual tiles with positions.
 * This is the main "translation" function.
 *
 * @param board - The board state from the server
 * @returns Array of visual tiles with x/y coordinates
 */
export function boardStateToVisualTiles(board: BoardState): VisualTile[] {
    if (board.tiles.length === 0) return [];

    const result: VisualTile[] = [];

    for (let i = 0; i < board.tiles.length; i++) {
        const tile = board.tiles[i];
        const prev = result[result.length - 1] ?? null;

        // Determine the connecting value (outer pip of previous tile)
        let matchValue: number | null = null;
        if (prev) {
            // The connecting value is the "outer" end of the previous tile
            // For the visual layout, we track this based on how tiles connect
            // The board.tiles array is in placement order, so we can derive this
            matchValue = prev.isDouble ? prev.left : getOuterPip(prev);
        }

        const placed = calculatePlacement(prev, tile, matchValue, result);
        result.push(placed);
    }

    return result;
}

/**
 * Get the outer (non-connecting) pip value of a visual tile.
 * For doubles, both sides are the same so we just return left.
 */
function getOuterPip(tile: VisualTile): number {
    if (tile.isDouble) return tile.left;

    // Based on rotation, determine which pip is "outer"
    // This is simplified - in practice the board tracks this
    // For now, use right as the outer pip (tiles connect left-to-right in array)
    return tile.right;
}

/**
 * Generate ghost tiles showing valid placement spots.
 *
 * @param selectedTile - The tile the player wants to place
 * @param board - Current board state
 * @param visualTiles - Pre-calculated visual tiles
 * @returns Ghost tiles for left and/or right ends
 */
export function getGhostTiles(
    selectedTile: Tile,
    board: BoardState,
    visualTiles: VisualTile[],
    canPlaceLeft: boolean,
    canPlaceRight: boolean,
): { left?: VisualTile; right?: VisualTile } {
    const result: { left?: VisualTile; right?: VisualTile } = {};

    if (visualTiles.length === 0) {
        // First tile - show ghost at center
        if (canPlaceLeft || canPlaceRight) {
            result.left = calculatePlacement(null, selectedTile, null, []);
        }
        return result;
    }

    // Find the visual tiles at each end
    const firstVisualTile = visualTiles[0];
    const lastVisualTile = visualTiles[visualTiles.length - 1];

    // Ghost for LEFT end
    if (canPlaceLeft && board.leftEnd) {
        // Create a "virtual" previous tile that represents connecting to the left end
        // The ghost extends in the opposite direction of how the first tile entered
        const leftDir = getOppositeDirection(firstVisualTile.directionEntered);
        const leftGhost = calculateGhostAtEnd(
            firstVisualTile,
            selectedTile,
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
            selectedTile,
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
    endTile: VisualTile,
    newTile: Tile,
    connectingValue: number,
    board: VisualTile[],
    dir: Direction,
): VisualTile {
    const isDouble = newTile.left === newTile.right;
    const rot = getFlowRotation(dir, isDouble);

    const dist =
        getSize(endTile.rotation, getAxis(dir)) / 2 +
        GAP +
        getSize(rot, getAxis(dir)) / 2;
    const pos = applyVector({ x: endTile.x, y: endTile.y }, dir, dist);

    return {
        ...newTile,
        x: pos.x,
        y: pos.y,
        rotation: rot,
        isDouble,
        directionEntered: dir,
    };
}

/**
 * Calculate the bounding box of all tiles for viewport calculations.
 */
export function getBoundingBox(tiles: VisualTile[]): {
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
