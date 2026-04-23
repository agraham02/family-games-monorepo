// packages/shared/src/hints/rummy.ts
// Pure, deterministic hint engine for the Rummy client.
//
// Operates on the server-card form (`Card` enum). The client converts its
// `PlayingCard[]` hand to `Card[]` once and feeds the result here. All
// returned indices reference the input `hand` array — translation back to
// the client display layer is the caller's concern.
//
// Side-effect free, suitable for both render-time use and unit tests.

import { Card, Rank, Suit, RANK_ORDER } from "../types/games/cards";
import type { Meld } from "../types/games/rummy";
import {
    isValidSet,
    isValidRun,
    canLayOffCard,
    cardValue,
    sumCardValues,
} from "../validation/rummy";

// ============================================================================
// Types
// ============================================================================

export type RummyHintGroupKind = "set" | "run";

/** A complete (3+) set or run detected in the hero's hand. */
export interface RummyMeldGroupHint {
    /** Stable id (e.g. "set-K-0", "run-Hearts-2") for keyed React lists. */
    readonly id: string;
    readonly kind: RummyHintGroupKind;
    /** Indices into the input `hand` array, in canonical order. */
    readonly handIndices: readonly number[];
}

/**
 * A near-meld (a pair or 2-card straight). Lower visual priority than
 * complete groups; the client typically renders these with a fainter cue.
 */
export interface RummyNearMeldHint {
    readonly id: string;
    readonly kind: RummyHintGroupKind;
    readonly handIndices: readonly number[];
    /** How many more cards are needed to make a valid meld (always 1 in v1). */
    readonly missing: number;
}

export interface RummyDiscardTopHint {
    /** Top discard could be laid off onto an existing meld. */
    readonly canLayoff: boolean;
    /**
     * Top discard could be combined with 2+ hand cards to form a new set/run
     * (does not consider tail cards from a take-discard pick).
     */
    readonly canFormMeldWithHand: boolean;
}

export interface RummyHints {
    /** For each hand index, ids of melds it can be laid off onto. */
    readonly layoffsByHandIndex: ReadonlyMap<number, readonly string[]>;
    /** Maximal sets/runs detected in hand (3+ cards each). */
    readonly meldGroups: readonly RummyMeldGroupHint[];
    /** Pairs and 2-card straights that need exactly one more card. */
    readonly nearMeldGroups: readonly RummyNearMeldHint[];
    /** Sum of card values for cards NOT assigned to any complete meldGroup. */
    readonly deadwoodPoints: number;
    /** Hint about the top of the discard pile. */
    readonly discardTop: RummyDiscardTopHint;
}

export interface ComputeHintsInput {
    readonly hand: readonly Card[];
    readonly melds: readonly Meld[];
    /** Top of discard, if any (last element of discard pile). */
    readonly discardTop?: Card | null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compute all hint data for the hero's current hand.
 *
 * Detection priority (greedy, no card double-assigned to complete groups):
 *   1. Longest runs per suit (length ≥ 3).
 *   2. Sets of 4 (one per rank).
 *   3. Sets of 3.
 *   4. Near-melds (pairs of same rank, 2-card straights) from leftovers.
 *
 * This matches how a player typically eyeballs their hand: pick out the
 * "obvious" big melds first, then small ones, then potential builds.
 */
export function computeRummyHints(input: ComputeHintsInput): RummyHints {
    const { hand, melds, discardTop = null } = input;

    const layoffsByHandIndex = computeLayoffs(hand, melds);
    const { meldGroups, usedIndices } = detectMeldGroups(hand);
    const nearMeldGroups = detectNearMelds(hand, usedIndices);

    const leftoverIndices: number[] = [];
    for (let i = 0; i < hand.length; i++) {
        if (!usedIndices.has(i)) leftoverIndices.push(i);
    }
    const deadwoodPoints = sumCardValues(leftoverIndices.map((i) => hand[i]));

    const discardTopHint: RummyDiscardTopHint = discardTop
        ? {
              canLayoff: melds.some((m) => canLayOffCard(discardTop, m)),
              canFormMeldWithHand: canFormMeldWith(discardTop, hand),
          }
        : { canLayoff: false, canFormMeldWithHand: false };

    return {
        layoffsByHandIndex,
        meldGroups,
        nearMeldGroups,
        deadwoodPoints,
        discardTop: discardTopHint,
    };
}

// ============================================================================
// Layoff detection
// ============================================================================

function computeLayoffs(
    hand: readonly Card[],
    melds: readonly Meld[],
): ReadonlyMap<number, readonly string[]> {
    const out = new Map<number, readonly string[]>();
    for (let i = 0; i < hand.length; i++) {
        const card = hand[i];
        const ids: string[] = [];
        for (const m of melds) {
            if (canLayOffCard(card, m)) ids.push(m.id);
        }
        if (ids.length > 0) {
            ids.sort();
            out.set(i, ids);
        }
    }
    return out;
}

// ============================================================================
// Meld-group detection (greedy)
// ============================================================================

interface DetectionResult {
    readonly meldGroups: readonly RummyMeldGroupHint[];
    readonly usedIndices: ReadonlySet<number>;
}

function detectMeldGroups(hand: readonly Card[]): DetectionResult {
    const used = new Set<number>();
    const groups: RummyMeldGroupHint[] = [];

    // 1. Longest runs per suit first.
    for (const suit of allSuits()) {
        // Repeat until no more runs of length ≥ 3 remain in this suit.
        // Each pass picks the longest available run starting at the lowest rank.
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const run = findLongestRun(hand, suit, used);
            if (!run || run.length < 3) break;
            groups.push({
                id: `run-${suit}-${run[0]}`,
                kind: "run",
                handIndices: run,
            });
            for (const i of run) used.add(i);
        }
    }

    // 2 + 3. Sets — try size 4 first then size 3, per rank.
    for (const targetSize of [4, 3] as const) {
        for (const rank of allRanksOrdered()) {
            const setIndices = findSet(hand, rank, used, targetSize);
            if (setIndices && setIndices.length === targetSize) {
                groups.push({
                    id: `set-${rank}-${groups.length}`,
                    kind: "set",
                    handIndices: setIndices,
                });
                for (const i of setIndices) used.add(i);
            }
        }
    }

    return { meldGroups: groups, usedIndices: used };
}

/**
 * Find the longest available run of `suit` from the hand, ignoring already-
 * used indices. Returns indices in low→high rank order, or null if no run
 * of length ≥ 3 exists.
 */
function findLongestRun(
    hand: readonly Card[],
    suit: Suit,
    used: ReadonlySet<number>,
): number[] | null {
    // Map ordinal → first available index.
    const byOrdinal = new Map<number, number>();
    for (let i = 0; i < hand.length; i++) {
        if (used.has(i)) continue;
        const card = hand[i];
        if (card.suit !== suit) continue;
        const ord = RANK_ORDER[card.rank];
        if (ord == null) continue;
        if (!byOrdinal.has(ord)) byOrdinal.set(ord, i);
    }
    if (byOrdinal.size < 3) return null;

    let bestRun: number[] | null = null;
    for (let start = 1; start <= 13; start++) {
        if (!byOrdinal.has(start)) continue;
        // Don't re-scan starts that would have been part of an earlier-detected longer run.
        if (byOrdinal.has(start - 1)) continue;
        const run: number[] = [];
        let cur = start;
        while (byOrdinal.has(cur)) {
            run.push(byOrdinal.get(cur)!);
            cur++;
        }
        if (run.length >= 3 && (!bestRun || run.length > bestRun.length)) {
            bestRun = run;
        }
    }
    return bestRun;
}

/**
 * Find a set of `size` cards of `rank` from the hand, ignoring used indices.
 * Returns indices in suit declaration order, or null if not enough distinct
 * suits are available.
 */
function findSet(
    hand: readonly Card[],
    rank: Rank,
    used: ReadonlySet<number>,
    size: number,
): number[] | null {
    const bySuit = new Map<Suit, number>();
    for (let i = 0; i < hand.length; i++) {
        if (used.has(i)) continue;
        const card = hand[i];
        if (card.rank !== rank) continue;
        if (RANK_ORDER[card.rank] == null) continue;
        if (!bySuit.has(card.suit)) bySuit.set(card.suit, i);
    }
    if (bySuit.size < size) return null;
    const indices: number[] = [];
    for (const suit of allSuits()) {
        const idx = bySuit.get(suit);
        if (idx != null) {
            indices.push(idx);
            if (indices.length === size) break;
        }
    }
    // Sanity-check each candidate set is actually valid (defence-in-depth).
    if (!isValidSet(indices.map((i) => hand[i]))) return null;
    return indices;
}

// ============================================================================
// Near-meld detection
// ============================================================================

function detectNearMelds(
    hand: readonly Card[],
    usedIndices: ReadonlySet<number>,
): readonly RummyNearMeldHint[] {
    const out: RummyNearMeldHint[] = [];
    const seenPairs = new Set<string>();

    // 2-card straights (same suit, consecutive ordinals).
    for (const suit of allSuits()) {
        const ordinalToIdx: { ord: number; idx: number }[] = [];
        for (let i = 0; i < hand.length; i++) {
            if (usedIndices.has(i)) continue;
            const card = hand[i];
            if (card.suit !== suit) continue;
            const ord = RANK_ORDER[card.rank];
            if (ord == null) continue;
            ordinalToIdx.push({ ord, idx: i });
        }
        ordinalToIdx.sort((a, b) => a.ord - b.ord);
        for (let i = 0; i + 1 < ordinalToIdx.length; i++) {
            const a = ordinalToIdx[i];
            const b = ordinalToIdx[i + 1];
            if (b.ord === a.ord + 1) {
                const id = `near-run-${suit}-${a.ord}`;
                if (seenPairs.has(id)) continue;
                seenPairs.add(id);
                out.push({
                    id,
                    kind: "run",
                    handIndices: [a.idx, b.idx],
                    missing: 1,
                });
            }
        }
    }

    // Pairs (same rank, different suit).
    const byRank = new Map<Rank, number[]>();
    for (let i = 0; i < hand.length; i++) {
        if (usedIndices.has(i)) continue;
        const card = hand[i];
        if (RANK_ORDER[card.rank] == null) continue;
        const arr = byRank.get(card.rank) ?? [];
        arr.push(i);
        byRank.set(card.rank, arr);
    }
    for (const [rank, indices] of byRank) {
        if (indices.length < 2) continue;
        // Only the first 2 distinct-suit indices form one near-set hint
        // (we don't surface 3-of-a-kind here — that would have been caught
        // as a complete set already).
        const seenSuits = new Set<Suit>();
        const pair: number[] = [];
        for (const i of indices) {
            const suit = hand[i].suit;
            if (seenSuits.has(suit)) continue;
            seenSuits.add(suit);
            pair.push(i);
            if (pair.length === 2) break;
        }
        if (pair.length === 2) {
            out.push({
                id: `near-set-${rank}`,
                kind: "set",
                handIndices: pair,
                missing: 1,
            });
        }
    }

    return out;
}

// ============================================================================
// Discard-top "form a meld with hand" check
// ============================================================================

/**
 * Returns true if `card` plus 2+ cards from `hand` could form a valid set
 * or run. Cheap O(n) scan — does not enumerate full subsets.
 */
function canFormMeldWith(card: Card, hand: readonly Card[]): boolean {
    if (RANK_ORDER[card.rank] == null) return false;

    // Set: need 2+ different-suit cards of same rank in hand.
    let sameRankDifferentSuit = 0;
    const usedSuits = new Set<Suit>([card.suit]);
    for (const h of hand) {
        if (h.rank === card.rank && !usedSuits.has(h.suit)) {
            usedSuits.add(h.suit);
            sameRankDifferentSuit++;
            if (sameRankDifferentSuit >= 2) return true;
        }
    }

    // Run: need 2 same-suit cards forming a 3-card run with `card`.
    const ord = RANK_ORDER[card.rank]!;
    const sameSuitOrdinals = new Set<number>();
    for (const h of hand) {
        if (h.suit !== card.suit) continue;
        const o = RANK_ORDER[h.rank];
        if (o != null) sameSuitOrdinals.add(o);
    }
    // Window of 3 consecutive ordinals containing `ord`.
    for (let start = Math.max(1, ord - 2); start <= ord; start++) {
        const end = start + 2;
        if (end > 13) continue;
        let ok = true;
        for (let v = start; v <= end; v++) {
            if (v === ord) continue;
            if (!sameSuitOrdinals.has(v)) {
                ok = false;
                break;
            }
        }
        if (ok) return true;
    }

    return false;
}

// ============================================================================
// Internal helpers
// ============================================================================

const SUIT_ORDER: readonly Suit[] = [
    Suit.Spades,
    Suit.Hearts,
    Suit.Diamonds,
    Suit.Clubs,
];

function allSuits(): readonly Suit[] {
    return SUIT_ORDER;
}

const RANK_ORDER_LIST: readonly Rank[] = [
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

function allRanksOrdered(): readonly Rank[] {
    return RANK_ORDER_LIST;
}

// ============================================================================
// Sort engine
// ============================================================================

export type RummySortMode = "smart" | "by-suit" | "by-rank" | "original";

export interface SortHandInput {
    readonly hand: readonly Card[];
    readonly mode: RummySortMode;
    /** Optional precomputed hints; rebuilt locally when omitted (smart only). */
    readonly hints?: RummyHints;
    readonly melds?: readonly Meld[];
}

/**
 * Returns a `displayOrder: number[]` mapping displayIndex → handIndex.
 * `displayOrder.length === hand.length` and contains every hand index
 * exactly once.
 *
 * - `original` → identity ([0..n-1]).
 * - `by-suit`  → group by suit (♠♥♦♣) then ascending rank (Ace low).
 * - `by-rank`  → ascending rank then suit. Jokers sort last.
 * - `smart`    → meld-group cards first (longest groups first, runs before
 *                sets), then near-meld cards, then leftovers ordered like
 *                `by-suit`.
 */
export function sortHandRummy(input: SortHandInput): number[] {
    const { hand, mode } = input;
    const n = hand.length;
    if (n === 0) return [];

    if (mode === "original") {
        return Array.from({ length: n }, (_, i) => i);
    }
    if (mode === "by-suit") {
        return sortByKey(n, (i) => suitRankKey(hand[i]));
    }
    if (mode === "by-rank") {
        return sortByKey(n, (i) => rankSuitKey(hand[i]));
    }

    // Smart sort.
    const hints =
        input.hints ??
        computeRummyHints({ hand, melds: input.melds ?? [], discardTop: null });

    const order: number[] = [];
    const placed = new Set<number>();

    // Complete melds — longest first, runs before sets within same length.
    const completeGroups = [...hints.meldGroups].sort((a, b) => {
        if (b.handIndices.length !== a.handIndices.length) {
            return b.handIndices.length - a.handIndices.length;
        }
        if (a.kind !== b.kind) return a.kind === "run" ? -1 : 1;
        return a.id.localeCompare(b.id);
    });
    for (const g of completeGroups) {
        for (const idx of g.handIndices) {
            if (!placed.has(idx)) {
                order.push(idx);
                placed.add(idx);
            }
        }
    }

    // Near-melds next.
    for (const g of hints.nearMeldGroups) {
        for (const idx of g.handIndices) {
            if (!placed.has(idx)) {
                order.push(idx);
                placed.add(idx);
            }
        }
    }

    // Leftovers, by-suit ordered.
    const leftovers: number[] = [];
    for (let i = 0; i < n; i++) {
        if (!placed.has(i)) leftovers.push(i);
    }
    leftovers.sort((a, b) =>
        compareKeys(suitRankKey(hand[a]), suitRankKey(hand[b])),
    );
    order.push(...leftovers);

    return order;
}

function sortByKey(
    n: number,
    keyFn: (i: number) => readonly number[],
): number[] {
    const indices = Array.from({ length: n }, (_, i) => i);
    const cache = indices.map((i) => keyFn(i));
    indices.sort((a, b) => compareKeys(cache[a], cache[b]));
    return indices;
}

function compareKeys(a: readonly number[], b: readonly number[]): number {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const av = a[i] ?? 0;
        const bv = b[i] ?? 0;
        if (av !== bv) return av - bv;
    }
    return 0;
}

function suitRankKey(card: Card): readonly number[] {
    const suitIdx = SUIT_ORDER.indexOf(card.suit);
    const rankOrd = RANK_ORDER[card.rank] ?? 99;
    return [suitIdx === -1 ? 99 : suitIdx, rankOrd];
}

function rankSuitKey(card: Card): readonly number[] {
    const suitIdx = SUIT_ORDER.indexOf(card.suit);
    const rankOrd = RANK_ORDER[card.rank] ?? 99;
    return [rankOrd, suitIdx === -1 ? 99 : suitIdx];
}

// Re-export for caller convenience.
export { cardValue };
