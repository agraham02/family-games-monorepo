"use client";

/**
 * DealingTile - Animated tile for deal animation.
 *
 * Flies from the center to a target edge position during the dealing phase.
 */

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { EdgePosition } from "@/components/games/shared";

interface DealingTileProps {
    /** Target edge position to fly to */
    targetPosition: EdgePosition;
    /** Animation delay in seconds */
    delay?: number;
    /** Container dimensions for calculating positions */
    containerDimensions?: { width: number; height: number };
}

// Target positions relative to container (percentage)
const POSITION_TARGETS: Record<EdgePosition, { x: string; y: string }> = {
    top: { x: "50%", y: "0%" },
    bottom: { x: "50%", y: "100%" },
    left: { x: "0%", y: "50%" },
    right: { x: "100%", y: "50%" },
};

/**
 * DealingTile Component
 *
 * Renders an animated tile that flies from center to target position.
 * Shows the back of a domino tile during the animation.
 */
function DealingTile({
    targetPosition,
    delay = 0,
    containerDimensions,
}: DealingTileProps) {
    const target = POSITION_TARGETS[targetPosition];

    // Calculate target coordinates based on container
    const targetCoords = useMemo(() => {
        if (!containerDimensions) {
            return { x: target.x, y: target.y };
        }

        const xPercent = parseFloat(target.x) / 100;
        const yPercent = parseFloat(target.y) / 100;

        return {
            x:
                containerDimensions.width * xPercent -
                containerDimensions.width / 2,
            y:
                containerDimensions.height * yPercent -
                containerDimensions.height / 2,
        };
    }, [target, containerDimensions]);

    return (
        <motion.div
            className="absolute pointer-events-none z-50"
            initial={{
                x: 0,
                y: 0,
                scale: 0.5,
                opacity: 1,
            }}
            animate={{
                x: typeof targetCoords.x === "number" ? targetCoords.x : 0,
                y: typeof targetCoords.y === "number" ? targetCoords.y : 0,
                scale: 1,
                opacity: 0,
            }}
            transition={{
                duration: 0.3,
                delay,
                ease: "easeOut",
            }}
            style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
            }}
        >
            {/* Tile back design */}
            <div className="w-9 h-18 bg-linear-to-br from-amber-700 via-amber-800 to-amber-900 rounded-sm border border-amber-950 shadow-lg">
                {/* Decorative pattern on back */}
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-12 border-2 border-amber-600/50 rounded-sm" />
                </div>
            </div>
        </motion.div>
    );
}

export default DealingTile;
