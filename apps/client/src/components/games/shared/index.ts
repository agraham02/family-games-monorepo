// Shared card game components
export { default as PlayingCard } from "./PlayingCard";
export type { CardSize } from "./PlayingCard";

export { default as GameScoreboard } from "./GameScoreboard";
export {
    default as GameMenu,
    GameSettingToggle,
    useGameSetting,
} from "./GameMenu";

// V2 Components - CSS Grid-based responsive layout
export { default as GameTable, TableCenter, useGameTable } from "./GameTable";
export type { LayoutMode } from "./GameTable";
export { default as EdgeRegion, useEdgeRegion } from "./EdgeRegion";
export type { EdgePosition, EdgeRegionContextValue } from "./EdgeRegion";
export { default as CardHand } from "./CardHand";
export type { FanOrientation } from "./CardHand";
export { default as CardDeck } from "./CardDeck";
export { default as DealingCard } from "./DealingCard";
export { default as CardBadge } from "./CardBadge";
export { default as PlayerInfo } from "./PlayerInfo";
export { default as TrickPile } from "./TrickPile";

// Action UI components
export { default as ActionConfirmationBar } from "./ActionConfirmationBar";
export { default as DealingOverlay } from "./DealingOverlay";
export type { DealingItem } from "./DealingOverlay";

// Fullscreen support
export {
    default as FullscreenPrompt,
    useFullscreenPrompt,
    requestFullscreen,
    exitFullscreen,
    isFullscreenSupported,
    isCurrentlyFullscreen,
    isMobileDevice,
    getFullscreenPreference,
    setFullscreenPreference,
    clearFullscreenPreference,
} from "./FullscreenPrompt";

// Turn timer for time-limited games
export { TurnTimer } from "./TurnTimer";

// Celebration animations
export { Celebration, WinnerAnnouncement } from "./Celebration";
