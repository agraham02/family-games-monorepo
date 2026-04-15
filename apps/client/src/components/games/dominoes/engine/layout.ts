import type {
    Direction,
    GridPosition,
    Rectangle,
    Vector2,
    ChainSegment,
} from "./types";
import { GRID_CELL_SIZE, BOARD_COLS, BOARD_ROWS } from "./types";

// ─── Coordinate conversion ──────────────────────────────────

export function gridToPixel(pos: GridPosition): Vector2 {
    return {
        x: pos.col * GRID_CELL_SIZE,
        y: pos.row * GRID_CELL_SIZE,
    };
}

export function pixelToGrid(p: Vector2): GridPosition {
    return {
        row: Math.floor(p.y / GRID_CELL_SIZE),
        col: Math.floor(p.x / GRID_CELL_SIZE),
    };
}

// ─── Tile bounding box (in grid cells) ──────────────────────

/**
 * Returns the bounding box of a tile in grid-cell units.
 * Regular tiles: 2×1 or 1×2 depending on direction.
 * Doubles: always perpendicular to direction → effectively 1×2 or 2×1 opposite.
 */
export function getTileCellBounds(
    gridPos: GridPosition,
    direction: Direction,
    isDouble: boolean,
): { rows: number; cols: number; startRow: number; startCol: number } {
    let cols: number;
    let rows: number;

    if (isDouble) {
        if (direction === 0 || direction === 180) {
            cols = 1;
            rows = 2;
        } else {
            cols = 2;
            rows = 1;
        }
    } else {
        if (direction === 0 || direction === 180) {
            cols = 2;
            rows = 1;
        } else {
            cols = 1;
            rows = 2;
        }
    }

    let startRow = gridPos.row;
    let startCol = gridPos.col;

    if (isDouble) {
        if (direction === 0 || direction === 180) {
            startRow = gridPos.row - 1;
        } else {
            startCol = gridPos.col - 1;
        }
    } else {
        if (direction === 180) {
            startCol = gridPos.col - 1;
        } else if (direction === 270) {
            startRow = gridPos.row - 1;
        }
    }

    return { rows, cols, startRow, startCol };
}

/** Get pixel bounding box for a tile. */
export function getTilePixelBounds(
    gridPos: GridPosition,
    direction: Direction,
    isDouble: boolean,
): Rectangle {
    const { rows, cols, startRow, startCol } = getTileCellBounds(
        gridPos,
        direction,
        isDouble,
    );
    const bounds: Rectangle = {
        x: startCol * GRID_CELL_SIZE,
        y: startRow * GRID_CELL_SIZE,
        width: cols * GRID_CELL_SIZE,
        height: rows * GRID_CELL_SIZE,
    };

    if (isDouble) {
        if (direction === 0 || direction === 180) {
            bounds.y += GRID_CELL_SIZE / 2;
        } else {
            bounds.x += GRID_CELL_SIZE / 2;
        }
    }

    return bounds;
}

// ─── Collision detection ────────────────────────────────────

export function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/** Check if a rectangle is fully within the board bounds. */
export function isWithinBoard(rect: Rectangle): boolean {
    const boardWidth = BOARD_COLS * GRID_CELL_SIZE;
    const boardHeight = BOARD_ROWS * GRID_CELL_SIZE;
    return (
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.x + rect.width <= boardWidth &&
        rect.y + rect.height <= boardHeight
    );
}

// ─── Direction helpers ──────────────────────────────────────

export function turnLeft(dir: Direction): Direction {
    return ((dir + 270) % 360) as Direction;
}

export function turnRight(dir: Direction): Direction {
    return ((dir + 90) % 360) as Direction;
}

export function reverseDirection(dir: Direction): Direction {
    return ((dir + 180) % 360) as Direction;
}

/** Get the unit vector (in grid cells) for a direction. */
export function directionVector(dir: Direction): {
    dRow: number;
    dCol: number;
} {
    switch (dir) {
        case 0:
            return { dRow: 0, dCol: 1 }; // right
        case 90:
            return { dRow: 1, dCol: 0 }; // down
        case 180:
            return { dRow: 0, dCol: -1 }; // left
        case 270:
            return { dRow: -1, dCol: 0 }; // up
    }
}

// ─── Space scoring (for auto-snake turn preference) ─────────

/**
 * Estimate how many cells of runway exist in a given direction
 * from a position before hitting the board edge.
 */
export function runwayInDirection(pos: GridPosition, dir: Direction): number {
    const { dRow, dCol } = directionVector(dir);
    if (dCol > 0) return BOARD_COLS - 1 - pos.col;
    if (dCol < 0) return pos.col;
    if (dRow > 0) return BOARD_ROWS - 1 - pos.row;
    if (dRow < 0) return pos.row;
    return 0;
}

/**
 * Walk cells in `dir` from `pos` and return the number of free cells
 * before hitting an occupied segment or the board edge.
 */
export function effectiveRunway(
    pos: GridPosition,
    dir: Direction,
    segments: ChainSegment[],
    skipIndex: number,
): number {
    const { dRow, dCol } = directionVector(dir);
    const maxSteps = runwayInDirection(pos, dir);
    let free = 0;

    for (let step = 1; step <= maxSteps; step++) {
        const probeRow = pos.row + dRow * step;
        const probeCol = pos.col + dCol * step;
        const probe: Rectangle = {
            x: probeCol * GRID_CELL_SIZE,
            y: probeRow * GRID_CELL_SIZE,
            width: GRID_CELL_SIZE,
            height: GRID_CELL_SIZE,
        };

        let blocked = false;
        for (let i = 0; i < segments.length; i++) {
            if (i === skipIndex) continue;
            const segBounds = getTilePixelBounds(
                segments[i].gridPos,
                segments[i].direction,
                segments[i].domino.isDouble,
            );
            if (rectanglesOverlap(probe, segBounds)) {
                blocked = true;
                break;
            }
        }
        if (blocked) break;
        free++;
    }
    return free;
}

/** Get the center of the board in grid coordinates. */
export function boardCenter(): GridPosition {
    return {
        row: Math.floor(BOARD_ROWS / 2),
        col: Math.floor(BOARD_COLS / 2),
    };
}

/**
 * Compute rotation angle (degrees) for rendering a tile on the Konva canvas.
 * direction=0 means tile lays horizontally pointing right (no rotation).
 */
export function tileRotationDegrees(
    direction: Direction,
    isDouble: boolean,
): number {
    if (isDouble) {
        return (direction + 90) % 360;
    }
    return direction;
}
