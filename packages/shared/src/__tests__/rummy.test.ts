// packages/shared/src/__tests__/rummy.test.ts
import { describe, it, expect } from "vitest";
import { Rank, Suit } from "../types/games/cards";
import type { Card } from "../types/games/cards";
import type { Meld } from "../types/games/rummy";
import {
    cardValue,
    sumCardValues,
    isValidSet,
    isValidRun,
    isValidMeld,
    detectMeldKind,
    canLayOffCard,
    findAllLayoffTargets,
    isRummyCallable,
    scoreHand,
    isValidDealSize,
    legalDealSizes,
} from "../validation/rummy";

const c = (rank: Rank, suit: Suit): Card => ({ rank, suit });

const meld = (id: string, kind: "set" | "run", cards: Card[]): Meld => ({
    id,
    kind,
    cards,
    ownerId: "p1",
    round: 1,
});

describe("cardValue", () => {
    it("scores aces as 15", () => {
        expect(cardValue(c(Rank.Ace, Suit.Spades))).toBe(15);
    });
    it("scores K/Q/J/10 as 10", () => {
        expect(cardValue(c(Rank.King, Suit.Hearts))).toBe(10);
        expect(cardValue(c(Rank.Queen, Suit.Hearts))).toBe(10);
        expect(cardValue(c(Rank.Jack, Suit.Hearts))).toBe(10);
        expect(cardValue(c(Rank.Ten, Suit.Hearts))).toBe(10);
    });
    it("scores 2-9 as 5", () => {
        for (const r of [
            Rank.Two,
            Rank.Three,
            Rank.Four,
            Rank.Five,
            Rank.Six,
            Rank.Seven,
            Rank.Eight,
            Rank.Nine,
        ]) {
            expect(cardValue(c(r, Suit.Clubs))).toBe(5);
        }
    });
    it("sums correctly", () => {
        expect(
            sumCardValues([
                c(Rank.Ace, Suit.Spades),
                c(Rank.King, Suit.Hearts),
                c(Rank.Two, Suit.Clubs),
            ]),
        ).toBe(30);
    });
});

describe("isValidSet", () => {
    it("accepts 3 same-rank different-suit cards", () => {
        expect(
            isValidSet([
                c(Rank.Seven, Suit.Hearts),
                c(Rank.Seven, Suit.Diamonds),
                c(Rank.Seven, Suit.Clubs),
            ]),
        ).toBe(true);
    });
    it("accepts 4 same-rank cards", () => {
        expect(
            isValidSet([
                c(Rank.King, Suit.Hearts),
                c(Rank.King, Suit.Diamonds),
                c(Rank.King, Suit.Clubs),
                c(Rank.King, Suit.Spades),
            ]),
        ).toBe(true);
    });
    it("rejects fewer than 3 cards", () => {
        expect(
            isValidSet([c(Rank.Seven, Suit.Hearts), c(Rank.Seven, Suit.Clubs)]),
        ).toBe(false);
    });
    it("rejects mixed ranks", () => {
        expect(
            isValidSet([
                c(Rank.Seven, Suit.Hearts),
                c(Rank.Eight, Suit.Diamonds),
                c(Rank.Seven, Suit.Clubs),
            ]),
        ).toBe(false);
    });
    it("rejects duplicate suits", () => {
        expect(
            isValidSet([
                c(Rank.Seven, Suit.Hearts),
                c(Rank.Seven, Suit.Hearts),
                c(Rank.Seven, Suit.Clubs),
            ]),
        ).toBe(false);
    });
});

describe("isValidRun", () => {
    it("accepts ascending same-suit run", () => {
        expect(
            isValidRun([
                c(Rank.Five, Suit.Hearts),
                c(Rank.Six, Suit.Hearts),
                c(Rank.Seven, Suit.Hearts),
            ]),
        ).toBe(true);
    });
    it("accepts run with ace LOW (A-2-3)", () => {
        expect(
            isValidRun([
                c(Rank.Ace, Suit.Spades),
                c(Rank.Two, Suit.Spades),
                c(Rank.Three, Suit.Spades),
            ]),
        ).toBe(true);
    });
    it("rejects Q-K-A wrap (ace not high)", () => {
        expect(
            isValidRun([
                c(Rank.Queen, Suit.Spades),
                c(Rank.King, Suit.Spades),
                c(Rank.Ace, Suit.Spades),
            ]),
        ).toBe(false);
    });
    it("rejects mixed suits", () => {
        expect(
            isValidRun([
                c(Rank.Five, Suit.Hearts),
                c(Rank.Six, Suit.Diamonds),
                c(Rank.Seven, Suit.Hearts),
            ]),
        ).toBe(false);
    });
    it("rejects non-consecutive cards", () => {
        expect(
            isValidRun([
                c(Rank.Five, Suit.Hearts),
                c(Rank.Seven, Suit.Hearts),
                c(Rank.Eight, Suit.Hearts),
            ]),
        ).toBe(false);
    });
    it("accepts unsorted but consecutive cards", () => {
        expect(
            isValidRun([
                c(Rank.Seven, Suit.Hearts),
                c(Rank.Five, Suit.Hearts),
                c(Rank.Six, Suit.Hearts),
            ]),
        ).toBe(true);
    });
});

describe("detectMeldKind / isValidMeld", () => {
    it("detects set", () => {
        expect(
            detectMeldKind([
                c(Rank.Three, Suit.Hearts),
                c(Rank.Three, Suit.Diamonds),
                c(Rank.Three, Suit.Clubs),
            ]),
        ).toBe("set");
    });
    it("detects run", () => {
        expect(
            detectMeldKind([
                c(Rank.Three, Suit.Hearts),
                c(Rank.Four, Suit.Hearts),
                c(Rank.Five, Suit.Hearts),
            ]),
        ).toBe("run");
    });
    it("returns null for invalid", () => {
        expect(
            detectMeldKind([
                c(Rank.Three, Suit.Hearts),
                c(Rank.Five, Suit.Diamonds),
            ]),
        ).toBeNull();
        expect(
            isValidMeld([
                c(Rank.Three, Suit.Hearts),
                c(Rank.Five, Suit.Diamonds),
            ]),
        ).toBe(false);
    });
});

describe("canLayOffCard", () => {
    const setMeld = meld("m1", "set", [
        c(Rank.Seven, Suit.Hearts),
        c(Rank.Seven, Suit.Diamonds),
        c(Rank.Seven, Suit.Clubs),
    ]);
    const runMeld = meld("m2", "run", [
        c(Rank.Five, Suit.Hearts),
        c(Rank.Six, Suit.Hearts),
        c(Rank.Seven, Suit.Hearts),
    ]);

    it("layoff onto set with new suit", () => {
        expect(canLayOffCard(c(Rank.Seven, Suit.Spades), setMeld)).toBe(true);
    });
    it("rejects layoff onto set with duplicate suit", () => {
        expect(canLayOffCard(c(Rank.Seven, Suit.Hearts), setMeld)).toBe(false);
    });
    it("rejects layoff onto set with different rank", () => {
        expect(canLayOffCard(c(Rank.Eight, Suit.Spades), setMeld)).toBe(false);
    });
    it("layoff extends run on high end", () => {
        expect(canLayOffCard(c(Rank.Eight, Suit.Hearts), runMeld)).toBe(true);
    });
    it("layoff extends run on low end", () => {
        expect(canLayOffCard(c(Rank.Four, Suit.Hearts), runMeld)).toBe(true);
    });
    it("rejects run extension with wrong suit", () => {
        expect(canLayOffCard(c(Rank.Eight, Suit.Diamonds), runMeld)).toBe(
            false,
        );
    });
    it("rejects run extension with non-adjacent rank", () => {
        expect(canLayOffCard(c(Rank.Nine, Suit.Hearts), runMeld)).toBe(false);
    });
    it("does not allow extending run past King", () => {
        const highRun = meld("m3", "run", [
            c(Rank.Jack, Suit.Spades),
            c(Rank.Queen, Suit.Spades),
            c(Rank.King, Suit.Spades),
        ]);
        expect(canLayOffCard(c(Rank.Ace, Suit.Spades), highRun)).toBe(false);
    });
});

describe("findAllLayoffTargets / isRummyCallable", () => {
    const m1 = meld("m1", "set", [
        c(Rank.Seven, Suit.Hearts),
        c(Rank.Seven, Suit.Diamonds),
        c(Rank.Seven, Suit.Clubs),
    ]);
    const m2 = meld("m2", "run", [
        c(Rank.Five, Suit.Hearts),
        c(Rank.Six, Suit.Hearts),
        c(Rank.Seven, Suit.Hearts),
    ]);

    it("returns matching meld ids sorted", () => {
        // Eight of Hearts can go onto m2 (run extension)
        expect(
            findAllLayoffTargets(c(Rank.Eight, Suit.Hearts), [m2, m1]),
        ).toEqual(["m2"]);
    });
    it("rummy callable when at least one target exists", () => {
        expect(isRummyCallable(c(Rank.Eight, Suit.Hearts), [m1, m2])).toBe(
            true,
        );
        expect(isRummyCallable(c(Rank.Two, Suit.Spades), [m1, m2])).toBe(false);
    });
    it("returns ids sorted ascending for deterministic v1 ambiguity rule", () => {
        const setSpades = meld("z", "set", [
            c(Rank.Seven, Suit.Hearts),
            c(Rank.Seven, Suit.Diamonds),
            c(Rank.Seven, Suit.Clubs),
        ]);
        const setSpades2 = meld("a", "set", [
            c(Rank.Seven, Suit.Hearts),
            c(Rank.Seven, Suit.Diamonds),
            c(Rank.Seven, Suit.Clubs),
        ]);
        expect(
            findAllLayoffTargets(c(Rank.Seven, Suit.Spades), [
                setSpades,
                setSpades2,
            ]),
        ).toEqual(["a", "z"]);
    });
});

describe("scoreHand", () => {
    it("computes melded - deadwood", () => {
        const result = scoreHand({
            hand: [c(Rank.Ace, Suit.Spades), c(Rank.Two, Suit.Hearts)], // 15+5 = 20
            melded: [
                c(Rank.Seven, Suit.Hearts),
                c(Rank.Seven, Suit.Diamonds),
                c(Rank.Seven, Suit.Clubs),
            ], // 5+5+5 = 15
            wentOut: false,
            goingOutBonus: 25,
        });
        expect(result.meldedPoints).toBe(15);
        expect(result.deadwoodPoints).toBe(20);
        expect(result.bonus).toBe(0);
        expect(result.delta).toBe(-5);
    });
    it("adds going-out bonus when applicable", () => {
        const result = scoreHand({
            hand: [],
            melded: [
                c(Rank.King, Suit.Hearts),
                c(Rank.King, Suit.Diamonds),
                c(Rank.King, Suit.Clubs),
            ], // 30
            wentOut: true,
            goingOutBonus: 25,
        });
        expect(result.delta).toBe(30 + 25);
    });
});

describe("isValidDealSize / legalDealSizes", () => {
    const bounds = { min: 7, max: 13, deckSize: 52, playerCount: 4 };
    it("accepts in-range odd sizes", () => {
        expect(isValidDealSize(7, bounds)).toBe(true);
        expect(isValidDealSize(9, bounds)).toBe(true);
        expect(isValidDealSize(11, bounds)).toBe(true);
    });
    it("rejects even sizes", () => {
        expect(isValidDealSize(8, bounds)).toBe(false);
    });
    it("rejects out-of-range", () => {
        expect(isValidDealSize(5, bounds)).toBe(false);
        expect(isValidDealSize(15, bounds)).toBe(false);
    });
    it("rejects sizes that exhaust the deck", () => {
        // 6 players * 13 = 78 + 1 face-up = 79 > 52
        expect(
            isValidDealSize(13, {
                min: 7,
                max: 13,
                deckSize: 52,
                playerCount: 6,
            }),
        ).toBe(false);
    });
    it("legalDealSizes returns only valid odd sizes", () => {
        // 4 players: 13*4+1 = 53 > 52, so 13 is excluded.
        expect(legalDealSizes(bounds)).toEqual([7, 9, 11]);
    });
});
