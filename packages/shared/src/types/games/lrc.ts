// packages/shared/src/types/games/lrc.ts
// Left Right Center (LRC) game types shared between client and API

import { BaseGameData, BasePlayerData, GameState } from "./base";
import { LRCSettings } from "../settings";

// ============================================================================
// LRC Dice Types
// ============================================================================

/**
 * The faces of an LRC die.
 * L = pass chip to the left, R = pass chip to the right,
 * C = put chip in center, * = keep the chip (dot).
 */
export type LRCDiceFace = "L" | "R" | "C" | "*";

// ============================================================================
// Game Phase
// ============================================================================

export type LRCPhase = "rolling" | "finished";

// ============================================================================
// Roll Record
// ============================================================================

/**
 * Represents a single roll of dice by a player.
 */
export interface LRCRoll {
    playerId: string;
    dice: LRCDiceFace[]; // Individual die results
    lefts: number; // Chips passed to the left
    rights: number; // Chips passed to the right
    centers: number; // Chips added to the center
    dots: number; // Chips kept
}

// ============================================================================
// Game Actions
// ============================================================================

export interface RollDiceAction {
    type: "ROLL_DICE";
    playerId: string;
}

export type LRCAction = RollDiceAction;

// ============================================================================
// LRC Game State (API - extends GameState)
// ============================================================================

export interface LRCState extends GameState {
    playOrder: string[];
    currentTurnIndex: number;

    chips: Record<string, number>; // How many chips each player has
    centerPot: number; // How many chips are in the center pot

    phase: LRCPhase;
    round: number;

    lastRoll?: LRCRoll; // The most recent roll (for display)
    winnerId?: string; // Set when game ends

    history: string[];
    settings: LRCSettings;
}

// ============================================================================
// LRC Client Data Types
// ============================================================================

/**
 * Client-side LRC settings.
 */
export interface LRCClientSettings {
    startingChips: number;
    chipValue: number;
    /** Inherited from BaseGameSettings; for LRC, winning is determined by last chip remaining, not a point target. Value is always 1. */
    winTarget: number;
    roundLimit: number | null;
    turnTimeLimit: number | null;
}

/**
 * LRC game data sent to clients (public state).
 */
export type LRCData = BaseGameData & {
    id: string;
    roomId: string;
    type: "lrc";

    playOrder: string[];
    currentTurnIndex: number;

    chips: Record<string, number>;
    centerPot: number;

    phase: LRCPhase;
    round: number;

    lastRoll?: LRCRoll;
    winnerId?: string;

    settings: LRCClientSettings;
};

/**
 * Player-specific LRC data (private state).
 * LRC has no hidden per-player information, so this is minimal.
 */
export type LRCPlayerData = BasePlayerData & {
    // No hidden state in LRC - chips and rolls are public
};

// ============================================================================
// Game Constants
// ============================================================================

export const LRC_MIN_PLAYERS = 2;
export const LRC_MAX_PLAYERS = 8;
