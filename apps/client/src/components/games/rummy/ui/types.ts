import type { PlayingCard, RummyData, RummyPlayerData } from "@shared/types";
import type { RummyHints, RummySortMode } from "@shared/hints/rummy";
import type { CardAnnotation } from "../hints/annotations";
import type { RummyHintSettings } from "../hints/useRummyHintSettings";

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

    // ---- Hand display layer (client-only sort / reorder) ----
    /**
     * Display order: `displayOrder[displayIndex] = serverHandIndex`.
     * Always a permutation of `[0..hand.length - 1]`. Renderers iterate
     * displayOrder to produce the visible card row; click handlers
     * receive a server-index via the resolved card.
     */
    displayOrder: readonly number[];
    sortMode: RummySortMode;
    onSetSortMode: (mode: RummySortMode) => void;

    // ---- Hints ----
    /** Active hint settings (master-gated). */
    hintSettings: RummyHintSettings;
    /** Computed hints for the hero's current hand. */
    hints: RummyHints;
    /** Per-server-index visual annotations for hand cards. */
    handAnnotations: Readonly<Record<number, CardAnnotation>>;

    // ---- Hand + meld selection ----
    onSelectHandCard: (idx: number) => void;
    onClearSelection: () => void;

    // ---- Draw phase actions ----
    onDrawStock: () => void;
    /** Skip the draw (only legal when stock is empty). */
    onPassDraw: () => void;
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
