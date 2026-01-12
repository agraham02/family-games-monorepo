// packages/shared/src/types/room.ts
// Room-related types shared between client and API

import { User } from "./user";
import { RoomSettings, PartialGameSettings } from "./settings";

/**
 * Represents a room where users can gather to play games.
 * Contains all state needed for lobby and game management.
 */
export interface Room {
    id: string;
    code: string;
    name: string;
    users: User[];
    leaderId: string;
    readyStates: Record<string, boolean>;
    state: "lobby" | "in-game" | "ended";
    gameId: string | null;
    selectedGameType: string;
    createdAt: Date;
    teams?: string[][]; // Array of teams, each team is an array of userIds
    settings?: RoomSettings; // Room-level settings
    gameSettings?: PartialGameSettings; // Game-specific settings (persisted across games)
    isPaused?: boolean; // Track if game is paused due to disconnections
    pausedAt?: Date; // Timestamp when game was paused (for timeout countdown)
    timeoutAt?: Date; // Timestamp when the pause timeout expires (for countdown on client)
    spectators?: string[]; // Array of user IDs who are spectating
    kickedUserIds?: string[]; // Array of user IDs who have been kicked (cannot rejoin)
}

// Re-export settings types for backwards compatibility
export type { RoomSettings, PartialGameSettings } from "./settings";
