"use client";

import React, { useRef, ReactNode, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useContainerDimensions, ContainerDimensions } from "@/hooks";
import { getEdgeSlotCounts } from "./seatLayout";

// ─────────────────────────────────────────────────────────────────────────────
// Layout Mode Types
// ─────────────────────────────────────────────────────────────────────────────

export type LayoutMode = "compact" | "comfortable" | "spacious";

interface LayoutModeConfig {
    /** The current layout mode */
    layoutMode: LayoutMode;
    /** Whether to show opponent cards as badges instead of fans */
    useBadgeMode: boolean;
    /** Card size for hero player */
    heroCardSize: "sm" | "md" | "lg";
    /** Card size for opponents (when not in badge mode) */
    opponentCardSize: "xs" | "sm";
}

/**
 * Determine layout mode based on viewport dimensions and player count
 */
function getLayoutMode(
    width: number,
    height: number,
    playerCount: number,
): LayoutMode {
    // Use the smaller dimension to detect cramped viewports regardless of
    // orientation. Mobile landscape (e.g. 667×360) has a short side of 360
    // and should always be treated as compact, not comfortable.
    const minDim = Math.min(width, height);

    // Compact: any short side under 500px (typical phone landscape or portrait)
    if (minDim > 0 && minDim < 500) return "compact";

    const isTablet = width >= 500 && width < 1024 && height >= 500;

    // Tablet with 4 players → comfortable (may need badges for side players)
    if (isTablet && playerCount >= 4) return "comfortable";

    // Tablet with 2-3 players → spacious
    if (isTablet) return "spacious";

    // Desktop → spacious
    return "spacious";
}

/**
 * Get layout configuration based on mode.
 *
 * High-density tables (7+ players) force badge mode at every breakpoint so
 * opponent rails stay narrow regardless of viewport. Hero card sizing is
 * unaffected.
 */
function getLayoutConfig(
    mode: LayoutMode,
    playerCount: number,
): LayoutModeConfig {
    const isCrowded = playerCount >= 7;
    switch (mode) {
        case "compact":
            return {
                layoutMode: mode,
                useBadgeMode: true,
                heroCardSize: "sm",
                opponentCardSize: "xs",
            };
        case "comfortable":
            return {
                layoutMode: mode,
                useBadgeMode: isCrowded || playerCount >= 4,
                heroCardSize: "md",
                opponentCardSize: "xs",
            };
        case "spacious":
        default:
            return {
                layoutMode: mode,
                useBadgeMode: isCrowded,
                heroCardSize: "lg",
                opponentCardSize: "sm",
            };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid track sizing
// ─────────────────────────────────────────────────────────────────────────────

interface SeatCounts {
    bottom: number;
    left: number;
    top: number;
    right: number;
}

/**
 * Compute CSS grid template rows/columns for the table based on layout mode
 * and per-edge seat counts. Tighter on `compact`, slightly looser on
 * `comfortable`, and natural sizing on `spacious`. Crowded edges (2-3 stacked
 * seats) get a bit more room but stay capped so the center area always wins
 * the leftover space.
 */
function getGridTracks(
    mode: LayoutMode,
    seatCounts: SeatCounts,
    bentoMode: boolean,
): { gridTemplateRows: string; gridTemplateColumns: string } {
    if (bentoMode) {
        return {
            gridTemplateRows: "0px 1fr 0px",
            gridTemplateColumns: "0px 1fr 0px",
        };
    }

    const sideMax = Math.max(seatCounts.left, seatCounts.right);
    const topCount = seatCounts.top;

    if (mode === "compact") {
        // Side columns: tight, but use clamp() so single avatars don't claim
        // an `fr` share that steals horizontal space from the board. When 2+
        // avatars are stacked we widen slightly so they fit.
        const sideCol =
            sideMax >= 3
                ? "clamp(2.75rem, 14vw, 5rem)"
                : sideMax >= 2
                  ? "clamp(2.5rem, 13vw, 4.75rem)"
                  : "clamp(2.25rem, 11vw, 4rem)";
        // Top row: only as tall as needed for a single avatar; reserve a bit
        // more when multiple avatars stack.
        const topRow =
            topCount >= 3
                ? "minmax(64px, max-content)"
                : topCount >= 2
                  ? "minmax(56px, max-content)"
                  : "minmax(48px, max-content)";
        return {
            gridTemplateRows: `${topRow} minmax(0, 1fr) minmax(48px, max-content)`,
            gridTemplateColumns: `${sideCol} minmax(0, 1fr) ${sideCol}`,
        };
    }

    if (mode === "comfortable") {
        // Softer than compact: capped max-content tracks. Trimmed from the
        // earlier 9rem/8rem/6.5rem to keep more room for the center board.
        const sideCol =
            sideMax >= 3
                ? "minmax(0, 7rem)"
                : sideMax >= 2
                  ? "minmax(0, 6rem)"
                  : "minmax(0, 5rem)";
        const topRow =
            topCount >= 3
                ? "minmax(0, 5.25rem)"
                : topCount >= 2
                  ? "minmax(0, 4.75rem)"
                  : "minmax(0, 4.25rem)";
        return {
            gridTemplateRows: `${topRow} minmax(0, 1fr) minmax(0, auto)`,
            gridTemplateColumns: `${sideCol} minmax(0, 1fr) ${sideCol}`,
        };
    }

    // Spacious: size edge tracks to their content (capped) so the center
    // cell always wins extra space. `max-content` prevents long opponent
    // names from inflating, and avoids the prior `auto` ballooning issue.
    return {
        gridTemplateRows:
            "minmax(0, max-content) minmax(0, 1fr) minmax(0, max-content)",
        gridTemplateColumns:
            "minmax(0, max-content) minmax(0, 1fr) minmax(0, max-content)",
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context for sharing table state with child components
// ─────────────────────────────────────────────────────────────────────────────

interface GameTableContextValue {
    dimensions: ContainerDimensions;
    playerCount: number;
    isDealing: boolean;
    /** Current layout mode based on viewport and player count */
    layoutMode: LayoutMode;
    /** Layout configuration with card sizes and badge mode */
    layoutConfig: LayoutModeConfig;
    /** Per-edge seat counts derived from playerCount */
    seatCounts: SeatCounts;
}

const GameTableContext = createContext<GameTableContextValue | null>(null);

export function useGameTable() {
    const context = useContext(GameTableContext);
    if (!context) {
        throw new Error("useGameTable must be used within a GameTable");
    }
    return context;
}

/**
 * Optional variant that returns null when used outside a GameTable.
 * Useful for shared components (like PlayerInfo) that want to adapt to
 * GameTable layout state when present but still render standalone.
 */
export function useGameTableOptional() {
    return useContext(GameTableContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GameTable Component
// ─────────────────────────────────────────────────────────────────────────────

interface GameTableProps {
    playerCount: number;
    children: ReactNode;
    isDealing?: boolean;
    className?: string;
    /** Custom gradient for the felt surface */
    feltGradient?: string;
    /** Show debug grid overlay */
    showDebugGrid?: boolean;
    /** Callback when the table background is clicked (for closing spread hands) */
    onTableClick?: () => void;
    /**
     * When true, collapse all edge grid tracks to 0 so the center region
     * fills the entire viewport. Used for bento-style full-screen scenes
     * (e.g. Rummy DRAW / MELD) where opponent tiles are not shown.
     */
    bentoMode?: boolean;
}

/**
 * GameTable - A CSS Grid-based responsive game table with edge-anchored player positioning.
 *
 * Uses CSS Grid to create a layout where:
 * - Players are positioned at the edges (top, bottom, left, right)
 * - The center region holds the card pile/trick area
 * - Cards are as close to screen edges as possible
 * - Player info is between cards and center
 *
 * Grid structure (4 players):
 *   .     top    .
 *   left  center right
 *   .     bottom .
 */
function GameTable({
    playerCount,
    children,
    isDealing = false,
    className,
    feltGradient = "from-emerald-800 via-emerald-700 to-teal-800",
    showDebugGrid = false,
    onTableClick,
    bentoMode = false,
}: GameTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dimensions = useContainerDimensions(containerRef);

    // Calculate layout mode based on dimensions and player count
    const layoutMode = getLayoutMode(
        dimensions.width,
        dimensions.height,
        playerCount,
    );
    const layoutConfig = getLayoutConfig(layoutMode, playerCount);
    const seatCounts = getEdgeSlotCounts(playerCount);
    const gridTracks = getGridTracks(layoutMode, seatCounts, bentoMode);

    const contextValue: GameTableContextValue = {
        dimensions,
        playerCount,
        isDealing,
        layoutMode,
        layoutConfig,
        seatCounts,
    };

    return (
        <GameTableContext.Provider value={contextValue}>
            <div
                ref={containerRef}
                className={cn(
                    "relative w-full h-full overflow-hidden",
                    `bg-linear-to-br ${feltGradient}`,
                    className,
                )}
                onClick={onTableClick}
            >
                {/* Felt texture overlay - using layered gradients for scalable texture */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.35) 100%),
                            repeating-linear-gradient(
                                0deg,
                                transparent,
                                transparent 2px,
                                rgba(0,0,0,0.03) 2px,
                                rgba(0,0,0,0.03) 4px
                            ),
                            repeating-linear-gradient(
                                90deg,
                                transparent,
                                transparent 2px,
                                rgba(0,0,0,0.03) 2px,
                                rgba(0,0,0,0.03) 4px
                            ),
                            repeating-linear-gradient(
                                45deg,
                                transparent,
                                transparent 3px,
                                rgba(255,255,255,0.02) 3px,
                                rgba(255,255,255,0.02) 6px
                            ),
                            repeating-linear-gradient(
                                -45deg,
                                transparent,
                                transparent 3px,
                                rgba(0,0,0,0.02) 3px,
                                rgba(0,0,0,0.02) 6px
                            )
                        `,
                    }}
                />

                {/* Subtle inner glow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        boxShadow: "inset 0 0 100px rgba(0,0,0,0.3)",
                    }}
                />

                {/* Debug grid overlay */}
                {showDebugGrid && (
                    <DebugOverlay
                        dimensions={dimensions}
                        playerCount={playerCount}
                        layoutMode={layoutMode}
                        layoutConfig={layoutConfig}
                    />
                )}

                {/* Main CSS Grid content */}
                <div
                    className="relative z-10 w-full h-full grid"
                    style={{
                        gridTemplateAreas: `
                            ".     top    ."
                            "left  center right"
                            ".     bottom ."
                        `,
                        gridTemplateRows: gridTracks.gridTemplateRows,
                        gridTemplateColumns: gridTracks.gridTemplateColumns,
                    }}
                >
                    {children}
                </div>
            </div>
        </GameTableContext.Provider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug Overlay Component
// ─────────────────────────────────────────────────────────────────────────────

function DebugOverlay({
    dimensions,
    playerCount,
    layoutMode,
    layoutConfig,
}: {
    dimensions: ContainerDimensions;
    playerCount: number;
    layoutMode: LayoutMode;
    layoutConfig: LayoutModeConfig;
}) {
    return (
        <div className="absolute inset-0 pointer-events-none z-50">
            {/* Center point */}
            <div
                className="absolute w-4 h-4 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{
                    left: dimensions.centerX,
                    top: dimensions.centerY,
                }}
            />

            {/* Center crosshair */}
            <div
                className="absolute w-full h-0.5 bg-yellow-400/30"
                style={{ top: dimensions.centerY }}
            />
            <div
                className="absolute h-full w-0.5 bg-yellow-400/30"
                style={{ left: dimensions.centerX }}
            />

            {/* Grid visualization */}
            <div
                className="absolute inset-0 border-2 border-dashed border-yellow-400/30"
                style={{
                    display: "grid",
                    gridTemplateAreas: `
                        ".     top    ."
                        "left  center right"
                        ".     bottom ."
                    `,
                    gridTemplateRows: "auto 1fr auto",
                    gridTemplateColumns: "auto 1fr auto",
                }}
            >
                <div
                    className="border border-blue-400/50 bg-blue-400/10"
                    style={{ gridArea: "top" }}
                />
                <div
                    className="border border-green-400/50 bg-green-400/10"
                    style={{ gridArea: "left" }}
                />
                <div
                    className="border border-purple-400/50 bg-purple-400/10"
                    style={{ gridArea: "center" }}
                />
                <div
                    className="border border-green-400/50 bg-green-400/10"
                    style={{ gridArea: "right" }}
                />
                <div
                    className="border border-red-400/50 bg-red-400/10"
                    style={{ gridArea: "bottom" }}
                />
            </div>

            {/* Dimension info */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded font-mono">
                <div>
                    Size: {Math.round(dimensions.width)} ×{" "}
                    {Math.round(dimensions.height)}
                </div>
                <div>
                    Orientation:{" "}
                    {dimensions.isPortrait ? "Portrait" : "Landscape"}
                </div>
                <div>Aspect: {dimensions.aspectRatio.toFixed(2)}</div>
                <div>Players: {playerCount}</div>
                <div className="mt-1 text-cyan-400">Layout: {layoutMode}</div>
                <div className="text-cyan-400">
                    Badge: {layoutConfig.useBadgeMode ? "Yes" : "No"}
                </div>
                <div className="text-cyan-400">
                    Hero: {layoutConfig.heroCardSize} | Opp:{" "}
                    {layoutConfig.opponentCardSize}
                </div>
                <div className="mt-1 text-yellow-400">Grid Layout Active</div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table Center Component
// ─────────────────────────────────────────────────────────────────────────────

interface TableCenterProps {
    children: ReactNode;
    className?: string;
    /** Minimum size of the center area */
    minSize?: number;
    /** Optional inline styles */
    style?: React.CSSProperties;
}

/**
 * TableCenter - The center region of the game table (CSS Grid area).
 * Use for trick piles, round indicators, and other central UI.
 */
export function TableCenter({
    children,
    className,
    minSize = 100,
    style,
}: TableCenterProps) {
    return (
        <motion.div
            className={cn(
                "flex flex-col items-center justify-center z-20",
                className,
            )}
            style={{
                gridArea: "center",
                minWidth: minSize,
                minHeight: minSize,
                // Ensure center is truly centered within the grid cell
                placeSelf: "center",
                ...style,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
}

export default GameTable;
