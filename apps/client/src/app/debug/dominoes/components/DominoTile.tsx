/**
 * DominoTile - Renders a single domino tile with pip dots.
 * Shared by both committed and ghost tiles via props.
 */

import React, { memo } from "react";
import type { Rotation } from "../engine";

// =============================================================================
// Types
// =============================================================================

export interface DominoTileProps {
    /** Left pip value (0-6) */
    leftPips: number;
    /** Right pip value (0-6) */
    rightPips: number;
    /** Tile width in pixels (short edge) */
    width?: number;
    /** Tile height in pixels (long edge) */
    height?: number;
    /** Rotation in degrees */
    rotation?: Rotation;
    /** Whether this is a ghost/preview tile */
    isGhost?: boolean;
    /** Whether the tile is selected */
    isSelected?: boolean;
    /** Whether the tile is playable */
    isPlayable?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Custom class name */
    className?: string;
    /** Inline styles override */
    style?: React.CSSProperties;
}

// =============================================================================
// Pip Patterns
// =============================================================================

/**
 * Pip positions for each value (0-6) on a domino half.
 * Positions are relative to half-width/half-height center.
 * Format: [row, col] where 0,0 is top-left
 */
const PIP_PATTERNS: Record<number, [number, number][]> = {
    0: [],
    1: [[1, 1]], // center
    2: [
        [0, 2],
        [2, 0],
    ], // diagonal
    3: [
        [0, 2],
        [1, 1],
        [2, 0],
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
    ], // corners with center
    6: [
        [0, 0],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 2],
    ], // two columns
};

// =============================================================================
// Component
// =============================================================================

/**
 * Renders pip dots for one half of a vertical domino (top or bottom half).
 */
function PipHalfVertical({
    value,
    fullWidth,
    halfHeight,
    pipSize,
    pipColor,
    offsetY,
}: {
    value: number;
    fullWidth: number;
    halfHeight: number;
    pipSize: number;
    pipColor: string;
    offsetY: number;
}) {
    const pattern = PIP_PATTERNS[value] ?? [];
    const padding = pipSize * 0.8;
    const gridWidth = fullWidth - padding * 2;
    const gridHeight = halfHeight - padding * 2;

    return (
        <>
            {pattern.map(([row, col], index) => {
                const x = padding + (col / 2) * gridWidth;
                const y = offsetY + padding + (row / 2) * gridHeight;

                return (
                    <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r={pipSize / 2}
                        fill={pipColor}
                    />
                );
            })}
        </>
    );
}

/**
 * Renders pip dots for one half of a horizontal domino (left or right half).
 */
function PipHalfHorizontal({
    value,
    halfWidth,
    fullHeight,
    pipSize,
    pipColor,
    offsetX,
}: {
    value: number;
    halfWidth: number;
    fullHeight: number;
    pipSize: number;
    pipColor: string;
    offsetX: number;
}) {
    const pattern = PIP_PATTERNS[value] ?? [];
    const padding = pipSize * 0.8;
    const gridWidth = halfWidth - padding * 2;
    const gridHeight = fullHeight - padding * 2;

    return (
        <>
            {pattern.map(([row, col], index) => {
                // For horizontal, we keep the same pattern but place within the half
                const x = offsetX + padding + (col / 2) * gridWidth;
                const y = padding + (row / 2) * gridHeight;

                return (
                    <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r={pipSize / 2}
                        fill={pipColor}
                    />
                );
            })}
        </>
    );
}

export const DominoTile = memo(function DominoTile({
    leftPips,
    rightPips,
    width = 60,
    height = 120,
    rotation = 0,
    isGhost = false,
    isSelected = false,
    isPlayable = false,
    onClick,
    className = "",
    style,
}: DominoTileProps) {
    // Determine if we need to swap dimensions for horizontal orientation
    const isHorizontal = rotation === 90 || rotation === 270;
    const renderWidth = isHorizontal ? height : width;
    const renderHeight = isHorizontal ? width : height;

    const halfWidth = renderWidth / 2;
    const halfHeight = renderHeight / 2;
    const pipSize = Math.min(width, height) / 8;
    const borderRadius = Math.min(renderWidth, renderHeight) / 8;
    const dividerThickness = 2;

    // Colors
    const bgColor = isGhost ? "rgba(255, 255, 255, 0.5)" : "#f5f5dc";
    const borderColor = isSelected
        ? "#3b82f6"
        : isPlayable
          ? "#22c55e"
          : "#1a1a1a";
    const pipColor = isGhost ? "rgba(26, 26, 26, 0.5)" : "#1a1a1a";

    // Determine pip arrangement based on rotation
    // rotation 0: vertical, top=leftPips, bottom=rightPips
    // rotation 90: horizontal, left=leftPips, right=rightPips
    // rotation 180: vertical inverted, top=rightPips, bottom=leftPips
    // rotation 270: horizontal inverted, left=rightPips, right=leftPips
    const isInverted = rotation === 180 || rotation === 270;
    const firstHalfPips = isInverted ? rightPips : leftPips;
    const secondHalfPips = isInverted ? leftPips : rightPips;

    return (
        <svg
            width={renderWidth}
            height={renderHeight}
            viewBox={`0 0 ${renderWidth} ${renderHeight}`}
            className={className}
            style={{
                cursor: onClick ? "pointer" : "default",
                filter: isGhost
                    ? "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))"
                    : undefined,
                ...style,
            }}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {/* Background */}
            <rect
                x={1}
                y={1}
                width={renderWidth - 2}
                height={renderHeight - 2}
                rx={borderRadius}
                ry={borderRadius}
                fill={bgColor}
                stroke={borderColor}
                strokeWidth={isSelected ? 3 : 2}
            />

            {isHorizontal ? (
                <>
                    {/* Horizontal layout: center divider is vertical */}
                    <line
                        x1={halfWidth}
                        y1={renderHeight * 0.15}
                        x2={halfWidth}
                        y2={renderHeight * 0.85}
                        stroke={pipColor}
                        strokeWidth={dividerThickness}
                        strokeLinecap="round"
                    />
                    {/* Left half pips */}
                    <g>
                        <PipHalfHorizontal
                            value={firstHalfPips}
                            halfWidth={halfWidth}
                            fullHeight={renderHeight}
                            pipSize={pipSize}
                            pipColor={pipColor}
                            offsetX={0}
                        />
                    </g>
                    {/* Right half pips */}
                    <g>
                        <PipHalfHorizontal
                            value={secondHalfPips}
                            halfWidth={halfWidth}
                            fullHeight={renderHeight}
                            pipSize={pipSize}
                            pipColor={pipColor}
                            offsetX={halfWidth}
                        />
                    </g>
                </>
            ) : (
                <>
                    {/* Vertical layout: center divider is horizontal */}
                    <line
                        x1={renderWidth * 0.15}
                        y1={halfHeight}
                        x2={renderWidth * 0.85}
                        y2={halfHeight}
                        stroke={pipColor}
                        strokeWidth={dividerThickness}
                        strokeLinecap="round"
                    />
                    {/* Top half pips */}
                    <g>
                        <PipHalfVertical
                            value={firstHalfPips}
                            fullWidth={renderWidth}
                            halfHeight={halfHeight}
                            pipSize={pipSize}
                            pipColor={pipColor}
                            offsetY={0}
                        />
                    </g>
                    {/* Bottom half pips */}
                    <g>
                        <PipHalfVertical
                            value={secondHalfPips}
                            fullWidth={renderWidth}
                            halfHeight={halfHeight}
                            pipSize={pipSize}
                            pipColor={pipColor}
                            offsetY={halfHeight}
                        />
                    </g>
                </>
            )}
        </svg>
    );
});
