"use client";

import { useMemo } from "react";
import { ContainerDimensions } from "./useContainerDimensions";

// Player count constraints for table seating
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

export interface PlayerPosition {
    x: number; // Absolute X position from container left
    y: number; // Absolute Y position from container top
    angle: number; // Angle in radians (for rotation effects)
    angleDegrees: number; // Angle in degrees
    seatPosition: SeatPosition; // Semantic position for layout decisions
    isHero: boolean; // Whether this is the local player
}

export type SeatPosition =
    | "bottom"
    | "bottom-left"
    | "left"
    | "top-left"
    | "top"
    | "top-right"
    | "right"
    | "bottom-right";

export interface PlayerPositionConfig {
    /** Horizontal radius multiplier (0-0.5, relative to container width) */
    radiusXMultiplier?: number;
    /** Vertical radius multiplier (0-0.5, relative to container height) */
    radiusYMultiplier?: number;
    /** Additional inset from edges for player slots (in pixels) */
    edgePadding?: number;
    /** Custom radius multipliers for portrait mode */
    portraitRadiusXMultiplier?: number;
    portraitRadiusYMultiplier?: number;
}

const DEFAULT_CONFIG: Required<PlayerPositionConfig> = {
    radiusXMultiplier: 0.38,
    radiusYMultiplier: 0.32,
    edgePadding: 40,
    portraitRadiusXMultiplier: 0.32,
    portraitRadiusYMultiplier: 0.35, // Vertical ellipse for portrait
};

/**
 * Determines the semantic seat position based on angle.
 * Angles are in radians, with 0 = right, π/2 = bottom, π = left, 3π/2 = top.
 * We use screen coordinates where Y increases downward.
 */
function getSeatPosition(
    angleDegrees: number,
    playerCount: number
): SeatPosition {
    // Normalize angle to 0-360
    const normalized = ((angleDegrees % 360) + 360) % 360;

    // Special cases for common player counts
    if (playerCount === 2) {
        return normalized < 180 ? "bottom" : "top";
    }

    if (playerCount === 4) {
        if (normalized >= 45 && normalized < 135) return "bottom";
        if (normalized >= 135 && normalized < 225) return "left";
        if (normalized >= 225 && normalized < 315) return "top";
        return "right";
    }

    // General 8-sector mapping
    if (normalized >= 67.5 && normalized < 112.5) return "bottom";
    if (normalized >= 112.5 && normalized < 157.5) return "bottom-left";
    if (normalized >= 157.5 && normalized < 202.5) return "left";
    if (normalized >= 202.5 && normalized < 247.5) return "top-left";
    if (normalized >= 247.5 && normalized < 292.5) return "top";
    if (normalized >= 292.5 && normalized < 337.5) return "top-right";
    if (normalized >= 337.5 || normalized < 22.5) return "right";
    return "bottom-right";
}

/**
 * Calculate player positions around an elliptical table.
 *
 * The hero (local player, index 0) is always at the bottom (θ = 90° or π/2).
 * Other players are distributed clockwise from there.
 *
 * Math:
 *   x = cx + rx * cos(θ)
 *   y = cy + ry * sin(θ)
 *
 * Where:
 *   - (cx, cy) is the center of the table
 *   - rx, ry are the horizontal and vertical radii
 *   - θ starts at π/2 (bottom) and increases clockwise
 */
export function usePlayerPositions(
    playerCount: number,
    dimensions: ContainerDimensions,
    config: PlayerPositionConfig = {}
): PlayerPosition[] {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    return useMemo(() => {
        const { width, height, centerX, centerY, isPortrait } = dimensions;

        if (width === 0 || height === 0 || playerCount < 2) {
            return [];
        }

        // Calculate radii based on orientation
        const rx = isPortrait
            ? width * mergedConfig.portraitRadiusXMultiplier
            : width * mergedConfig.radiusXMultiplier;

        const ry = isPortrait
            ? height * mergedConfig.portraitRadiusYMultiplier
            : height * mergedConfig.radiusYMultiplier;

        const positions: PlayerPosition[] = [];
        const clampedCount = Math.max(
            MIN_PLAYERS,
            Math.min(MAX_PLAYERS, playerCount)
        );

        // Angle step between players (in radians)
        const angleStep = (2 * Math.PI) / clampedCount;

        // Hero starts at bottom (π/2 radians = 90°)
        const startAngle = Math.PI / 2;

        for (let i = 0; i < clampedCount; i++) {
            // Clockwise distribution: add angle steps
            const angle = startAngle + i * angleStep;
            const angleDegrees = (angle * 180) / Math.PI;

            // Calculate position using parametric ellipse equations
            const x = centerX + rx * Math.cos(angle);
            const y = centerY + ry * Math.sin(angle);

            const seatPosition = getSeatPosition(angleDegrees, clampedCount);

            positions.push({
                x,
                y,
                angle,
                angleDegrees: angleDegrees % 360,
                seatPosition,
                isHero: i === 0,
            });
        }

        return positions;
    }, [
        playerCount,
        dimensions,
        mergedConfig.radiusXMultiplier,
        mergedConfig.radiusYMultiplier,
        mergedConfig.portraitRadiusXMultiplier,
        mergedConfig.portraitRadiusYMultiplier,
    ]);
}

export default usePlayerPositions;
