"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlayingCard, RummyData } from "@shared/types";
import PlayingCardView from "@/components/games/shared/PlayingCard";
import { Badge } from "@/components/ui/badge";
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
    /** Click handler for the "Pile (N)" badge in compact mode. */
    onExpandClick?: () => void;
    className?: string;
}

/**
 * DiscardPile renders the discard pile as a fan or stack depending on layout
 * mode. In compact mode shows only the top card + a count badge; tapping the
 * badge fires `onExpandClick` (caller is responsible for opening a sheet).
 */
export default function DiscardPile({
    discard,
    layoutMode,
    previewPickIndex = null,
    interactive = false,
    onCardClick,
    onExpandClick,
    className,
}: DiscardPileProps) {
    const cards = discard.cards;
    const count = cards.length;

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

    // ---- Compact: top card only + tap-to-expand badge ----
    if (layoutMode === "compact") {
        const top = cards[count - 1];
        return (
            <div className={cn("relative", className)}>
                <button
                    type="button"
                    onClick={() => interactive && onCardClick?.(count - 1)}
                    disabled={!interactive}
                    className={cn("block", interactive && "cursor-pointer")}
                    aria-label={`Discard top: ${top.rank} of ${top.suit}`}
                >
                    <PlayingCardView card={top} size="sm" />
                </button>
                {count > 1 && (
                    <button
                        type="button"
                        onClick={onExpandClick}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                    >
                        <Badge
                            variant="secondary"
                            className="text-[10px] cursor-pointer bg-black/70 text-white border-white/20 hover:bg-black/90"
                        >
                            Pile ({count})
                        </Badge>
                    </button>
                )}
            </div>
        );
    }

    // ---- Spacious / comfortable: cascading fan ----
    const maxVisible = layoutMode === "spacious" ? 12 : 8;
    const visibleStart = Math.max(0, count - maxVisible);
    const visibleCards = cards.slice(visibleStart);
    const hiddenBelow = visibleStart;
    const offsetPct = layoutMode === "spacious" ? 22 : 16;
    const cardSize = layoutMode === "spacious" ? "md" : "sm";
    const cardWidth = cardSize === "md" ? 70 : 52;

    const previewLocalIdx =
        previewPickIndex != null ? previewPickIndex - visibleStart : null;

    return (
        <div className={cn("relative inline-block", className)}>
            {hiddenBelow > 0 && (
                <Badge
                    variant="secondary"
                    className="absolute -top-2 -left-2 z-30 text-[10px] bg-black/70 text-white border-white/20"
                >
                    +{hiddenBelow}
                </Badge>
            )}
            <div
                className="relative"
                style={{
                    width: cardWidth + (visibleCards.length - 1) * offsetPct,
                    height: cardSize === "md" ? 98 : 73,
                }}
            >
                <AnimatePresence>
                    {visibleCards.map((card, localIdx) => {
                        const pileIndex = visibleStart + localIdx;
                        const isTop = pileIndex === count - 1;
                        const isPreview =
                            previewLocalIdx != null &&
                            localIdx >= previewLocalIdx;
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
                                )}
                                style={{
                                    left: localIdx * offsetPct,
                                    zIndex: isPreview ? 30 : localIdx,
                                }}
                                aria-label={`${card.rank} of ${card.suit}${isTop ? " (top)" : ""}`}
                            >
                                <PlayingCardView card={card} size={cardSize} />
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}

/**
 * Modal-like sheet body used when a compact-mode user taps the pile badge.
 * The caller wraps this in their own Dialog/Sheet component.
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
