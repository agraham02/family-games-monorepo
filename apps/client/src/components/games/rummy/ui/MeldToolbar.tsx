"use client";

import React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RummyData } from "@shared/types";

export interface MeldToolbarProps {
    turnSubstate: RummyData["turnSubstate"];
    isMeldComposerOpen: boolean;
    /** Exactly one card selected → Discard is enabled. */
    canDiscard: boolean;
    disabled?: boolean;
    onOpenMeldComposer: () => void;
    onCancelMeldComposer: () => void;
    onDiscard: () => void;
    onAutoArrange?: () => void;
}

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
    onAutoArrange,
}: MeldToolbarProps) {
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
        </motion.div>
    );
}
