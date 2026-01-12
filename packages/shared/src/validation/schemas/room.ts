// packages/shared/src/validation/schemas/room.ts
// Zod schemas for room-related validation

import { z } from "zod";

// ============================================================================
// Player Name Schema
// ============================================================================

/**
 * Schema for player names.
 * - Required (non-empty after trimming)
 * - 2-50 characters
 * - Only letters, numbers, spaces, hyphens, and apostrophes
 */
export const PlayerNameSchema = z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters" })
    .max(50, { error: "Name must be 50 characters or less" })
    .regex(/^[a-zA-Z0-9\s\-']+$/, {
        error: "Name can only contain letters, numbers, spaces, hyphens, and apostrophes",
    });

export type PlayerName = z.infer<typeof PlayerNameSchema>;

// ============================================================================
// Room Name Schema
// ============================================================================

/**
 * Schema for room names.
 * - Optional (empty string is valid)
 * - Max 100 characters if provided
 * - Only letters, numbers, spaces, hyphens, periods, ampersands, and parentheses
 */
export const RoomNameSchema = z
    .string()
    .trim()
    .max(100, { error: "Room name must be 100 characters or less" })
    .refine((val) => !val || /^[a-zA-Z0-9\s\-'.&()]+$/.test(val), {
        error: "Room name contains invalid characters",
    });

export type RoomName = z.infer<typeof RoomNameSchema>;

// ============================================================================
// Room Code Schema
// ============================================================================

/**
 * Schema for room codes.
 * - Required
 * - Exactly 6 characters
 * - Only uppercase letters and numbers (auto-uppercased)
 */
export const RoomCodeSchema = z
    .string()
    .trim()
    .toUpperCase()
    .min(1, { error: "Room code is required" })
    .length(6, { error: "Room code must be exactly 6 characters" })
    .regex(/^[A-Z0-9]{6}$/, {
        error: "Room code must contain only letters and numbers",
    });

export type RoomCode = z.infer<typeof RoomCodeSchema>;

// ============================================================================
// Create/Join Room Request Schemas
// ============================================================================

/**
 * Schema for creating a room request.
 */
export const CreateRoomRequestSchema = z.object({
    playerName: PlayerNameSchema,
    roomName: RoomNameSchema.optional().default(""),
});

export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;

/**
 * Schema for joining a room request.
 */
export const JoinRoomRequestSchema = z.object({
    playerName: PlayerNameSchema,
    roomCode: RoomCodeSchema,
});

export type JoinRoomRequest = z.infer<typeof JoinRoomRequestSchema>;
