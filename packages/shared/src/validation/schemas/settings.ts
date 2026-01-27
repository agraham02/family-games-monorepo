// packages/shared/src/validation/schemas/settings.ts
// Zod schemas for game settings validation

import { z } from "zod";

// ============================================================================
// Room Settings Schema
// ============================================================================

/**
 * Schema for room-level settings.
 */
export const RoomSettingsSchema = z.object({
    maxPlayers: z.number().int().positive().nullable().optional(),
    pauseTimeoutSeconds: z.number().int().min(30).max(600).optional(),
    isPrivate: z.boolean().optional(),
});

export type RoomSettingsInput = z.infer<typeof RoomSettingsSchema>;

// ============================================================================
// Base Game Settings Schema
// ============================================================================

/**
 * Schema for settings shared by all games.
 */
export const BaseGameSettingsSchema = z.object({
    winTarget: z.number().int().positive(),
    roundLimit: z.number().int().positive().nullable(),
    turnTimeLimit: z.number().int().min(10).max(300).nullable(),
});

export type BaseGameSettingsInput = z.infer<typeof BaseGameSettingsSchema>;

// ============================================================================
// Spades Settings Schema
// ============================================================================

/**
 * Schema for Spades game settings.
 */
export const SpadesSettingsSchema = BaseGameSettingsSchema.extend({
    allowNil: z.boolean(),
    blindNilEnabled: z.boolean(),
    blindBidEnabled: z.boolean(),
    bagsPenalty: z.number().int().max(0), // Should be negative or zero
    jokersEnabled: z.boolean(),
    deuceOfSpadesHigh: z.boolean(),
});

export type SpadesSettingsInput = z.infer<typeof SpadesSettingsSchema>;

/**
 * Partial schema for updating Spades settings.
 */
export const PartialSpadesSettingsSchema = SpadesSettingsSchema.partial();

export type PartialSpadesSettingsInput = z.infer<
    typeof PartialSpadesSettingsSchema
>;

// ============================================================================
// Dominoes Settings Schema
// ============================================================================

/**
 * Schema for Dominoes game mode.
 */
export const DominoesGameModeSchema = z.enum(["individual", "team"]);

/**
 * Schema for Dominoes game settings.
 */
export const DominoesSettingsSchema = BaseGameSettingsSchema.extend({
    gameMode: DominoesGameModeSchema,
    drawFromBoneyard: z.boolean(),
});

export type DominoesSettingsInput = z.infer<typeof DominoesSettingsSchema>;

/**
 * Partial schema for updating Dominoes settings.
 */
export const PartialDominoesSettingsSchema = DominoesSettingsSchema.partial();

export type PartialDominoesSettingsInput = z.infer<
    typeof PartialDominoesSettingsSchema
>;

// ============================================================================
// LRC Settings Schema
// ============================================================================

/**
 * Schema for Left-Right-Center game settings.
 */
export const LRCSettingsSchema = BaseGameSettingsSchema.extend({
    startingChips: z.number().int().min(1).max(10),
    chipValue: z.number().min(0).max(10),
    wildMode: z.boolean(),
    lastChipChallenge: z.boolean(),
});

export type LRCSettingsInput = z.infer<typeof LRCSettingsSchema>;

/**
 * Partial schema for updating LRC settings.
 */
export const PartialLRCSettingsSchema = LRCSettingsSchema.partial();

export type PartialLRCSettingsInput = z.infer<typeof PartialLRCSettingsSchema>;

// ============================================================================
// Union Schema for Any Game Settings
// ============================================================================

/**
 * Zod schema for any game settings (union type).
 */
export const GameSettingsZodSchema = z.union([
    SpadesSettingsSchema,
    DominoesSettingsSchema,
    LRCSettingsSchema,
]);

export type GameSettingsInput = z.infer<typeof GameSettingsZodSchema>;

/**
 * Partial schema for updating any game settings.
 * Used when settings update may contain a subset of fields.
 */
export const PartialGameSettingsSchema = z.object({
    // Base settings
    winTarget: z.number().int().positive().optional(),
    roundLimit: z.number().int().positive().nullable().optional(),
    turnTimeLimit: z.number().int().min(10).max(300).nullable().optional(),
    // Spades settings
    allowNil: z.boolean().optional(),
    blindNilEnabled: z.boolean().optional(),
    blindBidEnabled: z.boolean().optional(),
    bagsPenalty: z.number().int().max(0).optional(),
    jokersEnabled: z.boolean().optional(),
    deuceOfSpadesHigh: z.boolean().optional(),
    // Dominoes settings
    gameMode: DominoesGameModeSchema.optional(),
    drawFromBoneyard: z.boolean().optional(),
    // LRC settings
    startingChips: z.number().int().min(1).max(10).optional(),
    chipValue: z.number().min(0).max(10).optional(),
});

export type PartialGameSettingsInput = z.infer<
    typeof PartialGameSettingsSchema
>;
