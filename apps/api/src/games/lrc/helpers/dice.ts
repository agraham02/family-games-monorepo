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

/**
 * Shuffle players for random turn order using Fisher-Yates algorithm.
 *
 * @param players - Array of players to shuffle
 * @returns New shuffled array (does not mutate original)
 */
export function shufflePlayers<T>(players: T[]): T[] {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Find the next player who should roll.
 * Players with 0 chips skip their turn but remain in the game
 * (they can still receive chips from others' L/R rolls).
 *
 * @param players - Array of all players
 * @param currentIndex - Current player's index
 * @returns Index of next player (may be same player if only one has chips)
 */
export function findNextPlayerIndex(
    players: LRCPlayer[],
    currentIndex: number,
): number {
    const count = players.length;
    let nextIndex = (currentIndex + 1) % count;
    let checked = 0;

    // Find next player with chips, or wrap all the way around
    while (players[nextIndex].chips === 0 && checked < count) {
        nextIndex = (nextIndex + 1) % count;
        checked++;
    }

    // If we've checked all players and none have chips, game should have ended
    // Return the next index anyway (will be caught by win condition check)
    return nextIndex;
}

/**
 * Get the number of dice a player should roll.
 * Roll 1 die per chip, maximum 3.
 *
 * @param chips - Number of chips the player has
 * @returns Number of dice to roll (0-3)
 */
export function getDiceCount(chips: number): number {
    return Math.min(chips, 3);
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
