// packages/shared/src/__tests__/hints-rummy.test.ts
import { describe, it, expect } from "vitest";
import { Rank, Suit } from "../types/games/cards";
import type { Card } from "../types/games/cards";
import type { Meld } from "../types/games/rummy";
import {
    computeRummyHints,
    sortHandRummy,
    type RummySortMode,
} from "../hints/rummy";

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit });

const mkMeld = (id: string, kind: "set" | "run", cards: Card[]): Meld => ({
    id,
    kind,
    cards,
    ownerId: "p1",
    round: 1,
});

describe("computeRummyHints — meldGroups", () => {
    it("returns empty results for an empty hand", () => {
        const out = computeRummyHints({ hand: [], melds: [] });
        expect(out.meldGroups).toEqual([]);
        expect(out.nearMeldGroups).toEqual([]);
        expect(out.deadwoodPoints).toBe(0);
        expect(out.layoffsByHandIndex.size).toBe(0);
    });

    it("detects a clean run (5-6-7 of hearts)", () => {
        const hand = [
            c(Rank.Five, Suit.Hearts),
            c(Rank.Six, Suit.Hearts),
            c(Rank.Seven, Suit.Hearts),
        ];
        const out = computeRummyHints({ hand, melds: [] });
        expect(out.meldGroups).toHaveLength(1);
        expect(out.meldGroups[0].kind).toBe("run");
        expect([...out.meldGroups[0].handIndices].sort()).toEqual([0, 1, 2]);
        expect(out.deadwoodPoints).toBe(0);
    });

    it("detects a clean set (three Kings)", () => {
        const hand = [
            c(Rank.King, Suit.Spades),
            c(Rank.King, Suit.Hearts),
            c(Rank.King, Suit.Diamonds),
        ];
        const out = computeRummyHints({ hand, melds: [] });
        expect(out.meldGroups).toHaveLength(1);
        expect(out.meldGroups[0].kind).toBe("set");
        expect(out.deadwoodPoints).toBe(0);
    });

    it("prefers a longer run over a shorter set when overlapping", () => {
        // Hand: 4♥ 5♥ 6♥ 7♥ + 7♠ 7♦
        // Greedy picks the 4-card run first; the remaining 7s are only 2 cards
        // so no set is detected as complete (would need ≥3 distinct suits).
        const hand = [
            c(Rank.Four, Suit.Hearts),
            c(Rank.Five, Suit.Hearts),
            c(Rank.Six, Suit.Hearts),
            c(Rank.Seven, Suit.Hearts),
            c(Rank.Seven, Suit.Spades),
            c(Rank.Seven, Suit.Diamonds),
        ];
        const out = computeRummyHints({ hand, melds: [] });
        const completeRuns = out.meldGroups.filter((g) => g.kind === "run");
        expect(completeRuns).toHaveLength(1);
        expect(completeRuns[0].handIndices).toHaveLength(4);
    });

    it("ace is low only — Q-K-A is not a run", () => {
        const hand = [
            c(Rank.Queen, Suit.Hearts),
            c(Rank.King, Suit.Hearts),
            c(Rank.Ace, Suit.Hearts),
        ];
        const out = computeRummyHints({ hand, melds: [] });
        expect(out.meldGroups).toHaveLength(0);
    });
});

describe("computeRummyHints — layoffs", () => {
    it("flags hand cards that can lay off onto an existing meld", () => {
        const meld = mkMeld("m1", "run", [
            c(Rank.Five, Suit.Hearts),
            c(Rank.Six, Suit.Hearts),
            c(Rank.Seven, Suit.Hearts),
        ]);
        const hand = [
            c(Rank.Eight, Suit.Hearts), // can extend high
            c(Rank.Four, Suit.Hearts), // can extend low
            c(Rank.Eight, Suit.Spades), // cannot — wrong suit
        ];
        const out = computeRummyHints({ hand, melds: [meld] });
        expect(out.layoffsByHandIndex.get(0)).toEqual(["m1"]);
        expect(out.layoffsByHandIndex.get(1)).toEqual(["m1"]);
        expect(out.layoffsByHandIndex.has(2)).toBe(false);
    });
});

describe("computeRummyHints — near-melds & deadwood", () => {
    it("surfaces pairs and 2-card straights from leftovers", () => {
        // 9♠ 9♥ → pair. 4♦ 5♦ → near-run. 2♣ alone → deadwood only.
        const hand = [
            c(Rank.Nine, Suit.Spades),
            c(Rank.Nine, Suit.Hearts),
            c(Rank.Four, Suit.Diamonds),
            c(Rank.Five, Suit.Diamonds),
            c(Rank.Two, Suit.Clubs),
        ];
        const out = computeRummyHints({ hand, melds: [] });
        expect(out.meldGroups).toHaveLength(0);
        const kinds = out.nearMeldGroups.map((g) => g.kind).sort();
        expect(kinds).toEqual(["run", "set"]);
        // Deadwood = sum of every card (no complete groups).
        // 9+9+5+5+5 = 33? cardValue: 9s=5, 4=5, 5=5, 2=5 → 5*5 = 25.
        expect(out.deadwoodPoints).toBe(25);
    });

    it("excludes complete-group cards from deadwood", () => {
        // Run of 3 (15 melded) + leftover Ace (15 deadwood).
        const hand = [
            c(Rank.Five, Suit.Hearts),
            c(Rank.Six, Suit.Hearts),
            c(Rank.Seven, Suit.Hearts),
            c(Rank.Ace, Suit.Spades),
        ];
        const out = computeRummyHints({ hand, melds: [] });
        expect(out.meldGroups).toHaveLength(1);
        expect(out.deadwoodPoints).toBe(15);
    });
});

describe("computeRummyHints — discardTop", () => {
    it("flags layoff and meld-formation potential for the top discard", () => {
        const meld = mkMeld("m1", "set", [
            c(Rank.Eight, Suit.Spades),
            c(Rank.Eight, Suit.Hearts),
            c(Rank.Eight, Suit.Diamonds),
        ]);
        // Top discard = 8♣ → can lay off (4th eight) AND can form a set with hand.
        const hand = [c(Rank.Eight, Suit.Diamonds), c(Rank.Eight, Suit.Hearts)];
        const out = computeRummyHints({
            hand,
            melds: [meld],
            discardTop: c(Rank.Eight, Suit.Clubs),
        });
        expect(out.discardTop.canLayoff).toBe(true);
        // 8♣ + 8♦ + 8♥ is a valid 3-suit set.
        expect(out.discardTop.canFormMeldWithHand).toBe(true);
    });

    it("detects forming a new run using the discard top + hand", () => {
        const hand = [c(Rank.Six, Suit.Hearts), c(Rank.Seven, Suit.Hearts)];
        const out = computeRummyHints({
            hand,
            melds: [],
            discardTop: c(Rank.Five, Suit.Hearts),
        });
        expect(out.discardTop.canFormMeldWithHand).toBe(true);
    });

    it("detects discard top filling the middle of a run (9♠/J♠ in hand, 10♠ on discard)", () => {
        // Regression: the user reported the glow not firing in this case.
        // canFormMeldWith must consider the window where the discard sits
        // between two existing hand cards.
        const hand = [c(Rank.Nine, Suit.Spades), c(Rank.Jack, Suit.Spades)];
        const out = computeRummyHints({
            hand,
            melds: [],
            discardTop: c(Rank.Ten, Suit.Spades),
        });
        expect(out.discardTop.canFormMeldWithHand).toBe(true);
    });
});

describe("sortHandRummy", () => {
    const hand: Card[] = [
        c(Rank.Three, Suit.Diamonds),
        c(Rank.King, Suit.Spades),
        c(Rank.Three, Suit.Hearts),
        c(Rank.King, Suit.Hearts),
        c(Rank.Five, Suit.Spades),
    ];

    it("original mode returns identity", () => {
        const order = sortHandRummy({ hand, mode: "original" });
        expect(order).toEqual([0, 1, 2, 3, 4]);
    });

    it.each<RummySortMode>(["by-suit", "by-rank", "smart"])(
        "produces a permutation for %s",
        (mode) => {
            const order = sortHandRummy({ hand, mode });
            expect(order).toHaveLength(hand.length);
            expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
        },
    );

    it("by-suit groups same suits together", () => {
        const order = sortHandRummy({ hand, mode: "by-suit" });
        const suitsInOrder = order.map((i) => hand[i].suit);
        // No suit reappears after a different suit interrupts.
        const seen = new Set<Suit>();
        let prev: Suit | null = null;
        for (const s of suitsInOrder) {
            if (s !== prev && seen.has(s)) {
                throw new Error(`Suit ${s} reappeared after interruption`);
            }
            seen.add(s);
            prev = s;
        }
    });

    it("smart mode places complete-meld cards first", () => {
        // Add a clean run to the hand at random positions.
        const hand2: Card[] = [
            c(Rank.Two, Suit.Clubs), // deadwood
            c(Rank.Six, Suit.Hearts), // run
            c(Rank.Five, Suit.Hearts), // run
            c(Rank.King, Suit.Spades), // deadwood
            c(Rank.Seven, Suit.Hearts), // run
        ];
        const order = sortHandRummy({ hand: hand2, mode: "smart" });
        const firstThree = order.slice(0, 3).map((i) => hand2[i]);
        // The first 3 display slots should contain the 5-6-7 of hearts run.
        const ranks = firstThree.map((card) => card.rank).sort();
        expect(ranks).toEqual([Rank.Five, Rank.Seven, Rank.Six].sort());
    });

    it("returns an empty array for an empty hand", () => {
        expect(sortHandRummy({ hand: [], mode: "smart" })).toEqual([]);
    });
});
