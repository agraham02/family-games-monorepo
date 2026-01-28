"use client";

import { useMemo, RefObject } from "react";
import {
    useContainerDimensions,
    ContainerDimensions,
} from "./useContainerDimensions";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Layout mode based on available space and orientation.
 */
export type LayoutMode =
    | "stacked-vertical" // Mobile portrait - vertical list
    | "stacked-horizontal" // Mobile landscape - horizontal arrangement
    | "semi-circular" // Tablet/medium - arc layout
    | "full-circular"; // Desktop - full circular layout

/**
 * Size category for responsive sizing decisions.
 */
export type SizeCategory = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Comprehensive responsive layout configuration.
 */
export interface ResponsiveLayoutConfig {
    /** The calculated layout mode */
    layoutMode: LayoutMode;
    /** Size category based on container dimensions */
    sizeCategory: SizeCategory;
    /** Whether the layout is in compact mode (limited space) */
    isCompact: boolean;
    /** Whether to use circular layout (false = stacked) */
    useCircularLayout: boolean;
    /** Container dimensions */
    dimensions: ContainerDimensions;
    /** Optimal radius percentage for circular layouts */
    radiusPercent: number;
    /** Maximum number of players visible without scrolling (for stacked layouts) */
    maxVisiblePlayers: number;
    /** Whether elements should be scaled down */
    shouldScale: boolean;
    /** Scale factor for elements (1 = normal, <1 = scaled down) */
    scaleFactor: number;
    /** Padding to use around the layout */
    padding: { x: number; y: number };
    /** Safe area for center content (pot, dice) in circular layouts */
    centerSafeRadius: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Breakpoint Thresholds
// ─────────────────────────────────────────────────────────────────────────────

const BREAKPOINTS = {
    /** Minimum dimension for stacked -> semi-circular transition */
    STACKED_TO_SEMI: 500,
    /** Minimum dimension for semi-circular -> full-circular transition */
    SEMI_TO_FULL: 700,
    /** Width breakpoint for xs -> sm */
    XS_TO_SM: 360,
    /** Width breakpoint for sm -> md */
    SM_TO_MD: 640,
    /** Width breakpoint for md -> lg */
    MD_TO_LG: 1024,
    /** Width breakpoint for lg -> xl */
    LG_TO_XL: 1280,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the size category based on container width.
 */
function getSizeCategory(width: number): SizeCategory {
    if (width < BREAKPOINTS.XS_TO_SM) return "xs";
    if (width < BREAKPOINTS.SM_TO_MD) return "sm";
    if (width < BREAKPOINTS.MD_TO_LG) return "md";
    if (width < BREAKPOINTS.LG_TO_XL) return "lg";
    return "xl";
}

/**
 * Determine the layout mode based on dimensions and orientation.
 */
function getLayoutMode(
    width: number,
    height: number,
    isPortrait: boolean,
): LayoutMode {
    const minDim = Math.min(width, height);

    // Very small screens: always stacked
    if (minDim < BREAKPOINTS.STACKED_TO_SEMI) {
        return isPortrait ? "stacked-vertical" : "stacked-horizontal";
    }

    // Medium screens: semi-circular (arc at top/bottom)
    if (minDim < BREAKPOINTS.SEMI_TO_FULL) {
        return "semi-circular";
    }

    // Large screens: full circular
    return "full-circular";
}

/**
 * Calculate optimal radius percentage for circular layouts.
 * Accounts for player count and available space.
 */
function calculateRadiusPercent(
    width: number,
    height: number,
    playerCount: number,
    layoutMode: LayoutMode,
): number {
    if (
        layoutMode === "stacked-vertical" ||
        layoutMode === "stacked-horizontal"
    ) {
        return 0; // Not used for stacked layouts
    }

    const minDim = Math.min(width, height);

    // Base radius as percentage of container
    let baseRadius = 38;

    // Reduce radius for more players to avoid overlap
    const playerReduction = Math.max(0, (playerCount - 4) * 2);
    baseRadius -= playerReduction;

    // Reduce radius for smaller containers
    if (minDim < 600) {
        baseRadius -= 5;
    }

    // Semi-circular uses slightly smaller radius
    if (layoutMode === "semi-circular") {
        baseRadius -= 3;
    }

    return Math.max(25, Math.min(45, baseRadius));
}

/**
 * Calculate scale factor for elements based on available space.
 */
function calculateScaleFactor(
    width: number,
    height: number,
    playerCount: number,
): number {
    const minDim = Math.min(width, height);

    // Start scaling down below 500px
    if (minDim >= 500) return 1;

    // Linear scale from 1 at 500px to 0.7 at 320px
    const scale = 0.7 + (minDim - 320) * (0.3 / (500 - 320));

    // Additional reduction for many players
    const playerPenalty = Math.max(0, (playerCount - 4) * 0.03);

    return Math.max(0.6, Math.min(1, scale - playerPenalty));
}

/**
 * Calculate maximum visible players for stacked layouts.
 */
function getMaxVisiblePlayers(height: number, layoutMode: LayoutMode): number {
    if (layoutMode === "stacked-horizontal") {
        return 6; // Horizontal can show more
    }

    if (layoutMode !== "stacked-vertical") {
        return 10; // Circular layouts show all
    }

    // Vertical stacked: depends on height
    // Assume ~80px per player card + 200px for center content
    const availableHeight = height - 200;
    const playerHeight = 80;

    return Math.max(3, Math.floor(availableHeight / playerHeight));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseResponsiveLayoutOptions {
    /** Number of players (affects radius and scaling) */
    playerCount?: number;
    /** Force a specific layout mode (for testing) */
    forceLayoutMode?: LayoutMode;
}

/**
 * Hook that provides comprehensive responsive layout configuration.
 *
 * @param containerRef - Reference to the container element
 * @param options - Configuration options
 * @returns ResponsiveLayoutConfig with all layout parameters
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const layout = useResponsiveLayout(containerRef, { playerCount: 4 });
 *
 * if (layout.layoutMode === 'stacked-vertical') {
 *   return <MobileVerticalLayout {...props} />;
 * }
 * ```
 */
export function useResponsiveLayout(
    containerRef: RefObject<HTMLElement | null>,
    options: UseResponsiveLayoutOptions = {},
): ResponsiveLayoutConfig {
    const { playerCount = 4, forceLayoutMode } = options;
    const dimensions = useContainerDimensions(containerRef);

    const config = useMemo<ResponsiveLayoutConfig>(() => {
        const { width, height, isPortrait } = dimensions;

        // Determine layout mode
        const layoutMode =
            forceLayoutMode ?? getLayoutMode(width, height, isPortrait);

        // Calculate other values
        const sizeCategory = getSizeCategory(width);
        const isCompact = Math.min(width, height) < BREAKPOINTS.STACKED_TO_SEMI;
        const useCircularLayout =
            layoutMode === "semi-circular" || layoutMode === "full-circular";
        const radiusPercent = calculateRadiusPercent(
            width,
            height,
            playerCount,
            layoutMode,
        );
        const maxVisiblePlayers = getMaxVisiblePlayers(height, layoutMode);
        const scaleFactor = calculateScaleFactor(width, height, playerCount);
        const shouldScale = scaleFactor < 1;

        // Calculate padding based on size
        const basePadding =
            sizeCategory === "xs" ? 8 : sizeCategory === "sm" ? 12 : 16;
        const padding = { x: basePadding, y: basePadding };

        // Calculate center safe radius (area reserved for pot/dice)
        const centerSafeRadius = useCircularLayout
            ? Math.min(width, height) * 0.15
            : 0;

        return {
            layoutMode,
            sizeCategory,
            isCompact,
            useCircularLayout,
            dimensions,
            radiusPercent,
            maxVisiblePlayers,
            shouldScale,
            scaleFactor,
            padding,
            centerSafeRadius,
        };
    }, [dimensions, playerCount, forceLayoutMode]);

    return config;
}

/**
 * Pure function version for use outside React components.
 */
export function getResponsiveLayoutConfig(
    width: number,
    height: number,
    playerCount: number = 4,
): Omit<ResponsiveLayoutConfig, "dimensions"> {
    const isPortrait = height > width;
    const layoutMode = getLayoutMode(width, height, isPortrait);
    const sizeCategory = getSizeCategory(width);
    const isCompact = Math.min(width, height) < BREAKPOINTS.STACKED_TO_SEMI;
    const useCircularLayout =
        layoutMode === "semi-circular" || layoutMode === "full-circular";
    const radiusPercent = calculateRadiusPercent(
        width,
        height,
        playerCount,
        layoutMode,
    );
    const maxVisiblePlayers = getMaxVisiblePlayers(height, layoutMode);
    const scaleFactor = calculateScaleFactor(width, height, playerCount);
    const shouldScale = scaleFactor < 1;
    const basePadding =
        sizeCategory === "xs" ? 8 : sizeCategory === "sm" ? 12 : 16;
    const centerSafeRadius = useCircularLayout
        ? Math.min(width, height) * 0.15
        : 0;

    return {
        layoutMode,
        sizeCategory,
        isCompact,
        useCircularLayout,
        radiusPercent,
        maxVisiblePlayers,
        shouldScale,
        scaleFactor,
        padding: { x: basePadding, y: basePadding },
        centerSafeRadius,
    };
}

export default useResponsiveLayout;
