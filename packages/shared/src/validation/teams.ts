// packages/shared/src/validation/teams.ts
// Team validation utilities for games requiring team-based play

import { SPADES_TEAM_REQUIREMENTS } from "../types/games/spades";

// ============================================================================
// Team Requirements Registry
// ============================================================================

/**
 * Team requirements for each game type.
 * Games not listed here don't require teams.
 */
export const TEAM_REQUIREMENTS: Record<
    string,
    { numTeams: number; playersPerTeam: number }
> = {
    spades: SPADES_TEAM_REQUIREMENTS,
    // Add more games as they're implemented:
    // dominoes: { numTeams: 2, playersPerTeam: 2 }, // Only for team mode
};

// ============================================================================
// Team Validation
// ============================================================================

/**
 * Validates teams for a given game type.
 * @param gameType The selected game type (e.g., 'spades')
 * @param teams Array of teams (each team is an array of userIds)
 * @param users Array of userIds in the room
 * @param requireComplete If true, requires all slots filled (for starting game). Default false.
 * @throws Error if teams are invalid for the game
 */
export function validateTeamsForGame(
    gameType: string,
    teams: string[][],
    users: string[],
    requireComplete: boolean = false
): void {
    if (!Array.isArray(teams) || teams.length < 1) {
        throw new Error("Teams must be a non-empty array of arrays.");
    }

    // Get all assigned user IDs (filter out empty strings)
    const allTeamUserIds = teams.flat().filter((id) => id !== "");
    const uniqueAssigned = new Set(allTeamUserIds);

    // Check for duplicates
    if (allTeamUserIds.length !== uniqueAssigned.size) {
        throw new Error("A player cannot be assigned to multiple teams.");
    }

    // Check that assigned users are actually in the room
    for (const id of allTeamUserIds) {
        if (!users.includes(id)) {
            throw new Error("Cannot assign a player who is not in the room.");
        }
    }

    const req = TEAM_REQUIREMENTS[gameType];
    if (req) {
        // Always check team count
        if (teams.length !== req.numTeams) {
            throw new Error(
                `${gameType} requires exactly ${req.numTeams} teams.`
            );
        }

        // Only check full team slots when requireComplete is true (for starting game)
        if (requireComplete) {
            if (
                !teams.every(
                    (team) => team.filter(Boolean).length === req.playersPerTeam
                )
            ) {
                throw new Error(
                    `Each team in ${gameType} must have exactly ${req.playersPerTeam} players to start the game.`
                );
            }

            // Also verify all users are assigned when complete
            if (allTeamUserIds.length !== users.length) {
                throw new Error(
                    "All players must be assigned to a team to start the game."
                );
            }
        }
    }
    // For games that don't require teams, optionally allow empty or single team
}

/**
 * Check if a game type requires teams.
 * @param gameType The game type to check
 * @returns True if the game requires teams
 */
export function gameRequiresTeams(gameType: string): boolean {
    return gameType in TEAM_REQUIREMENTS;
}

/**
 * Get team requirements for a game type.
 * @param gameType The game type
 * @returns Team requirements or undefined if game doesn't require teams
 */
export function getTeamRequirements(
    gameType: string
): { numTeams: number; playersPerTeam: number } | undefined {
    return TEAM_REQUIREMENTS[gameType];
}
