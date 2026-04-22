// packages/shared/src/types/games/cards.ts
// Shared playing-card primitives used by all card-based games.
//
// Originally lived in spades.ts. Lifted here so additional games (Rummy,
// future Hearts/Euchre/etc.) can consume the same types without depending
// on Spades. spades.ts re-exports these for backward compatibility.

// ============================================================================
// Suit & Rank
// ============================================================================

export enum Suit {
    Hearts = "Hearts",
    Diamonds = "Diamonds",
    Clubs = "Clubs",
    Spades = "Spades",
}

export enum Rank {
    Ace = "A",
    Two = "2",
    Three = "3",
    Four = "4",
    Five = "5",
    Six = "6",
    Seven = "7",
    Eight = "8",
    Nine = "9",
    Ten = "10",
    Jack = "J",
    Queen = "Q",
    King = "K",
    LittleJoker = "LJ",
    BigJoker = "BJ",
}

// ============================================================================
// Card representations
// ============================================================================

/**
 * Server-side card (immutable).
 */
export interface Card {
    readonly rank: Rank;
    readonly suit: Suit;
}

/**
 * Client-side card. Uses string suit/rank to keep render layer flexible
 * (also allows future jokers without bleeding into the enum).
 */
export interface PlayingCard {
    readonly rank: string;
    readonly suit: "Spades" | "Hearts" | "Diamonds" | "Clubs";
}

// ============================================================================
// Standard rank ordering (used for runs / sorting)
// ============================================================================

/**
 * Numeric value for run/sort ordering. Ace is low (1) for Rummy runs.
 * Jokers are not orderable (return null).
 */
export const RANK_ORDER: Record<Rank, number | null> = {
    [Rank.Ace]: 1,
    [Rank.Two]: 2,
    [Rank.Three]: 3,
    [Rank.Four]: 4,
    [Rank.Five]: 5,
    [Rank.Six]: 6,
    [Rank.Seven]: 7,
    [Rank.Eight]: 8,
    [Rank.Nine]: 9,
    [Rank.Ten]: 10,
    [Rank.Jack]: 11,
    [Rank.Queen]: 12,
    [Rank.King]: 13,
    [Rank.LittleJoker]: null,
    [Rank.BigJoker]: null,
};

/**
 * Convert a PlayingCard rank string to the Rank enum, or null if unknown.
 */
export function parseRank(rank: string): Rank | null {
    const map: Record<string, Rank> = {
        A: Rank.Ace,
        "2": Rank.Two,
        "3": Rank.Three,
        "4": Rank.Four,
        "5": Rank.Five,
        "6": Rank.Six,
        "7": Rank.Seven,
        "8": Rank.Eight,
        "9": Rank.Nine,
        "10": Rank.Ten,
        J: Rank.Jack,
        Q: Rank.Queen,
        K: Rank.King,
        LJ: Rank.LittleJoker,
        BJ: Rank.BigJoker,
    };
    return map[rank] ?? null;
}
