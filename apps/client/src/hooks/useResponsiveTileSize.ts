/**
 * useResponsiveTileSize - Hook for determining appropriate tile size based on viewport
 *
 * Provides responsive tile sizing for Dominoes game based on screen dimensions
 * and layout context.
 */

import { useMemo, useState, useEffect } from "react";

export type TileSize = "xs" | "sm" | "md" | "lg";

interface ResponsiveTileSizeConfig {
    /** Tile size for board display */
    boardTileSize: TileSize;
    /** Tile size for player's hand */
    handTileSize: TileSize;
    /** Tile size for ghost previews */
    ghostTileSize: TileSize;
    /** Whether to use compact layout (mobile) */
    isCompact: boolean;
    /** Whether in landscape orientation */
    isLandscape: boolean;
}

interface Dimensions {
    width: number;
    height: number;
}

/**
 * Determines tile sizes based on dimensions
 */
function calculateTileSizes(dimensions: Dimensions): ResponsiveTileSizeConfig {
    const { width, height } = dimensions;

    // Handle initial/zero dimensions
    if (width === 0 || height === 0) {
        return {
            boardTileSize: "sm",
            handTileSize: "md",
            ghostTileSize: "sm",
            isCompact: false,
            isLandscape: false,
        };
    }

    const isLandscape = width > height;
    const minDimension = Math.min(width, height);

    // Mobile portrait (< 500px width)
    if (width < 500) {
        return {
            boardTileSize: "xs",
            handTileSize: "sm",
            ghostTileSize: "xs",
            isCompact: true,
            isLandscape: false,
        };
    }

    // Mobile landscape (< 500px height)
    if (height < 500) {
        return {
            boardTileSize: "xs",
            handTileSize: "sm",
            ghostTileSize: "xs",
            isCompact: true,
            isLandscape: true,
        };
    }

    // Tablet (500-1024px)
    if (minDimension < 1024) {
        return {
            boardTileSize: "sm",
            handTileSize: "md",
            ghostTileSize: "sm",
            isCompact: false,
            isLandscape,
        };
    }

    // Desktop (≥1024px)
    return {
        boardTileSize: "md",
        handTileSize: "lg",
        ghostTileSize: "md",
        isCompact: false,
        isLandscape,
    };
}

/**
 * Hook that tracks window dimensions
 */
function useWindowDimensions(): Dimensions {
    const [dimensions, setDimensions] = useState<Dimensions>({
        width: typeof window !== "undefined" ? window.innerWidth : 1024,
        height: typeof window !== "undefined" ? window.innerHeight : 768,
    });

    useEffect(() => {
        function handleResize() {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        // Set initial dimensions
        handleResize();

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return dimensions;
}

/**
 * Hook that provides responsive tile sizing based on window dimensions
 *
 * @returns Configuration object with tile sizes and layout info
 */
export function useResponsiveTileSize(): ResponsiveTileSizeConfig {
    const dimensions = useWindowDimensions();

    const config = useMemo(() => calculateTileSizes(dimensions), [dimensions]);

    return config;
}

/**
 * Standalone function to get tile sizes (for non-hook contexts)
 */
export function getResponsiveTileSize(
    width: number,
    height: number,
): ResponsiveTileSizeConfig {
    return calculateTileSizes({ width, height });
}
