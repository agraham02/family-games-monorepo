// packages/shared/src/utils/shuffle.ts
// Generic shuffle utility

/**
 * Fisher-Yates shuffle (unbiased, O(n)).
 * Generic implementation that works with any array type.
 * Keep randomness *only* here so the rest of the engine is replayable.
 *
 * @param items Array to shuffle
 * @param rng Random number generator function (default: Math.random)
 * @returns New shuffled array (original is not modified)
 */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * Pick a random element from an array.
 * @param items Array to pick from
 * @param rng Random number generator function (default: Math.random)
 * @returns Random element or undefined if array is empty
 */
export function pickRandom<T>(
    items: T[],
    rng: () => number = Math.random
): T | undefined {
    if (items.length === 0) return undefined;
    return items[Math.floor(rng() * items.length)];
}

/**
 * Pick N random elements from an array (without replacement).
 * @param items Array to pick from
 * @param count Number of elements to pick
 * @param rng Random number generator function (default: Math.random)
 * @returns Array of random elements
 */
export function pickRandomN<T>(
    items: T[],
    count: number,
    rng: () => number = Math.random
): T[] {
    const shuffled = shuffle(items, rng);
    return shuffled.slice(0, Math.min(count, items.length));
}
