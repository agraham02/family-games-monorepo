"use client";

/**
 * PositionIndicator - Shows directional awareness for player positions.
 *
 * Used in stacked layouts to indicate left/right neighbors in LRC
 * where the circular spatial relationship isn't visually obvious.
 */

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, ArrowDown } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RelativePosition = "left" | "right" | "hero" | "center";

export interface PositionIndicatorProps {
    /** The position relative to the hero player */
    position: RelativePosition;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Whether to animate the indicator */
    animate?: boolean;
    /** Whether this position is currently active (for chip passing) */
    isActive?: boolean;
    /** Additional class names */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Size Configurations
// ─────────────────────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
    sm: {
        container: "text-[10px] px-1.5 py-0.5 gap-0.5",
        icon: "w-3 h-3",
    },
    md: {
        container: "text-xs px-2 py-1 gap-1",
        icon: "w-3.5 h-3.5",
    },
    lg: {
        container: "text-sm px-2.5 py-1 gap-1.5",
        icon: "w-4 h-4",
    },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PositionIndicator({
    position,
    size = "md",
    animate = true,
    isActive = false,
    className,
}: PositionIndicatorProps) {
    const config = SIZE_CONFIG[size];

    // Don't show for hero position
    if (position === "hero") {
        return null;
    }

    const getPositionConfig = () => {
        switch (position) {
            case "left":
                return {
                    icon: ArrowLeft,
                    label: "L",
                    bgColor: "bg-blue-500/80",
                    textColor: "text-white",
                    hoverBg: "hover:bg-blue-400/90",
                    activeBg: "bg-blue-400",
                    ariaLabel: "Left neighbor",
                };
            case "right":
                return {
                    icon: ArrowRight,
                    label: "R",
                    bgColor: "bg-orange-500/80",
                    textColor: "text-white",
                    hoverBg: "hover:bg-orange-400/90",
                    activeBg: "bg-orange-400",
                    ariaLabel: "Right neighbor",
                };
            case "center":
                return {
                    icon: ArrowDown,
                    label: "C",
                    bgColor: "bg-purple-500/80",
                    textColor: "text-white",
                    hoverBg: "hover:bg-purple-400/90",
                    activeBg: "bg-purple-400",
                    ariaLabel: "Center pot",
                };
            default:
                return null;
        }
    };

    const posConfig = getPositionConfig();
    if (!posConfig) return null;

    const Icon = posConfig.icon;

    return (
        <motion.div
            className={cn(
                "inline-flex items-center rounded-full font-bold shadow-sm",
                "transition-colors duration-200",
                config.container,
                isActive ? posConfig.activeBg : posConfig.bgColor,
                posConfig.textColor,
                posConfig.hoverBg,
                className,
            )}
            initial={animate ? { opacity: 0, scale: 0.8 } : false}
            animate={{
                opacity: 1,
                scale: isActive ? 1.1 : 1,
            }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
            }}
            aria-label={posConfig.ariaLabel}
        >
            {position === "left" && <Icon className={config.icon} />}
            <span>{posConfig.label}</span>
            {position === "right" && <Icon className={config.icon} />}
            {position === "center" && <Icon className={config.icon} />}
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn Direction Indicator
// ─────────────────────────────────────────────────────────────────────────────

export interface TurnDirectionIndicatorProps {
    /** Turn direction (always clockwise for LRC) */
    direction?: "clockwise" | "counter-clockwise";
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Additional class names */
    className?: string;
}

/**
 * Shows the direction of play (always clockwise for LRC).
 */
export function TurnDirectionIndicator({
    direction = "clockwise",
    size = "md",
    className,
}: TurnDirectionIndicatorProps) {
    const config = SIZE_CONFIG[size];
    const arrow = direction === "clockwise" ? "→" : "←";

    return (
        <motion.div
            className={cn(
                "flex items-center justify-center gap-2 text-muted-foreground",
                config.container,
                className,
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <motion.span
                animate={{
                    x: direction === "clockwise" ? [0, 4, 0] : [0, -4, 0],
                }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut",
                }}
                className="text-lg"
            >
                {arrow}
            </motion.span>
            <span className="text-xs font-medium">Turn Order</span>
            <motion.span
                animate={{
                    x: direction === "clockwise" ? [0, 4, 0] : [0, -4, 0],
                }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut",
                }}
                className="text-lg"
            >
                {arrow}
            </motion.span>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Position Legend (for explaining L/R in stacked layouts)
// ─────────────────────────────────────────────────────────────────────────────

export interface PositionLegendProps {
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Show compact version */
    compact?: boolean;
    /** Additional class names */
    className?: string;
}

/**
 * Legend explaining what L and R mean in the context of LRC.
 */
export function PositionLegend({
    size = "sm",
    compact = false,
    className,
}: PositionLegendProps) {
    if (compact) {
        return (
            <div
                className={cn(
                    "flex items-center gap-3 text-xs text-muted-foreground",
                    className,
                )}
            >
                <div className="flex items-center gap-1">
                    <PositionIndicator
                        position="left"
                        size={size}
                        animate={false}
                    />
                    <span>= Your left</span>
                </div>
                <div className="flex items-center gap-1">
                    <PositionIndicator
                        position="right"
                        size={size}
                        animate={false}
                    />
                    <span>= Your right</span>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className={cn(
                "flex flex-col gap-1 p-2 bg-black/20 rounded-lg text-xs text-muted-foreground",
                className,
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
        >
            <div className="font-medium text-foreground/80 mb-1">
                Player Positions:
            </div>
            <div className="flex items-center gap-2">
                <PositionIndicator
                    position="left"
                    size={size}
                    animate={false}
                />
                <span>Neighbor to your LEFT</span>
            </div>
            <div className="flex items-center gap-2">
                <PositionIndicator
                    position="right"
                    size={size}
                    animate={false}
                />
                <span>Neighbor to your RIGHT</span>
            </div>
            <div className="flex items-center gap-2">
                <PositionIndicator
                    position="center"
                    size={size}
                    animate={false}
                />
                <span>Center pot</span>
            </div>
        </motion.div>
    );
}

export default PositionIndicator;
