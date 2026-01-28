/**
 * Tile Layout Calculation Utilities for Dominoes Dynamic Board
 *
 * SIMPLIFIED APPROACH - No CSS rotation! The Tile component handles orientation internally.
 *
 * Mental Model:
 * - A domino tile has a LONG side and a SHORT side (2:1 ratio)
 * - In a horizontal chain: tiles are laid FLAT (long side horizontal)
 * - Doubles are always perpendicular to the chain direction
 *
 * Coordinate System:
 * - Origin (0,0) is at center of first tile
 * - X increases to the right
 * - Y increases downward
 * - Tiles are positioned by their CENTER point
 */

import { Tile } from "@shared/types";

// ============================================================================
// Types
// ============================================================================

/** Direction the chain is currently extending */
export type ChainDirection = "right" | "down" | "left" | "up";

/** How a tile is oriented on the board */
export type TileOrientation = "horizontal" | "vertical";

/** A tile with calculated position */
export interface PositionedTile {
    tile: Tile;
    /** X position of tile center in pixels */
    x: number;
    /** Y position of tile center in pixels */
    y: number;
    /** Whether the tile is laid horizontally (long side along X axis) */
    isHorizontal: boolean;
    /** Whether this is a double tile */
    isDouble: boolean;
    /** Which end of the chain this tile is on */
    chainEnd: "left" | "right" | "middle";
    /** Visual width of tile in its current orientation */
    visualWidth: number;
    /** Visual height of tile in its current orientation */
    visualHeight: number;
}

/** Configuration for tile sizing */
export interface TileSizeConfig {
    /** Long dimension of a tile (when laid flat, this is the width) */
    longSide: number;
    /** Short dimension of a tile (when laid flat, this is the height) */
    shortSide: number;
    /** Gap between tiles */
    gap: number;
}

/** Result of layout calculation */
export interface BoardLayout {
    tiles: PositionedTile[];
    bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        width: number;
        height: number;
    };
    leftEndPosition: { x: number; y: number; isHorizontal: boolean } | null;
    rightEndPosition: { x: number; y: number; isHorizontal: boolean } | null;
    leftEndDirection: ChainDirection;
    rightEndDirection: ChainDirection;
}

/** Transform values for centering the board */
export interface CenteringTransform {
    x: number;
    y: number;
    scale: number;
}

/** Standard tile size presets - dimensions when tile is laid FLAT (horizontal) */
export const TILE_SIZE_PRESETS: Record<string, TileSizeConfig> = {
    xs: { longSide: 40, shortSide: 20, gap: 2 },
    sm: { longSide: 56, shortSide: 28, gap: 3 },
    md: { longSide: 80, shortSide: 40, gap: 4 },
    lg: { longSide: 112, shortSide: 56, gap: 5 },
};

// ============================================================================
// Helper Functions
// ============================================================================

/** Check if direction is horizontal (left or right) */
function isDirectionHorizontal(dir: ChainDirection): boolean {
    return dir === "left" || dir === "right";
}

/**
 * Get tile dimensions based on chain direction and whether it's a double.
 *
 * Regular tiles: aligned with chain (long side along chain)
 * Doubles: perpendicular to chain (short side along chain)
 */
function getTileDimensions(
    isDouble: boolean,
    chainDirection: ChainDirection,
    config: TileSizeConfig,
): { width: number; height: number; isHorizontal: boolean } {
    const horizontal = isDirectionHorizontal(chainDirection);

    if (isDouble) {
        // Doubles are PERPENDICULAR to chain direction
        // If chain is horizontal, double stands vertical (and vice versa)
        return {
            width: horizontal ? config.shortSide : config.longSide,
            height: horizontal ? config.longSide : config.shortSide,
            isHorizontal: !horizontal,
        };
    } else {
        // Regular tiles ALIGN with chain direction
        // If chain is horizontal, tile is laid flat
        return {
            width: horizontal ? config.longSide : config.shortSide,
            height: horizontal ? config.shortSide : config.longSide,
            isHorizontal: horizontal,
        };
    }
}

/** Get direction vector for a chain direction */
function getDirectionVector(dir: ChainDirection): { dx: number; dy: number } {
    switch (dir) {
        case "right":
            return { dx: 1, dy: 0 };
        case "left":
            return { dx: -1, dy: 0 };
        case "down":
            return { dx: 0, dy: 1 };
        case "up":
            return { dx: 0, dy: -1 };
    }
}

/** Get opposite direction */
function getOppositeDirection(dir: ChainDirection): ChainDirection {
    switch (dir) {
        case "right":
            return "left";
        case "left":
            return "right";
        case "down":
            return "up";
        case "up":
            return "down";
    }
}

/**
 * Get turn direction for serpentine pattern.
 * Pattern: right → down → left → down → right → down → left...
 */
function getTurnDirection(
    current: ChainDirection,
    turnCount: number,
): ChainDirection {
    if (current === "right" || current === "left") {
        // Horizontal chains always turn down
        return "down";
    }
    // Vertical chains alternate between left and right
    return turnCount % 2 === 0 ? "left" : "right";
}

// ============================================================================
// Main Layout Function
// ============================================================================

/**
 * Calculate positions for all tiles on the board with serpentine snaking.
 */
export function calculateTilePositions(
    tiles: Tile[],
    config: TileSizeConfig,
    containerWidth: number,
    containerHeight: number,
    enableSnaking: boolean = true,
): BoardLayout {
    // Handle empty case
    if (tiles.length === 0) {
        return {
            tiles: [],
            bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
            leftEndPosition: null,
            rightEndPosition: null,
            leftEndDirection: "right",
            rightEndDirection: "right",
        };
    }

    const { gap } = config;
    const padding = 20;

    // Usable half-dimensions from center
    const halfWidth = Math.max(0, (containerWidth - padding * 2) / 2);
    const halfHeight = Math.max(0, (containerHeight - padding * 2) / 2);

    const positioned: PositionedTile[] = [];
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    // Start at origin, going right
    let x = 0;
    let y = 0;
    let direction: ChainDirection = "right";
    let turnCount = 0;
    const startDirection = direction;

    for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const isDouble = tile.left === tile.right;
        const isFirst = i === 0;
        const isLast = i === tiles.length - 1;

        // Get dimensions based on current direction
        const dims = getTileDimensions(isDouble, direction, config);

        // Place tile at current position
        positioned.push({
            tile,
            x,
            y,
            isHorizontal: dims.isHorizontal,
            isDouble,
            chainEnd: isFirst ? "left" : isLast ? "right" : "middle",
            visualWidth: dims.width,
            visualHeight: dims.height,
        });

        // Update bounds
        minX = Math.min(minX, x - dims.width / 2);
        minY = Math.min(minY, y - dims.height / 2);
        maxX = Math.max(maxX, x + dims.width / 2);
        maxY = Math.max(maxY, y + dims.height / 2);

        // Calculate next position if not last tile
        if (!isLast) {
            const nextTile = tiles[i + 1];
            const nextIsDouble = nextTile.left === nextTile.right;

            // Get dimension of current tile along chain direction
            const currentAlongChain = isDirectionHorizontal(direction)
                ? dims.width
                : dims.height;

            // Get dimension of next tile along chain direction (before any turn)
            const nextDims = getTileDimensions(nextIsDouble, direction, config);
            const nextAlongChain = isDirectionHorizontal(direction)
                ? nextDims.width
                : nextDims.height;

            // Calculate step to next tile center
            const stepSize = currentAlongChain / 2 + gap + nextAlongChain / 2;
            const { dx, dy } = getDirectionVector(direction);
            let nextX = x + dx * stepSize;
            let nextY = y + dy * stepSize;

            // Check if we need to turn (snaking)
            if (enableSnaking && halfWidth > 0 && halfHeight > 0) {
                // Check if next tile would exceed bounds
                const wouldExceedRight =
                    direction === "right" &&
                    nextX + nextDims.width / 2 > halfWidth;
                const wouldExceedLeft =
                    direction === "left" &&
                    nextX - nextDims.width / 2 < -halfWidth;
                const wouldExceedDown =
                    direction === "down" &&
                    nextY + nextDims.height / 2 > halfHeight;

                const needsTurn =
                    wouldExceedRight || wouldExceedLeft || wouldExceedDown;

                if (needsTurn) {
                    // Turn to new direction
                    const prevDirection = direction;
                    const prevHorizontal = isDirectionHorizontal(prevDirection);
                    direction = getTurnDirection(prevDirection, turnCount);
                    if (prevHorizontal) turnCount++;

                    // Recalculate next tile dimensions for new direction
                    const turnedNextDims = getTileDimensions(
                        nextIsDouble,
                        direction,
                        config,
                    );

                    // Step from current tile's edge perpendicular to old direction
                    // to next tile's center in new direction
                    const currentPerpendicularEdge = prevHorizontal
                        ? dims.height / 2 // Was horizontal, stepping vertically
                        : dims.width / 2; // Was vertical, stepping horizontally

                    // Next tile's extent along the NEW direction
                    const nextNewAlongChain = isDirectionHorizontal(direction)
                        ? turnedNextDims.width
                        : turnedNextDims.height;

                    const turnStepSize =
                        currentPerpendicularEdge + gap + nextNewAlongChain / 2;
                    const { dx: tdx, dy: tdy } = getDirectionVector(direction);
                    nextX = x + tdx * turnStepSize;
                    nextY = y + tdy * turnStepSize;
                }
            }

            x = nextX;
            y = nextY;
        }
    }

    // Calculate bounds
    const bounds = {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };

    // Calculate ghost positions
    const first = positioned[0];
    const last = positioned[positioned.length - 1];

    const leftEndPosition = first
        ? calculateGhostPosition(first, startDirection, config, "left")
        : null;
    const rightEndPosition = last
        ? calculateGhostPosition(last, direction, config, "right")
        : null;

    return {
        tiles: positioned,
        bounds,
        leftEndPosition,
        rightEndPosition,
        leftEndDirection: getOppositeDirection(startDirection),
        rightEndDirection: direction,
    };
}

/**
 * Calculate ghost tile position at an end of the chain.
 */
function calculateGhostPosition(
    endTile: PositionedTile,
    chainDirection: ChainDirection,
    config: TileSizeConfig,
    end: "left" | "right",
): { x: number; y: number; isHorizontal: boolean } {
    // Ghost is a regular tile (assume not double for positioning)
    const ghostDims = getTileDimensions(false, chainDirection, config);

    // Calculate step from end tile to ghost
    const endAlongChain = isDirectionHorizontal(chainDirection)
        ? endTile.visualWidth
        : endTile.visualHeight;
    const ghostAlongChain = isDirectionHorizontal(chainDirection)
        ? ghostDims.width
        : ghostDims.height;

    const stepSize = endAlongChain / 2 + config.gap + ghostAlongChain / 2;

    // Direction to step (away from chain for "right" end, into chain for "left" end)
    const stepDirection =
        end === "right" ? chainDirection : getOppositeDirection(chainDirection);
    const { dx, dy } = getDirectionVector(stepDirection);

    return {
        x: endTile.x + dx * stepSize,
        y: endTile.y + dy * stepSize,
        isHorizontal: ghostDims.isHorizontal,
    };
}

/**
 * Calculate transform to center the board in its container.
 */
export function calculateCenteringTransform(
    bounds: BoardLayout["bounds"],
    containerWidth: number,
    containerHeight: number,
): CenteringTransform {
    if (bounds.width === 0 || bounds.height === 0) {
        return { x: containerWidth / 2, y: containerHeight / 2, scale: 1 };
    }

    const padding = 40;
    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - padding;

    // Calculate scale to fit
    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    const scale = Math.min(1, scaleX, scaleY);

    // Calculate center offset
    const boardCenterX = (bounds.minX + bounds.maxX) / 2;
    const boardCenterY = (bounds.minY + bounds.maxY) / 2;

    // Translation to center the board
    const x = containerWidth / 2 - boardCenterX * scale;
    const y = containerHeight / 2 - boardCenterY * scale;

    return { x, y, scale };
}

/**
 * Calculate ghost tile positions for placement previews.
 */
export function calculateGhostPositions(
    selectedTile: Tile | null,
    layout: BoardLayout,
    canPlaceLeft: boolean,
    canPlaceRight: boolean,
    config: TileSizeConfig,
): { left: PositionedTile | null; right: PositionedTile | null } {
    if (!selectedTile) {
        return { left: null, right: null };
    }

    const isDouble = selectedTile.left === selectedTile.right;

    // Left ghost
    let leftGhost: PositionedTile | null = null;
    if (canPlaceLeft && layout.leftEndPosition) {
        const pos = layout.leftEndPosition;
        const leftDir = layout.leftEndDirection;
        const dims = getTileDimensions(isDouble, leftDir, config);
        leftGhost = {
            tile: selectedTile,
            x: pos.x,
            y: pos.y,
            isHorizontal: dims.isHorizontal,
            isDouble,
            chainEnd: "left",
            visualWidth: dims.width,
            visualHeight: dims.height,
        };
    }

    // Right ghost
    let rightGhost: PositionedTile | null = null;
    if (canPlaceRight && layout.rightEndPosition) {
        const pos = layout.rightEndPosition;
        const rightDir = layout.rightEndDirection;
        const dims = getTileDimensions(isDouble, rightDir, config);
        rightGhost = {
            tile: selectedTile,
            x: pos.x,
            y: pos.y,
            isHorizontal: dims.isHorizontal,
            isDouble,
            chainEnd: "right",
            visualWidth: dims.width,
            visualHeight: dims.height,
        };
    }

    return { left: leftGhost, right: rightGhost };
}
