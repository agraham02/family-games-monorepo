// apps/api/src/games/lrc/helpers/dice.ts
// Dice rolling and turn order helpers for LRC

import {
    DieFace,
    DieRoll,
    LRCPlayer,
    DIE_FACE_VALUES,
    DIE_FACE_VALUES_WILD,
} from "@family-games/shared";

/**
 * Roll a specified number of LRC dice.
 *
 * Standard dice mapping: 1,2,3 = DOT, 4 = L, 5 = C, 6 = R
 * Wild mode mapping: 1 = WILD, 2,3 = DOT, 4 = L, 5 = C, 6 = R
 *
 * @param count - Number of dice to roll (1-3)
 * @param wildMode - Whether wild mode is enabled
 * @returns Array of die roll results
 */
export function rollDice(count: number, wildMode: boolean): DieRoll[] {
    const rolls: DieRoll[] = [];
    const faceMap = wildMode ? DIE_FACE_VALUES_WILD : DIE_FACE_VALUES;

    for (let i = 0; i < count; i++) {
        const rawValue = Math.floor(Math.random() * 6) + 1;
        const face = faceMap[rawValue];

        rolls.push({
            face,
            rawValue,
        });
    }

    return rolls;
}

// Note: For shuffling, use the shared shuffle utility from '../shared'
// import { shuffle } from '../../shared';

/**
 * Find the next player who should roll.
 * Players with 0 chips skip their turn but remain in the game
 * (they can still receive chips from others' L/R rolls).
 *
 * @param players - Array of all players
 * @param currentIndex - Current player's index
 * @returns Index of next player with chips
 * @throws Error if no player with chips can be found (game should have ended)
 */
export function findNextPlayerIndex(
    players: LRCPlayer[],
    currentIndex: number,
): number {
    const count = players.length;

    // Edge case: no players or single player
    if (count === 0) {
        throw new Error("No players in game");
    }
    if (count === 1) {
        // Single player edge case - if they have chips, they're next
        return players[0].chips > 0 ? 0 : -1;
    }

    let nextIndex = (currentIndex + 1) % count;
    let checked = 0;

    // Find next player with chips, or wrap all the way around
    while (players[nextIndex].chips === 0 && checked < count) {
        nextIndex = (nextIndex + 1) % count;
        checked++;
    }

    // If we've checked all players and none have chips, game should have ended
    if (checked >= count && players[nextIndex].chips === 0) {
        throw new Error(
            "No players with chips remaining - win condition should have been detected",
        );
    }

    return nextIndex;
}

/**
 * Get the number of dice a player should roll.
 * Roll 1 die per chip, maximum 3, minimum 0.
 *
 * @param chips - Number of chips the player has
 * @returns Number of dice to roll (0-3)
 */
export function getDiceCount(chips: number): number {
    // Defensive: handle negative chips (shouldn't happen but be safe)
    return Math.min(Math.max(chips, 0), 3);
}

/**
 * Check if a roll contains 3 wild faces (instant win in wild mode).
 *
 * @param roll - Array of die rolls
 * @returns True if all 3 dice show WILD
 */
export function isTripleWild(roll: DieRoll[]): boolean {
    return roll.length === 3 && roll.every((die) => die.face === "WILD");
}

/**
 * Check if a roll is all dots (for Last Chip Challenge success).
 *
 * @param roll - Array of die rolls
 * @returns True if all dice show DOT
 */
export function isAllDots(roll: DieRoll[]): boolean {
    return roll.every((die) => die.face === "DOT");
}

/**
 * Count how many of each face appear in a roll.
 *
 * @param roll - Array of die rolls
 * @returns Record of face counts
 */
export function countFaces(roll: DieRoll[]): Record<DieFace, number> {
    const counts: Record<DieFace, number> = {
        L: 0,
        C: 0,
        R: 0,
        DOT: 0,
        WILD: 0,
    };

    for (const die of roll) {
        counts[die.face]++;
    }

    return counts;
}
