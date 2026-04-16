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
        justifyContent: "flex-end",
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
    // Compact mode uses minimal padding to maximize card space.
    // Comfortable/spacious add a small breathing gap so hands never sit flush
    // against the viewport edge.
    // Safe-area insets are merged into the base padding via max() so notched
    // devices keep their inset without the utility class nuking our base
    // padding to 0 on non-notched viewports.
    const basePad = isCompact
        ? { edge: "2px", cross: "2px" }
        : { edge: "0.5rem", cross: "0.5rem" };

    const paddingStyles: Record<EdgePosition, React.CSSProperties> = {
        bottom: {
            paddingBottom: `max(${basePad.edge}, env(safe-area-inset-bottom))`,
            paddingTop: basePad.cross,
        },
        top: {
            paddingTop: `max(${basePad.edge}, env(safe-area-inset-top))`,
            paddingBottom: basePad.cross,
        },
        left: {
            paddingLeft: `max(${basePad.edge}, env(safe-area-inset-left))`,
            paddingRight: basePad.cross,
        },
        right: {
            paddingRight: `max(${basePad.edge}, env(safe-area-inset-right))`,
            paddingLeft: basePad.cross,
        },
    };

    // Cap the region so rotated opponent hands can never outgrow their grid
    // cell — but only on compact, where badge mode is used and we need tight
    // clipping to prevent side rails extending the viewport.
    // On comfortable/spacious (desktop/tablet), keep overflow-visible so full
    // fan hands (top/left/right) can bleed into the center cell as designed.
    const overflowClass =
        isCompact && position !== "bottom"
            ? "overflow-hidden"
            : "overflow-visible";

    return (
        <EdgeRegionContext.Provider value={contextValue}>
            <motion.div
                className={cn("flex gap-2 z-20", overflowClass, className)}
                style={{
                    gridArea: layout.gridArea,
                    flexDirection: layout.flexDirection,
                    justifyContent: layout.justifyContent,
                    alignItems: layout.alignItems,
                    // Allow grid item to shrink below content size
                    minWidth: 0,
                    minHeight: 0,
                    // On compact, cap region to its assigned grid cell so
                    // rotated fans/badges cannot outgrow the row/column.
                    // On larger layouts, allow bleed into the center cell so
                    // full fans render at their natural size.
                    maxWidth: isCompact ? "100%" : undefined,
                    maxHeight: isCompact ? "100%" : undefined,
                    ...paddingStyles[position],
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
