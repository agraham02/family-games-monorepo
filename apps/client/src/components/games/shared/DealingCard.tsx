"use client";

import React from "react";
import { motion } from "motion/react";
import { EdgePosition } from "./EdgeRegion";
import { usePrefersReducedMotion } from "@/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DealingCardProps {
    /** Target player's edge position */
    targetPosition: EdgePosition;
    /** Delay before animation starts (for staggering) */
    delay?: number;
    /** Callback when card finishes animating to player */
    onComplete?: () => void;
    /** Container dimensions for calculating positions */
    containerDimensions: { width: number; height: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation Constants
// ─────────────────────────────────────────────────────────────────────────────

const CARD_WIDTH = 56;
const CARD_HEIGHT = 80;

// Calculate target offset from center based on edge position
function getTargetOffset(
    position: EdgePosition,
    containerWidth: number,
    containerHeight: number,
): { x: number; y: number; rotation: number } {
    // Calculate distance to edge (from center)
    const halfWidth = containerWidth / 2;
    const halfHeight = containerHeight / 2;

    // Leave some padding from the actual edge for the cards to land
    const edgePaddingX = 100;
    const edgePaddingY = 80;

    switch (position) {
        case "bottom":
            return {
                x: 0,
                y: halfHeight - edgePaddingY,
                rotation: Math.random() * 10 - 5, // slight random rotation
            };
        case "top":
            return {
                x: 0,
                y: -(halfHeight - edgePaddingY),
                rotation: 180 + Math.random() * 10 - 5,
            };
        case "left":
            return {
                x: -(halfWidth - edgePaddingX),
                y: 0,
                rotation: 90 + Math.random() * 10 - 5,
            };
        case "right":
            return {
                x: halfWidth - edgePaddingX,
                y: 0,
                rotation: -90 + Math.random() * 10 - 5,
            };
        default:
            return { x: 0, y: 0, rotation: 0 };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DealingCard Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DealingCard - A card that animates from the deck to a player's hand position.
 *
 * Renders a card back that flies from center to the target edge position
 * with a fast, snappy animation similar to UNO console games.
 */
function DealingCard({
    targetPosition,
    delay = 0,
    onComplete,
    containerDimensions,
}: DealingCardProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const target = getTargetOffset(
        targetPosition,
        containerDimensions.width,
        containerDimensions.height,
    );

    // For reduced motion, just fade out quickly without flying animation
    if (prefersReducedMotion) {
        return (
            <motion.div
                className="fixed pointer-events-none"
                style={{
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    left: `calc(50vw - ${CARD_WIDTH / 2}px)`,
                    top: `calc(50vh - ${CARD_HEIGHT / 2}px)`,
                    zIndex: 200,
                }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.1, delay }}
                onAnimationComplete={onComplete}
            >
                <div className="w-full h-full rounded-lg bg-linear-to-br from-blue-600 via-blue-700 to-blue-800 border border-blue-500/30 shadow-xl" />
            </motion.div>
        );
    }

    return (
        <motion.div
            className="fixed pointer-events-none"
            style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                left: `calc(50vw - ${CARD_WIDTH / 2}px)`,
                top: `calc(50vh - ${CARD_HEIGHT / 2}px)`,
                zIndex: 200,
                willChange: "transform, opacity",
            }}
            initial={{
                transform: "translate3d(0px, 0px, 0px) scale(1) rotate(0deg)",
                opacity: 1,
            }}
            animate={{
                transform: `translate3d(${target.x}px, ${target.y}px, 0px) scale(0.7) rotate(${target.rotation}deg)`,
                opacity: 0,
            }}
            transition={{
                duration: 0.05,
                delay,
                ease: "easeOut",
            }}
            onAnimationComplete={onComplete}
        >
            {/* Card back visual */}
            <div className="w-full h-full rounded-lg bg-linear-to-br from-blue-600 via-blue-700 to-blue-800 border border-blue-500/30 shadow-xl">
                <div
                    className="absolute inset-1.5 rounded border border-blue-400/30"
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
        </motion.div>
    );
}

export default DealingCard;
