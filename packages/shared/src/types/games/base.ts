// packages/shared/src/types/games/base.ts
// Base game types shared between client and API

import { User } from "../user";
import { BaseGameSettings } from "../settings";

// ============================================================================
// Player Collections
// ============================================================================

/**
 * Map of player IDs to User objects.
 * Used as the primary player collection in game state.
 */
export type Players = Record<string, User>;

/**
 * Alias for Players type, used in GameManager context.
 */
export type GamePlayers = Record<string, User>;

// ============================================================================
// Base Game State
// ============================================================================

/**
 * Base interface for all game states.
 * All game-specific states should extend this.
 */
export interface GameState {
    id: string;
    roomId: string;
    type: string;
    settings: BaseGameSettings;
    players: GamePlayers;
    history?: string[]; // Optional history for game actions
    leaderId: string;
    // ...other game-specific state is added by extending interfaces
}

/**
 * Base game data sent to clients (public state).
 * Contains only information that all players should see.
 */
export type BaseGameData = {
    type: string;
    players: Players;
    leaderId: string;
    // Add other shared fields here if needed
};

/**
 * Base player-specific data (private state for each player).
 * Extended by game-specific player data types.
 */
export type BasePlayerData = {
    localOrdering: string[];
    // Add other shared fields here if needed
};

// ============================================================================
// Game Events
// ============================================================================

/**
 * Base structure for all game events.
 */
export type BaseGameEvent = {
    event: string;
};

/**
 * Union type for all game-related socket events.
 * Generic type T allows specifying the game data type.
 * Generic type P allows specifying the player data type.
 */
export type GameEventPayload<T = BaseGameData, P = BasePlayerData> =
    | (BaseGameEvent & { event: "sync"; gameState: T })
    | { event: "player_sync"; playerState: P }
    | { event: "player_left"; userName: string }
    | { event: "game_aborted"; reason: string }
    | { event: "game_paused"; reason: string; timeoutAt: string }
    | { event: "game_resumed" }
    | { event: "user_disconnected"; userName?: string; userId: string }
    | { event: "user_reconnected"; userName?: string; userId: string };

// ============================================================================
// Game Actions
// ============================================================================

/**
 * Base interface for all game actions.
 * Game-specific actions should extend this or define their own structure.
 */
export interface GameAction {
    type: string;
    payload?: unknown;
    userId: string;
}

// ============================================================================
// Game Module Interface (for API game implementations)
// ============================================================================

import { SettingDefinition, PartialGameSettings } from "../settings";
import { Room } from "../room";

/**
 * Metadata describing a game module's capabilities.
 * Used for game registration and dynamic UI generation.
 */
export interface GameModuleMetadata {
    type: string;
    displayName: string;
    description?: string;
    requiresTeams: boolean;
    minPlayers: number;
    maxPlayers: number;
    numTeams?: number;
    playersPerTeam?: number;
    settingsDefinitions?: SettingDefinition[];
    defaultSettings?: BaseGameSettings;
}

/**
 * Interface for game module implementations.
 * Each game type (spades, dominoes, etc.) implements this interface.
 */
export interface GameModule<TState extends GameState = GameState> {
    init(room: Room, customSettings?: PartialGameSettings): TState;
    reducer(state: TState, action: GameAction): TState;
    getState(state: TState): Partial<TState>;
    getPlayerState(
        state: TState,
        userId: string
    ): Partial<TState> & { hand?: unknown; localOrdering?: string[] };
    checkMinimumPlayers?(state: TState): boolean;
    handlePlayerReconnect?(state: TState, userId: string): TState;
    handlePlayerDisconnect?(state: TState, userId: string): TState;
    metadata: GameModuleMetadata;
}
