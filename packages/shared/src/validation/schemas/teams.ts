// packages/shared/src/validation/schemas/teams.ts
// Zod schemas for team-related validation

import { z } from "zod";

// ============================================================================
// Team Structure Schemas
// ============================================================================

/**
 * Schema for a single team (array of user IDs).
 * Empty strings represent unassigned slots.
 */
export const TeamSchema = z.array(z.string());

export type Team = z.infer<typeof TeamSchema>;

/**
 * Schema for all teams in a room.
 * Array of teams, each containing user IDs.
 */
export const TeamsSchema = z
    .array(TeamSchema)
    .min(1, { error: "At least one team is required" });

export type Teams = z.infer<typeof TeamsSchema>;

// ============================================================================
// Team Requirements Schema
// ============================================================================

/**
 * Schema for team requirements configuration.
 */
export const TeamRequirementsSchema = z.object({
    numTeams: z.number().int().positive(),
    playersPerTeam: z.number().int().positive(),
});

export type TeamRequirements = z.infer<typeof TeamRequirementsSchema>;

// ============================================================================
// Team Update Request Schema
// ============================================================================

/**
 * Schema for updating teams in a room.
 */
export const UpdateTeamsRequestSchema = z.object({
    teams: TeamsSchema,
});

export type UpdateTeamsRequest = z.infer<typeof UpdateTeamsRequestSchema>;

// ============================================================================
// Helper Schemas
// ============================================================================

/**
 * Schema for a user ID (non-empty string).
 */
export const UserIdSchema = z.string().min(1, { error: "User ID is required" });

export type UserId = z.infer<typeof UserIdSchema>;

/**
 * Schema for an array of user IDs.
 */
export const UserIdsSchema = z.array(UserIdSchema);

export type UserIds = z.infer<typeof UserIdsSchema>;
