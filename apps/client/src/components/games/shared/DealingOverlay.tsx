"use client";

import React from "react";
import { AnimatePresence } from "motion/react";
import DealingCard from "./DealingCard";
import { EdgePosition } from "./EdgeRegion";
import { useGameTable } from "./GameTable";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DealingItem {
    /** Unique ID for the dealing animation */
    id: string;
    /** Target position for the card/tile */
    targetPosition: EdgePosition;
    /** Delay before animation starts (in seconds) */
    delay: number;
}

interface DealingOverlayProps {
    /** Array of items currently being dealt */
    dealingItems: DealingItem[];
    /** Optional custom card back or tile representation */
    renderItem?: (
        item: DealingItem,
        dimensions: { width: number; height: number }
    ) => React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// DealingOverlay Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DealingOverlay - Renders animated cards/tiles flying from center to player positions.
 *
 * Uses GameTable context for container dimensions. Must be rendered inside a GameTable.
 *
 * @example
 * ```tsx
 * // Basic usage with cards
 * <DealingOverlay dealingItems={dealingCards} />
 *
 * // Custom tile rendering
 * <DealingOverlay
 *     dealingItems={dealingTiles}
 *     renderItem={(item, dims) => <CustomTile key={item.id} />}
 * />
 * ```
 */
function DealingOverlay({ dealingItems, renderItem }: DealingOverlayProps) {
    const { dimensions } = useGameTable();

    // Default to using DealingCard component for cards
    if (renderItem) {
        return (
            <AnimatePresence>
                {dealingItems.map((item) =>
                    renderItem(item, {
                        width: dimensions.width,
                        height: dimensions.height,
                    })
                )}
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {dealingItems.map((item) => (
                <DealingCard
                    key={item.id}
                    targetPosition={item.targetPosition}
                    delay={item.delay}
                    containerDimensions={{
                        width: dimensions.width,
                        height: dimensions.height,
                    }}
                />
            ))}
        </AnimatePresence>
    );
}

export default DealingOverlay;
export type { DealingItem, DealingOverlayProps };
