"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useGameTable } from "@/components/games/shared/GameTable";
import { useEdgeRegion } from "@/components/games/shared/EdgeRegion";
import { usePrefersReducedMotion } from "@/hooks";
import type { Tile } from "@shared/types/games/dominoes";
import { tileToDomino } from "../engine/replay";

// ─────────────────────────────────────────────────────────────────────────────
// Pip rendering
// ─────────────────────────────────────────────────────────────────────────────

const PIP_LAYOUTS: Record<number, [number, number][]> = {
    0: [],
    1: [[50, 50]],
    2: [
        [25, 25],
        [75, 75],
    ],
    3: [
        [25, 25],
        [50, 50],
        [75, 75],
    ],
    4: [
        [25, 25],
        [75, 25],
        [25, 75],
        [75, 75],
    ],
    5: [
        [25, 25],
        [75, 25],
        [50, 50],
        [25, 75],
        [75, 75],
    ],
    6: [
        [25, 25],
        [75, 25],
        [25, 50],
        [75, 50],
        [25, 75],
        [75, 75],
    ],
};

function PipHalf({ value }: { value: number }) {
    return (
        <div className="relative w-full h-full">
            {PIP_LAYOUTS[value]?.map(([x, y], i) => (
                <div
                    key={i}
                    className="absolute w-1.75 h-1.75 rounded-full bg-[#1B1B1B]"
                    style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: "translate(-50%, -50%)",
                    }}
                />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile sizing (matches CardHand's responsive size system)
// ─────────────────────────────────────────────────────────────────────────────

const TILE_SIZES: Record<string, { width: number; height: number }> = {
    xs: { width: 24, height: 42 },
    sm: { width: 36, height: 64 },
    md: { width: 46, height: 82 },
    lg: { width: 52, height: 100 },
};

/** Gap between tiles in pixels (no overlap for dominoes) */
const TILE_GAP = 6;

// ─────────────────────────────────────────────────────────────────────────────
// DominoHand Component
// ─────────────────────────────────────────────────────────────────────────────

interface DominoHandProps {
    tiles: Tile[];
    interactive?: boolean;
    selectedIndex?: number | null;
    disabledIndices?: number[];
    onTileClick?: (index: number, tile: Tile) => void;
    className?: string;
}

/**
 * DominoHand - Renders the local player's domino tile hand.
 *
 * Integrates with GameTable/EdgeRegion shared layout system.
 * Renders domino tiles with pip faces instead of playing cards.
 */
export default function DominoHand({
    tiles,
    interactive = false,
    selectedIndex = null,
    disabledIndices = [],
    onTileClick,
    className,
}: DominoHandProps) {
    const { layoutConfig } = useGameTable();
    const prefersReducedMotion = usePrefersReducedMotion();

    const sizeKey = layoutConfig.heroCardSize;
    const tileDims = TILE_SIZES[sizeKey] ?? TILE_SIZES.lg;

    const dominoes = tiles.map(tileToDomino);

    // Calculate total hand dimensions for centering.
    // On compact screens we reduce tile size and use negative overlap
    // if the full hand would overflow.
    const numTiles = dominoes.length;
    const idealHandWidth =
        numTiles * tileDims.width + Math.max(0, numTiles - 1) * TILE_GAP;

    // In compact mode, if hand would overflow, use tighter gap or overlap
    const isCompact = layoutConfig.layoutMode === "compact";
    const effectiveGap =
        isCompact && numTiles > 5
            ? Math.max(-4, TILE_GAP - numTiles)
            : TILE_GAP;
    const effectiveHandWidth =
        numTiles * tileDims.width +
        Math.max(0, numTiles - 1) * Math.max(0, effectiveGap);

    return (
        <div
            className={cn(
                "flex items-center justify-center duration-300",
                !interactive && "brightness-60 pointer-events-none",
                className,
            )}
            style={{
                width: effectiveHandWidth,
                height: tileDims.height,
                maxWidth: "100%",
            }}
        >
            <div className="flex flex-row" style={{ gap: effectiveGap }}>
                <AnimatePresence mode="popLayout">
                    {dominoes.map((domino, index) => {
                        const isSelected = selectedIndex === index;
                        const isDisabled = disabledIndices.includes(index);
                        const zIndex = isSelected ? 100 : index;
                        const yOffset = isSelected ? -20 : 0;

                        return (
                            <motion.div
                                key={domino.id}
                                className="relative"
                                style={{
                                    zIndex,
                                }}
                                initial={
                                    prefersReducedMotion
                                        ? false
                                        : { opacity: 0, scale: 0.3, y: -30 }
                                }
                                animate={{ opacity: 1, scale: 1, y: yOffset }}
                                exit={
                                    prefersReducedMotion
                                        ? { opacity: 0 }
                                        : { opacity: 0, scale: 0.5, y: -50 }
                                }
                                transition={
                                    prefersReducedMotion
                                        ? { duration: 0.1 }
                                        : {
                                              type: "spring",
                                              stiffness: 400,
                                              damping: 25,
                                          }
                                }
                                whileHover={
                                    interactive && !isDisabled
                                        ? {
                                              y: isSelected ? -24 : -8,
                                              scale: 1.05,
                                          }
                                        : undefined
                                }
                                whileTap={
                                    interactive && !isDisabled
                                        ? { scale: 0.95 }
                                        : undefined
                                }
                                onClick={
                                    interactive && !isDisabled && onTileClick
                                        ? (e) => {
                                              e.stopPropagation();
                                              onTileClick(index, tiles[index]);
                                          }
                                        : undefined
                                }
                            >
                                <div
                                    data-tile-id={domino.id}
                                    className={cn(
                                        "flex flex-col rounded-lg border-2 overflow-hidden select-none bg-[var(--tile-face)]",
                                        interactive &&
                                            !isDisabled &&
                                            "cursor-pointer",
                                        isSelected &&
                                            "ring-2 ring-[var(--tile-selected)] ring-offset-2 ring-offset-transparent shadow-[0_0_12px_var(--tile-selected)]",
                                        !isSelected &&
                                            !isDisabled &&
                                            "border-[var(--tile-border)] shadow-md",
                                        isDisabled &&
                                            "border-[var(--tile-border)] opacity-40 cursor-not-allowed",
                                    )}
                                    style={{
                                        width: tileDims.width,
                                        height: tileDims.height,
                                    }}
                                >
                                    <div className="flex-1 border-b border-[#A0926B]">
                                        <PipHalf value={domino.pip1} />
                                    </div>
                                    <div className="flex-1">
                                        <PipHalf value={domino.pip2} />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// OpponentTiles - face-down domino tile backs for opponents
// ─────────────────────────────────────────────────────────────────────────────

interface OpponentTilesProps {
    tileCount: number;
    playerId?: string;
    className?: string;
}

/**
 * Renders face-down domino tiles for opponents.
 * Integrates with GameTable/EdgeRegion for responsive sizing and rotation.
 * In badge mode (compact layout), shows a simple count badge instead.
 */
export function OpponentTiles({
    tileCount,
    playerId,
    className,
}: OpponentTilesProps) {
    const { layoutConfig } = useGameTable();
    const edgeContext = useEdgeRegion();

    // In badge mode (compact / 7+ player layouts), the opponent's tile count
    // already rides on their avatar via PlayerInfo's `countBadge`. Rendering
    // a second pill here duplicates the same information and steals scarce
    // vertical space, so we suppress this slot entirely in badge mode.
    if (layoutConfig.useBadgeMode) {
        return null;
    }

    const sizeKey = layoutConfig.opponentCardSize;
    const tileDims = TILE_SIZES[sizeKey] ?? TILE_SIZES.sm;
    const rotation = edgeContext?.cardRotation ?? 0;
    const count = Math.max(0, tileCount);
    const gap = 4;
    const isRotatedSideways = Math.abs(rotation) === 90;

    return (
        <div
            className={cn("flex items-center justify-center", className)}
            style={{
                width: isRotatedSideways
                    ? tileDims.height
                    : count * tileDims.width + (count - 1) * gap,
                height: isRotatedSideways
                    ? count * tileDims.width + (count - 1) * gap
                    : tileDims.height,
                // Cap so opponent rails never outgrow their grid cell.
                maxWidth: "100%",
                maxHeight: "100%",
            }}
        >
            <div
                className="flex flex-row"
                style={{
                    gap,
                    transform:
                        rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
                    transformOrigin: "center center",
                }}
            >
                <AnimatePresence mode="popLayout">
                    {Array.from({ length: count }).map((_, i) => (
                        <motion.div
                            key={`${playerId}-back-${i}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{
                                opacity: 0,
                                scale: 0.5,
                                transition: { duration: 0.15 },
                            }}
                            transition={{
                                delay: i * 0.03,
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                            }}
                        >
                            <div
                                className="rounded-md border border-[var(--tile-border)] bg-[#2C5F7C] shadow-sm overflow-hidden flex flex-col"
                                style={{
                                    width: tileDims.width,
                                    height: tileDims.height,
                                }}
                            >
                                {/* Top half */}
                                <div className="flex-1 border-b border-[#3A7A9A]/50 relative">
                                    <div
                                        className="absolute inset-1 rounded-sm"
                                        style={{
                                            backgroundImage: `repeating-linear-gradient(
                                                45deg,
                                                transparent,
                                                transparent 2px,
                                                rgba(255,255,255,0.08) 2px,
                                                rgba(255,255,255,0.08) 4px
                                            )`,
                                        }}
                                    />
                                </div>
                                {/* Bottom half */}
                                <div className="flex-1 relative">
                                    <div
                                        className="absolute inset-1 rounded-sm"
                                        style={{
                                            backgroundImage: `repeating-linear-gradient(
                                                -45deg,
                                                transparent,
                                                transparent 2px,
                                                rgba(255,255,255,0.08) 2px,
                                                rgba(255,255,255,0.08) 4px
                                            )`,
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
