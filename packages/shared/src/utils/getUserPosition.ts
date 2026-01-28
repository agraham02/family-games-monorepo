// packages/shared/src/utils/getUserPosition.ts
// Utility to determine a user's position within a room

import type { LobbyData } from "../types/lobby";

/**
 * Represents the possible positions a user can have within a room.
 * - "lobby-only": User is in the room but not participating in the current game
 * - "in-game": User is an active player in the current game
 * - "spectating": User is watching the game as a spectator
 */
export type UserPosition = "lobby-only" | "in-game" | "spectating";

/**
 * Determines a user's position within a room based on the current room state.
 *
 * @param roomState - The current lobby/room state
 * @param userId - The user ID to check
 * @returns The user's position: "lobby-only", "in-game", or "spectating"
 *
 * @example
 * ```ts
 * const position = getUserPosition(lobbyData, currentUserId);
 * if (position === "in-game") {
 *   // Show game controls
 * } else if (position === "spectating") {
 *   // Show spectator UI
 * } else {
 *   // Show lobby UI
 * }
 * ```
 */
export function getUserPosition(
    roomState: LobbyData | null | undefined,
    userId: string | null | undefined,
): UserPosition {
    // If no room state or user ID, default to lobby-only
    if (!roomState || !userId) {
        return "lobby-only";
    }

    // If room is not in an active game, everyone is in lobby
    if (roomState.state !== "in-game") {
        return "lobby-only";
    }

    // Check if user is a spectator
    if (roomState.spectators?.includes(userId)) {
        return "spectating";
    }

    // Check if user is in the active game
    // Use gamePlayerIds if available, otherwise fall back to checking users list
    if (roomState.gamePlayerIds?.includes(userId)) {
        return "in-game";
    }

    // Fallback: if gamePlayerIds not populated (undefined or empty array),
    // check if user is in users list and not a spectator (legacy compatibility)
    const hasGamePlayerIds =
        roomState.gamePlayerIds && roomState.gamePlayerIds.length > 0;
    if (
        !hasGamePlayerIds &&
        roomState.users.some((u) => u.id === userId) &&
        !roomState.spectators?.includes(userId)
    ) {
        return "in-game";
    }

    // User is in the room but not in the game (joined after game started)
    return "lobby-only";
}

/**
 * Checks if a user is eligible to rejoin an active game.
 * Only original game players can rejoin.
 *
 * @param roomState - The current lobby/room state
 * @param userId - The user ID to check
 * @returns True if the user can rejoin the game
 */
export function canRejoinGame(
    roomState: LobbyData | null | undefined,
    userId: string | null | undefined,
): boolean {
    if (!roomState || !userId) {
        return false;
    }

    // Must be in an active game
    if (roomState.state !== "in-game") {
        return false;
    }

    // Check if user was an original player
    return roomState.originalGamePlayerIds?.includes(userId) ?? false;
}

/**
 * Checks if a user is currently a spectator.
 *
 * @param roomState - The current lobby/room state
 * @param userId - The user ID to check
 * @returns True if the user is spectating
 */
export function isSpectator(
    roomState: LobbyData | null | undefined,
    userId: string | null | undefined,
): boolean {
    if (!roomState || !userId) {
        return false;
    }

    return roomState.spectators?.includes(userId) ?? false;
}
