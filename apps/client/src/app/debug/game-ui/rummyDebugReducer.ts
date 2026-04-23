/**
 * Debug-mode reducer for Rummy actions. Applies client-only mutations so the
 * debug playground behaves like a live server for DRAW_STOCK / DISCARD /
 * LAY_MELD / LAY_OFF / TAKE_DISCARD.
 *
 * Card shape note: actions coming from the Rummy UI use the server-enum
 * `Card` form ({ suit: Suit, rank: Rank }), while the client `RummyData`
 * renders `PlayingCard` ({ suit: "Hearts", rank: "A" }). This reducer
 * converts between the two so the local state stays internally consistent.
 */

import {
    GameData,
    PlayerData,
    PlayingCard,
    Rank,
    Suit,
    Card,
    RummyData,
    RummyPlayerData,
    RummyMeldView,
} from "@shared/types";

const SUIT_TO_DISPLAY: Record<string, PlayingCard["suit"]> = {
    [Suit.Hearts]: "Hearts",
    [Suit.Diamonds]: "Diamonds",
    [Suit.Clubs]: "Clubs",
    [Suit.Spades]: "Spades",
};

const RANK_TO_DISPLAY: Record<string, PlayingCard["rank"]> = {
    [Rank.Ace]: "A",
    [Rank.Two]: "2",
    [Rank.Three]: "3",
    [Rank.Four]: "4",
    [Rank.Five]: "5",
    [Rank.Six]: "6",
    [Rank.Seven]: "7",
    [Rank.Eight]: "8",
    [Rank.Nine]: "9",
    [Rank.Ten]: "10",
    [Rank.Jack]: "J",
    [Rank.Queen]: "Q",
    [Rank.King]: "K",
    [Rank.LittleJoker]: "LJ",
    [Rank.BigJoker]: "BJ",
};

function toDisplayCard(c: Card): PlayingCard {
    return {
        suit: SUIT_TO_DISPLAY[c.suit] ?? "Spades",
        rank: RANK_TO_DISPLAY[c.rank] ?? "A",
    };
}

function sameCard(a: PlayingCard, b: PlayingCard): boolean {
    return a.suit === b.suit && a.rank === b.rank;
}

function cardToDisplay(
    c: Card | PlayingCard | undefined | null,
): PlayingCard | null {
    if (!c) return null;
    // PlayingCard uses string suits ("Hearts"), Card uses enum numeric/string.
    const suit = (c as PlayingCard).suit;
    if (
        typeof suit === "string" &&
        (suit === "Hearts" ||
            suit === "Diamonds" ||
            suit === "Clubs" ||
            suit === "Spades")
    ) {
        return c as PlayingCard;
    }
    return toDisplayCard(c as Card);
}

/** Pick a plausible random card the player doesn't already hold. */
function randomCardNotInHand(hand: PlayingCard[]): PlayingCard {
    const suits: PlayingCard["suit"][] = [
        "Hearts",
        "Diamonds",
        "Clubs",
        "Spades",
    ];
    const ranks: PlayingCard["rank"][] = [
        "A",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
    ];
    for (let attempt = 0; attempt < 52; attempt++) {
        const suit = suits[Math.floor(Math.random() * suits.length)];
        const rank = ranks[Math.floor(Math.random() * ranks.length)];
        const candidate = { suit, rank };
        if (!hand.some((h) => sameCard(h, candidate))) return candidate;
    }
    return { suit: "Spades", rank: "A" };
}

interface RummyLikeAction {
    type: string;
    userId?: string;
    payload?: {
        playerId?: string;
        card?: Card | PlayingCard;
        cards?: (Card | PlayingCard)[];
        meldId?: string;
        pickIndex?: number;
        intoMeldId?: string;
        newMeld?: (Card | PlayingCard)[];
    };
}

/**
 * Mutates `gameData` and `playerDataMap` in place for supported Rummy
 * actions. Ignored for unknown action types.
 *
 * Note: React StrictMode double-invokes the surrounding `setMasterGameState`
 * updater. To keep the reducer idempotent, we clone the target player's
 * entry before reassigning `.hand` so the underlying object is never
 * mutated in place.
 */
export function applyRummyDebugAction(
    gameData: GameData,
    playerDataMap: Record<string, PlayerData>,
    action: RummyLikeAction,
    fallbackPlayerId: string,
): void {
    if (gameData.type !== "rummy") return;
    const rummy = gameData as RummyData;
    const payload = action.payload ?? {};
    const playerId = payload.playerId ?? action.userId ?? fallbackPlayerId;
    const existing = playerDataMap[playerId] as RummyPlayerData | undefined;
    if (!existing) return;
    // Clone so reassigning `.hand` doesn't mutate the prev state that
    // React replays under StrictMode.
    const playerData: RummyPlayerData = {
        ...existing,
        hand: [...existing.hand],
    };
    playerDataMap[playerId] = playerData;

    const advanceTurn = () => {
        rummy.currentTurnIndex =
            (rummy.currentTurnIndex + 1) % rummy.playOrder.length;
        rummy.turnSubstate = "awaiting-draw";
    };

    switch (action.type) {
        case "DRAW_STOCK": {
            if (rummy.stockCount <= 0) return;
            const card = randomCardNotInHand(playerData.hand);
            playerData.hand = [...playerData.hand, card];
            rummy.handCounts = {
                ...rummy.handCounts,
                [playerId]: (rummy.handCounts[playerId] ?? 0) + 1,
            };
            rummy.stockCount -= 1;
            rummy.turnSubstate = "may-meld";
            return;
        }

        case "DISCARD": {
            const card = cardToDisplay(payload.card);
            if (!card) return;
            const idx = playerData.hand.findIndex((h) => sameCard(h, card));
            if (idx < 0) return;
            playerData.hand = [
                ...playerData.hand.slice(0, idx),
                ...playerData.hand.slice(idx + 1),
            ];
            rummy.handCounts = {
                ...rummy.handCounts,
                [playerId]: Math.max(0, (rummy.handCounts[playerId] ?? 0) - 1),
            };
            rummy.discard = {
                cards: [...rummy.discard.cards, card],
            };
            advanceTurn();
            return;
        }

        case "LAY_MELD": {
            const cards =
                payload.cards
                    ?.map((c) => cardToDisplay(c))
                    .filter((c): c is PlayingCard => c !== null) ?? [];
            if (cards.length < 3) return;
            const removed = removeCardsFromHand(playerData.hand, cards);
            playerData.hand = removed;
            rummy.handCounts = {
                ...rummy.handCounts,
                [playerId]: removed.length,
            };
            rummy.melds = [
                ...rummy.melds,
                makeMeld(cards, playerId, rummy.round),
            ];
            rummy.turnSubstate = "may-meld";
            return;
        }

        case "LAY_OFF": {
            const card = cardToDisplay(payload.card);
            if (!card || !payload.meldId) return;
            const meldIdx = rummy.melds.findIndex(
                (m) => m.id === payload.meldId,
            );
            if (meldIdx < 0) return;
            const handIdx = playerData.hand.findIndex((h) => sameCard(h, card));
            if (handIdx < 0) return;
            playerData.hand = [
                ...playerData.hand.slice(0, handIdx),
                ...playerData.hand.slice(handIdx + 1),
            ];
            rummy.handCounts = {
                ...rummy.handCounts,
                [playerId]: playerData.hand.length,
            };
            const meld = rummy.melds[meldIdx];
            const newCards = [...meld.cards, card];
            rummy.melds = [
                ...rummy.melds.slice(0, meldIdx),
                {
                    ...meld,
                    cards: newCards,
                    layoffs: [
                        ...(meld.layoffs ?? []),
                        { index: newCards.length - 1, playerId },
                    ],
                },
                ...rummy.melds.slice(meldIdx + 1),
            ];
            rummy.turnSubstate = "may-meld";
            return;
        }

        case "TAKE_DISCARD": {
            const pickIndex = payload.pickIndex ?? 0;
            if (pickIndex < 0 || pickIndex >= rummy.discard.cards.length)
                return;
            const picked = rummy.discard.cards[pickIndex];
            const tail = rummy.discard.cards.slice(pickIndex + 1);
            const newDiscardCards = rummy.discard.cards.slice(0, pickIndex);

            if (payload.newMeld && payload.newMeld.length > 0) {
                const meldCards = payload.newMeld
                    .map((c) => cardToDisplay(c))
                    .filter((c): c is PlayingCard => c !== null);
                if (meldCards.length < 3) return;
                // Remove meld cards (except picked) from hand.
                const fromHand = meldCards.filter((c) => !sameCard(c, picked));
                let remaining = removeCardsFromHand(playerData.hand, fromHand);
                // Tail cards join hand.
                remaining = [...remaining, ...tail];
                playerData.hand = remaining;
                rummy.handCounts = {
                    ...rummy.handCounts,
                    [playerId]: remaining.length,
                };
                rummy.melds = [
                    ...rummy.melds,
                    makeMeld(meldCards, playerId, rummy.round),
                ];
            } else if (payload.intoMeldId) {
                const meldIdx = rummy.melds.findIndex(
                    (m) => m.id === payload.intoMeldId,
                );
                if (meldIdx < 0) return;
                const meld = rummy.melds[meldIdx];
                const newCards = [...meld.cards, picked];
                rummy.melds = [
                    ...rummy.melds.slice(0, meldIdx),
                    {
                        ...meld,
                        cards: newCards,
                        layoffs: [
                            ...(meld.layoffs ?? []),
                            { index: newCards.length - 1, playerId },
                        ],
                    },
                    ...rummy.melds.slice(meldIdx + 1),
                ];
                const newHand = [...playerData.hand, ...tail];
                playerData.hand = newHand;
                rummy.handCounts = {
                    ...rummy.handCounts,
                    [playerId]: newHand.length,
                };
            } else {
                // Invalid action (no target) — server would reject. No-op.
                return;
            }

            rummy.discard = { cards: newDiscardCards };
            rummy.turnSubstate = "may-meld";
            return;
        }

        default:
            return;
    }
}

function removeCardsFromHand(
    hand: PlayingCard[],
    toRemove: PlayingCard[],
): PlayingCard[] {
    const result = [...hand];
    for (const c of toRemove) {
        const idx = result.findIndex((h) => sameCard(h, c));
        if (idx >= 0) result.splice(idx, 1);
    }
    return result;
}

function makeMeld(
    cards: PlayingCard[],
    ownerId: string,
    round: number,
): RummyMeldView {
    const allSameRank = cards.every((c) => c.rank === cards[0].rank);
    return {
        id: `debug-meld-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        kind: allSameRank ? "set" : "run",
        cards,
        ownerId,
        round,
    };
}
