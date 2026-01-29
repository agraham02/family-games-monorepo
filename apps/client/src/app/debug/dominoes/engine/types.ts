/**
 * Core types for the headless domino layout engine.
 * All types are immutable and serializable for deterministic computation.
 */

// =============================================================================
// Direction & Rotation
// =============================================================================

/** Cardinal directions for chain growth */
export type Direction = "N" | "E" | "S" | "W";

/** Valid rotation angles in degrees (90° increments) */
export type Rotation = 0 | 90 | 180 | 270;

/** Which end of the chain to operate on */
export type ChainEnd = "head" | "tail";

// =============================================================================
// Domino Primitives
// =============================================================================

/** A domino tile with two pip values */
export interface Domino {
    readonly id: string;
    readonly left: number; // 0-6 for double-six set
    readonly right: number; // 0-6 for double-six set
}

/** Check if a domino is a double (same value on both ends) */
export function isDouble(domino: Domino): boolean {
    return domino.left === domino.right;
}

/** Get the pip values as a tuple */
export function getPips(domino: Domino): readonly [number, number] {
    return [domino.left, domino.right] as const;
}

// =============================================================================
// Layout Geometry
// =============================================================================

/** 2D point */
export interface Point {
    readonly x: number;
    readonly y: number;
}

/** Axis-aligned bounding box */
export interface BoundingBox {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}

/** Dimensions */
export interface Size {
    readonly width: number;
    readonly height: number;
}

// =============================================================================
// Placed Domino
// =============================================================================

/**
 * A domino that has been placed on the board with computed geometry.
 * The pips are ordered as [connecting, open] relative to direction of placement.
 */
export interface PlacedDomino {
    readonly id: string;
    /** Pip values ordered as [head-facing, tail-facing] */
    readonly pips: readonly [number, number];
    /** Center position of the tile */
    readonly position: Point;
    /** Rotation in degrees (0, 90, 180, 270) */
    readonly rotation: Rotation;
    /** Whether this is a double tile */
    readonly isDouble: boolean;
    /** Direction this tile was entered from (for the connecting end) */
    readonly entryDirection: Direction;
    /** Direction the open end faces (for chain continuation) */
    readonly exitDirection: Direction;
}

// =============================================================================
// Chain State
// =============================================================================

/** Represents one end of the chain */
export interface ChainEndState {
    /** The pip value exposed at this end */
    readonly openValue: number;
    /** The ID of the tile at this end */
    readonly tileId: string;
    /** The direction this end faces (for next placement) */
    readonly direction: Direction;
    /** The position of the tile at this end */
    readonly position: Point;
}

/**
 * Complete state of the domino chain.
 * Grows bidirectionally from a center anchor.
 */
export interface ChainState {
    /** All placed dominoes in placement order */
    readonly tiles: readonly PlacedDomino[];
    /** The head end of the chain (grows in one direction) */
    readonly head: ChainEndState | null;
    /** The tail end of the chain (grows in opposite direction) */
    readonly tail: ChainEndState | null;
    /** Whether the chain is empty */
    readonly isEmpty: boolean;
}

/** Initial empty chain state */
export const EMPTY_CHAIN: ChainState = {
    tiles: [],
    head: null,
    tail: null,
    isEmpty: true,
};

// =============================================================================
// Layout Configuration
// =============================================================================

/** Configuration for the layout engine */
export interface LayoutConfig {
    /** Width of a domino (short edge) in logical units */
    readonly tileWidth: number;
    /** Height of a domino (long edge) in logical units */
    readonly tileHeight: number;
    /** Gap between adjacent tiles */
    readonly gap: number;
    /** Distance from center before triggering a turn */
    readonly boundaryDistance: number;
    /** Padding around the layout bounds */
    readonly padding: number;
}

/** Default layout configuration */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    tileWidth: 60,
    tileHeight: 120,
    tileGap: 5,
    boundaryDistance: 400,
    padding: 50,
} as unknown as LayoutConfig;

// Fix the typo - using proper property name
export const createLayoutConfig = (
    overrides: Partial<LayoutConfig> = {},
): LayoutConfig => ({
    tileWidth: 60,
    tileHeight: 120,
    gap: 5,
    boundaryDistance: 400,
    padding: 50,
    ...overrides,
});

// =============================================================================
// Camera & Viewport
// =============================================================================

/** Camera transform for viewport positioning */
export interface CameraTransform {
    /** Zoom scale (1 = 100%) */
    readonly scale: number;
    /** Offset from origin */
    readonly offset: Point;
}

/** Viewport state including camera and bounds */
export interface ViewportState {
    readonly camera: CameraTransform;
    readonly contentBounds: BoundingBox;
    readonly containerSize: Size;
    readonly isPanEnabled: boolean;
}

// =============================================================================
// Layout Snapshot
// =============================================================================

/**
 * Complete layout snapshot - the primary output of the layout engine.
 * Contains all data needed to render the board.
 */
export interface LayoutSnapshot {
    readonly chain: ChainState;
    readonly bounds: BoundingBox;
    readonly camera: CameraTransform;
    /** Optional ghost placement for preview */
    readonly ghost: PlacedDomino | null;
    /** Which end the ghost is attached to */
    readonly ghostEnd: ChainEnd | null;
}

// =============================================================================
// Placement Result
// =============================================================================

/** Result of attempting to place a domino */
export type PlacementResult =
    | { readonly success: true; readonly chain: ChainState }
    | { readonly success: false; readonly reason: string };

/** Which ends a domino can be placed at */
export interface PlacementValidity {
    readonly canPlaceAtHead: boolean;
    readonly canPlaceAtTail: boolean;
}
