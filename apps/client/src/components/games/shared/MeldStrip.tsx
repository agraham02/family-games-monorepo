"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import PlayingCardComponent, {
    CardSize,
} from "@/components/games/shared/PlayingCard";
import type {
    RummyMeldView,
    PlayingCard as PlayingCardType,
} from "@shared/types";
import { sortRunForDisplay } from "@shared/utils/rummy";

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
    /** Pulse the strip to indicate it's a valid layoff target right now. */
    eligible?: boolean;
    /** Render compact: tighter overlap so more cards fit. */
    compact?: boolean;
    /** Click handler for the entire strip (used for tap-only layoff). */
    onSelect?: () => void;
    /** Optional ownership label rendered above the strip. */
    ownerLabel?: string;
    /**
     * Map of playerId → 1-2 char display initial. Used to render a small
     * badge on each laid-off card showing who laid it down.
     */
    playerInitials?: Record<string, string>;
    /**
     * When a 4-card set forms a "book", render face-down (per house rules).
     * Defaults to true — pass false to keep all cards face-up.
     */
    flipBooks?: boolean;
    /**
     * Force the strip to render face-down regardless of card count. Used when
     * the owner's portion of a book has been visually trimmed (its layoff
     * cards were relocated to the laying players' rows) but the underlying
     * meld is still a book and should remain face-down.
     */
    forceFaceDown?: boolean;
    /** ARIA label for accessibility. */
    ariaLabel?: string;
}

export function MeldStrip({
    meld,
    size = "sm",
    highlighted = false,
    eligible = false,
    compact = false,
    onSelect,
    ownerLabel,
    playerInitials,
    flipBooks = true,
    forceFaceDown = false,
    ariaLabel,
}: MeldStripProps) {
    // Card overlap: more aggressive in compact so 4–7 cards fit in narrow tabs.
    const overlapPx = compact ? 22 : 16;

    const interactive = Boolean(onSelect);

    // Index → playerId for layoffs (for fast badge lookup).
    const layoffByIndex = useMemo(() => {
        const map: Record<number, string> = {};
        for (const l of meld.layoffs ?? []) map[l.index] = l.playerId;
        return map;
    }, [meld.layoffs]);

    // Runs are stored in insertion order on the server; sort them for display
    // so e.g. picking 10♠ then dropping it after 9♠/J♠ still reads as 9-10-J.
    // We keep an `originalIndex` mapping so layoff badges stay attached to
    // the correct underlying card.
    const displayOrder = useMemo<readonly number[]>(() => {
        if (meld.kind === "run") return sortRunForDisplay(meld.cards);
        return meld.cards.map((_, i) => i);
    }, [meld.kind, meld.cards]);

    const isBook =
        forceFaceDown ||
        (flipBooks && meld.kind === "set" && meld.cards.length >= 4);

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
                `${meld.kind === "set" ? "Set" : "Run"} of ${meld.cards.length} cards${isBook ? " (book — face-down)" : ""}`
            }
        >
            {ownerLabel && (
                <div className="text-[10px] uppercase tracking-wide text-white/60 font-mono pl-1">
                    {ownerLabel}
                </div>
            )}
            <div
                className={cn(
                    "relative flex items-center rounded-md p-1 transition-all",
                    eligible
                        ? "ring-2 ring-emerald-400 bg-emerald-400/10 shadow-[0_0_18px_rgba(52,211,153,0.45)] animate-pulse"
                        : highlighted
                          ? "ring-2 ring-amber-400 bg-amber-400/10"
                          : "ring-1 ring-white/5",
                )}
            >
                {displayOrder.map((origIdx, dispIdx) => {
                    const c = meld.cards[origIdx];
                    const layoffPid = layoffByIndex[origIdx];
                    const initial = layoffPid
                        ? (playerInitials?.[layoffPid] ?? "?")
                        : null;
                    return (
                        <div
                            key={`${c.suit}-${c.rank}-${origIdx}`}
                            className="relative"
                            style={{
                                marginLeft:
                                    dispIdx === 0 ? 0 : `-${overlapPx}px`,
                                zIndex: dispIdx,
                            }}
                        >
                            <PlayingCardComponent
                                card={c as PlayingCardType}
                                size={size}
                                hidden={isBook}
                            />
                            {initial && !isBook && (
                                <span
                                    className="absolute -top-1 -right-1 z-10 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold font-mono ring-1 ring-emerald-300/70 shadow-md"
                                    title={`Laid off by ${initial}`}
                                >
                                    {initial}
                                </span>
                            )}
                        </div>
                    );
                })}
                {isBook && !forceFaceDown && (
                    <span className="absolute -top-2 right-1 z-20 px-1.5 py-0.5 rounded-md bg-amber-400 text-black text-[9px] font-bold font-mono uppercase tracking-wider shadow">
                        Book · {meld.cards.length}
                    </span>
                )}
            </div>
        </div>
    );
}
