// apps/api/src/games/rummy/helpers/deck.ts
// Standard 52-card deck construction for Rummy (no jokers in v1).

import { Card, Rank, Suit } from "@family-games/shared";
import { shuffle } from "../../shared";

const SUITS: Suit[] = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
const RANKS: Rank[] = [
    Rank.Ace,
    Rank.Two,
    Rank.Three,
    Rank.Four,
    Rank.Five,
    Rank.Six,
    Rank.Seven,
    Rank.Eight,
    Rank.Nine,
    Rank.Ten,
    Rank.Jack,
    Rank.Queen,
    Rank.King,
];

/** Build a fresh, shuffled 52-card deck. */
export function buildDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    return shuffle(deck);
}

/** Compare two cards for value equality (rank+suit). */
export function cardsEqual(a: Card, b: Card): boolean {
    return a.rank === b.rank && a.suit === b.suit;
}

/**
 * Remove the first card matching `target` from `cards` (mutates a copy and
 * returns it). Returns null if not found.
 */
export function removeCard(cards: Card[], target: Card): Card[] | null {
    const idx = cards.findIndex((c) => cardsEqual(c, target));
    if (idx === -1) return null;
    const out = [...cards];
    out.splice(idx, 1);
    return out;
}

/**
 * Remove all cards in `targets` from `cards` (one-to-one match).
 * Returns the resulting array, or null if any target is missing.
 */
export function removeCards(
    cards: Card[],
    targets: readonly Card[],
): Card[] | null {
    let working = [...cards];
    for (const t of targets) {
        const next = removeCard(working, t);
        if (next === null) return null;
        working = next;
    }
    return working;
}
