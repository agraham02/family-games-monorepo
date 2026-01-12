// packages/shared/src/validation/room.ts
// Validation utilities for room and player name inputs

import {
    PlayerNameSchema,
    RoomNameSchema,
    RoomCodeSchema,
} from "./schemas/room";

/**
 * Standard validation error structure.
 * Used across all validation functions.
 */
export interface ValidationError {
    field: string;
    message: string;
}

// ============================================================================
// Player Name Validation
// ============================================================================

/**
 * Validates a player name.
 * @param name The player name to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validatePlayerName(name: string): ValidationError | null {
    const result = PlayerNameSchema.safeParse(name);
    if (result.success) {
        return null;
    }
    return {
        field: "name",
        message: result.error.issues[0]?.message ?? "Invalid name",
    };
}

// ============================================================================
// Room Name Validation
// ============================================================================

/**
 * Validates a room name.
 * Room names are optional, so empty string is valid.
 * @param roomName The room name to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateRoomName(roomName: string): ValidationError | null {
    const result = RoomNameSchema.safeParse(roomName);
    if (result.success) {
        return null;
    }
    return {
        field: "roomName",
        message: result.error.issues[0]?.message ?? "Invalid room name",
    };
}

// ============================================================================
// Room Code Validation
// ============================================================================

/**
 * Validates a room code.
 * Room codes must be exactly 6 alphanumeric characters.
 * @param roomCode The room code to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateRoomCode(roomCode: string): ValidationError | null {
    const result = RoomCodeSchema.safeParse(roomCode);
    if (result.success) {
        return null;
    }
    return {
        field: "roomCode",
        message: result.error.issues[0]?.message ?? "Invalid room code",
    };
}

// ============================================================================
// Parse Functions (Validate + Transform)
// ============================================================================

/**
 * Parses and sanitizes a player name.
 * Returns the trimmed name if valid, or null if invalid.
 * Use this when you need the sanitized value after validation.
 *
 * @param name The player name to parse
 * @returns The trimmed name if valid, null if invalid
 */
export function parsePlayerName(name: string): string | null {
    const result = PlayerNameSchema.safeParse(name);
    return result.success ? result.data : null;
}

/**
 * Parses and sanitizes a room name.
 * Returns the trimmed name if valid, or null if invalid.
 *
 * @param roomName The room name to parse
 * @returns The trimmed room name if valid, null if invalid
 */
export function parseRoomName(roomName: string): string | null {
    const result = RoomNameSchema.safeParse(roomName);
    return result.success ? result.data : null;
}

/**
 * Parses and sanitizes a room code.
 * Returns the trimmed, uppercased code if valid, or null if invalid.
 *
 * @param roomCode The room code to parse
 * @returns The sanitized room code if valid, null if invalid
 */
export function parseRoomCode(roomCode: string): string | null {
    const result = RoomCodeSchema.safeParse(roomCode);
    return result.success ? result.data : null;
}
