// packages/shared/src/types/games/spades.ts
// Spades game types shared between client and API

import { BaseGameData, BasePlayerData, GameState, TurnTimerInfo } from "./base";
import { SpadesSettings } from "../settings";
import { Suit, Rank, Card, PlayingCard } from "./cards";

// ============================================================================
// Card Types — re-exported from cards.ts for backward compatibility.
// New code should import these directly from "@shared/types" (cards.ts).
// ============================================================================

export { Suit, Rank };
export type { Card, PlayingCard };

// ============================================================================
// Bid Types
// ============================================================================

export type SpadesPhase =
    | "blind-bid-window"
    | "bidding"
    | "playing"
    | "trick-result"
    | "scoring"
    | "round-summary"
    | "finished";

// ============================================================================
// Blind Bid Window (team-level pre-bid decision)
// ============================================================================

/**
 * Per-team state during the `blind-bid-window` phase. Eligible teams must
 * decide as a unit whether to commit a team blind bid, individually commit
 * blind nil, or reveal their cards and bid normally. Both teammates' hands
 * stay hidden while their team status is `"pending"`.
 */
export interface BlindWindowTeamState {
    /** Whether this team is 100+ behind and eligible for blind options. */
    eligible: boolean;
    /**
     * `"pending"` — cards still hidden, no team-level decision yet.
     * `"revealed"` — at least one teammate chose to see cards; team must bid normally.
     * `"committed-team-blind"` — team locked in a combined blind bid.
     */
    status: "pending" | "revealed" | "committed-team-blind";
    /** Combined blind bid amount (4-13) if the team committed. */
    teamBlindBid?: number;
    /** Player IDs that individually committed blind nil during the window. */
    blindNilPlayerIds: string[];
    /** Which teammate clicked the team-level decision (commit or reveal). */
    decidedById?: string;
}

export interface BlindWindow {
    /** Epoch ms after which the window auto-resolves (auto-reveal). */
    deadline: number;
    teams: Record<number, BlindWindowTeamState>;
}

export type BidType = "normal" | "nil" | "blind" | "blind-nil";

export interface Bid {
    readonly amount: number;
    readonly type: BidType;
    readonly isBlind: boolean;
}

// ============================================================================
// Game Actions
// ============================================================================

export interface PlaceBidAction {
    type: "PLACE_BID";
    playerId: string;
    bid: Bid;
}

/**
 * Records a player's in-progress (un-submitted) bid amount so the server can
 * use it as the auto-bid if the turn timer expires before they confirm.
 */
export interface StageBidAction {
    type: "STAGE_BID";
    playerId: string;
    amount: number;
}

export interface PlayCardAction {
    type: "PLAY_CARD";
    playerId: string;
    card: Card;
}

/**
 * Either teammate may commit a team-wide blind bid (4-13) during the
 * blind-bid-window. Locks both partners' bids; cards remain hidden until
 * regular play begins.
 */
export interface CommitTeamBlindBidAction {
    type: "COMMIT_TEAM_BLIND_BID";
    playerId: string;
    amount: number;
}

/** A single player committing blind nil for themselves during the window. */
export interface CommitBlindNilAction {
    type: "COMMIT_BLIND_NIL";
    playerId: string;
}

/**
 * Either teammate may decline the team's blind options and reveal both
 * partners' hands. Once revealed, the team must bid normally.
 */
export interface RevealTeamHandsAction {
    type: "REVEAL_TEAM_HANDS";
    playerId: string;
}

export type SpadesAction =
    | PlaceBidAction
    | StageBidAction
    | PlayCardAction
    | CommitTeamBlindBidAction
    | CommitBlindNilAction
    | RevealTeamHandsAction;

// ============================================================================
// Trick Types
// ============================================================================

export interface CardPlay {
    playerId: string;
    card: Card;
}

export interface Trick {
    leaderId: string;
    plays: CardPlay[];
    leadSuit: Suit | null; // suit of the first card played
    winnerId?: string;
}

/**
 * Client-side trick representation using PlayingCard.
 */
export interface SpadesTrick {
    plays: {
        playerId: string;
        card: PlayingCard;
    }[];
}

// ============================================================================
// Team Types
// ============================================================================

export interface SpadesTeam {
    players: string[];
    score: number;
    accumulatedBags: number;
    nil?: boolean;
}

// ============================================================================
// Spades Game State (API - extends GameState)
// ============================================================================

export interface SpadesState extends GameState {
    teams: Record<number, SpadesTeam>;
    playOrder: string[];
    currentTurnIndex: number;
    dealerIndex: number;

    hands: Record<string, Card[]>;
    handsCounts?: Record<string, number>;
    bids: Record<string, Bid>;
    /**
     * Per-player draft bid amounts collected while the bidding modal is open
     * but not yet submitted. Used by the auto-bid fallback when the turn timer
     * expires so we honor the player's intent instead of the bare minimum.
     */
    draftBids?: Record<string, number>;

    spadesBroken: boolean;
    currentTrick: Trick | null;
    completedTricks: Trick[];
    phase: SpadesPhase;
    round: number;
    history: string[]; // Action history for debugging
    settings: SpadesSettings;
    winnerTeamId?: number;
    isTie?: boolean;

    lastTrickWinnerId?: string;
    lastTrickWinningCard?: Card;

    roundTrickCounts: Record<string, number>;
    roundTeamScores: Record<number, number>; // scores for each team for the round
    roundScoreBreakdown: Record<number, unknown>; // detailed breakdown for each team
    teamEligibleForBlind: Record<number, boolean>; // which teams are eligible for blind bids
    /** Team-level blind-bid decision state (only present during `blind-bid-window`). */
    blindWindow?: BlindWindow;

    /** ISO timestamp when the current turn started (for turn timer) */
    turnStartedAt?: string;
    /** Remaining seconds for the current turn (server-calculated for sync) */
    remainingSeconds?: number;
}

// ============================================================================
// Spades Client Data Types
// ============================================================================

/**
 * Client-side settings interface (mirrors server settings).
 */
export interface SpadesClientSettings {
    allowNil: boolean;
    bagsPenalty: number;
    winTarget: number;
    blindNilEnabled: boolean;
    blindBidEnabled: boolean;
    jokersEnabled: boolean;
    deuceOfSpadesHigh: boolean;
    turnTimeLimit?: number; // seconds, 0 or undefined means no limit
    teamMinBid?: number;
}

/**
 * Spades game data sent to clients (public state).
 */
export type SpadesData = BaseGameData & {
    hands: string[][];
    id: string;
    roomId: string;
    type: "spades";
    teams: {
        [teamId: string]: {
            players: string[];
            score: number;
            accumulatedBags: number;
        };
    };
    playOrder: string[];
    dealerIndex: number;
    currentTurnIndex: number;
    bids: Record<string, { amount: number; type: string; isBlind: boolean }>;
    /** Per-player un-submitted bid amounts (for auto-bid fallback). */
    draftBids?: Record<string, number>;
    spadesBroken: boolean;
    currentTrick: SpadesTrick | null;
    completedTricks: SpadesTrick[];
    phase: SpadesPhase;
    round: number;
    settings: SpadesClientSettings;
    history: string[];
    handsCounts: Record<string, number>;
    lastTrickWinnerId?: string;
    lastTrickWinningCard?: PlayingCard;

    roundTrickCounts: Record<string, number>;
    roundTeamScores: Record<number, number>; // scores for each team for the round
    roundScoreBreakdown: Record<number, unknown>;
    teamEligibleForBlind: Record<number, boolean>; // which teams are eligible for blind bids
    /** Team-level blind-bid decision state (only present during `blind-bid-window`). */
    blindWindow?: BlindWindow;
    /** Turn timer info for client-side sync with latency compensation */
    turnTimer?: TurnTimerInfo;
};

/**
 * Player-specific Spades data (private state).
 */
export type SpadesPlayerData = BasePlayerData & {
    hand: PlayingCard[];
    // Add other player-specific data as needed
};

// ============================================================================
// Team Requirements
// ============================================================================

export const SPADES_TEAM_REQUIREMENTS = {
    numTeams: 2,
    playersPerTeam: 2,
} as const;

export const SPADES_TOTAL_PLAYERS =
    SPADES_TEAM_REQUIREMENTS.numTeams * SPADES_TEAM_REQUIREMENTS.playersPerTeam;
