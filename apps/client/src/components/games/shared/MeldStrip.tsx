"use client";

import React from "react";
import { cn } from "@/lib/utils";
import PlayingCardComponent, {
    CardSize,
} from "@/components/games/shared/PlayingCard";
import type {
    RummyMeldView,
    PlayingCard as PlayingCardType,
} from "@shared/types";

/**
 * MeldStrip — renders one meld (set or run) as a horizontal stack of cards.
 *
 * Designed to live inside MeldBoard; can also be used standalone (e.g. in the
 * round-summary overlay).
 */
export interface MeldStripProps {
    meld: RummyMeldView;
    size?: CardSize;
    /** Highlight the strip (e.g. layoff target preview). */
    highlighted?: boolean;
    /** Render compact: tighter overlap so more cards fit. */
    compact?: boolean;
    /** Click handler for the entire strip (used for tap-only layoff). */
    onSelect?: () => void;
    /** Optional ownership label rendered above the strip. */
    ownerLabel?: string;
    /** ARIA label for accessibility. */
    ariaLabel?: string;
}

export function MeldStrip({
    meld,
    size = "sm",
    highlighted = false,
    compact = false,
    onSelect,
    ownerLabel,
    ariaLabel,
}: MeldStripProps) {
    // Card overlap: more aggressive in compact so 4–7 cards fit in narrow tabs.
    const overlapPx = compact ? 22 : 16;

    const interactive = Boolean(onSelect);

    return (
        <div
            className={cn(
                "flex flex-col items-start gap-1",
                interactive && "cursor-pointer",
            )}
            onClick={onSelect}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={(e) => {
                if (interactive && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect?.();
                }
            }}
            aria-label={
                ariaLabel ??
                `${meld.kind === "set" ? "Set" : "Run"} of ${meld.cards.length} cards`
            }
        >
            {ownerLabel && (
                <div className="text-[10px] uppercase tracking-wide text-white/60 font-mono pl-1">
                    {ownerLabel}
                </div>
            )}
            <div
                className={cn(
                    "relative flex items-center rounded-md p-1 transition-colors",
                    highlighted
                        ? "ring-2 ring-amber-400 bg-amber-400/10"
                        : "ring-1 ring-white/5",
                )}
            >
                {meld.cards.map((c, i) => (
                    <div
                        key={`${c.suit}-${c.rank}-${i}`}
                        style={{
                            marginLeft: i === 0 ? 0 : `-${overlapPx}px`,
                            zIndex: i,
                        }}
                    >
                        <PlayingCardComponent
                            card={c as PlayingCardType}
                            size={size}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
