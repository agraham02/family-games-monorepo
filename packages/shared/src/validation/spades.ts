// packages/shared/src/validation/spades.ts
// Spades game validation utilities

import { PlayingCard, SpadesTrick } from "../types/games/spades";

// ============================================================================
// Suit Following Rules
// ============================================================================

/**
 * Check if a card follows the led suit rule.
 * If a suit was led, player must follow that suit if they have it.
 * @param card The card being played
 * @param playerHand The player's current hand
 * @param ledSuit The suit that was led (null if first card)
 * @returns True if the card follows suit rules
 */
function mustFollowSuit(
    card: PlayingCard,
    playerHand: PlayingCard[],
    ledSuit: PlayingCard["suit"] | null
): boolean {
    if (!ledSuit) return true; // first card of trick – any suit allowed
    if (card.suit === ledSuit) return true; // followed suit
    // If player has at least one card of the led suit, they cannot slough
    return !playerHand.some((c) => c.suit === ledSuit);
}

/**
 * Check if a card can lead a trick based on spades-broken rule.
 * Cannot lead spades unless spades are broken OR player only has spades.
 * @param card The card being played
 * @param spadesBroken Whether spades have been broken
 * @param playerHand The player's current hand
 * @returns True if the card can lead
 */
function canLeadSuit(
    card: PlayingCard,
    spadesBroken: boolean,
    playerHand: PlayingCard[]
): boolean {
    if (card.suit !== "Spades") return true; // non-spade can always lead
    if (spadesBroken) return true; // spades broken, can lead spades
    // If player ONLY has spades, permit leading them
    return playerHand.every((c) => c.suit === "Spades");
}

// ============================================================================
// Card Play Validation
// ============================================================================

/**
 * Check if a specific card can be legally played given the current trick state.
 * @param card The card to check
 * @param playerHand The player's current hand
 * @param currentTrick The current trick in progress (null if starting new trick)
 * @param spadesBroken Whether spades have been broken
 * @returns True if the card can be legally played
 */
export function canPlayCard(
    card: PlayingCard,
    playerHand: PlayingCard[],
    currentTrick: SpadesTrick | null,
    spadesBroken: boolean
): boolean {
    // If no trick in progress, this is the first card of a new trick
    if (!currentTrick || currentTrick.plays.length === 0) {
        return canLeadSuit(card, spadesBroken, playerHand);
    }

    // Subsequent plays must follow suit
    const ledSuit = currentTrick.plays[0]?.card.suit || null;
    return mustFollowSuit(card, playerHand, ledSuit);
}

/**
 * Get indices of all cards that cannot be legally played.
 * Returns array of indices that should be disabled in the UI.
 * @param hand The player's hand
 * @param currentTrick The current trick in progress
 * @param spadesBroken Whether spades have been broken
 * @returns Array of indices for unplayable cards
 */
export function getUnplayableCardIndices(
    hand: PlayingCard[],
    currentTrick: SpadesTrick | null,
    spadesBroken: boolean
): number[] {
    const unplayableIndices: number[] = [];

    hand.forEach((card, index) => {
        if (!canPlayCard(card, hand, currentTrick, spadesBroken)) {
            unplayableIndices.push(index);
        }
    });

    return unplayableIndices;
}

/**
 * Get all playable cards from a hand.
 * @param hand The player's hand
 * @param currentTrick The current trick in progress
 * @param spadesBroken Whether spades have been broken
 * @returns Array of playable cards
 */
export function getPlayableCards(
    hand: PlayingCard[],
    currentTrick: SpadesTrick | null,
    spadesBroken: boolean
): PlayingCard[] {
    return hand.filter((card) =>
        canPlayCard(card, hand, currentTrick, spadesBroken)
    );
}

// ============================================================================
// Card Type Checks
// ============================================================================

/**
 * Check if a card is a joker.
 * @param card The card to check
 * @returns True if the card is a joker
 */
export function isJoker(card: PlayingCard): boolean {
    return card.rank === "BJ" || card.rank === "LJ";
}

/**
 * Check if a card is a spade.
 * @param card The card to check
 * @returns True if the card is a spade
 */
export function isSpade(card: PlayingCard): boolean {
    return card.suit === "Spades";
}

/**
 * Check if a card is a trump (spade or joker).
 * @param card The card to check
 * @returns True if the card is a trump
 */
export function isTrump(card: PlayingCard): boolean {
    return isSpade(card) || isJoker(card);
}
