"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { ChipStack } from "./ChipStack";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CenterPotProps {
    /** Number of chips in the pot */
    chipCount: number;
    /** Monetary value per chip (0 = don't show money) */
    chipValue?: number;
    /** Whether to show a glow effect */
    showGlow?: boolean;
    /** Additional class names */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Center Pot Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CenterPot - The center pot display for LRC.
 *
 * Features:
 * - Visual chip stack representation
 * - Growing glow effect as pot increases
 * - Optional monetary value display
 * - Pulsing animation for emphasis
 */
export function CenterPot({
    chipCount,
    chipValue = 0,
    showGlow = true,
    className,
}: CenterPotProps) {
    // Calculate glow intensity based on pot size
    const glowIntensity = useMemo(() => {
        // More chips = more glow (max at ~15 chips)
        return Math.min(1, chipCount / 15);
    }, [chipCount]);

    // Calculate pot value
    const potValue = chipCount * chipValue;
    const formattedPotValue = useMemo(() => {
        if (chipValue <= 0) return null;
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(potValue);
    }, [potValue, chipValue]);

    return (
        <motion.div
            className={cn(
                "relative flex flex-col items-center justify-center p-4",
                className,
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Glow effect */}
            {showGlow && chipCount > 0 && (
                <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                        background: `radial-gradient(circle, rgba(251, 191, 36, ${glowIntensity * 0.4}) 0%, transparent 70%)`,
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}

            {/* Pot label */}
            <motion.div
                className="mb-2 text-amber-200 font-semibold text-sm uppercase tracking-wide"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Center Pot
            </motion.div>

            {/* Chip stack */}
            <ChipStack
                count={chipCount}
                chipSize={50}
                maxVisible={8}
                chipValue={chipValue}
                isLargePot
            />

            {/* Pot value highlight (if significant) */}
            {formattedPotValue && potValue > 0 && (
                <motion.div
                    className="mt-3 px-4 py-1 rounded-full bg-amber-500/90 text-white font-bold text-lg shadow-lg"
                    key={potValue}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                    {formattedPotValue}
                </motion.div>
            )}

            {/* Empty pot message */}
            {chipCount === 0 && (
                <motion.div
                    className="text-amber-200/60 text-sm mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    No chips yet
                </motion.div>
            )}
        </motion.div>
    );
}

export default CenterPot;
