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

export default function Tile({
    tile,
    isSelected = false,
    isPlayable = true,
    isHorizontal = false,
    size = "md",
    onClick,
    className,
}: TileProps) {
    const config = SIZE_CONFIG[size];
    const { width, height, pipSize, gap } = config;

    // For horizontal display, swap dimensions
    const svgWidth = isHorizontal ? height : width;
    const svgHeight = isHorizontal ? width : height;

    const halfHeight = (height - gap) / 2;

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
            style={{
                transform: isHorizontal ? "rotate(90deg)" : undefined,
            }}
        >
            <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${width} ${height}`}
                className={cn(
                    "drop-shadow-md",
                    isDouble && "ring-1 ring-amber-500/50 rounded"
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
        </button>
    );
}
