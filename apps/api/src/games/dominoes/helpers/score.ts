// src/games/dominoes/helpers/score.ts

import {
    Tile,
    DominoesGameMode,
    DominoesTeam,
    DominoesRoundScoreResult,
} from "@family-games/shared";

/**
 * Calculate the pip count (sum of dots) on a tile
 */
export function getTilePipCount(tile: Tile): number {
    return tile.left + tile.right;
}

/**
 * Calculate total pip count for a hand of tiles
 */
export function getHandPipCount(hand: Tile[]): number {
    return hand.reduce((sum, tile) => sum + getTilePipCount(tile), 0);
}

/**
 * Find which team a player belongs to
 */
function getPlayerTeamId(
    playerId: string,
    teams: Record<number, DominoesTeam>,
): number | null {
    for (const [teamId, team] of Object.entries(teams)) {
        if (team.players.includes(playerId)) {
            return Number(teamId);
        }
    }
    return null;
}

/**
 * Calculate scores when a round ends.
 * Supports both individual and team modes with Caribbean (Jamaican) tie-breaking rules.
 *
 * Individual mode:
 * - Winner gets the sum of all opponents' remaining tile pip counts
 * - If game is blocked and multiple players tie for lowest pip count, round is a tie (no points)
 *
 * Team mode (Caribbean Partner Dominoes):
 * - Winner's TEAM gets the sum of the OPPONENT TEAM's pip counts (not partner's)
 * - If blocked: team of player with lowest pip count wins
 * - If players from different teams tie for lowest: round is a tie (no points)
 */
export function calculateRoundScores(
    hands: Record<string, Tile[]>,
    currentPlayerScores: Record<string, number>,
    currentTeamScores: Record<number, number>,
    winnerId: string | null,
    gameMode: DominoesGameMode,
    teams?: Record<number, DominoesTeam>,
): DominoesRoundScoreResult {
    const pipCounts: Record<string, number> = {};
    const newPlayerScores: Record<string, number> = { ...currentPlayerScores };
    const newTeamScores: Record<number, number> = { ...currentTeamScores };

    // Calculate pip count for each player's remaining tiles
    for (const [playerId, hand] of Object.entries(hands)) {
        pipCounts[playerId] = getHandPipCount(hand);
    }

    // ========================================================================
    // TEAM MODE SCORING
    // ========================================================================
    if (gameMode === "team" && teams) {
        return calculateTeamRoundScores(
            hands,
            pipCounts,
            newPlayerScores,
            newTeamScores,
            winnerId,
            teams,
        );
    }

    // ========================================================================
    // INDIVIDUAL MODE SCORING (existing logic)
    // ========================================================================
    return calculateIndividualRoundScores(
        hands,
        pipCounts,
        newPlayerScores,
        winnerId,
    );
}

/**
 * Calculate round scores for team mode (Caribbean Partner Dominoes)
 */
function calculateTeamRoundScores(
    hands: Record<string, Tile[]>,
    pipCounts: Record<string, number>,
    playerScores: Record<string, number>,
    teamScores: Record<number, number>,
    winnerId: string | null,
    teams: Record<number, DominoesTeam>,
): DominoesRoundScoreResult {
    // If there's a clear winner (player went out), their TEAM wins
    if (winnerId && hands[winnerId].length === 0) {
        const winningTeamId = getPlayerTeamId(winnerId, teams);
        if (winningTeamId === null) {
            throw new Error(`Winner ${winnerId} not found in any team`);
        }

        // Sum opponent team's pip counts
        const opponentTeamId = winningTeamId === 0 ? 1 : 0;
        const opponentPips = teams[opponentTeamId].players.reduce(
            (sum, playerId) => sum + (pipCounts[playerId] || 0),
            0,
        );

        teamScores[winningTeamId] =
            (teamScores[winningTeamId] || 0) + opponentPips;

        return {
            playerScores,
            teamScores,
            pipCounts,
            roundWinner: winnerId,
            winningTeam: winningTeamId,
            roundPoints: opponentPips,
            isTie: false,
        };
    }

    // Game is blocked - find player(s) with lowest pip count
    let lowestPipCount = Infinity;
    for (const pipCount of Object.values(pipCounts)) {
        if (pipCount < lowestPipCount) {
            lowestPipCount = pipCount;
        }
    }

    // Find all players with the lowest pip count
    const playersWithLowestPips = Object.entries(pipCounts)
        .filter(([, pips]) => pips === lowestPipCount)
        .map(([playerId]) => playerId);

    // Get teams of players with lowest pips
    const teamsWithLowestPips = new Set(
        playersWithLowestPips.map((playerId) =>
            getPlayerTeamId(playerId, teams),
        ),
    );

    // Caribbean rule: If players from DIFFERENT teams tie for lowest, round is a tie
    if (teamsWithLowestPips.size > 1) {
        return {
            playerScores,
            teamScores, // No score changes
            pipCounts,
            roundWinner: null,
            winningTeam: null,
            roundPoints: 0,
            isTie: true,
        };
    }

    // Single team has lowest - that team wins
    const winningTeamId = Array.from(teamsWithLowestPips)[0];
    if (winningTeamId === null) {
        throw new Error("Could not determine winning team");
    }

    const blockWinnerId = playersWithLowestPips[0]; // Player with lowest pips
    const opponentTeamId = winningTeamId === 0 ? 1 : 0;

    // Winning team gets opponent team's pips
    const opponentPips = teams[opponentTeamId].players.reduce(
        (sum, playerId) => sum + (pipCounts[playerId] || 0),
        0,
    );

    teamScores[winningTeamId] = (teamScores[winningTeamId] || 0) + opponentPips;

    return {
        playerScores,
        teamScores,
        pipCounts,
        roundWinner: blockWinnerId,
        winningTeam: winningTeamId,
        roundPoints: opponentPips,
        isTie: false,
    };
}

/**
 * Calculate round scores for individual mode
 */
function calculateIndividualRoundScores(
    hands: Record<string, Tile[]>,
    pipCounts: Record<string, number>,
    playerScores: Record<string, number>,
    winnerId: string | null,
): DominoesRoundScoreResult {
    // If there's a clear winner (went out), they get all opponent pip counts
    if (winnerId && hands[winnerId].length === 0) {
        const winnerPoints = Object.entries(pipCounts)
            .filter(([id]) => id !== winnerId)
            .reduce((sum, [, pips]) => sum + pips, 0);

        playerScores[winnerId] = (playerScores[winnerId] || 0) + winnerPoints;

        return {
            playerScores,
            teamScores: {},
            pipCounts,
            roundWinner: winnerId,
            winningTeam: null,
            roundPoints: winnerPoints,
            isTie: false,
        };
    }

    // Game is blocked - find player(s) with lowest pip count
    let lowestPipCount = Infinity;
    for (const pipCount of Object.values(pipCounts)) {
        if (pipCount < lowestPipCount) {
            lowestPipCount = pipCount;
        }
    }

    // Find all players with the lowest pip count
    const playersWithLowestPips = Object.entries(pipCounts)
        .filter(([, pips]) => pips === lowestPipCount)
        .map(([playerId]) => playerId);

    // Caribbean rule: If multiple players tie for lowest, round is a tie
    if (playersWithLowestPips.length > 1) {
        return {
            playerScores, // No score changes
            teamScores: {},
            pipCounts,
            roundWinner: null,
            winningTeam: null,
            roundPoints: 0,
            isTie: true,
        };
    }

    // Single winner with lowest pip count
    const blockWinnerId = playersWithLowestPips[0];
    const winnerPoints = Object.entries(pipCounts)
        .filter(([id]) => id !== blockWinnerId)
        .reduce((sum, [, pips]) => sum + (pips - lowestPipCount), 0);

    playerScores[blockWinnerId] =
        (playerScores[blockWinnerId] || 0) + winnerPoints;

    return {
        playerScores,
        teamScores: {},
        pipCounts,
        roundWinner: blockWinnerId,
        winningTeam: null,
        roundPoints: winnerPoints,
        isTie: false,
    };
}

/**
 * Check if any player/team has reached the winning score
 */
export function checkWinCondition(
    scores: Record<string, number> | Record<number, number>,
    winTarget: number,
): string | number | null {
    for (const [id, score] of Object.entries(scores)) {
        if (score >= winTarget) {
            return id;
        }
    }
    return null;
}
