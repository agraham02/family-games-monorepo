// packages/shared/src/constants/teams.ts
// Team name and display constants

// Note: Team color schemes (Tailwind classes) are in apps/client/src/lib/colors/teamColors.ts
// This file only contains UI-agnostic team constants.

// ============================================================================
// Team Names
// ============================================================================

/**
 * Default team display names.
 */
export const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4"] as const;

/**
 * Get team display name by index (0-based).
 * Falls back to "Team N+1" for indices beyond predefined names.
 * @param teamIndex The team index (0-based)
 * @returns Team display name
 */
export function getTeamName(teamIndex: number): string {
    return TEAM_NAMES[teamIndex] ?? `Team ${teamIndex + 1}`;
}

// ============================================================================
// Team Utilities
// ============================================================================

/**
 * Get the number of predefined team names available.
 */
export const MAX_TEAM_NAMES = TEAM_NAMES.length;

/**
 * Maximum supported teams (matches color schemes in client).
 */
export const MAX_TEAMS = 4;
