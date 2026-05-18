"use client";

import React, { useEffect, useMemo, useState } from "react";
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
    /**
     * Optional card that MUST be included in the meld (e.g. the just-picked
     * discard during `awaiting-discard-play`). Rendered pinned at the start
     * of the selection row and included in validation alongside hand
     * selections.
     */
    seedCard?: PlayingCard | null;
    /**
     * Optional bonus cards that come along with `seedCard` (e.g. the cards
     * above a deep discard pickup that the player is forced to take into
     * hand). They are tappable: included by default in the proposed meld
     * but can be toggled out if they don't fit (excluded bonus cards still
     * end up in the player's hand on confirm — the server treats unused
     * tail cards as a free pool sourced from the discard tail). Only the
     * `seedCard` is truly mandatory in the meld.
     */
    bonusCards?: PlayingCard[];
    /** Optional help text shown instead of the default empty-state hint. */
    helpText?: string;
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
    seedCard = null,
    bonusCards,
    helpText,
}: MeldComposerProps) {
    const selectedCards = useMemo(
        () => selectedIndices.map((i) => hand[i]).filter(Boolean),
        [selectedIndices, hand],
    );

    // Bonus cards are toggleable. Default: include all (most pickups want
    // every tail card in the meld). Tap to exclude one that doesn't fit
    // — it still ends up in hand on confirm.
    const [excludedBonusKeys, setExcludedBonusKeys] = useState<Set<string>>(
        () => new Set(),
    );
    // Reset exclusions when the bonus pile identity changes (new pickup).
    const bonusKey = useMemo(
        () => (bonusCards ?? []).map((c) => `${c.rank}${c.suit}`).join("|"),
        [bonusCards],
    );
    useEffect(() => {
        setExcludedBonusKeys(new Set());
    }, [bonusKey]);

    const includedBonusCards = useMemo(
        () =>
            (bonusCards ?? []).filter(
                (c, i) => !excludedBonusKeys.has(`${i}-${c.rank}${c.suit}`),
            ),
        [bonusCards, excludedBonusKeys],
    );

    /** Cards used for validation — seed + included bonus come first. */
    const validationCards = useMemo(() => {
        const forced: PlayingCard[] = [];
        if (seedCard) forced.push(seedCard);
        if (includedBonusCards.length > 0) forced.push(...includedBonusCards);
        return forced.length > 0
            ? [...forced, ...selectedCards]
            : selectedCards;
    }, [seedCard, includedBonusCards, selectedCards]);

    const validation = useMemo(() => {
        if (validationCards.length < 3) {
            return {
                kind: null as null | "set" | "run",
                reason: "Select at least 3 cards.",
            };
        }
        const serverCards = toServerCards(validationCards);
        if (serverCards.length !== validationCards.length) {
            return { kind: null, reason: "Unsupported card." };
        }
        if (isValidSet(serverCards))
            return { kind: "set" as const, reason: null };
        if (isValidRun(serverCards))
            return { kind: "run" as const, reason: null };
        return { kind: null, reason: "Not a valid set or run." };
    }, [validationCards]);

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
                            onConfirm(validationCards, validation.kind)
                        }
                        disabled={disabled || !validation.kind}
                    >
                        Confirm
                    </Button>
                </div>
            </div>
            <div className="flex items-center gap-1 min-h-12">
                {seedCard && (
                    <div
                        className="relative shrink-0"
                        aria-label={`Locked: ${seedCard.rank} of ${seedCard.suit}`}
                    >
                        <PlayingCardView card={seedCard} size="sm" />
                        <Badge className="absolute -top-2 -right-2 text-[9px] bg-amber-500 text-black border-amber-300">
                            picked
                        </Badge>
                    </div>
                )}
                {bonusCards?.map((c, i) => {
                    const key = `${i}-${c.rank}${c.suit}`;
                    const excluded = excludedBonusKeys.has(key);
                    return (
                        <button
                            key={`bonus-${key}`}
                            type="button"
                            onClick={() =>
                                setExcludedBonusKeys((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(key)) next.delete(key);
                                    else next.add(key);
                                    return next;
                                })
                            }
                            disabled={disabled}
                            className={`relative shrink-0 cursor-pointer transition-opacity ${excluded ? "opacity-40" : ""}`}
                            aria-label={`${excluded ? "Add back" : "Exclude"} bonus card ${c.rank} of ${c.suit}`}
                            aria-pressed={!excluded}
                        >
                            <PlayingCardView card={c} size="sm" />
                            <Badge
                                className={`absolute -top-2 -right-2 text-[9px] ${excluded ? "bg-white/30 text-white border-white/40" : "bg-sky-500 text-white border-sky-300"}`}
                            >
                                {excluded ? "to hand" : "bonus"}
                            </Badge>
                        </button>
                    );
                })}
                {selectedCards.length === 0 && !seedCard ? (
                    <span className="text-white/40 text-xs italic">
                        {helpText ?? "Tap cards in your hand to add them."}
                    </span>
                ) : selectedCards.length === 0 && seedCard ? (
                    <span className="text-white/50 text-xs italic ml-1">
                        {helpText ??
                            "Add 2+ cards from your hand to form a set or run with the picked card."}
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
