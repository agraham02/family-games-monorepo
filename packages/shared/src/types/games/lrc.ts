// packages/shared/src/types/games/lrc.ts
// Left Right Center (LRC) game types shared between client and API

import { BaseGameData, BasePlayerData, GameState, TurnTimerInfo } from "./base";
import { LRCSettings } from "../settings";

// ============================================================================
// Die Types
// ============================================================================

/**
 * Possible faces on an LRC die.
 * - L: Pass chip to player on left
 * - C: Pass chip to center pot
 * - R: Pass chip to player on right
 * - DOT: Keep chip (no action)
 * - WILD: Wild mode only - steal from richest player
 */
export type DieFace = "L" | "C" | "R" | "DOT" | "WILD";

/**
 * Result of a single die roll.
 */
export interface DieRoll {
    /** The resulting face */
    face: DieFace;
    /** The raw d6 value (1-6) for animation purposes */
    rawValue: number;
}

// ============================================================================
// Chip Movement Types
// ============================================================================

/**
 * Represents a chip movement from one player to another or to the center.
 * Used for both logic and animation.
 */
export interface ChipMovement {
    /** Player ID giving the chip */
    fromPlayerId: string;
    /** Player ID receiving the chip, or "center" for center pot */
    toPlayerId: string | "center";
    /** Number of chips being moved */
    count: number;
    /** The die face that caused this movement */
    dieFace: DieFace;
}

// ============================================================================
// Player Types
// ============================================================================

/**
 * LRC player state.
 * Note: Connection status is tracked in state.players[id].isConnected
 */
export interface LRCPlayer {
    id: string;
    name: string;
    /** Current chip count */
    chips: number;
    /** Net chips gained/lost this round (chips - startingChips) */
    netChipsThisRound: number;
    /** Seat index for determining left/right neighbors */
    seatIndex: number;
}

// ============================================================================
// Game Phase
// ============================================================================

/**
 * LRC game phases.
 * - waiting-for-roll: Current player needs to roll the dice
 * - showing-results: Dice rolled, displaying animation/results
 * - passing-chips: Animating chip transfers
 * - wild-target-selection: Wild mode - player choosing who to steal from
 * - last-chip-challenge: Last Chip Challenge variant - challenge roll in progress
 * - round-over: Winner determined, showing summary
 * - finished: Game ended (player left or quit)
 */
export type LRCPhase =
    | "waiting-for-roll"
    | "showing-results"
    | "passing-chips"
    | "wild-target-selection"
    | "last-chip-challenge"
    | "round-over"
    | "finished";

// ============================================================================
// Game Actions
// ============================================================================

export interface RollDiceAction {
    type: "ROLL_DICE";
}

export interface ConfirmResultsAction {
    type: "CONFIRM_RESULTS";
}

export interface ChooseWildTargetAction {
    type: "CHOOSE_WILD_TARGET";
    /** The player ID to steal from */
    targetPlayerId: string;
}

export interface LastChipChallengeRollAction {
    type: "LAST_CHIP_CHALLENGE_ROLL";
}

export interface PlayAgainAction {
    type: "PLAY_AGAIN";
}

export type LRCAction =
    | RollDiceAction
    | ConfirmResultsAction
    | ChooseWildTargetAction
    | LastChipChallengeRollAction
    | PlayAgainAction;

// ============================================================================
// LRC Game State (API - extends GameState)
// ============================================================================

export interface LRCState extends GameState {
    /** All players in seat order (used for left/right passing) */
    lrcPlayers: LRCPlayer[];

    /** Index into lrcPlayers array for current turn */
    currentPlayerIndex: number;

    /** Chips in the center pot */
    centerPot: number;

    /** Current game phase */
    phase: LRCPhase;

    /** Current roll results (null if not yet rolled) */
    currentRoll: DieRoll[] | null;

    /** Chip movements from current roll (for animation) */
    chipMovements: ChipMovement[] | null;

    /** Pending wild die targets (Wild mode - indices of WILD dice needing targets) */
    pendingWildTargets: number[];

    /** Selected wild targets (player IDs chosen for each wild die) */
    wildTargets: string[];

    /** Winner's player ID when phase is round-over */
    winnerId: string | null;

    /** Whether Last Chip Challenge is active for current potential winner */
    lastChipChallengeActive: boolean;

    /** Last Chip Challenge roll results */
    lastChipChallengeRoll: DieRoll[] | null;

    /** Whether the Last Chip Challenge was successful */
    lastChipChallengeSuccess: boolean | null;

    /** Settings snapshot */
    settings: LRCSettings;

    /** Number of completed rounds (for tracking) */
    roundNumber: number;

    /** History of winners per round (player IDs) */
    roundWinners: string[];

    /** Action history for debugging */
    history: string[];

    /** ISO timestamp when the current turn started (for turn timer) */
    turnStartedAt?: string;

    /** Auto-confirm timeout timestamp (for showing-results phase) */
    autoConfirmAt?: string;
}

// ============================================================================
// LRC Client Data Types
// ============================================================================

/**
 * Client-side settings interface (mirrors server settings).
 */
export interface LRCClientSettings {
    winTarget: number;
    roundLimit: number | null;
    turnTimeLimit: number | null;
    startingChips: number;
    chipValue: number;
    wildMode: boolean;
    lastChipChallenge: boolean;
}

/**
 * LRC game data sent to clients (public state).
 * LRC is fully public - no hidden information.
 */
export type LRCData = BaseGameData & {
    id: string;
    roomId: string;
    type: "lrc";

    /** Play order (player IDs in seat order) */
    playOrder: string[];

    /** Current turn index into playOrder */
    currentTurnIndex: number;

    /** All players in seat order */
    lrcPlayers: LRCPlayer[];

    /** Index of current player's turn */
    currentPlayerIndex: number;

    /** Chips in center pot */
    centerPot: number;

    /** Current game phase */
    phase: LRCPhase;

    /** Current roll results */
    currentRoll: DieRoll[] | null;

    /** Chip movements for animation */
    chipMovements: ChipMovement[] | null;

    /** Pending wild targets (indices of WILD dice needing targets) */
    pendingWildTargets: number[];

    /** Selected wild targets */
    wildTargets: string[];

    /** Winner ID when round is over */
    winnerId: string | null;

    /** Whether Last Chip Challenge is active */
    lastChipChallengeActive: boolean;

    /** Last Chip Challenge roll results */
    lastChipChallengeRoll: DieRoll[] | null;

    /** Whether the Last Chip Challenge was successful */
    lastChipChallengeSuccess: boolean | null;

    /** Current round number */
    roundNumber: number;

    /** History of round winners */
    roundWinners: string[];

    /** Turn timer information */
    turnTimer?: TurnTimerInfo;

    /** Auto-confirm timer info (for showing-results phase) */
    autoConfirmTimer?: TurnTimerInfo;

    /** Game settings */
    settings: LRCClientSettings;
};

/**
 * Player-specific LRC data.
 * LRC has no hidden information, so this is minimal.
 */
export type LRCPlayerData = BasePlayerData & {
    /** The player's own ID for convenience */
    odusId: string;
    /** Whether it's this player's turn */
    isMyTurn: boolean;
    /** This player's current chip count */
    myChips: number;
    /** This player's net winnings (chips won - starting chips) in cents */
    netWinningsCents: number;
};

// ============================================================================
// Game Constants
// ============================================================================

export const LRC_MIN_PLAYERS = 3;
export const LRC_MAX_PLAYERS = 10;
export const LRC_MAX_DICE = 3;

/** Default auto-confirm delay in seconds */
export const LRC_AUTO_CONFIRM_DELAY = 4;

/** Die face to d6 value mapping (standard LRC dice) */
export const DIE_FACE_VALUES: Record<number, DieFace> = {
    1: "DOT",
    2: "DOT",
    3: "DOT",
    4: "L",
    5: "C",
    6: "R",
};

/** Wild mode die face mapping (1 becomes WILD) */
export const DIE_FACE_VALUES_WILD: Record<number, DieFace> = {
    1: "WILD",
    2: "DOT",
    3: "DOT",
    4: "L",
    5: "C",
    6: "R",
};

/** Display labels for die faces */
export const DIE_FACE_LABELS: Record<DieFace, string> = {
    L: "Left",
    C: "Center",
    R: "Right",
    DOT: "Keep",
    WILD: "Wild",
};

/** Colors for die faces (for UI) */
export const DIE_FACE_COLORS: Record<DieFace, string> = {
    L: "#3B82F6", // blue
    C: "#EF4444", // red
    R: "#22C55E", // green
    DOT: "#A855F7", // purple
    WILD: "#F59E0B", // amber
};
