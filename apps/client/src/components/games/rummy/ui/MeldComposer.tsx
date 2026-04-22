"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { PlayingCard, Suit, Rank } from "@shared/types";
import { isValidSet, isValidRun } from "@shared/validation/rummy";
import PlayingCardView from "@/components/games/shared/PlayingCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface MeldComposerProps {
    /** The hero's hand. */
    hand: PlayingCard[];
    /** Selected card indices (controlled). */
    selectedIndices: number[];
    onToggleSelect: (idx: number) => void;
    onClear: () => void;
    onConfirm: (cards: PlayingCard[], kind: "set" | "run") => void;
    onCancel: () => void;
    disabled?: boolean;
}

const SUIT_TO_ENUM: Record<string, Suit> = {
    Hearts: Suit.Hearts,
    Diamonds: Suit.Diamonds,
    Clubs: Suit.Clubs,
    Spades: Suit.Spades,
};

const RANK_TO_ENUM: Record<string, Rank> = {
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
    LJ: Rank.LittleJoker,
    BJ: Rank.BigJoker,
};

function toServerCards(cards: PlayingCard[]) {
    return cards
        .map((c) => {
            const suit = SUIT_TO_ENUM[c.suit];
            const rank = RANK_TO_ENUM[c.rank];
            if (!suit || !rank) return null;
            return { suit, rank };
        })
        .filter((c): c is { suit: Suit; rank: Rank } => c !== null);
}

/**
 * Compact meld composer rendered above HandToolbar. Validates the current
 * selection live against isValidSet / isValidRun and surfaces a Confirm CTA.
 */
export default function MeldComposer({
    hand,
    selectedIndices,
    onToggleSelect,
    onClear,
    onConfirm,
    onCancel,
    disabled,
}: MeldComposerProps) {
    const selectedCards = useMemo(
        () => selectedIndices.map((i) => hand[i]).filter(Boolean),
        [selectedIndices, hand],
    );

    const validation = useMemo(() => {
        if (selectedCards.length < 3) {
            return {
                kind: null as null | "set" | "run",
                reason: "Select at least 3 cards.",
            };
        }
        const serverCards = toServerCards(selectedCards);
        if (serverCards.length !== selectedCards.length) {
            return { kind: null, reason: "Unsupported card." };
        }
        if (isValidSet(serverCards))
            return { kind: "set" as const, reason: null };
        if (isValidRun(serverCards))
            return { kind: "run" as const, reason: null };
        return { kind: null, reason: "Not a valid set or run." };
    }, [selectedCards]);

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col gap-2 p-3 rounded-xl bg-black/60 border border-emerald-500/40 backdrop-blur-sm shadow-xl"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-white">
                    <span className="font-medium">Compose meld:</span>
                    {validation.kind ? (
                        <Badge className="bg-emerald-600 text-white border-emerald-400">
                            Valid {validation.kind}
                        </Badge>
                    ) : (
                        <span className="text-white/60 italic">
                            {validation.reason}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClear}
                        disabled={disabled || selectedIndices.length === 0}
                        className="text-white/70 hover:text-white"
                    >
                        Clear
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onCancel}
                        disabled={disabled}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={() =>
                            validation.kind &&
                            onConfirm(selectedCards, validation.kind)
                        }
                        disabled={disabled || !validation.kind}
                    >
                        Confirm
                    </Button>
                </div>
            </div>
            <div className="flex items-center gap-1 min-h-[3rem]">
                {selectedCards.length === 0 ? (
                    <span className="text-white/40 text-xs italic">
                        Tap cards in your hand to add them.
                    </span>
                ) : (
                    selectedCards.map((c, i) => (
                        <button
                            key={`sel-${i}-${c.rank}-${c.suit}`}
                            type="button"
                            onClick={() => onToggleSelect(selectedIndices[i])}
                            className="cursor-pointer"
                            aria-label={`Remove ${c.rank} of ${c.suit}`}
                        >
                            <PlayingCardView card={c} size="sm" />
                        </button>
                    ))
                )}
            </div>
        </motion.div>
    );
}
