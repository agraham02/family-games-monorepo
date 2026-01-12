// packages/shared/src/types/user.ts
// User-related types shared between client and API

/**
 * Represents a user in the system.
 * Used in rooms, games, and player lists.
 */
export interface User {
    id: string;
    name: string;
    isConnected?: boolean; // Track connection status for rejoin logic
}

/**
 * Metadata describing a game type's capabilities and requirements.
 * Used for game registration and lobby display.
 */
export interface GameTypeMetadata {
    type: string;
    displayName: string;
    maxPlayers: number;
    minPlayers: number;
    requiresTeams: boolean;
    numTeams?: number;
    playersPerTeam?: number;
    description?: string;
    /** Whether this game is enabled for play. Defaults to true if not specified. */
    enabled?: boolean;
    /** Whether this game is marked as coming soon (shown but not selectable). */
    comingSoon?: boolean;
}

/**
 * Response payload when creating and joining a new room.
 */
export interface CreateAndJoinRoomResponse {
    roomId: string;
    userId: string;
    roomCode: string;
}
