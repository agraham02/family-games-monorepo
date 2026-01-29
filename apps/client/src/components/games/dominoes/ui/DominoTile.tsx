"use client";

/**
 * DominoTile - Renders a single domino tile with pip dots.
 *
 * Supports multiple sizes and displays authentic pip patterns like real dominoes.
 * Pips are arranged in the same pattern as dice faces.
 */

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TileSize } from "@/hooks";

interface DominoTileProps {
    /** Left/top pip value (0-6) */
    left: number;
    /** Right/bottom pip value (0-6) */
    right: number;
    /** Visual size variant */
    size?: TileSize;
    /** Rotation in degrees */
    rotation?: number;
    /** Whether this tile is selected */
    isSelected?: boolean;
    /** Whether this tile is playable (for hints) */
    isPlayable?: boolean;
    /** Whether this tile is disabled */
    disabled?: boolean;
    /** Whether this is a ghost/preview tile */
    isGhost?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Optional className override */
    className?: string;
    /** Motion layout ID for animations */
    layoutId?: string;
}

// Size configurations (width x height for vertical orientation)
const SIZE_CONFIG: Record<
    TileSize,
    { width: number; height: number; pipSize: number; gap: number }
> = {
    xs: { width: 28, height: 56, pipSize: 4, gap: 2 },
    sm: { width: 36, height: 72, pipSize: 5, gap: 3 },
    md: { width: 48, height: 96, pipSize: 6, gap: 4 },
    lg: { width: 60, height: 120, pipSize: 8, gap: 5 },
};

/**
 * Get pip positions for a given value (0-6).
 * Positions are relative to a 3x3 grid within each half of the tile.
 * Returns array of [row, col] positions (0-2).
 */
function getPipPositions(value: number): [number, number][] {
    switch (value) {
        case 0:
            return [];
        case 1:
            return [[1, 1]]; // Center
        case 2:
            return [
                [0, 2],
                [2, 0],
            ]; // Top-right, bottom-left diagonal
        case 3:
            return [
                [0, 2],
                [1, 1],
                [2, 0],
            ]; // Diagonal with center
        case 4:
            return [
                [0, 0],
                [0, 2],
                [2, 0],
                [2, 2],
            ]; // Four corners
        case 5:
            return [
                [0, 0],
                [0, 2],
                [1, 1],
                [2, 0],
                [2, 2],
            ]; // Four corners + center
        case 6:
            return [
                [0, 0],
                [0, 2],
                [1, 0],
                [1, 2],
                [2, 0],
                [2, 2],
            ]; // Two columns of 3
        default:
            return [];
    }
}

/**
 * Renders the pip dots for one half of the domino.
 */
function PipHalf({
    value,
    pipSize,
    gap,
}: {
    value: number;
    pipSize: number;
    gap: number;
}) {
    const positions = getPipPositions(value);
    const gridSize = pipSize * 3 + gap * 2;

    return (
        <div
            className="relative flex-1 flex items-center justify-center"
            style={{ minHeight: gridSize }}
        >
            <div
                className="relative"
                style={{
                    width: gridSize,
                    height: gridSize,
                }}
            >
                {positions.map(([row, col], idx) => (
                    <div
                        key={idx}
                        className="absolute rounded-full bg-gray-900"
                        style={{
                            width: pipSize,
                            height: pipSize,
                            top: row * (pipSize + gap),
                            left: col * (pipSize + gap),
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * DominoTile Component
 *
 * Renders a domino tile with authentic pip dot patterns.
 * Vertically oriented by default (left value on top, right on bottom).
 */
function DominoTile({
    left,
    right,
    size = "md",
    rotation = 0,
    isSelected = false,
    isPlayable = false,
    disabled = false,
    isGhost = false,
    onClick,
    className,
    layoutId,
}: DominoTileProps) {
    const config = SIZE_CONFIG[size];
    const isDouble = left === right;

    const tileContent = (
        <div
            className={cn(
                "flex flex-col items-center justify-between border rounded-sm shadow-md transition-all duration-150",
                // Base styling
                isGhost
                    ? "border-2 border-dashed border-white/60 bg-white/20 backdrop-blur-sm"
                    : "border-gray-800 bg-amber-50",
                // Interactive states
                !disabled &&
                    onClick &&
                    !isGhost &&
                    "cursor-pointer hover:shadow-lg",
                isSelected &&
                    !isGhost &&
                    "ring-2 ring-blue-500 ring-offset-2 ring-offset-green-800 scale-105",
                isPlayable &&
                    !isSelected &&
                    !isGhost &&
                    "ring-2 ring-green-400/50",
                disabled && "opacity-50 cursor-not-allowed",
                // Ghost animation
                isGhost &&
                    "animate-pulse cursor-pointer hover:bg-white/40 hover:scale-105",
                className,
            )}
            style={{
                width: config.width,
                height: config.height,
                transform:
                    rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
            }}
            onClick={disabled ? undefined : onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick && !disabled ? 0 : undefined}
            onKeyDown={
                onClick && !disabled
                    ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onClick();
                          }
                      }
                    : undefined
            }
        >
            {!isGhost && (
                <>
                    {/* Top pip section */}
                    <PipHalf
                        value={left}
                        pipSize={config.pipSize}
                        gap={config.gap}
                    />

                    {/* Divider line */}
                    <div className="w-full h-px bg-gray-800" />

                    {/* Bottom pip section */}
                    <PipHalf
                        value={right}
                        pipSize={config.pipSize}
                        gap={config.gap}
                    />
                </>
            )}
        </div>
    );

    // Wrap in motion.div for layout animations if layoutId provided
    if (layoutId) {
        return (
            <motion.div
                layoutId={layoutId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
            >
                {tileContent}
            </motion.div>
        );
    }

    return tileContent;
}

export default DominoTile;
export type { DominoTileProps, TileSize };
