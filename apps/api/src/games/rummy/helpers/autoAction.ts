// apps/api/src/games/rummy/helpers/autoAction.ts
// Auto-action helpers for Rummy turn-timer expiry.
//
// Strategy on timeout:
//  - awaiting-draw      → draw from stock
//  - awaiting-discard-play → forced new-meld with picked card (if it can
//                            stand alone, e.g. with 2 hand cards). v1: just
//                            cancel and force discard of picked card. (We
//                            disallow this state at timeout via reducer, so
//                            we only need the pick→discard fallback.)
//  - may-meld            → discard a deterministic card (highest-value
//                          deadwood, breaking ties by suit ordering)
//  - cardless-waiting    → no auto-action (not the player's "turn" to act)

import {
    RummyState,
    RummyAction,
    RummyPhase,
    cardValue,
    Card,
    Suit,
} from "@family-games/shared";

const ACTIVE_TIMER_PHASES: RummyPhase[] = ["playing"];

export function shouldTimerBeActive(state: RummyState): boolean {
    if (!ACTIVE_TIMER_PHASES.includes(state.phase)) return false;
    // Don't run timer for cardless-waiting (they have no decision to make).
    return state.turnSubstate !== "cardless-waiting";
}

/** Suit ordering used for deterministic tiebreaks. */
const SUIT_RANK: Record<Suit, number> = {
    [Suit.Spades]: 0,
    [Suit.Hearts]: 1,
    [Suit.Diamonds]: 2,
    [Suit.Clubs]: 3,
};

function pickAutoDiscard(hand: readonly Card[]): Card | null {
    if (hand.length === 0) return null;
    return [...hand].sort((a, b) => {
        const va = cardValue(a);
        const vb = cardValue(b);
        if (vb !== va) return vb - va; // highest value first
        if (SUIT_RANK[a.suit] !== SUIT_RANK[b.suit]) {
            return SUIT_RANK[a.suit] - SUIT_RANK[b.suit];
        }
        return a.rank.localeCompare(b.rank);
    })[0];
}

export function getAutoAction(
    state: RummyState,
    playerId: string,
): RummyAction | null {
    const currentPid = state.playOrder[state.currentTurnIndex];
    if (currentPid !== playerId) return null;
    if (state.phase !== "playing") return null;

    switch (state.turnSubstate) {
        case "awaiting-draw":
            return { type: "DRAW_STOCK", playerId };
        case "awaiting-discard-play": {
            // Edge case: player has a pending pick they must play. We can't
            // safely auto-meld; fall through and force a discard of the
            // pending card by treating it like a hand card. Reducer will
            // accept DISCARD of the picked card and end the turn.
            const picked = state.pendingDiscardPick?.pickedCard;
            if (picked) return { type: "DISCARD", playerId, card: picked };
            return null;
        }
        case "may-meld": {
            const hand = state.hands[playerId] ?? [];
            const card = pickAutoDiscard(hand);
            if (!card) return null;
            return { type: "DISCARD", playerId, card };
        }
        default:
            return null;
    }
}
