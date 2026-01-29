/**
 * Path computation module for the domino layout engine.
 * Handles axis-aligned segment construction, boundary detection, and turn logic.
 */

import type {
    Direction,
    Rotation,
    Point,
    PlacedDomino,
    LayoutConfig,
    BoundingBox,
    ChainEnd,
} from "./types";

// =============================================================================
// Direction Utilities
// =============================================================================

/** Get the opposite direction */
export function oppositeDirection(dir: Direction): Direction {
    const opposites: Record<Direction, Direction> = {
        N: "S",
        S: "N",
        E: "W",
        W: "E",
    };
    return opposites[dir];
}

/** Get direction vector as unit point */
export function directionVector(dir: Direction): Point {
    const vectors: Record<Direction, Point> = {
        N: { x: 0, y: -1 },
        S: { x: 0, y: 1 },
        E: { x: 1, y: 0 },
        W: { x: -1, y: 0 },
    };
    return vectors[dir];
}

/** Check if direction is vertical */
export function isVertical(dir: Direction): boolean {
    return dir === "N" || dir === "S";
}

/** Check if direction is horizontal */
export function isHorizontal(dir: Direction): boolean {
    return dir === "E" || dir === "W";
}

/** Turn right (clockwise) */
export function turnRight(dir: Direction): Direction {
    const turns: Record<Direction, Direction> = {
        N: "E",
        E: "S",
        S: "W",
        W: "N",
    };
    return turns[dir];
}

/** Turn left (counter-clockwise) */
export function turnLeft(dir: Direction): Direction {
    const turns: Record<Direction, Direction> = {
        N: "W",
        W: "S",
        S: "E",
        E: "N",
    };
    return turns[dir];
}

// =============================================================================
// Rotation Utilities
// =============================================================================

/**
 * Get rotation for a tile based on its exit direction and whether it's a double.
 *
 * Standard tiles: long axis aligns with direction of travel
 * - N/S movement: rotation = 0 (vertical)
 * - E/W movement: rotation = 90 (horizontal)
 *
 * Double tiles: perpendicular to direction of travel
 * - N/S movement: rotation = 90 (horizontal)
 * - E/W movement: rotation = 0 (vertical)
 */
export function getRotation(
    exitDirection: Direction,
    isDouble: boolean,
): Rotation {
    const isVert = isVertical(exitDirection);

    if (isDouble) {
        return isVert ? 90 : 0;
    }
    return isVert ? 0 : 90;
}

// =============================================================================
// Position Computation
// =============================================================================

/**
 * Compute the dimensions a tile occupies in world space based on rotation.
 */
export function getTileWorldSize(
    config: LayoutConfig,
    isDouble: boolean,
    exitDirection: Direction,
): { width: number; height: number } {
    const rotation = getRotation(exitDirection, isDouble);
    const isRotated = rotation === 90 || rotation === 270;

    return {
        width: isRotated ? config.tileHeight : config.tileWidth,
        height: isRotated ? config.tileWidth : config.tileHeight,
    };
}

/**
 * Compute the offset from previous tile center to new tile center.
 * Accounts for tile sizes, doubles, and gap.
 */
export function computeOffset(
    config: LayoutConfig,
    prevIsDouble: boolean,
    nextIsDouble: boolean,
    direction: Direction,
): Point {
    const vec = directionVector(direction);

    // Half of previous tile's dimension in direction of travel
    const prevSize = getTileWorldSize(config, prevIsDouble, direction);
    const prevHalf = isVertical(direction)
        ? prevSize.height / 2
        : prevSize.width / 2;

    // Half of next tile's dimension in direction of travel
    const nextSize = getTileWorldSize(config, nextIsDouble, direction);
    const nextHalf = isVertical(direction)
        ? nextSize.height / 2
        : nextSize.width / 2;

    const distance = prevHalf + config.gap + nextHalf;

    return {
        x: vec.x * distance,
        y: vec.y * distance,
    };
}

/**
 * Compute position for the next tile in the chain.
 */
export function computeNextPosition(
    prevPosition: Point,
    config: LayoutConfig,
    prevIsDouble: boolean,
    nextIsDouble: boolean,
    direction: Direction,
): Point {
    const offset = computeOffset(config, prevIsDouble, nextIsDouble, direction);
    return {
        x: prevPosition.x + offset.x,
        y: prevPosition.y + offset.y,
    };
}

// =============================================================================
// Boundary Detection
// =============================================================================

/**
 * Check if a position would exceed the boundary distance from origin.
 * Uses center-based bounds since chain grows from center.
 */
export function wouldExceedBoundary(
    position: Point,
    config: LayoutConfig,
    direction: Direction,
    isDouble: boolean,
): boolean {
    const size = getTileWorldSize(config, isDouble, direction);
    const halfExtent = isVertical(direction) ? size.height / 2 : size.width / 2;

    const vec = directionVector(direction);
    const edgePos = isVertical(direction)
        ? Math.abs(position.y + vec.y * halfExtent)
        : Math.abs(position.x + vec.x * halfExtent);

    return edgePos > config.boundaryDistance;
}

/**
 * Determine if we should turn before placing the next tile.
 * Boundary-reactive: only turn when we would exceed bounds.
 */
export function shouldTurn(
    prevPosition: Point,
    config: LayoutConfig,
    prevIsDouble: boolean,
    nextIsDouble: boolean,
    currentDirection: Direction,
    placedTiles: readonly PlacedDomino[],
): boolean {
    // Compute where the next tile would be if we continue straight
    const nextPos = computeNextPosition(
        prevPosition,
        config,
        prevIsDouble,
        nextIsDouble,
        currentDirection,
    );

    // Check if it would exceed boundary
    if (wouldExceedBoundary(nextPos, config, currentDirection, nextIsDouble)) {
        return true;
    }

    // Check for collision with existing tiles
    if (
        wouldCollide(
            nextPos,
            config,
            nextIsDouble,
            currentDirection,
            placedTiles,
        )
    ) {
        return true;
    }

    return false;
}

// =============================================================================
// Collision Detection
// =============================================================================

/**
 * Check if a tile at the given position would collide with existing tiles.
 * Uses simple bounding box overlap check.
 */
export function wouldCollide(
    position: Point,
    config: LayoutConfig,
    isDouble: boolean,
    direction: Direction,
    placedTiles: readonly PlacedDomino[],
): boolean {
    const newSize = getTileWorldSize(config, isDouble, direction);
    const newBounds = {
        minX: position.x - newSize.width / 2,
        maxX: position.x + newSize.width / 2,
        minY: position.y - newSize.height / 2,
        maxY: position.y + newSize.height / 2,
    };

    // Add small margin for gap
    const margin = config.gap / 2;

    for (const tile of placedTiles) {
        const tileSize = getTileWorldSize(
            config,
            tile.isDouble,
            tile.exitDirection,
        );
        const tileBounds = {
            minX: tile.position.x - tileSize.width / 2 - margin,
            maxX: tile.position.x + tileSize.width / 2 + margin,
            minY: tile.position.y - tileSize.height / 2 - margin,
            maxY: tile.position.y + tileSize.height / 2 + margin,
        };

        // Check overlap
        if (
            newBounds.minX < tileBounds.maxX &&
            newBounds.maxX > tileBounds.minX &&
            newBounds.minY < tileBounds.maxY &&
            newBounds.maxY > tileBounds.minY
        ) {
            return true;
        }
    }

    return false;
}

// =============================================================================
// Turn Direction Selection
// =============================================================================

/**
 * Determine the best direction to turn.
 * Prefers turning toward the side with more available space.
 */
export function selectTurnDirection(
    position: Point,
    config: LayoutConfig,
    currentDirection: Direction,
    nextIsDouble: boolean,
    placedTiles: readonly PlacedDomino[],
    chainEnd: ChainEnd,
): Direction {
    // Try right turn first for head, left for tail (creates symmetric snake)
    const preferredFirst = chainEnd === "head" ? turnRight : turnLeft;
    const preferredSecond = chainEnd === "head" ? turnLeft : turnRight;

    const firstOption = preferredFirst(currentDirection);
    const secondOption = preferredSecond(currentDirection);

    // Check if first option is valid
    const firstPos = computeNextPosition(
        position,
        config,
        false, // We don't know prev double status here, assume false
        nextIsDouble,
        firstOption,
    );

    if (
        !wouldExceedBoundary(firstPos, config, firstOption, nextIsDouble) &&
        !wouldCollide(firstPos, config, nextIsDouble, firstOption, placedTiles)
    ) {
        return firstOption;
    }

    // Try second option
    const secondPos = computeNextPosition(
        position,
        config,
        false,
        nextIsDouble,
        secondOption,
    );

    if (
        !wouldExceedBoundary(secondPos, config, secondOption, nextIsDouble) &&
        !wouldCollide(
            secondPos,
            config,
            nextIsDouble,
            secondOption,
            placedTiles,
        )
    ) {
        return secondOption;
    }

    // Fallback to first option even if it collides
    return firstOption;
}

// =============================================================================
// Bounding Box Computation
// =============================================================================

/**
 * Compute the bounding box of all placed tiles.
 */
export function computeBoundingBox(
    tiles: readonly PlacedDomino[],
    config: LayoutConfig,
): BoundingBox {
    if (tiles.length === 0) {
        // Small initial bounds centered at origin - just enough for first tile
        const initialSize = config.tileHeight + config.padding * 2;
        return {
            minX: -initialSize / 2,
            minY: -initialSize / 2,
            maxX: initialSize / 2,
            maxY: initialSize / 2,
        };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const tile of tiles) {
        const size = getTileWorldSize(
            config,
            tile.isDouble,
            tile.exitDirection,
        );
        const halfW = size.width / 2;
        const halfH = size.height / 2;

        minX = Math.min(minX, tile.position.x - halfW);
        maxX = Math.max(maxX, tile.position.x + halfW);
        minY = Math.min(minY, tile.position.y - halfH);
        maxY = Math.max(maxY, tile.position.y + halfH);
    }

    // Add padding
    const padding = config.padding;
    return {
        minX: minX - padding,
        minY: minY - padding,
        maxX: maxX + padding,
        maxY: maxY + padding,
    };
}
