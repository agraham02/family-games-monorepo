"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CardBadgeProps {
    /** Number of cards to display */
    cardCount: number;
    /** Size variant */
    size?: "sm" | "md";
    /** Additional class names */
    className?: string;
    /** Click handler for tap-to-expand */
    onClick?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Back Icon Component
// ─────────────────────────────────────────────────────────────────────────────

function CardBackIcon({ size }: { size: "sm" | "md" }) {
    const dimensions = size === "sm" ? { w: 20, h: 28 } : { w: 28, h: 40 };

    return (
        <div
            className="relative rounded-sm shadow-md overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center"
            style={{
                width: dimensions.w,
                height: dimensions.h,
            }}
        >
            {/* Inner pattern */}
            <div
                className="absolute inset-0.5 rounded-sm border border-blue-400/40"
                style={{
                    backgroundImage: `
                        repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 2px,
                            rgba(255,255,255,0.08) 2px,
                            rgba(255,255,255,0.08) 4px
                        )
                    `,
                }}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CardBadge Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CardBadge - A compact representation of a player's hand.
 *
 * Shows a card back icon with the card count, used in compact layout modes
 * where showing full card fans would be too cramped.
 */
function CardBadge({
    cardCount,
    size = "sm",
    className,
    onClick,
}: CardBadgeProps) {
    const isInteractive = !!onClick;

    return (
        <motion.div
            className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                "bg-black/30 backdrop-blur-sm border border-white/10",
                isInteractive &&
                    "cursor-pointer hover:bg-black/40 active:scale-95",
                "transition-colors duration-150",
                className
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={onClick}
            whileHover={isInteractive ? { scale: 1.02 } : undefined}
            whileTap={isInteractive ? { scale: 0.95 } : undefined}
        >
            {/* Card back icon */}
            <CardBackIcon size={size} />

            {/* Card count */}
            <span
                className={cn(
                    "font-bold text-white/90 tabular-nums",
                    size === "sm" ? "text-sm" : "text-base"
                )}
            >
                {cardCount}
            </span>
        </motion.div>
    );
}

export default CardBadge;
