"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { RummyData } from "@shared/types";

export interface HandToolbarProps {
    /** Current turn substate for the local player. */
    turnSubstate: RummyData["turnSubstate"];
    /** True when it is the local player's turn. */
    isMyTurn: boolean;
    /** Optional pre-staged take-discard pickIndex (enables Take Discard btn). */
    stagedDiscardPickIndex?: number | null;
    /** Whether multi-select meld composer is active. */
    isMeldComposerOpen: boolean;
    /** Disable all buttons (e.g. while submitting). */
    disabled?: boolean;
    onDrawStock: () => void;
    onTakeDiscard: () => void;
    onOpenMeldComposer: () => void;
    onCancelMeldComposer: () => void;
    onAutoArrange?: () => void;
}

/**
 * Substate-driven action toolbar shown below the hero's hand.
 *
 *  - awaiting-draw         : Draw / Take Discard
 *  - may-meld              : Lay Meld / Sort
 *  - awaiting-discard-play : "Play picked card" hint (blocking)
 *  - cardless-waiting      : info pill
 */
export default function HandToolbar({
    turnSubstate,
    isMyTurn,
    stagedDiscardPickIndex,
    isMeldComposerOpen,
    disabled = false,
    onDrawStock,
    onTakeDiscard,
    onOpenMeldComposer,
    onCancelMeldComposer,
    onAutoArrange,
}: HandToolbarProps) {
    if (!isMyTurn) return null;

    if (turnSubstate === "cardless-waiting") {
        return (
            <Pill className="bg-purple-600/80 border-purple-400">
                Empty hand — waiting for next turn
            </Pill>
        );
    }

    if (turnSubstate === "awaiting-discard-play") {
        return (
            <Pill className="bg-amber-600/80 border-amber-400">
                Play your picked card into a meld or new set/run.
            </Pill>
        );
    }

    return (
        <motion.div
            className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
        >
            {turnSubstate === "awaiting-draw" && (
                <>
                    <Button size="sm" onClick={onDrawStock} disabled={disabled}>
                        Draw stock
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        disabled={disabled || stagedDiscardPickIndex == null}
                        onClick={onTakeDiscard}
                    >
                        Take discard
                        {stagedDiscardPickIndex != null && (
                            <Badge className="ml-2 text-[10px] bg-amber-500 text-black">
                                idx {stagedDiscardPickIndex}
                            </Badge>
                        )}
                    </Button>
                </>
            )}
            {turnSubstate === "may-meld" && (
                <>
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
                        >
                            Lay meld
                        </Button>
                    )}
                    {onAutoArrange && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onAutoArrange}
                            disabled={disabled}
                            className="text-white/70 hover:text-white"
                        >
                            Auto-arrange
                        </Button>
                    )}
                    <Pill className="bg-emerald-600/60 border-emerald-400 text-[11px]">
                        Tap a hand card → tap a meld to lay off, or discard to
                        end turn.
                    </Pill>
                </>
            )}
        </motion.div>
    );
}

function Pill({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`px-3 py-1.5 rounded-full text-xs text-white border backdrop-blur-sm ${className}`}
        >
            {children}
        </motion.div>
    );
}
