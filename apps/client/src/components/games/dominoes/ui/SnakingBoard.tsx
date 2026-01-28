"use client";

import React, { useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { BoardState, Tile as TileType } from "@shared/types";
import Tile from "./Tile";
import {
    calculateTilePositions,
    calculateCenteringTransform,
    calculateGhostPositions,
    TILE_SIZE_PRESETS,
    BoardLayout,
    PositionedTile,
    TileSizeConfig,
} from "../utils/tileLayout";
import {
    useContainerDimensions,
    usePrefersReducedMotion,
    TileSize,
} from "@/hooks";
import { getBoardAriaProps } from "@/lib/accessibility";
import { useLayoutMemo, SPRING_PRESETS } from "@/lib/performanceUtils";

// ============================================================================
// Types
// ============================================================================

interface SnakingBoardProps {
    board: BoardState;
    selectedTile: TileType | null;
    isMyTurn: boolean;
    canPlaceLeft: boolean;
    canPlaceRight: boolean;
    onPlaceTile: (side: "left" | "right") => void;
    onCancelSelection?: () => void;
    /** Last played side - kept for API compatibility with Board component */
    lastPlayedSide?: "left" | "right" | null;
    className?: string;
    /** Prefix for layoutId to enable shared animations with TileHand */
    layoutIdPrefix?: string;
    /** Tile size preset */
    tileSize?: TileSize;
    /** Ghost tile size for placement previews */
    ghostTileSize?: TileSize;
    /** Enable snaking (direction changes at edges) */
    enableSnaking?: boolean;
    /** Show debug overlay */
    debug?: boolean;
}

// ============================================================================
// Subcomponents
// ============================================================================

/** Renders a positioned tile */
function PositionedTileRender({
    positionedTile,
    layoutIdPrefix,
    tileSize,
    prefersReducedMotion,
}: {
    positionedTile: PositionedTile;
    layoutIdPrefix?: string;
    tileSize: TileSize;
    prefersReducedMotion: boolean;
}) {
    const { tile, x, y, isHorizontal, isDouble } = positionedTile;

    return (
        <motion.div
            key={tile.id}
            className="absolute"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
            }}
            transition={SPRING_PRESETS.default}
        >
            <Tile
                tile={tile}
                isHorizontal={isHorizontal}
                size={tileSize}
                highlightDouble={isDouble}
                perpendicularDoubles={false}
                layoutId={
                    layoutIdPrefix
                        ? `${layoutIdPrefix}-tile-${tile.id}`
                        : undefined
                }
            />
        </motion.div>
    );
}

/** Ghost tile preview for placement */
function GhostTilePreview({
    positionedTile,
    side,
    tileSize,
    onClick,
    prefersReducedMotion,
}: {
    positionedTile: PositionedTile;
    side: "left" | "right";
    tileSize: TileSize;
    onClick: () => void;
    prefersReducedMotion: boolean;
}) {
    const { tile, x, y, isHorizontal } = positionedTile;
    const tileDescription = `${tile.left}-${tile.right}${tile.left === tile.right ? " double" : ""}`;

    return (
        <motion.button
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onClick}
            aria-label={`Place tile ${tileDescription} on the ${side} end of the board`}
            className="absolute cursor-pointer group z-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-green-800 rounded-lg"
            style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
            }}
        >
            <motion.div
                className="relative"
                animate={
                    prefersReducedMotion ? undefined : { scale: [1, 1.02, 1] }
                }
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                {/* Ghost tile with reduced opacity */}
                <div className="opacity-50 group-hover:opacity-90 transition-opacity duration-200">
                    <Tile
                        tile={tile}
                        isHorizontal={isHorizontal}
                        size={tileSize}
                        highlightDouble={false}
                    />
                </div>

                {/* Pulsing ring */}
                <motion.div
                    className="absolute inset-0 rounded-lg ring-2 ring-yellow-400"
                    animate={
                        prefersReducedMotion
                            ? { opacity: 0.7 }
                            : { opacity: [0.5, 1, 0.5] }
                    }
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                    }}
                />

                {/* Label */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full">
                    {side === "left" ? "← Place here" : "Place here →"}
                </span>
            </motion.div>
        </motion.button>
    );
}

/** End value badges showing current playable values */
function EndValueBadges({
    leftEnd,
    rightEnd,
    tileCount,
}: {
    leftEnd: number | null;
    rightEnd: number | null;
    tileCount: number;
}) {
    return (
        <div className="mb-2 text-sm font-medium text-white/70 flex items-center justify-between px-1">
            <span className="flex items-center gap-2">
                Board
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {tileCount} tiles
                </span>
            </span>
            {leftEnd !== null && rightEnd !== null && (
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs">
                        <motion.span
                            key={`left-${leftEnd}`}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="bg-amber-500/80 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm"
                        >
                            {leftEnd}
                        </motion.span>
                        <span className="text-white/50">—</span>
                        <motion.span
                            key={`right-${rightEnd}`}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="bg-amber-500/80 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm"
                        >
                            {rightEnd}
                        </motion.span>
                    </span>
                </div>
            )}
        </div>
    );
}

/** Empty board state */
function EmptyBoardPlaceholder({ isMyTurn }: { isMyTurn: boolean }) {
    return (
        <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center text-green-200/80 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <motion.div
                className="w-3 h-3 rounded-full bg-green-400/50"
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                }}
            />
            <span className="text-sm mt-2">
                {isMyTurn
                    ? "Select a tile from your hand to start"
                    : "Waiting for first tile..."}
            </span>
        </motion.div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SnakingBoard renders dominoes in a 2D layout that can turn at edges.
 * Uses transform-based positioning for smooth pan/zoom transitions.
 */
export default function SnakingBoard({
    board,
    selectedTile,
    isMyTurn,
    canPlaceLeft,
    canPlaceRight,
    onPlaceTile,
    onCancelSelection,
    lastPlayedSide: _lastPlayedSide,
    className,
    layoutIdPrefix,
    tileSize = "sm",
    ghostTileSize,
    enableSnaking = true,
    debug = false,
}: SnakingBoardProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const containerRef = useRef<HTMLDivElement>(null);
    const { width: containerWidth, height: containerHeight } =
        useContainerDimensions(containerRef);

    // Effective ghost size
    const effectiveGhostSize = ghostTileSize ?? tileSize;

    // Get tile config - map tileSize preset to new config format
    const tileConfig: TileSizeConfig = useMemo(() => {
        const preset = TILE_SIZE_PRESETS[tileSize] ?? TILE_SIZE_PRESETS.sm;
        return preset;
    }, [tileSize]);

    // Extract tile IDs for memoization key
    const tileIds = useMemo(() => board.tiles.map((t) => t.id), [board.tiles]);

    // Calculate layout with optimized memoization
    const layout: BoardLayout = useLayoutMemo(
        useCallback(
            (roundedWidth: number, roundedHeight: number) => {
                if (board.tiles.length === 0 || roundedWidth === 0) {
                    return {
                        tiles: [],
                        bounds: {
                            minX: 0,
                            minY: 0,
                            maxX: 0,
                            maxY: 0,
                            width: 0,
                            height: 0,
                        },
                        leftEndPosition: null,
                        rightEndPosition: null,
                        leftEndDirection: "right" as const,
                        rightEndDirection: "right" as const,
                    };
                }

                return calculateTilePositions(
                    board.tiles,
                    tileConfig,
                    roundedWidth,
                    roundedHeight,
                    enableSnaking,
                );
            },
            [board.tiles, tileConfig, enableSnaking],
        ),
        tileIds,
        containerWidth,
        containerHeight,
        enableSnaking,
    );

    // Calculate centering transform
    const transform = useMemo(() => {
        return calculateCenteringTransform(
            layout.bounds,
            containerWidth,
            containerHeight,
        );
    }, [layout.bounds, containerWidth, containerHeight]);

    // Spring-animated values for smooth zoom/pan
    const springConfig = SPRING_PRESETS.smooth;
    const springScale = useSpring(transform.scale, springConfig);
    const springTranslateX = useSpring(transform.x, springConfig);
    const springTranslateY = useSpring(transform.y, springConfig);

    // Update springs when transform changes
    useEffect(() => {
        springScale.set(transform.scale);
        springTranslateX.set(transform.x);
        springTranslateY.set(transform.y);
    }, [transform, springScale, springTranslateX, springTranslateY]);

    // Calculate ghost positions
    const ghostPositions = useMemo(() => {
        if (!selectedTile || !isMyTurn || board.tiles.length === 0) {
            return { left: null, right: null };
        }

        return calculateGhostPositions(
            selectedTile,
            layout,
            canPlaceLeft,
            canPlaceRight,
            tileConfig,
        );
    }, [
        layout,
        selectedTile,
        isMyTurn,
        board.tiles.length,
        tileConfig,
        canPlaceLeft,
        canPlaceRight,
    ]);

    // Show ghost previews
    const showGhostPreviews =
        selectedTile && isMyTurn && board.tiles.length > 0;

    // Click outside to cancel selection
    const handleContainerClick = useCallback(
        (e: React.MouseEvent) => {
            // Only trigger if clicking the container itself, not a ghost tile
            if (e.target === e.currentTarget && onCancelSelection) {
                onCancelSelection();
            }
        },
        [onCancelSelection],
    );

    const isEmpty = board.tiles.length === 0;

    // Check for overflow (board larger than container)
    const isOverflowing = transform.scale < 1;

    return (
        <div className={cn("relative w-full", className)}>
            {/* End value badges */}
            <EndValueBadges
                leftEnd={board.leftEnd?.value ?? null}
                rightEnd={board.rightEnd?.value ?? null}
                tileCount={board.tiles.length}
            />

            {/* Board container */}
            <div
                ref={containerRef}
                onClick={handleContainerClick}
                className="relative bg-linear-to-b from-green-700 to-green-800 dark:from-green-800 dark:to-green-900 rounded-xl min-h-[140px] sm:min-h-[180px] shadow-inner border border-green-600/30 overflow-hidden"
                {...getBoardAriaProps({
                    gameType: "Dominoes",
                    tileCount: board.tiles.length,
                    leftEnd: board.leftEnd?.value,
                    rightEnd: board.rightEnd?.value,
                })}
            >
                {isEmpty ? (
                    <EmptyBoardPlaceholder isMyTurn={isMyTurn} />
                ) : (
                    <motion.div
                        className="absolute inset-0"
                        style={{
                            x: springTranslateX,
                            y: springTranslateY,
                            scale: springScale,
                        }}
                    >
                        {/* Render positioned tiles */}
                        {layout.tiles.map((pt) => (
                            <PositionedTileRender
                                key={pt.tile.id}
                                positionedTile={pt}
                                layoutIdPrefix={layoutIdPrefix}
                                tileSize={tileSize}
                                prefersReducedMotion={prefersReducedMotion}
                            />
                        ))}

                        {/* Ghost tile previews */}
                        <AnimatePresence>
                            {showGhostPreviews && ghostPositions.left && (
                                <GhostTilePreview
                                    key="ghost-left"
                                    positionedTile={ghostPositions.left}
                                    side="left"
                                    tileSize={effectiveGhostSize}
                                    onClick={() => onPlaceTile("left")}
                                    prefersReducedMotion={prefersReducedMotion}
                                />
                            )}
                            {showGhostPreviews && ghostPositions.right && (
                                <GhostTilePreview
                                    key="ghost-right"
                                    positionedTile={ghostPositions.right}
                                    side="right"
                                    tileSize={effectiveGhostSize}
                                    onClick={() => onPlaceTile("right")}
                                    prefersReducedMotion={prefersReducedMotion}
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Debug overlay */}
                {debug && !isEmpty && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded font-mono">
                        <div>
                            Container: {containerWidth} x {containerHeight}
                        </div>
                        <div>
                            Bounds: {layout.bounds.width.toFixed(0)} x{" "}
                            {layout.bounds.height.toFixed(0)}
                        </div>
                        <div>Scale: {transform.scale.toFixed(2)}</div>
                        <div>Overflow: {isOverflowing ? "yes" : "no"}</div>
                    </div>
                )}

                {/* Overflow indicator */}
                {isOverflowing && !isEmpty && (
                    <div className="absolute bottom-2 right-2 text-xs text-white/50 bg-black/30 px-2 py-1 rounded">
                        Pinch to zoom
                    </div>
                )}
            </div>
        </div>
    );
}
