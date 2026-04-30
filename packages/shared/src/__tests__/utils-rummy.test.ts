import { describe, it, expect } from "vitest";
import { sortRunForDisplay } from "../utils/rummy";

describe("sortRunForDisplay", () => {
    it("sorts a same-suit run ascending, ace low by default", () => {
        const cards = [
            { rank: "3", suit: "Spades" as const },
            { rank: "A", suit: "Spades" as const },
            { rank: "2", suit: "Spades" as const },
        ];
        expect(sortRunForDisplay(cards)).toEqual([1, 2, 0]);
    });

    it("treats ace as high when run includes a King and no Two", () => {
        const cards = [
            { rank: "A", suit: "Spades" as const },
            { rank: "Q", suit: "Spades" as const },
            { rank: "K", suit: "Spades" as const },
        ];
        // Q (12), K (13), A-high (14)
        expect(sortRunForDisplay(cards)).toEqual([1, 2, 0]);
    });

    it("regression: 10/9/J → 9/10/J", () => {
        const cards = [
            { rank: "10", suit: "Spades" as const },
            { rank: "9", suit: "Spades" as const },
            { rank: "J", suit: "Spades" as const },
        ];
        expect(sortRunForDisplay(cards)).toEqual([1, 0, 2]);
    });

    it("preserves all cards even when some ranks are unorderable", () => {
        const cards = [
            { rank: "5", suit: "Hearts" as const },
            { rank: "BJ", suit: "Hearts" as const },
            { rank: "3", suit: "Hearts" as const },
        ];
        const order = sortRunForDisplay(cards);
        expect(order).toHaveLength(3);
        expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2]);
        // Joker (unorderable) appended at end.
        expect(order[order.length - 1]).toBe(1);
    });
});
