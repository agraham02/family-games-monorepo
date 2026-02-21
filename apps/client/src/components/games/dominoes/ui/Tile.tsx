"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Tile as TileType } from "@shared/types";

interface TileProps {
    tile: TileType;
    isSelected?: boolean;
    isPlayable?: boolean;
    isHorizontal?: boolean;
    size?: "sm" | "md" | "lg";
    onClick?: () => void;
    className?: string;
}

// Pip positions for each value (0-6) in a 3×3 logical grid.
// [row, col] where row=0 is top, row=2 is bottom; col=0 is left, col=2 is right.
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

// width = short dimension (tile width for vertical orientation)
// height = long dimension (tile height for vertical orientation, ≈ 2×width)
const SIZE_CONFIG = {
    sm: { width: 28, height: 56, pipSize: 4, gap: 2 },
    md: { width: 40, height: 80, pipSize: 6, gap: 3 },
    lg: { width: 56, height: 112, pipSize: 8, gap: 4 },
};

/**
 * Render pips centered within a square section of the tile.
 * The pip grid is a 3×3 logical grid that fits within a `size × size` area
 * starting at (x, y).
 */
function PipSection({
    value,
    x,
    y,
    size,
    pipSize,
}: {
    value: number;
    x: number;
    y: number;
    size: number;
    pipSize: number;
}) {
    const positions = PIP_POSITIONS[value] || [];
    const padding = pipSize * 0.85;
    const gridStep = (size - 2 * padding) / 2;

    return (
        <>
            {positions.map(([row, col], idx) => (
                <circle
                    key={idx}
                    cx={x + padding + col * gridStep}
                    cy={y + padding + row * gridStep}
                    r={pipSize / 2}
                    className="fill-zinc-800 dark:fill-zinc-100"
                />
            ))}
        </>
    );
}

export default function Tile({
    tile,
    isSelected = false,
    isPlayable = true,
    isHorizontal = false,
    size = "md",
    onClick,
    className,
}: TileProps) {
    const { width, height, pipSize, gap } = SIZE_CONFIG[size];

    // SVG dimensions depend on orientation:
    // Vertical:   width × height  (portrait)
    // Horizontal: height × width  (landscape)
    const svgWidth = isHorizontal ? height : width;
    const svgHeight = isHorizontal ? width : height;

    // Long half dimension (each half along the main axis, minus the gap)
    const halfLong = (height - gap) / 2;

    // Each half's bounding box dimensions
    // Vertical:   halfW=width, halfH=halfLong
    // Horizontal: halfW=halfLong, halfH=width
    const halfW = isHorizontal ? halfLong : width;
    const halfH = isHorizontal ? width : halfLong;

    // Second half's top-left offset
    const halfBX = isHorizontal ? halfLong + gap : 0;
    const halfBY = isHorizontal ? 0 : halfLong + gap;

    // Use the smaller half-dimension as the square pip-grid size, then center it
    const sectionSize = Math.min(halfW, halfH);
    const pipAX = (halfW - sectionSize) / 2;
    const pipAY = (halfH - sectionSize) / 2;
    const pipBX = halfBX + (halfW - sectionSize) / 2;
    const pipBY = halfBY + (halfH - sectionSize) / 2;

    // Divider line between the two halves
    const divX1 = isHorizontal ? halfLong + gap / 2 : 2;
    const divY1 = isHorizontal ? 2 : halfLong + gap / 2;
    const divX2 = isHorizontal ? halfLong + gap / 2 : svgWidth - 2;
    const divY2 = isHorizontal ? svgHeight - 2 : halfLong + gap / 2;

    const isDouble = tile.left === tile.right;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={cn(
                "relative rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                onClick && isPlayable && "cursor-pointer hover:scale-105",
                onClick &&
                    !isPlayable &&
                    "cursor-not-allowed grayscale brightness-75",
                !onClick && "cursor-default",
                isSelected && "ring-2 ring-yellow-400 scale-110 z-10",
                className
            )}
        >
            <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className={cn(
                    "drop-shadow-md",
                    isDouble && "ring-1 ring-amber-500/50 rounded"
                )}
            >
                {/* Background */}
                <rect
                    x="0"
                    y="0"
                    width={svgWidth}
                    height={svgHeight}
                    rx="4"
                    ry="4"
                    className="fill-white dark:fill-zinc-200 stroke-zinc-300 dark:stroke-zinc-600"
                    strokeWidth="1"
                />

                {/* Divider line between the two halves */}
                <line
                    x1={divX1}
                    y1={divY1}
                    x2={divX2}
                    y2={divY2}
                    className="stroke-zinc-400 dark:stroke-zinc-500"
                    strokeWidth="1.5"
                />

                {/* First half pips (left value) */}
                <PipSection
                    value={tile.left}
                    x={pipAX}
                    y={pipAY}
                    size={sectionSize}
                    pipSize={pipSize}
                />

                {/* Second half pips (right value) */}
                <PipSection
                    value={tile.right}
                    x={pipBX}
                    y={pipBY}
                    size={sectionSize}
                    pipSize={pipSize}
                />
            </svg>
        </button>
    );
}
