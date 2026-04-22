// packages/shared/src/validation/rummy.ts
// Pure validation + scoring helpers for Rummy.
// All functions here are deterministic and side-effect free, suitable
// for both client (preview/optimistic) and server (authoritative) use.

import { Card, Rank, Suit, RANK_ORDER } from "../types/games/cards";
import { Meld, RUMMY_MIN_MELD_SIZE } from "../types/games/rummy";

// ============================================================================
// Card values
// ============================================================================

/**
 * Point value of a card per house rules:
 *   A = 15
 *   K, Q, J, 10 = 10
 *   2-9 = 5
 *   Jokers = 0 (not used in Rummy v1; reserved)
 */
export function cardValue(card: Card): number {
    switch (card.rank) {
        case Rank.Ace:
            return 15;
        case Rank.King:
        case Rank.Queen:
        case Rank.Jack:
        case Rank.Ten:
            return 10;
        case Rank.Two:
        case Rank.Three:
        case Rank.Four:
        case Rank.Five:
        case Rank.Six:
        case Rank.Seven:
        case Rank.Eight:
        case Rank.Nine:
            return 5;
        default:
            return 0;
    }
}

export function sumCardValues(cards: readonly Card[]): number {
    return cards.reduce((sum, c) => sum + cardValue(c), 0);
}

// ============================================================================
// Set / Run validators
// ============================================================================

/**
 * A valid SET is 3+ cards of the same rank, all from different suits.
 * Jokers are not valid in v1.
 */
export function isValidSet(cards: readonly Card[]): boolean {
    if (cards.length < RUMMY_MIN_MELD_SIZE) return false;
    const rank = cards[0].rank;
    if (RANK_ORDER[rank] == null) return false; // jokers excluded
    const suits = new Set<Suit>();
    for (const c of cards) {
        if (c.rank !== rank) return false;
        if (RANK_ORDER[c.rank] == null) return false;
        if (suits.has(c.suit)) return false; // duplicate suit
        suits.add(c.suit);
    }
    return true;
}

/**
 * A valid RUN is 3+ consecutive cards of the same suit.
 * Ace is LOW only (A-2-3 valid, Q-K-A invalid).
 */
export function isValidRun(cards: readonly Card[]): boolean {
    if (cards.length < RUMMY_MIN_MELD_SIZE) return false;
    const suit = cards[0].suit;
    const values: number[] = [];
    for (const c of cards) {
        if (c.suit !== suit) return false;
        const v = RANK_ORDER[c.rank];
        if (v == null) return false; // jokers / unknown
        values.push(v);
    }
    const sorted = [...values].sort((a, b) => a - b);
    // Must be strictly consecutive, no duplicates.
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
}

/** Validate a candidate meld of either kind. */
export function isValidMeld(cards: readonly Card[]): boolean {
    return isValidSet(cards) || isValidRun(cards);
}

/** Returns "set" | "run" | null based on which (if any) the cards form. */
export function detectMeldKind(cards: readonly Card[]): "set" | "run" | null {
    if (isValidSet(cards)) return "set";
    if (isValidRun(cards)) return "run";
    return null;
}

// ============================================================================
// Lay-off validation
// ============================================================================

/**
 * Can `card` be added to `meld`?
 *  - For sets: same rank, different suit than all existing cards.
 *  - For runs: extends low end (rank one below current min, same suit) or
 *    high end (rank one above current max, same suit, max ≤ King).
 */
export function canLayOffCard(card: Card, meld: Meld): boolean {
    if (RANK_ORDER[card.rank] == null) return false;
    if (meld.cards.length === 0) return false;

    if (meld.kind === "set") {
        if (card.rank !== meld.cards[0].rank) return false;
        return meld.cards.every((c) => c.suit !== card.suit);
    }

    // Run
    if (card.suit !== meld.cards[0].suit) return false;
    const cardValueOrdinal = RANK_ORDER[card.rank]!;
    const ordinals = meld.cards
        .map((c) => RANK_ORDER[c.rank])
        .filter((v): v is number => v != null);
    if (ordinals.length === 0) return false;
    const min = Math.min(...ordinals);
    const max = Math.max(...ordinals);
    return cardValueOrdinal === min - 1 || cardValueOrdinal === max + 1;
}

/**
 * Returns ids of all melds the card can be laid off onto, in deterministic
 * order (sorted by meld id ascending) so v1 ambiguity rule = "lowest id".
 */
export function findAllLayoffTargets(
    card: Card,
    melds: readonly Meld[],
): string[] {
    return melds
        .filter((m) => canLayOffCard(card, m))
        .map((m) => m.id)
        .sort();
}

// ============================================================================
// "Rummy!" call eligibility
// ============================================================================

/**
 * Returns true if the discarded card could have been laid off onto any
 * existing meld at the moment of the discard. Used to decide whether to
 * open the "Rummy!" call window.
 */
export function isRummyCallable(card: Card, melds: readonly Meld[]): boolean {
    return findAllLayoffTargets(card, melds).length > 0;
}

// ============================================================================
// Round scoring
// ============================================================================

export interface ScoreHandInput {
    /** Cards remaining in this player's hand (deadwood). */
    hand: readonly Card[];
    /** Cards this player has melded this round (across all their melds + lay-offs). */
    melded: readonly Card[];
    /** True if this player went out this round. */
    wentOut: boolean;
    /** Bonus added when wentOut === true (settings.goingOutBonus). */
    goingOutBonus: number;
}

export interface ScoreHandResult {
    meldedPoints: number;
    deadwoodPoints: number;
    bonus: number;
    delta: number;
}

/**
 * Round score for a single player:
 *   delta = meldedPoints − deadwoodPoints + (wentOut ? goingOutBonus : 0)
 */
export function scoreHand(input: ScoreHandInput): ScoreHandResult {
    const meldedPoints = sumCardValues(input.melded);
    const deadwoodPoints = sumCardValues(input.hand);
    const bonus = input.wentOut ? input.goingOutBonus : 0;
    return {
        meldedPoints,
        deadwoodPoints,
        bonus,
        delta: meldedPoints - deadwoodPoints + bonus,
    };
}

// ============================================================================
// Deal-size validation
// ============================================================================

export interface DealSizeBounds {
    min: number;
    max: number;
    /** Total cards in the deck (52 standard, no jokers in v1). */
    deckSize: number;
    /** Number of players in the round. */
    playerCount: number;
}

/**
 * Validate a dealer-chosen hand size:
 *   - odd number
 *   - within [min, max]
 *   - leaves at least 2 cards in stock after deal (so the +1 face-up flip
 *     onto discard still leaves stock with ≥1 card to draw).
 */
export function isValidDealSize(
    handSize: number,
    bounds: DealSizeBounds,
): boolean {
    if (!Number.isInteger(handSize)) return false;
    if (handSize % 2 === 0) return false;
    if (handSize < bounds.min || handSize > bounds.max) return false;
    const totalDealt = handSize * bounds.playerCount + 1; // +1 face-up flip
    return bounds.deckSize - totalDealt >= 1;
}

/** Returns the list of legal odd hand sizes given the bounds. */
export function legalDealSizes(bounds: DealSizeBounds): number[] {
    const out: number[] = [];
    for (let n = bounds.min; n <= bounds.max; n++) {
        if (isValidDealSize(n, bounds)) out.push(n);
    }
    return out;
}
