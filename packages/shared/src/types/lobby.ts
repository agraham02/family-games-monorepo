// packages/shared/src/types/lobby.ts
// Lobby-related types for room state and events

import { User } from "./user";
import {
    RoomSettings,
    GameSettings,
    PartialGameSettings,
    BaseGameSettings,
    SpadesSettings,
    DominoesSettings,
    SettingDefinition,
} from "./settings";

// ============================================================================
// Re-export Settings Types for Convenience
// ============================================================================

// Re-export lobby-specific settings with alternate names for backwards compatibility
export type LobbySpadesSettings = SpadesSettings;
export type LobbyDominoesSettings = DominoesSettings;

// ============================================================================
// Game Settings Type System (Client-Side)
// ============================================================================

/**
 * Discriminated union for type-safe game-specific settings.
 * Use this when you need to ensure settings match a specific game type.
 */
export type TypedGameSettings =
    | { gameType: "spades"; settings: Partial<SpadesSettings> }
    | { gameType: "dominoes"; settings: Partial<DominoesSettings> }
    | { gameType: null; settings: Record<string, never> }; // No game selected

/**
 * Type guard for Spades settings.
 */
export function isSpadesSettings(
    settings: PartialGameSettings,
    gameType: string | null
): settings is Partial<SpadesSettings> {
    return gameType === "spades";
}

/**
 * Type guard for Dominoes settings.
 */
export function isDominoesSettings(
    settings: PartialGameSettings,
    gameType: string | null
): settings is Partial<DominoesSettings> {
    return gameType === "dominoes";
}

/**
 * Convert PartialGameSettings to TypedGameSettings for type-safe operations.
 */
export function toTypedSettings(
    gameType: string | null,
    settings: PartialGameSettings
): TypedGameSettings {
    if (gameType === "spades") {
        return {
            gameType: "spades",
            settings: settings as Partial<SpadesSettings>,
        };
    } else if (gameType === "dominoes") {
        return {
            gameType: "dominoes",
            settings: settings as Partial<DominoesSettings>,
        };
    }
    return { gameType: null, settings: {} };
}

// NOTE: GameSettingsSchema is exported from settings.ts

// ============================================================================
// Lobby Data Types
// ============================================================================

/**
 * Lobby state data sent to clients.
 * Represents the current state of a room from the client's perspective.
 */
export type LobbyData = {
    code: string;
    name: string;
    createdAt: string;
    state: string;
    readyStates: Record<string, boolean>;
    roomId: string;
    users: User[];
    leaderId: string;
    selectedGameType: string;
    teams?: string[][]; // Optional, only if game requires teams
    settings?: RoomSettings; // Room-level settings
    gameSettings?: PartialGameSettings; // Game-specific settings
    isPaused?: boolean; // Track if game is paused due to disconnections
    pausedAt?: string; // ISO timestamp when game was paused
    timeoutAt?: string; // ISO timestamp when the pause timeout expires (used for countdown)
    spectators?: string[]; // User IDs of spectators
};

// ============================================================================
// Room Events
// ============================================================================

/**
 * Base structure for room events.
 */
export type BaseRoomEvent = {
    event: string;
    roomState: LobbyData;
    timestamp: string;
};

/**
 * Union type for all room-related socket events.
 */
export type RoomEventPayload =
    | (BaseRoomEvent & { event: "sync" })
    | (BaseRoomEvent & {
          event: "user_joined";
          userName: string;
          isSpectator?: boolean;
      })
    | (BaseRoomEvent & {
          event: "user_left";
          userName: string;
          voluntary?: boolean;
      })
    | (BaseRoomEvent & {
          event: "game_started";
          gameId: string;
          gameState: object;
          gameType: string;
      })
    | (BaseRoomEvent & { event: "room_closed" })
    | (BaseRoomEvent & {
          event: "user_disconnected";
          userName?: string;
          userId: string;
      })
    | (BaseRoomEvent & {
          event: "user_reconnected";
          userName?: string;
          userId: string;
      })
    | (BaseRoomEvent & {
          event: "game_paused";
          userName?: string;
          reason: string;
          timeoutAt: string;
      })
    | (BaseRoomEvent & {
          event: "game_resumed";
          userName?: string;
      })
    | (BaseRoomEvent & {
          event: "leader_promoted";
          newLeaderId: string;
          newLeaderName: string;
      })
    | (BaseRoomEvent & {
          event: "game_aborted";
          reason: string;
      })
    | (BaseRoomEvent & {
          event: "user_kicked";
          userId: string;
          userName?: string;
      })
    | (BaseRoomEvent & {
          event: "room_settings_updated";
          settings: RoomSettings;
      })
    | (BaseRoomEvent & {
          event: "game_settings_updated";
          gameSettings: PartialGameSettings;
      })
    | (BaseRoomEvent & {
          event: "player_moved_to_spectators";
          userId: string;
          userName: string;
      })
    | (BaseRoomEvent & {
          event: "player_slot_claimed";
          claimingUserId: string;
          claimingUserName: string;
          targetSlotUserId: string;
      })
    | (BaseRoomEvent & {
          event: "teams_set";
          teams: string[][];
      });
