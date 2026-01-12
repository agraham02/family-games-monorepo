import { PlayingCard, SpadesTrick } from "@shared/types";

/**
 * Check if a card follows the led suit rule.
 * If a suit was led, player must follow that suit if they have it.
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

/**
 * Check if a specific card can be legally played given the current trick state.
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
 * Returns array of indices that should be disabled.
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
 * Check if a card is a joker
 */
export function isJoker(card: PlayingCard): boolean {
    return card.rank === "BJ" || card.rank === "LJ";
}
