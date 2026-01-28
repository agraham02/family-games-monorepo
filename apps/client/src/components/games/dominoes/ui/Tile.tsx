"use client";

import React, { forwardRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Tile as TileType } from "@shared/types";
import { usePrefersReducedMotion } from "@/hooks";

interface TileProps {
    tile: TileType;
    isSelected?: boolean;
    isPlayable?: boolean;
    isFocused?: boolean;
    isHorizontal?: boolean;
    size?: "xs" | "sm" | "md" | "lg";
    onClick?: () => void;
    onFocus?: () => void;
    className?: string;
    /** Unique ID for layout animations between hand and board */
    layoutId?: string;
    /** Show double tile with special styling */
    highlightDouble?: boolean;
    /** Render double tiles perpendicular (vertical when on horizontal board) */
    perpendicularDoubles?: boolean;
}

// Pip positions for each value (0-6)
// Positions are relative to a 3x3 grid within each half
const PIP_POSITIONS: Record<number, [number, number][]> = {
    0: [],
    1: [[1, 1]], // center
    2: [
        [0, 0],
        [2, 2],
    ], // diagonal
    3: [
        [0, 0],
        [1, 1],
        [2, 2],
    ], // diagonal with center
    4: [
        [0, 0],
        [0, 2],
        [2, 0],
        [2, 2],
    ], // corners
    5: [
        [0, 0],
        [0, 2],
        [1, 1],
        [2, 0],
        [2, 2],
    ], // corners + center
    6: [
        [0, 0],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 2],
    ], // two columns of 3
};

const SIZE_CONFIG = {
    xs: { width: 20, height: 40, pipSize: 3, gap: 1.5 },
    sm: { width: 28, height: 56, pipSize: 4, gap: 2 },
    md: { width: 40, height: 80, pipSize: 6, gap: 3 },
    lg: { width: 56, height: 112, pipSize: 8, gap: 4 },
};

function PipHalf({
    value,
    halfHeight,
    pipSize,
    offsetY,
}: {
    value: number;
    halfWidth: number;
    halfHeight: number;
    pipSize: number;
    offsetY: number;
}) {
    const positions = PIP_POSITIONS[value] || [];
    const padding = pipSize * 0.8;
    const gridSize = (halfHeight - 2 * padding) / 2;

    return (
        <>
            {positions.map(([row, col], idx) => {
                const cx = padding + col * gridSize;
                const cy = offsetY + padding + row * gridSize;
                return (
                    <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r={pipSize / 2}
                        className="fill-zinc-800 dark:fill-zinc-100"
                    />
                );
            })}
        </>
    );
}

const Tile = forwardRef<HTMLButtonElement, TileProps>(function Tile(
    {
        tile,
        isSelected = false,
        isPlayable = true,
        isFocused = false,
        isHorizontal = false,
        size = "md",
        onClick,
        onFocus,
        className,
        layoutId,
        highlightDouble = true,
        perpendicularDoubles = false,
    },
    ref,
) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const config = SIZE_CONFIG[size];
    const { width, height, pipSize, gap } = config;

    const isDouble = tile.left === tile.right;
    const showDoubleHighlight = isDouble && highlightDouble;

    // Doubles on the board render perpendicular (vertical when board is horizontal)
    const shouldRenderPerpendicular =
        isDouble && perpendicularDoubles && isHorizontal;

    // For horizontal display, swap dimensions (unless perpendicular double)
    const svgWidth =
        isHorizontal && !shouldRenderPerpendicular ? height : width;
    const svgHeight =
        isHorizontal && !shouldRenderPerpendicular ? width : height;

    const halfHeight = (height - gap) / 2;

    // Calculate rotation based on display mode
    const getRotation = () => {
        if (shouldRenderPerpendicular) {
            // Perpendicular doubles stay vertical on horizontal board
            return 0;
        }
        if (isHorizontal) {
            return 90;
        }
        return 0;
    };

    const animationProps = prefersReducedMotion
        ? {}
        : {
              whileHover: onClick && isPlayable ? { y: -4 } : undefined,
              whileTap: onClick && isPlayable ? { scale: 0.95 } : undefined,
          };

    return (
        <motion.button
            ref={ref}
            type="button"
            layoutId={layoutId}
            onClick={onClick}
            onFocus={onFocus}
            disabled={!onClick}
            className={cn(
                "relative rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-green-800",
                onClick &&
                    isPlayable &&
                    "cursor-pointer hover:scale-105 active:scale-95",
                onClick &&
                    !isPlayable &&
                    "cursor-not-allowed grayscale brightness-75",
                !onClick && "cursor-default",
                isSelected &&
                    "ring-2 ring-yellow-400 scale-110 z-10 shadow-lg shadow-yellow-400/30",
                isFocused && !isSelected && "ring-2 ring-blue-400 z-10",
                prefersReducedMotion && "transition-none",
                className,
            )}
            style={{
                transform: `rotate(${getRotation()}deg)`,
            }}
            layout={!prefersReducedMotion}
            transition={
                prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 300, damping: 30 }
            }
            {...animationProps}
        >
            {/* Double tile glow effect */}
            {showDoubleHighlight && !prefersReducedMotion && (
                <motion.div
                    className="absolute -inset-1 rounded-lg bg-amber-400/30 blur-sm -z-10"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}
            {/* Static highlight for reduced motion */}
            {showDoubleHighlight && prefersReducedMotion && (
                <div className="absolute -inset-1 rounded-lg bg-amber-400/40 -z-10" />
            )}
            <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${width} ${height}`}
                className={cn(
                    "drop-shadow-md",
                    showDoubleHighlight && "ring-2 ring-amber-500/70 rounded",
                )}
            >
                {/* Background */}
                <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    rx="4"
                    ry="4"
                    className="fill-white dark:fill-zinc-200 stroke-zinc-300 dark:stroke-zinc-600"
                    strokeWidth="1"
                />

                {/* Divider line */}
                <line
                    x1="2"
                    y1={halfHeight + gap / 2}
                    x2={width - 2}
                    y2={halfHeight + gap / 2}
                    className="stroke-zinc-400 dark:stroke-zinc-500"
                    strokeWidth="1.5"
                />

                {/* Top half pips (left value) */}
                <PipHalf
                    value={tile.left}
                    halfWidth={width}
                    halfHeight={halfHeight}
                    pipSize={pipSize}
                    offsetY={0}
                />

                {/* Bottom half pips (right value) */}
                <PipHalf
                    value={tile.right}
                    halfWidth={width}
                    halfHeight={halfHeight}
                    pipSize={pipSize}
                    offsetY={halfHeight + gap}
                />
            </svg>
        </motion.button>
    );
});

export default Tile;
