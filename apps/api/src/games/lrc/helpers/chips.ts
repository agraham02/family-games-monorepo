// apps/api/src/games/lrc/helpers/chips.ts
// Chip movement and win condition helpers for LRC

import { ChipMovement, DieRoll, LRCPlayer } from "@family-games/shared";

/**
 * Calculate chip movements based on dice roll.
 * Uses player array order (seat indices) to determine left/right neighbors.
 *
 * Note: WILD dice are not processed here - they need target selection first.
 *
 * @param players - Array of all players in seat order
 * @param rollerIndex - Index of the player who rolled
 * @param roll - Array of die roll results
 * @param wildTargets - Array of player IDs for WILD targets (in order of WILD dice)
 * @returns Array of chip movements
 */
export function calculateChipMovements(
    players: LRCPlayer[],
    rollerIndex: number,
    roll: DieRoll[],
    wildTargets: string[] = [],
): ChipMovement[] {
    const movements: ChipMovement[] = [];
    const roller = players[rollerIndex];
    const count = players.length;

    // Indices for neighbors (wrap around)
    const leftIndex = (rollerIndex - 1 + count) % count;
    const rightIndex = (rollerIndex + 1) % count;

    let wildTargetIndex = 0;

    for (const die of roll) {
        const movement: ChipMovement = {
            fromPlayerId: roller.id,
            toPlayerId: "center", // Default, will be overwritten
            count: 1,
            dieFace: die.face,
        };

        switch (die.face) {
            case "L":
                movement.toPlayerId = players[leftIndex].id;
                movements.push(movement);
                break;

            case "R":
                movement.toPlayerId = players[rightIndex].id;
                movements.push(movement);
                break;

            case "C":
                movement.toPlayerId = "center";
                movements.push(movement);
                break;

            case "WILD":
                // Use pre-selected target for WILD
                if (wildTargets[wildTargetIndex]) {
                    movement.toPlayerId = wildTargets[wildTargetIndex];
                    movements.push(movement);
                    wildTargetIndex++;
                }
                // If no target yet, movement will be added after selection
                break;

            case "DOT":
                // No movement - keep chip
                break;
        }
    }

    return movements;
}

/**
 * Apply chip movements to create updated player array.
 * Returns a new array (immutable operation).
 *
 * @param players - Current player array
 * @param movements - Chip movements to apply
 * @returns Updated player array with new chip counts
 */
export function applyChipMovements(
    players: LRCPlayer[],
    movements: ChipMovement[],
): { players: LRCPlayer[]; centerPotDelta: number } {
    // Create a map for chip deltas
    const chipDeltas = new Map<string, number>();
    let centerPotDelta = 0;

    // Initialize all players with 0 delta
    for (const player of players) {
        chipDeltas.set(player.id, 0);
    }

    // Calculate deltas from movements
    for (const movement of movements) {
        // Subtract from sender
        const currentFrom = chipDeltas.get(movement.fromPlayerId) ?? 0;
        chipDeltas.set(movement.fromPlayerId, currentFrom - movement.count);

        // Add to receiver (or center)
        if (movement.toPlayerId === "center") {
            centerPotDelta += movement.count;
        } else {
            const currentTo = chipDeltas.get(movement.toPlayerId) ?? 0;
            chipDeltas.set(movement.toPlayerId, currentTo + movement.count);
        }
    }

    // Apply deltas to create new player array
    const updatedPlayers = players.map((player) => ({
        ...player,
        chips: Math.max(0, player.chips + (chipDeltas.get(player.id) ?? 0)),
    }));

    return { players: updatedPlayers, centerPotDelta };
}

/**
 * Check if exactly one player has chips remaining (win condition).
 *
 * @param players - Array of all players
 * @returns The winning player, or null if no winner yet
 */
export function checkWinCondition(players: LRCPlayer[]): LRCPlayer | null {
    const playersWithChips = players.filter((p) => p.chips > 0);

    if (playersWithChips.length === 1) {
        return playersWithChips[0];
    }

    return null;
}

/**
 * Find the player with the most chips (for Wild mode auto-targeting).
 * Excludes the roller from consideration.
 * If there's a tie, returns the first player in seat order with max chips.
 *
 * @param players - Array of all players
 * @param excludePlayerId - Player ID to exclude (the roller)
 * @returns Player ID with most chips, or null if no valid targets
 */
export function findPlayerWithMostChips(
    players: LRCPlayer[],
    excludePlayerId: string,
): string | null {
    let maxChips = 0;
    let targetId: string | null = null;

    for (const player of players) {
        if (player.id !== excludePlayerId && player.chips > maxChips) {
            maxChips = player.chips;
            targetId = player.id;
        }
    }

    return targetId;
}

/**
 * Get all valid targets for Wild dice (players with chips, excluding roller).
 *
 * @param players - Array of all players
 * @param excludePlayerId - Player ID to exclude (the roller)
 * @returns Array of player IDs that are valid Wild targets
 */
export function getValidWildTargets(
    players: LRCPlayer[],
    excludePlayerId: string,
): string[] {
    return players
        .filter((p) => p.id !== excludePlayerId && p.chips > 0)
        .map((p) => p.id);
}

/**
 * Count the number of WILD faces in a roll.
 *
 * @param roll - Array of die rolls
 * @returns Number of WILD dice
 */
export function countWildDice(roll: DieRoll[]): number {
    return roll.filter((die) => die.face === "WILD").length;
}

/**
 * Calculate total chips in the game (for validation).
 *
 * @param players - Array of all players
 * @param centerPot - Chips in center pot
 * @returns Total chip count
 */
export function calculateTotalChips(
    players: LRCPlayer[],
    centerPot: number,
): number {
    const playerChips = players.reduce((sum, p) => sum + p.chips, 0);
    return playerChips + centerPot;
}

/**
 * Get left and right neighbor indices for a player.
 *
 * @param playerIndex - Index of the player
 * @param playerCount - Total number of players
 * @returns Object with leftIndex and rightIndex
 */
export function getNeighborIndices(
    playerIndex: number,
    playerCount: number,
): { leftIndex: number; rightIndex: number } {
    return {
        leftIndex: (playerIndex - 1 + playerCount) % playerCount,
        rightIndex: (playerIndex + 1) % playerCount,
    };
}
