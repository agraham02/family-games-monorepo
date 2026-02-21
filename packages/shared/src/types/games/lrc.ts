// packages/shared/src/types/games/lrc.ts
// Left Right Center (LRC) game types shared between client and API

import { BaseGameData, BasePlayerData, GameState } from "./base";
import { LRCSettings } from "../settings";

// ============================================================================
// Dice Types
// ============================================================================

/**
 * Possible faces on an LRC die.
 * L = pass chip left, R = pass chip right, C = put chip in center, * = keep chip
 */
export type LRCDieFace = "L" | "R" | "C" | "*";

// ============================================================================
// Game Phase
// ============================================================================

export type LRCPhase = "playing" | "finished";

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

    chips: Record<string, number>; // chips each player holds
    pot: number; // chips in the center

    phase: LRCPhase;
    round: number;

    lastRoll?: {
        playerId: string;
        dice: LRCDieFace[];
    };

    gameWinner?: string;
    history: string[];
    settings: LRCSettings;
}

// ============================================================================
// LRC Client Data Types
// ============================================================================

/**
 * Client-side settings interface (mirrors server settings).
 */
export interface LRCClientSettings {
    startingChips: number;
    chipValue: number; // dollar value per chip
}

/**
 * LRC game data sent to clients (public state).
 * Everything is visible to all players in LRC.
 */
export type LRCData = BaseGameData & {
    id: string;
    roomId: string;
    type: "lrc";

    playOrder: string[];
    currentTurnIndex: number;

    chips: Record<string, number>;
    pot: number;

    phase: LRCPhase;
    round: number;

    lastRoll?: {
        playerId: string;
        dice: LRCDieFace[];
    };

    gameWinner?: string;
    settings: LRCClientSettings;
};

/**
 * Player-specific LRC data (private state).
 * LRC has no hidden information, but we need the localOrdering for UI layout.
 */
export type LRCPlayerData = BasePlayerData & {
    // No hidden information in LRC - everything is public
};
