/**
 * Engine module barrel export.
 * Re-exports all public types and functions from the layout engine.
 */

// Types
export type {
    Direction,
    Rotation,
    ChainEnd,
    Domino,
    Point,
    BoundingBox,
    Size,
    PlacedDomino,
    ChainEndState,
    ChainState,
    LayoutConfig,
    CameraTransform,
    ViewportState,
    LayoutSnapshot,
    PlacementResult,
    PlacementValidity,
} from "./types";

export { isDouble, getPips, EMPTY_CHAIN, createLayoutConfig } from "./types";

// Path Builder
export {
    oppositeDirection,
    directionVector,
    isVertical,
    isHorizontal,
    turnRight,
    turnLeft,
    getRotation,
    getTileWorldSize,
    computeNextPosition,
    wouldExceedBoundary,
    shouldTurn,
    wouldCollide,
    selectTurnDirection,
    computeBoundingBox,
} from "./pathBuilder";

// Chain Manager
export {
    canConnect,
    getOrientedPips,
    getPlacementValidity,
    canPlace,
    placeDomino,
    getOpenEnds,
    getTileAtEnd,
    createChainFromDominoes,
} from "./chainManager";

// Ghost Simulator
export type { GhostPreviewState } from "./ghostSimulator";
export {
    generateGhostTile,
    simulatePlacement,
    generateAllPreviews,
    generateMultiplePreviews,
    createGhostPreviewState,
    switchGhostEnd,
} from "./ghostSimulator";

// Camera
export {
    computeCameraTransform,
    createInitialCamera,
    applyPanOffset,
    applyConstrainedPan,
    applyZoom,
    setZoomLevel,
    createViewportState,
    shouldEnablePan,
    containerToWorld,
    worldToContainer,
    lerpCamera,
    camerasEqual,
} from "./camera";
