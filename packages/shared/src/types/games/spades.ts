// packages/shared/src/types/games/spades.ts
// Spades game types shared between client and API

import { BaseGameData, BasePlayerData, GameState } from "./base";
import { SpadesSettings } from "../settings";

// ============================================================================
// Card Types
// ============================================================================

export enum Suit {
    Hearts = "Hearts",
    Diamonds = "Diamonds",
    Clubs = "Clubs",
    Spades = "Spades",
}

export enum Rank {
    Ace = "A",
    Two = "2",
    Three = "3",
    Four = "4",
    Five = "5",
    Six = "6",
    Seven = "7",
    Eight = "8",
    Nine = "9",
    Ten = "10",
    Jack = "J",
    Queen = "Q",
    King = "K",
    LittleJoker = "LJ",
    BigJoker = "BJ",
}

/**
 * Represents a playing card (API version with readonly).
 */
export interface Card {
    readonly rank: Rank;
    readonly suit: Suit;
}

/**
 * Playing card interface for client-side use.
 * Uses string for rank to allow flexible rendering.
 */
export interface PlayingCard {
    readonly rank: string;
    readonly suit: "Spades" | "Hearts" | "Diamonds" | "Clubs";
}

// ============================================================================
// Bid Types
// ============================================================================

export type SpadesPhase =
    | "bidding"
    | "playing"
    | "trick-result"
    | "scoring"
    | "round-summary"
    | "finished";

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

export interface PlayCardAction {
    type: "PLAY_CARD";
    playerId: string;
    card: Card;
}

export type SpadesAction = PlaceBidAction | PlayCardAction;

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

    /** ISO timestamp when the current turn started (for turn timer) */
    turnStartedAt?: string;
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
    turnStartedAt?: string; // ISO timestamp for turn timer
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
