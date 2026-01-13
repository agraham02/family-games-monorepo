"use client";

import React, { ReactNode, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useGameTable } from "./GameTable";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EdgePosition = "top" | "bottom" | "left" | "right";

export interface EdgeRegionContextValue {
    position: EdgePosition;
    isHero: boolean;
    /** Rotation in degrees to apply to card hands */
    cardRotation: number;
}

const EdgeRegionContext = createContext<EdgeRegionContextValue | null>(null);

export function useEdgeRegion() {
    return useContext(EdgeRegionContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout configuration based on edge position
// ─────────────────────────────────────────────────────────────────────────────

interface EdgeLayout {
    /** Flex direction for arranging cards and info */
    flexDirection: "row" | "row-reverse" | "column" | "column-reverse";
    /** Grid area name */
    gridArea: string;
    /** Justify content for the region */
    justifyContent: "flex-start" | "center" | "flex-end";
    /** Align items for the region */
    alignItems: "flex-start" | "center" | "flex-end";
    /** Rotation in degrees for card hands (0, 90, -90, 180) */
    cardRotation: number;
}

const EDGE_LAYOUTS: Record<EdgePosition, EdgeLayout> = {
    bottom: {
        flexDirection: "column", // Info above, cards below (toward edge)
        gridArea: "bottom",
        justifyContent: "flex-end",
        alignItems: "center",
        cardRotation: 0,
    },
    top: {
        flexDirection: "column-reverse", // Cards above (toward edge), info below
        gridArea: "top",
        justifyContent: "flex-start",
        alignItems: "center",
        cardRotation: 180,
    },
    left: {
        flexDirection: "row-reverse", // Cards left (toward edge), info right
        gridArea: "left",
        justifyContent: "flex-start",
        alignItems: "center",
        cardRotation: 90,
    },
    right: {
        flexDirection: "row", // Info left, cards right (toward edge)
        gridArea: "right",
        justifyContent: "flex-end",
        alignItems: "center",
        cardRotation: -90,
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// EdgeRegion Component
// ─────────────────────────────────────────────────────────────────────────────

interface EdgeRegionProps {
    /** Which edge this region is on */
    position: EdgePosition;
    /** Whether this is the hero/local player */
    isHero?: boolean;
    /** Child components (PlayerInfo and CardHand) */
    children: ReactNode;
    /** Additional class names */
    className?: string;
    /** Whether the game is dealing cards */
    isDealing?: boolean;
}

/**
 * EdgeRegion - Positions player content at a screen edge.
 *
 * Handles the layout of card hands and player info based on edge position:
 * - Bottom: Info above cards, cards at bottom edge
 * - Top: Cards at top edge, info below
 * - Left: Cards at left edge, info to right
 * - Right: Info to left, cards at right edge
 */
function EdgeRegion({
    position,
    isHero = false,
    children,
    className,
    isDealing = false,
}: EdgeRegionProps) {
    const layout = EDGE_LAYOUTS[position];
    const { layoutConfig } = useGameTable();
    const isCompact = layoutConfig.layoutMode === "compact";

    const contextValue: EdgeRegionContextValue = {
        position,
        isHero,
        cardRotation: layout.cardRotation,
    };

    // Different padding based on position and layout mode
    // Compact mode uses minimal padding to maximize card space
    // Bottom edge needs extra padding to prevent clipping at screen edge
    const paddingClasses = isCompact
        ? {
              bottom: "pb-2 pt-1", // Extra bottom padding to prevent clipping
              top: "pt-2 pb-1", // Extra top padding
              left: "pl-1 pr-1",
              right: "pr-1 pl-1",
          }
        : {
              bottom: "pb-3 pt-4", // More padding for safe area
              top: "pt-3 pb-4",
              left: "pl-2 pr-4",
              right: "pr-2 pl-4",
          };

    // For left/right positions, cards are rotated and need to overflow visually
    // For top/bottom positions, we need overflow-hidden to prevent clipping issues
    const isVerticalEdge = position === "left" || position === "right";
    const overflowClass = isVerticalEdge
        ? "overflow-visible"
        : "overflow-visible";

    return (
        <EdgeRegionContext.Provider value={contextValue}>
            <motion.div
                className={cn(
                    "flex gap-2",
                    overflowClass,
                    paddingClasses[position],
                    className
                )}
                style={{
                    gridArea: layout.gridArea,
                    flexDirection: layout.flexDirection,
                    justifyContent: layout.justifyContent,
                    alignItems: layout.alignItems,
                    // Allow grid item to shrink below content size
                    minWidth: 0,
                    minHeight: 0,
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                    opacity: isDealing ? 0.6 : 1,
                    scale: 1,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                }}
            >
                {children}
            </motion.div>
        </EdgeRegionContext.Provider>
    );
}

export default EdgeRegion;
