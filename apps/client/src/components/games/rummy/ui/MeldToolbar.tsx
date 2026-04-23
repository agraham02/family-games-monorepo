"use client";

import React from "react";
import { motion } from "motion/react";
import {
    ArrowDownAZ,
    ArrowDownWideNarrow,
    Hand,
    Sparkles,
    Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { RummyData } from "@shared/types";
import type { RummySortMode } from "@shared/hints/rummy";

export interface MeldToolbarProps {
    turnSubstate: RummyData["turnSubstate"];
    isMeldComposerOpen: boolean;
    /** Exactly one card selected → Discard is enabled. */
    canDiscard: boolean;
    disabled?: boolean;
    onOpenMeldComposer: () => void;
    onCancelMeldComposer: () => void;
    onDiscard: () => void;
    /** Active client-side sort mode for the hero's hand. */
    sortMode: RummySortMode;
    onSetSortMode: (mode: RummySortMode) => void;
    /** Optional deadwood total — rendered as a small badge when provided. */
    deadwoodPoints?: number;
    /**
     * When true, the "Lay meld" button pulses to draw attention. Caller
     * must gate this on `hintSettings.meldButtonPulse && hasLayableMeld`.
     */
    meldPulse?: boolean;
}

const SORT_LABELS: Record<RummySortMode, { label: string; hint: string }> = {
    smart: {
        label: "Smart",
        hint: "Group melds + near-melds first",
    },
    "by-suit": {
        label: "By suit",
        hint: "Spades · Hearts · Diamonds · Clubs",
    },
    "by-rank": {
        label: "By rank",
        hint: "Ace → King",
    },
    original: {
        label: "Dealt order",
        hint: "Match server order",
    },
};

const SORT_ICONS: Record<RummySortMode, React.ReactNode> = {
    smart: <Sparkles className="h-3.5 w-3.5" />,
    "by-suit": <ArrowDownWideNarrow className="h-3.5 w-3.5" />,
    "by-rank": <ArrowDownAZ className="h-3.5 w-3.5" />,
    original: <Hand className="h-3.5 w-3.5" />,
};

/**
 * Toolbar rendered in the MELD scene. Actions depend on substate:
 *
 *  - may-meld: Lay meld (opens composer) / Discard selected / Cancel composer
 *  - awaiting-discard-play: blocking hint pill (must play picked card)
 *  - cardless-waiting: info pill (handled by WAITING scene, not here)
 */
export default function MeldToolbar({
    turnSubstate,
    isMeldComposerOpen,
    canDiscard,
    disabled = false,
    onOpenMeldComposer,
    onCancelMeldComposer,
    onDiscard,
    sortMode,
    onSetSortMode,
    deadwoodPoints,
    meldPulse = false,
}: MeldToolbarProps) {
    // Defensive fallback: if a stale/invalid sortMode is ever passed in we
    // still want to render something rather than crash on `.label` of
    // undefined. SORT_LABELS is the single source of truth for valid modes.
    const activeSortMode: RummySortMode = SORT_LABELS[sortMode]
        ? sortMode
        : "smart";
    const activeMeta = SORT_LABELS[activeSortMode];
    if (turnSubstate === "awaiting-discard-play") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-3 py-1.5 rounded-full text-xs text-white border backdrop-blur-sm bg-amber-600/80 border-amber-400"
            >
                Play your picked card into a meld or new set/run.
            </motion.div>
        );
    }

    return (
        <motion.div
            className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
        >
            {isMeldComposerOpen ? (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancelMeldComposer}
                    disabled={disabled}
                >
                    Cancel meld
                </Button>
            ) : (
                <Button
                    size="sm"
                    onClick={onOpenMeldComposer}
                    disabled={disabled}
                    className={cn(
                        meldPulse &&
                            "ring-2 ring-emerald-400 animate-pulse shadow-[0_0_18px_rgba(52,211,153,0.6)]",
                    )}
                >
                    Lay meld
                </Button>
            )}

            {/* Sort dropdown — client-only hand reordering. */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={disabled}
                        className="text-white/80 hover:text-white gap-1.5"
                        aria-label={`Sort hand (${activeMeta.label})`}
                    >
                        <Wand2 className="h-3.5 w-3.5" />
                        Sort
                        <span className="hidden sm:inline text-[10px] text-white/60">
                            · {activeMeta.label}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Sort hand</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(Object.keys(SORT_LABELS) as RummySortMode[]).map(
                        (mode) => {
                            const meta = SORT_LABELS[mode];
                            const active = mode === activeSortMode;
                            return (
                                <DropdownMenuItem
                                    key={mode}
                                    onClick={() => onSetSortMode(mode)}
                                    className={cn(
                                        "flex items-start gap-2",
                                        active && "bg-accent",
                                    )}
                                >
                                    <span className="mt-0.5">
                                        {SORT_ICONS[mode]}
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="text-xs font-medium">
                                            {meta.label}
                                            {active && (
                                                <span className="ml-1.5 text-[10px] text-emerald-600">
                                                    ✓
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {meta.hint}
                                        </span>
                                    </span>
                                </DropdownMenuItem>
                            );
                        },
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Button
                size="sm"
                variant="destructive"
                onClick={onDiscard}
                disabled={disabled || !canDiscard || isMeldComposerOpen}
            >
                Discard
                {canDiscard && (
                    <Badge className="ml-2 text-[10px] bg-black/40 text-white">
                        selected
                    </Badge>
                )}
            </Button>

            {deadwoodPoints != null && (
                <Badge
                    className={cn(
                        "text-[10px] gap-1",
                        deadwoodPoints === 0
                            ? "bg-emerald-600/80 text-white border-emerald-400"
                            : deadwoodPoints <= 10
                              ? "bg-amber-600/70 text-white border-amber-400"
                              : "bg-rose-600/70 text-white border-rose-400",
                    )}
                    aria-label={`Deadwood: ${deadwoodPoints} points`}
                >
                    Deadwood: {deadwoodPoints}
                </Badge>
            )}
        </motion.div>
    );
}
