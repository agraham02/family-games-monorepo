"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import PlayingCardView from "@/components/games/shared/PlayingCard";
import type { RummyData } from "@shared/types";

export interface DiscardSheetProps {
    discard: RummyData["discard"];
    className?: string;
}

/**
 * Compact discard chip + read-only bottom sheet. Used in WAITING and MELD
 * scenes where the discard pile is informational but not actionable. The
 * interactive discard fan for the DRAW scene lives in `DiscardPile.tsx`.
 */
export default function DiscardSheet({
    discard,
    className,
}: DiscardSheetProps) {
    const [open, setOpen] = useState(false);
    const cards = discard.cards;
    const count = cards.length;
    const top = count > 0 ? cards[count - 1] : null;

    return (
        <>
            <motion.button
                type="button"
                layout
                layoutId="rummy-discard-chip"
                onClick={() => count > 0 && setOpen(true)}
                disabled={count === 0}
                aria-label={
                    top
                        ? `Discard pile — top card ${top.rank} of ${top.suit}, ${count} total. Tap to open.`
                        : "Discard pile — empty"
                }
                className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 bg-black/50 backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors",
                    count === 0 && "opacity-60 cursor-not-allowed",
                    className,
                )}
            >
                {top ? (
                    <PlayingCardView card={top} size="xs" />
                ) : (
                    <div className="w-10 h-14 rounded-md border-2 border-dashed border-white/20 flex items-center justify-center text-[9px] text-white/40">
                        Empty
                    </div>
                )}
                <div className="flex flex-col items-start">
                    <span className="text-[10px] uppercase tracking-wide text-white/60 font-mono">
                        Discard
                    </span>
                    <Badge
                        variant="secondary"
                        className="text-[10px] font-mono bg-white/10 text-white border-white/10"
                    >
                        {count}
                    </Badge>
                </div>
            </motion.button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="bottom" className="max-h-[80vh] p-0">
                    <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/10">
                        <SheetTitle className="flex items-center gap-2">
                            Discard pile
                            <Badge
                                variant="secondary"
                                className="font-mono bg-white/10 text-white border-white/10"
                            >
                                {count}
                            </Badge>
                        </SheetTitle>
                        <SheetDescription>
                            Oldest on the left, most recent on the right.
                        </SheetDescription>
                    </SheetHeader>
                    {count === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-white/50">
                            The discard pile is empty.
                        </div>
                    ) : (
                        <div className="px-5 py-5 overflow-y-auto">
                            <div className="flex flex-wrap justify-center gap-3">
                                {cards.map((card, i) => {
                                    const isTop = i === count - 1;
                                    return (
                                        <div
                                            key={`discard-sheet-${i}-${card.rank}-${card.suit}`}
                                            className="relative flex flex-col items-center gap-1.5"
                                        >
                                            <div
                                                className={cn(
                                                    "rounded-md transition-shadow",
                                                    isTop &&
                                                        "ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]",
                                                )}
                                            >
                                                <PlayingCardView
                                                    card={card}
                                                    size="md"
                                                />
                                            </div>
                                            {isTop && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[9px] font-mono uppercase tracking-wider bg-amber-400/15 text-amber-300 border-amber-400/30"
                                                >
                                                    Top
                                                </Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}
