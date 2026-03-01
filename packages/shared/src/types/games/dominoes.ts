// packages/shared/src/types/games/dominoes.ts
// Dominoes game types shared between client and API

import { BaseGameData, BasePlayerData, GameState } from "./base";
import { DominoesGameMode, DominoesSettings } from "../settings";

// ============================================================================
// Team Types (for 2v2 partner mode)
// ============================================================================

/**
 * Represents a team in partner dominoes.
 */
export interface DominoesTeam {
    players: string[]; // Array of 2 player IDs
    score: number;
}

/**
 * Result from round scoring calculation.
 */
export interface DominoesRoundScoreResult {
    /** Updated scores (playerScores for individual, teamScores for team mode) */
    playerScores: Record<string, number>;
    teamScores: Record<number, number>;
    /** Pip counts for each player */
    pipCounts: Record<string, number>;
    /** Player who won the round (went out or lowest pips) */
    roundWinner: string | null;
    /** Team that won the round (team mode only) */
    winningTeam: number | null;
    /** Points scored this round */
    roundPoints: number;
    /** True if round ended in a tie (no points awarded) */
    isTie: boolean;
}

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

export type DominoLayoutDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface DominoTileLayout {
    id: string;
    x: number;
    y: number;
    rotation: number;
    isDouble: boolean;
    direction: DominoLayoutDirection;
}

export interface DominoLayoutPoint {
    x: number;
    y: number;
    direction: DominoLayoutDirection;
}

/** Tracks one end of the chain for incremental append. */
export interface DominoEndpoint {
    tileId: string;
    x: number;
    y: number;
    direction: DominoLayoutDirection;
    isDouble: boolean;
}

export interface DominoBoardLayout {
    seed: string;
    tileLayouts: Record<string, DominoTileLayout>;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    leftEndPos: DominoLayoutPoint | null;
    rightEndPos: DominoLayoutPoint | null;
    /** Head endpoint metadata for incremental append (right end). */
    _head?: DominoEndpoint;
    /** Tail endpoint metadata for incremental append (left end). */
    _tail?: DominoEndpoint;
}

// ============================================================================
// V3 Layout Types
// ============================================================================

/** A single move in the chain's build history. */
export interface DominoLayoutMove {
    tileId: string;
    /** 'init' for the first tile, 'left'/'right' for subsequent placements. */
    side: "init" | "left" | "right";
}

/** Axis-aligned bounding box. */
export interface AABB {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

/** Seam descriptor for rendering: describes the connection between two adjacent tiles. */
export interface SeamDescriptor {
    /** The axis the seam lies on. 'x' = vertical seam line, 'y' = horizontal seam line. */
    axis: "x" | "y";
    /** World-space position on the seam axis. */
    position: number;
    /** Center of the seam on the perpendicular axis. */
    center: number;
    /** Length of the seam in logical units. */
    length: number;
    /** IDs of the two tiles this seam connects (for debugging). */
    tileIds: [string, string];
}

/**
 * V3 Board Layout — all metadata fields are required.
 * Produced by the v3 layout engine.
 */
export interface DominoBoardLayoutV3 {
    seed: string;
    /** Layout engine turn-policy version. Must match when replaying. */
    _turnPolicyVersion: number;
    /** Ordered move history for deterministic replay. */
    _moveHistory: DominoLayoutMove[];
    /** FNV-1a hash of the layout for integrity checks. */
    _layoutHash: string;
    /** Per-tile positioning data. */
    tileLayouts: Record<string, DominoTileLayout>;
    /** World-space bounding box of all tiles. */
    bounds: AABB;
    /** Ghost position for the left (tail) end. */
    leftEndPos: DominoLayoutPoint | null;
    /** Ghost position for the right (head) end. */
    rightEndPos: DominoLayoutPoint | null;
    /** Head endpoint metadata (right end of chain). Required. */
    _head: DominoEndpoint;
    /** Tail endpoint metadata (left end of chain). Required. */
    _tail: DominoEndpoint;
    /** Consecutive tiles along the same axis at the head end. */
    _headStraightRun: number;
    /** Consecutive tiles along the same axis at the tail end. */
    _tailStraightRun: number;
    /** Seam descriptors for rendering seam-filler elements. */
    _seams: SeamDescriptor[];
    /** Non-null if the most recent placement failed. */
    _layoutError: LayoutPlacementError | null;
}

/** Typed error when the layout engine cannot place a tile. */
export interface LayoutPlacementError {
    type: "PLACEMENT_FAILED";
    tileId: string;
    side: "left" | "right";
    moveIndex: number;
    seed: string;
    turnPolicyVersion: number;
    layoutHashBeforeFailure: string;
    candidatesAttempted: Array<{
        direction: DominoLayoutDirection;
        centerX: number;
        centerY: number;
        collidedWith: string[];
    }>;
}

/** Result type for appendTile — always returns either success or a typed error. */
export type LayoutResult =
    | { ok: true; layout: DominoBoardLayoutV3 }
    | {
          ok: false;
          error: LayoutPlacementError;
          previousLayout: DominoBoardLayoutV3;
      };

/**
 * Represents the current state of the domino board.
 */
export interface BoardState {
    tiles: Tile[]; // Tiles placed on board in order
    leftEnd: BoardEnd | null;
    rightEnd: BoardEnd | null;
    layout?: DominoBoardLayout;
    /** V3 layout (used when engine v3 is active). */
    layoutV3?: DominoBoardLayoutV3;
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

export interface DrawTileAction {
    type: "DRAW_TILE";
    playerId: string;
}

export type DominoesAction = PlaceTileAction | PassAction | DrawTileAction;

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

    // Game mode (individual or team)
    gameMode: DominoesGameMode;

    // Team data (populated when gameMode === "team")
    teams?: Record<number, DominoesTeam>;
    teamScores?: Record<number, number>;

    // Individual scores (always populated, used when gameMode === "individual")
    playerScores: Record<string, number>;

    // Round summary data
    roundPipCounts?: Record<string, number>; // Pip counts at end of round
    roundWinner?: string | null; // Player who won the current round
    winningTeam?: number | null; // Team that won (team mode only)
    roundPoints?: number; // Points scored this round
    isRoundTie?: boolean; // True if round ended in a tie (blocked game, multiple lowest pip counts)

    gameWinner?: string; // Overall game winner (player ID)
    winningTeamId?: number; // Overall game winning team (team mode)
    history: string[]; // Action history for debugging
    settings: DominoesSettings;

    /** ISO timestamp when the current turn started (for turn timer) */
    turnStartedAt?: string;
}

// ============================================================================
// Dominoes Client Data Types
// ============================================================================

/**
 * Client-side settings interface (mirrors server settings).
 */
export interface DominoesClientSettings {
    winTarget: number; // Score needed to win (default 100)
    roundLimit: number | null; // Fixed number of rounds (null = unlimited)
    gameMode: DominoesGameMode; // Play mode (individual or team)
    drawFromBoneyard: boolean; // Allow drawing tiles instead of passing
    turnTimeLimit: number | null; // Seconds per turn (null = unlimited)
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
    boneyardCount: number; // Number of tiles remaining in boneyard
    board: BoardState;

    // Game flow
    phase: DominoesPhase;
    round: number;
    consecutivePasses: number;

    // Game mode
    gameMode: DominoesGameMode;

    // Team data (when gameMode === "team")
    teams?: Record<number, DominoesTeam>;
    teamScores?: Record<number, number>;

    // Individual scores (always available)
    playerScores: Record<string, number>;

    // Round summary data
    roundPipCounts?: Record<string, number>; // Pip counts at end of round
    roundWinner?: string | null; // Player who won the current round (null if blocked tie)
    winningTeam?: number | null; // Team that won (team mode only)
    roundPoints?: number; // Points scored this round
    isRoundTie?: boolean; // True if round ended in a tie (Caribbean rule)

    // End game
    gameWinner?: string;
    winningTeamId?: number;

    // Turn timer (same format as Spades: TurnTimerInfo)
    turnTimer?: {
        startedAt: number; // Unix timestamp (ms) when the turn started
        duration: number; // Total duration in milliseconds
        serverTime: number; // Current server time (ms) when emitted
    };

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
