"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Circle } from "lucide-react";

/**
 * PassDirectionIndicator
 *
 * Compact center-overlay indicator shown during the LRC chip-passing phase.
 * Replaces the legacy `DirectionArrows` (curved arrows around a circular
 * layout) with a hero-anchored compass that reads the same on any seat
 * arrangement: ← L · C · R →.
 */
export function PassDirectionIndicator({ show }: { show: boolean }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-amber-400/40 text-amber-200 text-xs font-mono shadow-lg"
                    aria-label="Chips are being passed"
                >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-bold">L</span>
                    <Circle className="h-2 w-2 fill-amber-300 text-amber-300" />
                    <span className="font-bold">R</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default PassDirectionIndicator;
