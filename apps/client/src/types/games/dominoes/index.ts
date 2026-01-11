import { BaseGameData, BasePlayerData } from "..";

// =====================
// Core Tile Types
// =====================

export interface Tile {
    left: number; // 0-6 for double-six set
    right: number; // 0-6 for double-six set
    id: string; // unique identifier for the tile
}

export interface BoardEnd {
    value: number; // The pip value at this end of the board
    tileId: string; // ID of the tile at this end
}

export interface BoardState {
    tiles: Tile[]; // Tiles placed on board in order
    leftEnd: BoardEnd | null;
    rightEnd: BoardEnd | null;
}

// =====================
// Game Phase & Settings
// =====================

export type DominoesPhase = "playing" | "round-summary" | "finished";

export interface DominoesSettings {
    winTarget: number; // Score needed to win (default 100)
    drawFromBoneyard: boolean; // Allow drawing tiles instead of passing
}

// =====================
// Game Data (Public State)
// =====================

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
    settings: DominoesSettings;
};

// =====================
// Player Data (Private State)
// =====================

export type DominoesPlayerData = BasePlayerData & {
    hand: Tile[];
    localOrdering: string[];
};
