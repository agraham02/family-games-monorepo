// packages/shared/src/utils/rummy.ts
//
// Pure helpers for Rummy display logic that are not strictly validation or
// hint-engine concerns. Kept side-effect free so they're trivially testable
// and reusable across client surfaces (MeldStrip, summary modal, debug page).

import { RANK_ORDER, Rank } from "../types/games/cards";
import type { PlayingCard } from "../types/games/cards";

const RANK_FROM_STRING: Readonly<Record<string, Rank>> = {
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
};

function rankOrdinal(rank: string): number | null {
    const r = RANK_FROM_STRING[rank];
    if (r == null) return null;
    return RANK_ORDER[r];
}

/**
 * Returns the indices of `cards` in the order they should be visually
 * displayed for a Rummy *run* meld. Cards are sorted ascending by rank
 * ordinal. Aces are treated as HIGH (14) when the run contains a King but
 * no Two — otherwise they remain LOW (1). This matches how players
 * intuitively read a run that ends in K-A.
 *
 * The returned array is the same length as `cards` and contains every
 * input index exactly once. Cards whose rank cannot be ordered (jokers,
 * unknown strings) are appended at the end in their original order so
 * the helper is total and never drops cards.
 *
 * Use the returned array as `[displayIdx → originalIdx]` so callers can
 * keep per-card metadata (e.g. layoff badges) attached to the original
 * index even after re-sorting.
 */
export function sortRunForDisplay(
    cards: readonly Pick<PlayingCard, "rank">[],
): number[] {
    const orderable: { idx: number; ord: number }[] = [];
    const unorderable: number[] = [];

    let hasKing = false;
    let hasTwo = false;
    let hasAce = false;
    for (let i = 0; i < cards.length; i++) {
        const ord = rankOrdinal(cards[i].rank);
        if (ord == null) {
            unorderable.push(i);
            continue;
        }
        if (ord === 13) hasKing = true;
        if (ord === 2) hasTwo = true;
        if (ord === 1) hasAce = true;
        orderable.push({ idx: i, ord });
    }

    const aceHigh = hasAce && hasKing && !hasTwo;

    const adjusted = orderable.map(({ idx, ord }) => ({
        idx,
        ord: aceHigh && ord === 1 ? 14 : ord,
    }));

    adjusted.sort((a, b) => {
        if (a.ord !== b.ord) return a.ord - b.ord;
        // Stable on ties: preserve original order.
        return a.idx - b.idx;
    });

    return [...adjusted.map((x) => x.idx), ...unorderable];
}
