import type { PlayingCard, RummyData, RummyPlayerData } from "@shared/types";

/**
 * Controller object passed down from `<Rummy />` → `<RummyStage />` → scenes.
 * Consolidates local UI state + action dispatchers so scenes don't each need
 * a dozen individual props.
 */
export interface RummyController {
    // ---- Local UI state (controlled by parent) ----
    selectedHandIndices: number[];
    activeMeldId: string | null;
    /**
     * Meld ids onto which the currently-selected hand card can be laid off.
     * Empty unless the hero has exactly one card selected during `may-meld`.
     */
    eligibleLayoffMeldIds: readonly string[];
    discardPickIndex: number | null;
    meldComposerOpen: boolean;
    isSubmitting: boolean;

    // ---- Hand + meld selection ----
    onSelectHandCard: (idx: number) => void;
    onClearSelection: () => void;

    // ---- Draw phase actions ----
    onDrawStock: () => void;
    onClickDiscardCard: (pickIndex: number) => void;

    // ---- Meld phase actions ----
    onSelectMeld: (meldId: string) => void;
    onOpenMeldComposer: () => void;
    onCancelMeldComposer: () => void;
    onConfirmMeld: (cards: PlayingCard[], kind: "set" | "run") => void;
    onDiscard: () => void;
}

export interface RummySceneCommonProps {
    gameData: RummyData;
    playerData: RummyPlayerData;
    heroId: string;
    isSpectator: boolean;
    controller: RummyController;
}
