"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
// import { useGameTable } from "./GameTable";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CardDeckProps {
    /** Total cards in deck */
    cardCount: number;
    /** Whether the deck is currently dealing */
    isDealing?: boolean;
    /** Callback when a card is dealt (with target player index) */
    onDealCard?: (targetPlayerIndex: number, cardIndex: number) => void;
    /** Additional class names */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CardDeck Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CardDeck - A central deck of cards that can animate dealing to players.
 *
 * Positioned at the center of the table, shows stacked cards with a
 * 3D perspective effect. During dealing, cards animate to player positions.
 */
function CardDeck({ cardCount, isDealing = false, className }: CardDeckProps) {
    // const { dimensions } = useGameTable();

    // Show a visual stack of cards (max 10 visible layers)
    const visibleLayers = Math.min(cardCount, 10);

    return (
        <motion.div
            className={cn("relative", className)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Card stack */}
            <div className="relative" style={{ perspective: "800px" }}>
                {Array.from({ length: visibleLayers }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-16 h-24 md:w-20 md:h-28 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 border border-blue-500/30 shadow-lg"
                        style={{
                            top: -i * 2,
                            left: -i * 0.5,
                            zIndex: visibleLayers - i,
                            transformStyle: "preserve-3d",
                        }}
                        initial={{ opacity: 0, rotateY: -90 }}
                        animate={{
                            opacity: 1,
                            rotateY: 0,
                            transition: { delay: i * 0.02 },
                        }}
                    >
                        {/* Card back pattern */}
                        <div className="absolute inset-2 rounded border border-blue-400/30 flex items-center justify-center">
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundImage: `
                                        repeating-linear-gradient(
                                            45deg,
                                            transparent,
                                            transparent 3px,
                                            rgba(255,255,255,0.05) 3px,
                                            rgba(255,255,255,0.05) 6px
                                        )
                                    `,
                                }}
                            />
                        </div>
                    </motion.div>
                ))}

                {/* Dealing animation overlay */}
                <AnimatePresence>
                    {isDealing && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Card count indicator */}
            <motion.div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <span className="text-white text-xs font-medium">
                    {cardCount} cards
                </span>
            </motion.div>
        </motion.div>
    );
}

export default CardDeck;
