// ─── Pip & Tile ──────────────────────────────────────────────
export type PipValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Domino {
    id: string; // e.g. "3-5"
    pip1: PipValue;
    pip2: PipValue;
    isDouble: boolean;
}

// ─── Directions & Grid ──────────────────────────────────────
/** 0 = right, 90 = down, 180 = left, 270 = up */
export type Direction = 0 | 90 | 180 | 270;

export interface GridPosition {
    row: number;
    col: number;
}

export interface Vector2 {
    x: number;
    y: number;
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ─── Chain ───────────────────────────────────────────────────
export interface ChainSegment {
    domino: Domino;
    gridPos: GridPosition;
    direction: Direction;
    /** Which pip faces the "open" end at head side */
    openPipHead: PipValue;
    /** Which pip faces the "open" end at tail side */
    openPipTail: PipValue;
    /** True when pip2 is the connecting (gridPos-side) pip, so display should swap pip1/pip2 */
    flipped: boolean;
}

export type ChainEnd = "head" | "tail";

export interface DominoChainState {
    segments: ChainSegment[];
    /** The pip value exposed at the head end */
    headOpenPip: PipValue | null;
    /** The pip value exposed at the tail end */
    tailOpenPip: PipValue | null;
    /**
     * Stable per-chain seed used to randomize snake direction tiebreakers
     * (e.g. whether the head snakes up or down when runways are similar).
     * Must be deterministic for a given board state so replays stay stable.
     */
    snakeSeed?: number;
}

// ─── Placement ───────────────────────────────────────────────
export interface PlacementOption {
    end: ChainEnd;
    segment: ChainSegment; // the computed segment if placed
}

export interface PlacementResult {
    success: boolean;
    segment?: ChainSegment;
    error?: string;
}

// ─── Layout constants ────────────────────────────────────────
export const GRID_CELL_SIZE = 60; // px
export const TILE_LENGTH = 2; // grid cells for regular tile long side
export const TILE_WIDTH = 1; // grid cells for regular tile short side
export const DOUBLE_SIZE = 1; // doubles occupy 1×1 visually but are perpendicular

// Pixel dimensions
export const TILE_PX_LENGTH = TILE_LENGTH * GRID_CELL_SIZE; // 120px
export const TILE_PX_WIDTH = TILE_WIDTH * GRID_CELL_SIZE; // 60px
export const DOUBLE_PX_SIZE = GRID_CELL_SIZE; // 60px

// Board grid size (in cells)
export const BOARD_COLS = 24;
export const BOARD_ROWS = 18;
