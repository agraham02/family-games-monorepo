export { useContainerDimensions } from "./useContainerDimensions";
export type { ContainerDimensions } from "./useContainerDimensions";

export { useWebSocketError } from "./useWebSocketError";

export { usePlayerPositions } from "./usePlayerPositions";
export type {
    PlayerPosition,
    SeatPosition,
    PlayerPositionConfig,
} from "./usePlayerPositions";

export { useRoomEvents } from "./useRoomEvents";

export { useOptimisticGameAction } from "./useOptimisticGameAction";

export { useServerKeepAlive } from "./useServerKeepAlive";

export { useGameSettingsSchema } from "./useGameSettingsSchema";

export {
    useJoinRequests,
    useJoinRequestResponse,
    sendJoinRequest,
} from "./useJoinRequests";

export { useTurnTimer } from "./useTurnTimer";

export {
    useResponsiveTileSize,
    getResponsiveTileSize,
} from "./useResponsiveTileSize";
export type { TileSize } from "./useResponsiveTileSize";

export {
    usePrefersReducedMotion,
    getAnimationDuration,
    getMotionConfig,
} from "./usePrefersReducedMotion";
export type { MotionConfig } from "./usePrefersReducedMotion";

export {
    useKeyboardNavigation,
    useGameKeyboard,
} from "./useKeyboardNavigation";
export type {
    KeyboardNavigationConfig,
    GameKeyboardConfig,
} from "./useKeyboardNavigation";
