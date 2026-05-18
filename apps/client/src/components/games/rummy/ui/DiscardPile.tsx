"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlayingCard, RummyData } from "@shared/types";
import PlayingCardView from "@/components/games/shared/PlayingCard";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DiscardPileProps {
    discard: RummyData["discard"];
    /** Layout mode from useGameTable. */
    layoutMode: "compact" | "comfortable" | "spacious";
    /** Index of currently previewed pick (during draw step). */
    previewPickIndex?: number | null;
    /** Whether the local player can interact with the pile. */
    interactive?: boolean;
    /** Click handler for a card in the pile (passes index). */
    onCardClick?: (pickIndex: number) => void;
    /**
     * Optional cap on how many cards from the top render in the live fan.
     * Cards older than this are accessible via the overflow sheet. Defaults
     * to 10 (spacious) / 8 (comfortable) / 1 (compact).
     */
    maxFanCards?: number;
    /**
     * When true, the top-of-pile card pulses with a green ring to hint that
     * the hero can immediately layoff or form a meld with it. Hint-gated by
     * the caller (settings + master toggle).
     */
    topGlow?: boolean;
    /**
     * Optional per-card glow flags (parallel to `discard.cards`). When
     * `cardGlow[i]` is true, that card pulses with a green ring to hint
     * that picking it up would yield a meld or layoff (deep pickups
     * include the bonus cards above the picked card). Hint-gated by
     * the caller. When provided, this supersedes `topGlow` for the top
     * card position.
     */
    cardGlow?: readonly boolean[];
    /**
     * Override the card size that would otherwise be derived from
     * `layoutMode`. Useful when a parent gives the pile more space than
     * its layoutMode default would suggest (e.g. compact DRAW scene's
     * left/right split where the action pane has plenty of horizontal
     * room despite the global compact mode).
     */
    cardSizeOverride?: "md" | "sm" | "xs";
    className?: string;
}

/**
 * DiscardPile renders the top of the pile as a fan (or the top card in
 * compact mode). When the pile grows past `maxFanCards`, an overflow chip is
 * surfaced — tapping it opens an internal sheet that lists the entire pile so
 * the player can still pick deep cards (Rummy lets you pick any card and take
 * everything above it).
 */
export default function DiscardPile({
    discard,
    layoutMode,
    previewPickIndex = null,
    interactive = false,
    onCardClick,
    maxFanCards,
    topGlow = false,
    cardGlow,
    cardSizeOverride,
    className,
}: DiscardPileProps) {
    const cards = discard.cards;
    const count = cards.length;
    const [sheetOpen, setSheetOpen] = useState(false);

    const handleSheetPick = (pickIndex: number) => {
        if (!interactive) return;
        onCardClick?.(pickIndex);
        setSheetOpen(false);
    };

    if (count === 0) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center w-16 h-24 md:w-20 md:h-28 rounded-lg border-2 border-dashed border-white/20 text-white/40 text-[10px]",
                    className,
                )}
            >
                Discard
            </div>
        );
    }

    // ---- Compact / comfortable / spacious: cascading fan with overflow ----
    // Compact still shows a fan (smaller cap + tighter offset + xs cards) so
    // players can see and pick deep cards instead of being limited to the top.
    const fanCap =
        maxFanCards ??
        (layoutMode === "spacious" ? 10 : layoutMode === "comfortable" ? 8 : 4);
    const visibleCount = Math.min(count, fanCap);
    const visibleStart = count - visibleCount;
    const visibleCards = cards.slice(visibleStart);
    const hiddenBelow = visibleStart;
    // Compact: offset bumped from 12→22 so each card's corner rank/suit stays
    // legible when the fan stacks 3-4 cards. Spacious/comfortable unchanged.
    const offsetPct =
        layoutMode === "spacious" ? 22 : layoutMode === "comfortable" ? 16 : 22;
    const cardSize: "md" | "sm" | "xs" =
        cardSizeOverride ??
        (layoutMode === "spacious"
            ? "md"
            : layoutMode === "comfortable"
              ? "sm"
              : "xs");
    const cardWidth = cardSize === "md" ? 70 : cardSize === "sm" ? 52 : 40;
    const cardHeight = cardSize === "md" ? 98 : cardSize === "sm" ? 73 : 56;

    const previewLocalIdx =
        previewPickIndex != null && previewPickIndex >= visibleStart
            ? previewPickIndex - visibleStart
            : null;

    return (
        <>
            <div
                className={cn(
                    "relative inline-block",
                    // Allow the +N overflow chip to render outside the fan
                    // bounds without being clipped by parent stacking.
                    "pt-3",
                    className,
                )}
            >
                {hiddenBelow > 0 && (
                    <button
                        type="button"
                        onClick={() => setSheetOpen(true)}
                        className="absolute top-0 -left-3 z-40"
                        aria-label={`Show ${hiddenBelow} older discarded card${hiddenBelow === 1 ? "" : "s"}`}
                    >
                        <Badge
                            variant="secondary"
                            className="text-[10px] leading-none px-1.5 py-0.5 bg-black/80 text-white border-white/30 cursor-pointer hover:bg-black shadow-md"
                        >
                            +{hiddenBelow}
                        </Badge>
                    </button>
                )}
                <div
                    className="relative"
                    style={{
                        width:
                            cardWidth + (visibleCards.length - 1) * offsetPct,
                        height: cardHeight,
                    }}
                >
                    <AnimatePresence>
                        {visibleCards.map((card, localIdx) => {
                            const pileIndex = visibleStart + localIdx;
                            const isTop = pileIndex === count - 1;
                            const isPreview =
                                previewLocalIdx != null &&
                                localIdx >= previewLocalIdx;
                            const glowThis =
                                cardGlow?.[pileIndex] ??
                                (isTop ? topGlow : false);
                            return (
                                <motion.button
                                    key={`${pileIndex}-${card.rank}-${card.suit}`}
                                    type="button"
                                    onClick={() =>
                                        interactive && onCardClick?.(pileIndex)
                                    }
                                    disabled={!interactive}
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 320,
                                        damping: 26,
                                    }}
                                    className={cn(
                                        "absolute top-0",
                                        interactive && "cursor-pointer",
                                        isPreview &&
                                            "ring-2 ring-amber-400 rounded-md z-20",
                                        !isPreview &&
                                            glowThis &&
                                            "ring-2 ring-emerald-400 rounded-md animate-pulse",
                                    )}
                                    style={{
                                        left: localIdx * offsetPct,
                                        zIndex: isPreview ? 30 : localIdx,
                                    }}
                                    aria-label={`${card.rank} of ${card.suit}${isTop ? " (top)" : ""}`}
                                >
                                    <PlayingCardView
                                        card={card}
                                        size={cardSize}
                                    />
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
            <DiscardPileSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                cards={cards}
                interactive={interactive}
                onPick={handleSheetPick}
                previewPickIndex={previewPickIndex}
            />
        </>
    );
}

// ─── Internal sheet ───────────────────────────────────────────────────────────

interface DiscardPileSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cards: PlayingCard[];
    interactive: boolean;
    onPick: (pickIndex: number) => void;
    previewPickIndex?: number | null;
}

/**
 * Bottom-sheet listing the entire discard pile so the player can pick a deep
 * card (Rummy: picking index `i` takes card `i` plus every card above it).
 * Cards are listed newest-first so the most-recent options are at the top.
 */
function DiscardPileSheet({
    open,
    onOpenChange,
    cards,
    interactive,
    onPick,
    previewPickIndex = null,
}: DiscardPileSheetProps) {
    const count = cards.length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="p-0">
                <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/10">
                    <SheetTitle className="flex items-center gap-2">
                        Discard pile
                        <Badge
                            variant="secondary"
                            className="font-mono bg-white/10 border-white/10"
                        >
                            {count}
                        </Badge>
                    </SheetTitle>
                    <SheetDescription>
                        {interactive
                            ? "Oldest on the left, newest on the right. Tap any card to take it plus every card above it."
                            : "Oldest on the left, newest on the right."}
                    </SheetDescription>
                </SheetHeader>
                <div
                    className="overflow-x-auto overflow-y-hidden px-4 py-6"
                    // Snap newest card into view on open so the most-recent
                    // option is immediately visible without scrolling.
                    ref={(el) => {
                        if (el && open) {
                            // Defer to next paint so layout is settled.
                            requestAnimationFrame(() => {
                                el.scrollLeft = el.scrollWidth;
                            });
                        }
                    }}
                >
                    <div className="flex items-center gap-2 w-max">
                        {cards.map((card, pileIndex) => {
                            const isTop = pileIndex === count - 1;
                            const isPreview = pileIndex === previewPickIndex;
                            return (
                                <button
                                    key={`sheet-${pileIndex}-${card.rank}-${card.suit}`}
                                    type="button"
                                    onClick={() => onPick(pileIndex)}
                                    disabled={!interactive}
                                    className={cn(
                                        "relative shrink-0 rounded-md transition-transform",
                                        interactive &&
                                            "cursor-pointer hover:scale-105",
                                        !interactive && "cursor-default",
                                        isPreview &&
                                            "ring-2 ring-amber-400 rounded-md",
                                    )}
                                    aria-label={`Take ${card.rank} of ${card.suit}${isTop ? " (top of pile)" : ` (and ${count - 1 - pileIndex} above)`}`}
                                >
                                    <PlayingCardView card={card} size="sm" />
                                    {isTop && (
                                        <Badge className="absolute -top-1 -right-1 text-[9px] bg-amber-500 text-black border-amber-300">
                                            Top
                                        </Badge>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

/**
 * Read-only grid version of the discard pile, exported for callers that want
 * to embed the cards inside their own dialog/sheet container.
 */
export function DiscardPileSheetContent({
    cards,
    onCardClick,
    interactive = false,
}: {
    cards: PlayingCard[];
    interactive?: boolean;
    onCardClick?: (pickIndex: number) => void;
}) {
    return (
        <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto p-2">
            {cards.map((card, i) => (
                <button
                    key={`${i}-${card.rank}-${card.suit}`}
                    type="button"
                    onClick={() => interactive && onCardClick?.(i)}
                    disabled={!interactive}
                    className={cn(
                        "rounded-md transition-transform",
                        interactive && "cursor-pointer hover:scale-105",
                    )}
                    aria-label={`Pick ${card.rank} of ${card.suit} (index ${i})`}
                >
                    <PlayingCardView card={card} size="sm" />
                </button>
            ))}
        </div>
    );
}
