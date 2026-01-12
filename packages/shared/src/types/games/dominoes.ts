// packages/shared/src/types/games/dominoes.ts
// Dominoes game types shared between client and API

import { BaseGameData, BasePlayerData, GameState } from "./base";
import { DominoesSettings } from "../settings";

// ============================================================================
// Core Tile Types
// ============================================================================

/**
 * Represents a domino tile.
 */
export interface Tile {
    left: number; // 0-6 for double-six set
    right: number; // 0-6 for double-six set
    id: string; // unique identifier for the tile
}

/**
 * Represents one end of the domino board.
 */
export interface BoardEnd {
    value: number; // The pip value at this end of the board
    tileId: string; // ID of the tile at this end
}

/**
 * Represents the current state of the domino board.
 */
export interface BoardState {
    tiles: Tile[]; // Tiles placed on board in order
    leftEnd: BoardEnd | null;
    rightEnd: BoardEnd | null;
}

// ============================================================================
// Game Phase
// ============================================================================

export type DominoesPhase = "playing" | "round-summary" | "finished";

// ============================================================================
// Game Actions
// ============================================================================

export interface PlaceTileAction {
    type: "PLACE_TILE";
    playerId: string;
    tile: Tile;
    side: "left" | "right"; // which end of the board to place the tile
}

export interface PassAction {
    type: "PASS";
    playerId: string;
}

export type DominoesAction = PlaceTileAction | PassAction;

// ============================================================================
// Dominoes Game State (API - extends GameState)
// ============================================================================

export interface DominoesState extends GameState {
    playOrder: string[];
    currentTurnIndex: number;
    startingPlayerIndex: number; // Player who started the current round

    hands: Record<string, Tile[]>;
    handsCounts?: Record<string, number>; // For public state
    board: BoardState;

    phase: DominoesPhase;
    round: number;
    consecutivePasses: number; // Track consecutive passes to detect blocked game

    playerScores: Record<string, number>; // Individual scores
    roundPipCounts?: Record<string, number>; // Pip counts at end of round
    roundWinner?: string | null; // Winner of the current round
    isRoundTie?: boolean; // True if round ended in a tie (blocked game, multiple lowest pip counts)

    gameWinner?: string; // Overall game winner
    history: string[]; // Action history for debugging
    settings: DominoesSettings;
}

// ============================================================================
// Dominoes Client Data Types
// ============================================================================

/**
 * Client-side settings interface (mirrors server settings).
 */
export interface DominoesClientSettings {
    winTarget: number; // Score needed to win (default 100)
    drawFromBoneyard: boolean; // Allow drawing tiles instead of passing
}

/**
 * Dominoes game data sent to clients (public state).
 */
export type DominoesData = BaseGameData & {
    id: string;
    roomId: string;
    type: "dominoes";

    // Turn management
    playOrder: string[];
    currentTurnIndex: number;
    startingPlayerIndex: number;

    // Game pieces (public: only tile counts, not actual tiles)
    handsCounts: Record<string, number>;
    board: BoardState;

    // Game flow
    phase: DominoesPhase;
    round: number;
    consecutivePasses: number;

    // Scoring (individual, not team-based)
    playerScores: Record<string, number>;
    roundPipCounts?: Record<string, number>; // Pip counts at end of round
    roundWinner?: string | null; // Winner of the current round (null if blocked tie)
    isRoundTie?: boolean; // True if round ended in a tie (Caribbean rule)

    // End game
    gameWinner?: string;

    // Settings
    settings: DominoesClientSettings;
};

/**
 * Player-specific Dominoes data (private state).
 */
export type DominoesPlayerData = BasePlayerData & {
    hand: Tile[];
    localOrdering: string[];
};

// ============================================================================
// Game Constants
// ============================================================================

export const DOMINOES_TOTAL_PLAYERS = 4;
