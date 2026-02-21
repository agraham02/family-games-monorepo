// packages/shared/src/types/games/lrc.ts
// Left-Right-Center (LRC) game types shared between client and API

import { BaseGameData, BasePlayerData, GameState } from "./base";
import { LRCSettings } from "../settings";

// ============================================================================
// Dice Types
// ============================================================================

/**
 * Possible faces on an LRC die.
 * Standard LRC die: 3 dot faces, 1 L, 1 R, 1 C.
 */
export type LRCDiceFace = "L" | "R" | "C" | "dot";

// ============================================================================
// Game Phase
// ============================================================================

export type LRCPhase = "playing" | "finished";

// ============================================================================
// Game State (API - extends GameState)
// ============================================================================

export interface LRCState extends GameState {
    playOrder: string[]; // Player IDs in turn order
    currentTurnIndex: number; // Index into playOrder for whose turn it is
    chips: Record<string, number>; // Chips per player
    pot: number; // Chips in the center pot
    phase: LRCPhase;
    lastRoll?: {
        playerId: string;
        dice: LRCDiceFace[];
    };
    gameWinner?: string; // userId of the winner
    settings: LRCSettings;
    history: string[];
}

// ============================================================================
// LRC Client Data Types
// ============================================================================

/**
 * LRC game data sent to clients (public state).
 */
export type LRCData = BaseGameData & {
    id: string;
    roomId: string;
    type: "lrc";

    // Turn management
    playOrder: string[];
    currentTurnIndex: number;

    // Game pieces
    chips: Record<string, number>;
    pot: number;

    // Game flow
    phase: LRCPhase;
    lastRoll?: {
        playerId: string;
        dice: LRCDiceFace[];
    };

    // End game
    gameWinner?: string;

    // Settings
    settings: {
        startingChips: number;
        chipValue: number;
    };
};

/**
 * Player-specific LRC data (private state).
 * LRC has no hidden information, but we include localOrdering for consistent UI.
 */
export type LRCPlayerData = BasePlayerData & {
    localOrdering: string[];
};

// ============================================================================
// Game Constants
// ============================================================================

export const LRC_MIN_PLAYERS = 3;
export const LRC_MAX_PLAYERS = 8;

/** Standard LRC die faces (3 dots, 1 L, 1 R, 1 C) */
export const LRC_DIE_FACES: LRCDiceFace[] = ["L", "R", "C", "dot", "dot", "dot"];
