"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { ChevronUp } from "lucide-react";
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
import type { PlayingCard } from "@shared/types";

export interface HandPeekProps {
    hand: PlayingCard[];
    /** When true the strip acts as a spectator banner — no cards, no sheet. */
    spectator?: boolean;
    /** Description shown inside the expanded sheet. */
    subtitle?: string;
    className?: string;
}

/**
 * Collapsed, read-only hand displayed in scenes where the hero's hand isn't
 * the focus (WAITING, DRAW). Tapping the strip opens a bottom sheet with a
 * read-only fan of the full hand so the player can plan ahead.
 *
 * For interactive hand usage (MELD scene) use `CardHand` directly.
 */
export default function HandPeek({
    hand,
    spectator = false,
    subtitle = "Read-only view for planning. It's not your turn to act.",
    className,
}: HandPeekProps) {
    const [open, setOpen] = useState(false);

    if (spectator) {
        return (
            <div
                className={cn(
                    "w-full flex items-center justify-center px-3 py-2 bg-black/40 backdrop-blur-sm border-t border-white/10",
                    className,
                )}
            >
                <span className="text-xs text-white/70 italic">
                    Spectating — you don&apos;t have a hand this round.
                </span>
            </div>
        );
    }

    const count = hand.length;
    // Visible miniature cards — always face-up since this is the hero's own.
    const maxVisible = 8;
    const visible = hand.slice(0, maxVisible);
    const hidden = Math.max(0, count - maxVisible);

    return (
        <>
            <motion.button
                type="button"
                layout
                onClick={() => count > 0 && setOpen(true)}
                disabled={count === 0}
                aria-label={`Your hand (${count} cards) — tap to expand`}
                className={cn(
                    "w-full flex items-center justify-center gap-3 px-3 py-2",
                    "bg-black/50 backdrop-blur-sm border-t border-white/10",
                    "hover:bg-black/60 transition-colors",
                    count === 0 && "opacity-50 cursor-not-allowed",
                    className,
                )}
            >
                <Badge
                    variant="secondary"
                    className="text-[10px] font-mono bg-emerald-600/70 text-white border-emerald-400"
                >
                    Hand · {count}
                </Badge>
                <div
                    className="relative flex-1 flex items-center justify-center"
                    style={{ height: 40 }}
                >
                    {visible.map((card, idx) => (
                        <div
                            key={`peek-${idx}-${card.rank}-${card.suit}`}
                            className="absolute"
                            style={{
                                left: `calc(50% - ${(visible.length * 14) / 2}px + ${idx * 14}px)`,
                                transform: `rotate(${(idx - visible.length / 2) * 2}deg)`,
                                zIndex: idx,
                            }}
                        >
                            <PlayingCardView card={card} size="xs" />
                        </div>
                    ))}
                </div>
                {hidden > 0 && (
                    <Badge
                        variant="secondary"
                        className="text-[10px] bg-black/70 text-white border-white/20"
                    >
                        +{hidden}
                    </Badge>
                )}
                <ChevronUp className="size-4 text-white/60" aria-hidden />
            </motion.button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="bottom" className="max-h-[80vh]">
                    <SheetHeader>
                        <SheetTitle>Your hand ({count})</SheetTitle>
                        <SheetDescription>{subtitle}</SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-wrap gap-2 px-4 pb-6 overflow-y-auto">
                        {hand.map((card, i) => (
                            <div
                                key={`sheet-${i}-${card.rank}-${card.suit}`}
                                className="shrink-0"
                            >
                                <PlayingCardView card={card} size="sm" />
                            </div>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
