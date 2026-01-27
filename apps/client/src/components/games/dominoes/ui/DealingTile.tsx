"use client";

import React from "react";
import { motion } from "motion/react";
import { EdgePosition } from "@/components/games/shared";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DealingTileProps {
    /** Target player's edge position */
    targetPosition: EdgePosition;
    /** Delay before animation starts (for staggering) */
    delay?: number;
    /** Callback when tile finishes animating to player */
    onComplete?: () => void;
    /** Container dimensions for calculating positions */
    containerDimensions: { width: number; height: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation Constants
// ─────────────────────────────────────────────────────────────────────────────

const TILE_WIDTH = 40;
const TILE_HEIGHT = 80;

/**
 * Calculate target offset from center based on edge position
 */
function getTargetOffset(
    position: EdgePosition,
    containerWidth: number,
    containerHeight: number,
): { x: number; y: number; rotation: number } {
    const halfWidth = containerWidth / 2;
    const halfHeight = containerHeight / 2;

    // Leave padding from the actual edge
    const edgePaddingX = 100;
    const edgePaddingY = 80;

    switch (position) {
        case "bottom":
            return {
                x: 0,
                y: halfHeight - edgePaddingY,
                rotation: 0,
            };
        case "top":
            return {
                x: 0,
                y: -(halfHeight - edgePaddingY),
                rotation: 180,
            };
        case "left":
            return {
                x: -(halfWidth - edgePaddingX),
                y: 0,
                rotation: 90,
            };
        case "right":
            return {
                x: halfWidth - edgePaddingX,
                y: 0,
                rotation: -90,
            };
        default:
            return { x: 0, y: 0, rotation: 0 };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DealingTile Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DealingTile - A domino tile that animates from the center to a player's hand position.
 *
 * Renders a face-down tile (white with dotted back) that flies from center
 * to the target edge position with a fast, snappy animation.
 */
function DealingTile({
    targetPosition,
    delay = 0,
    onComplete,
    containerDimensions,
}: DealingTileProps) {
    const target = getTargetOffset(
        targetPosition,
        containerDimensions.width,
        containerDimensions.height,
    );

    return (
        <motion.div
            className="fixed pointer-events-none"
            style={{
                width: TILE_WIDTH,
                height: TILE_HEIGHT,
                left: `calc(50vw - ${TILE_WIDTH / 2}px)`,
                top: `calc(50vh - ${TILE_HEIGHT / 2}px)`,
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
                duration: 0.06,
                delay,
                ease: "easeOut",
            }}
            onAnimationComplete={onComplete}
        >
            {/* Tile back visual - white with center divider */}
            <div className="w-full h-full rounded-lg bg-white border border-zinc-300 shadow-xl overflow-hidden">
                {/* Top half with decorative pattern */}
                <div className="h-[calc(50%-1px)] relative">
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            backgroundImage: `
                                radial-gradient(circle at 50% 50%, rgba(0,0,0,0.1) 20%, transparent 20%),
                                radial-gradient(circle at 25% 25%, rgba(0,0,0,0.05) 15%, transparent 15%),
                                radial-gradient(circle at 75% 75%, rgba(0,0,0,0.05) 15%, transparent 15%)
                            `,
                            backgroundSize: "100% 100%",
                        }}
                    />
                </div>
                {/* Center divider */}
                <div className="h-0.5 bg-zinc-400" />
                {/* Bottom half with decorative pattern */}
                <div className="h-[calc(50%-1px)] relative">
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            backgroundImage: `
                                radial-gradient(circle at 50% 50%, rgba(0,0,0,0.1) 20%, transparent 20%),
                                radial-gradient(circle at 25% 75%, rgba(0,0,0,0.05) 15%, transparent 15%),
                                radial-gradient(circle at 75% 25%, rgba(0,0,0,0.05) 15%, transparent 15%)
                            `,
                            backgroundSize: "100% 100%",
                        }}
                    />
                </div>
            </div>
        </motion.div>
    );
}

export default DealingTile;
