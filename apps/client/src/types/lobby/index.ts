import { User } from "..";

// ============================================================================
// Room Settings
// ============================================================================

export interface RoomSettings {
    maxPlayers?: number | null; // Room capacity (null = unlimited)
    pauseTimeoutSeconds?: number; // Seconds before auto-abort on pause (default: 120)
    isPrivate?: boolean; // Prevents join via room code (requires request to join)
}

// ============================================================================
// Base Game Settings (all games inherit)
// ============================================================================

export interface BaseGameSettings {
    winTarget: number; // Score/points needed to win
    roundLimit: number | null; // Fixed number of rounds (null = disabled)
    turnTimeLimit: number | null; // Seconds per turn (null = unlimited)
}

// ============================================================================
// Spades Lobby Settings (for lobby form)
// ============================================================================

export interface LobbySpadesSettings extends BaseGameSettings {
    allowNil: boolean; // Standard nil bids allowed
    blindNilEnabled: boolean; // Blind nil (available when 100+ behind)
    blindBidEnabled: boolean; // Blind bids (available when 100+ behind)
    bagsPenalty: number; // Points deducted per 10 bags
    jokersEnabled: boolean; // Include Big/Little Joker in deck
    deuceOfSpadesHigh: boolean; // 2♠ ranks above A♠
}

// ============================================================================
// Dominoes Lobby Settings (for lobby form)
// ============================================================================

export type DominoesGameMode = "individual" | "team";

export interface LobbyDominoesSettings extends BaseGameSettings {
    gameMode: DominoesGameMode; // Play mode (individual or team)
    drawFromBoneyard: boolean; // Allow drawing vs passing
}

// ============================================================================
// Game Settings Type System
// ============================================================================

// Primary type for settings storage and transmission
// Uses intersection type for flexibility in partial updates
export type GameSettings = Partial<LobbySpadesSettings> &
    Partial<LobbyDominoesSettings>;

// Discriminated union for type-safe game-specific settings (future use)
// Use this when you need to ensure settings match a specific game type
export type TypedGameSettings =
    | { gameType: "spades"; settings: Partial<LobbySpadesSettings> }
    | { gameType: "dominoes"; settings: Partial<LobbyDominoesSettings> }
    | { gameType: null; settings: Record<string, never> }; // No game selected

// Helper type guard functions for runtime validation
export function isSpadesSettings(
    settings: GameSettings,
    gameType: string | null
): settings is Partial<LobbySpadesSettings> {
    return gameType === "spades";
}

export function isDominoesSettings(
    settings: GameSettings,
    gameType: string | null
): settings is Partial<LobbyDominoesSettings> {
    return gameType === "dominoes";
}

/**
 * Convert GameSettings to TypedGameSettings for type-safe operations
 */
export function toTypedSettings(
    gameType: string | null,
    settings: GameSettings
): TypedGameSettings {
    if (gameType === "spades") {
        return {
            gameType: "spades",
            settings: settings as Partial<LobbySpadesSettings>,
        };
    } else if (gameType === "dominoes") {
        return {
            gameType: "dominoes",
            settings: settings as Partial<LobbyDominoesSettings>,
        };
    }
    return { gameType: null, settings: {} };
}

// ============================================================================
// Setting Definition (for dynamic UI generation)
// ============================================================================

export type SettingType = "boolean" | "number" | "select" | "nullableNumber";

export type SettingCategory = "general" | "scoring" | "rules" | "advanced";

export interface SelectOption {
    value: string;
    label: string;
}

export interface SettingDependency {
    key: string;
    value: unknown;
}

export interface SettingDefinition {
    key: string; // Property name in settings object
    label: string; // Display label
    description: string; // Tooltip/help text
    type: SettingType; // Control type
    default: unknown; // Default value
    category: SettingCategory; // Grouping
    // Number type constraints
    min?: number;
    max?: number;
    step?: number;
    // Select type options
    options?: SelectOption[];
    // Conditional visibility
    dependsOn?: SettingDependency;
    // Display formatting
    suffix?: string; // e.g., "points", "seconds"
}

// ============================================================================
// Settings Schema (returned from API)
// ============================================================================

export interface GameSettingsSchema {
    definitions: SettingDefinition[];
    defaults: BaseGameSettings;
}

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
    gameSettings?: GameSettings; // Game-specific settings
    isPaused?: boolean; // Track if game is paused due to disconnections
    pausedAt?: string; // ISO timestamp when game was paused
    timeoutAt?: string; // ISO timestamp when the pause timeout expires (used for countdown)
    spectators?: string[]; // User IDs of spectators
};

export type BaseRoomEvent = {
    event: string;
    roomState: LobbyData;
    timestamp: string;
};

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
          gameSettings: GameSettings;
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
