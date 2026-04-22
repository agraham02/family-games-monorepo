"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlayingCard } from "@shared/types";
import PlayingCardView from "@/components/games/shared/PlayingCard";
import { Button } from "@/components/ui/button";

export interface RummyCallToastProps {
    /** Open when a rummy window is active. */
    isOpen: boolean;
    /** The just-discarded card eligible for a call. */
    card: PlayingCard | null;
    /** Server-derived ms timestamp when the window closes. */
    closesAt: number | null;
    /** Whether the local player has any legal layoff target. */
    canCall: boolean;
    onCall: () => void;
}

/**
 * Non-blocking toast shown to non-active players during the rummy-window.
 * Surfaces a card preview, a countdown ring (in seconds), and a "RUMMY!" CTA.
 */
export default function RummyCallToast({
    isOpen,
    card,
    closesAt,
    canCall,
    onCall,
}: RummyCallToastProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!isOpen) return;
        const id = window.setInterval(() => setNow(Date.now()), 100);
        return () => window.clearInterval(id);
    }, [isOpen]);

    const remainingMs = closesAt ? Math.max(0, closesAt - now) : 0;
    const seconds = Math.ceil(remainingMs / 1000);

    return (
        <AnimatePresence>
            {isOpen && card && (
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 26,
                    }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/95 backdrop-blur-sm shadow-2xl border-2 border-amber-300"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex flex-col items-center gap-1">
                        <PlayingCardView card={card} size="sm" />
                        <span className="text-[10px] font-semibold text-amber-950">
                            {seconds}s
                        </span>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-amber-950 text-sm">
                            Rummy window!
                        </span>
                        <Button
                            size="sm"
                            disabled={!canCall || remainingMs <= 0}
                            onClick={onCall}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            RUMMY!
                        </Button>
                        {!canCall && (
                            <span className="text-[10px] text-amber-900/80 italic">
                                No matching meld
                            </span>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
