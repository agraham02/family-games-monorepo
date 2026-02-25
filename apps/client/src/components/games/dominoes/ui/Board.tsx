"use client";
import React, { useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { BoardState, Tile as TileType, DominoTileLayout } from "@shared/types";
import Tile from "./Tile";
import { Button } from "@/components/ui/button";
import { Focus, Minus, Plus } from "lucide-react";
import { TileSize, usePrefersReducedMotion } from "@/hooks";
import { useBoardCamera } from "@/hooks/useBoardCamera";
import { useContainerDimensions } from "@/hooks/useContainerDimensions";

// ============================================================================
// Types
// ============================================================================

interface BoardProps {
    board: BoardState;
    selectedTile: TileType | null;
    isMyTurn: boolean;
    canPlaceLeft: boolean;
    canPlaceRight: boolean;
    selectedGhostSide: "left" | "right" | null;
    onSelectGhostSide: (side: "left" | "right") => void;
    className?: string;
    layoutIdPrefix?: string;
    tileSize?: TileSize;
    ghostTileSize?: TileSize;
}

// ============================================================================
// Constants
// ============================================================================

const TILE_UNIT_SIZES: Record<TileSize, number> = {
    xs: 20,
    sm: 28,
    md: 40,
    lg: 56,
};

// ============================================================================
// Helpers
// ============================================================================

function orientTileForPlacement(
    tile: TileType,
    endValue: number | undefined,
): TileType {
    if (endValue === undefined) return tile;
    if (tile.left === endValue) return tile;
    if (tile.right === endValue) {
        return { ...tile, left: tile.right, right: tile.left };
    }
    return tile;
}

function getGhostRotation(direction: string, isDouble: boolean): number {
    if (direction === "RIGHT") return isDouble ? 90 : 0;
    if (direction === "LEFT") return isDouble ? 90 : 180;
    if (direction === "DOWN") return isDouble ? 0 : 90;
    if (direction === "UP") return isDouble ? 0 : 270;
    return 0;
}

// ============================================================================
// Sub-components
// ============================================================================

function EmptyBoardIndicator({
    isMyTurn,
    prefersReducedMotion,
}: {
    isMyTurn: boolean;
    prefersReducedMotion: boolean;
}) {
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-green-200/80 italic text-center flex flex-col items-center gap-2">
                <div
                    className={cn(
                        "w-3 h-3 rounded-full bg-green-400/50",
                        !prefersReducedMotion && "animate-pulse",
                    )}
                />
                <span className="text-sm">
                    {isMyTurn
                        ? "Select a tile from your hand to start"
                        : "Waiting for first tile..."}
                </span>
            </div>
        </div>
    );
}

function PlacedTile({
    tile,
    layout,
    unitSize,
    tileSize,
    prefersReducedMotion,
    layoutIdPrefix,
}: {
    tile: TileType;
    layout: DominoTileLayout;
    unitSize: number;
    tileSize: TileSize;
    prefersReducedMotion: boolean;
    layoutIdPrefix?: string;
}) {
    const logicalUnit = 2 * unitSize;
    const width = 2 * unitSize;
    const height = unitSize;
    const px = layout.x * logicalUnit - width / 2;
    const py = layout.y * logicalUnit - height / 2;

    return (
        <motion.div
            key={tile.id}
            className="absolute flex items-center justify-center"
            style={{
                left: px,
                top: py,
                width,
                height,
                rotate: layout.rotation,
            }}
            initial={
                prefersReducedMotion
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.6 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={
                prefersReducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 400, damping: 28 }
            }
        >
            <Tile
                tile={tile}
                isHorizontal={true}
                size={tileSize}
                highlightDouble={false}
                perpendicularDoubles={false}
                disableLayoutAnimation
                layoutId={
                    layoutIdPrefix
                        ? `${layoutIdPrefix}-tile-${tile.id}`
                        : undefined
                }
            />
        </motion.div>
    );
}

function GhostPreview({
    tile,
    side: _side,
    position,
    unitSize,
    tileSize,
    isSelected,
    onSelect,
    prefersReducedMotion,
}: {
    tile: TileType;
    side: "left" | "right";
    position: { x: number; y: number; direction: string };
    unitSize: number;
    tileSize: TileSize;
    isSelected: boolean;
    onSelect: () => void;
    prefersReducedMotion: boolean;
}) {
    const logicalUnit = 2 * unitSize;
    const width = 2 * unitSize;
    const height = unitSize;
    const isDouble = tile.left === tile.right;
    const rotation = getGhostRotation(position.direction, isDouble);

    const px = position.x * logicalUnit - width / 2;
    const py = position.y * logicalUnit - height / 2;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute z-30 cursor-pointer group"
            style={{
                left: px,
                top: py,
                width,
                height,
                rotate: rotation,
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
        >
            <div className="relative w-full h-full">
                {/* Ghost tile (semi-transparent) */}
                <div className="opacity-50 group-hover:opacity-90 transition-opacity duration-200 w-full h-full">
                    <Tile
                        tile={tile}
                        isHorizontal={true}
                        size={tileSize}
                        highlightDouble={false}
                        perpendicularDoubles={false}
                        disableLayoutAnimation
                    />
                </div>

                {/* Pulsing selection ring */}
                <motion.div
                    className="absolute inset-0 rounded-lg ring-2 ring-yellow-400"
                    animate={
                        prefersReducedMotion
                            ? { opacity: isSelected ? 1 : 0.7 }
                            : {
                                  opacity: isSelected
                                      ? [0.8, 1, 0.8]
                                      : [0.5, 1, 0.5],
                              }
                    }
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 1.5, repeat: Infinity }
                    }
                />

                {/* Label (counter-rotated so text stays readable) */}
                <span
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full"
                    style={{ rotate: `-${rotation}deg` }}
                >
                    {isSelected ? "End selected" : "Tap to choose end"}
                </span>
            </div>
        </motion.div>
    );
}

function ZoomControls({
    zoomIn,
    zoomOut,
    recenter,
}: {
    zoomIn: () => void;
    zoomOut: () => void;
    recenter: () => void;
}) {
    return (
        <div
            data-board-control="true"
            className="absolute top-2 right-2 z-40 flex items-center gap-1.5 bg-black/45 backdrop-blur-sm rounded-lg p-1"
        >
            <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-none"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={zoomOut}
                aria-label="Zoom out"
            >
                <Minus className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-black/50 hover:bg-black/70 text-white border-none"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={zoomIn}
                aria-label="Zoom in"
            >
                <Plus className="w-4 h-4" />
            </Button>
            <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 bg-black/50 hover:bg-black/70 text-white border-none px-2"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={recenter}
            >
                <Focus className="w-4 h-4 mr-1" />
                Recenter
            </Button>
        </div>
    );
}

// ============================================================================
// Main Board component
// ============================================================================

export default function Board({
    board,
    selectedTile,
    isMyTurn,
    canPlaceLeft,
    canPlaceRight,
    selectedGhostSide,
    onSelectGhostSide,
    className,
    layoutIdPrefix,
    tileSize = "sm",
    ghostTileSize,
}: BoardProps) {
    const effectiveGhostSize = ghostTileSize ?? tileSize;
    const prefersReducedMotion = usePrefersReducedMotion();
    const containerRef = useRef<HTMLDivElement>(null);
    const { width: containerWidth, height: containerHeight } =
        useContainerDimensions(containerRef);

    const unitSize = TILE_UNIT_SIZES[tileSize];

    // Layout comes from board state (computed server-side or by debug engine) — no client fallback
    const layouts = useMemo(() => {
        const serverLayouts = board.layout?.tileLayouts;
        if (!serverLayouts) return new Map<string, DominoTileLayout>();
        return new Map(
            Object.values(serverLayouts).map((layout) => [layout.id, layout]),
        );
    }, [board.layout?.tileLayouts]);

    const bounds = board.layout?.bounds ?? {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
    };
    const leftEndPos = board.layout?.leftEndPos ?? null;
    const rightEndPos = board.layout?.rightEndPos ?? null;

    // Camera: pan/zoom/pinch via @use-gesture/react
    const {
        camera,
        isUserControlled,
        bindGestures,
        zoomIn,
        zoomOut,
        recenter,
    } = useBoardCamera({
        containerWidth,
        containerHeight,
        logicalBounds: bounds,
        unitSize: 2 * unitSize,
        padding: 60,
    });

    // Ghost tile computation
    const isEmpty = board.tiles.length === 0;
    const showGhostPreviews = selectedTile && isMyTurn;

    const leftGhostTile =
        selectedTile && board.leftEnd
            ? orientTileForPlacement(selectedTile, board.leftEnd.value)
            : selectedTile;
    const rightGhostTile =
        selectedTile && board.rightEnd
            ? orientTileForPlacement(selectedTile, board.rightEnd.value)
            : selectedTile;

    const emptyBoardGhostPos = { x: 0, y: 0, direction: "RIGHT" as const };

    // Camera transition style
    const cameraTransition = prefersReducedMotion
        ? { duration: 0 }
        : isUserControlled
          ? { duration: 0 }
          : { type: "spring" as const, stiffness: 220, damping: 34 };

    return (
        <div className={cn("relative w-full flex flex-col", className)}>
            {/* Board header with tile count and end values */}
            <div className="mb-2 text-sm font-medium text-white/70 flex items-center justify-between px-1">
                <span className="flex items-center gap-2">
                    Board
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                        {board.tiles.length} tiles
                    </span>
                </span>
                {board.leftEnd && board.rightEnd && (
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs">
                            <span className="bg-amber-500/80 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm">
                                {board.leftEnd.value}
                            </span>
                            <span className="text-white/50">—</span>
                            <span className="bg-amber-500/80 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm">
                                {board.rightEnd.value}
                            </span>
                        </span>
                    </div>
                )}
            </div>

            {/* Board container — gesture target */}
            <div
                ref={containerRef}
                {...bindGestures()}
                className="relative flex-1 w-full overflow-hidden touch-none cursor-grab active:cursor-grabbing"
            >
                {/* Zoom / recenter controls (always visible) */}
                <ZoomControls
                    zoomIn={zoomIn}
                    zoomOut={zoomOut}
                    recenter={recenter}
                />

                {/* Manual pan indicator */}
                {isUserControlled && (
                    <div className="absolute top-12 right-2 z-40 text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded-md">
                        View locked to manual pan/zoom
                    </div>
                )}

                {/* Camera transform layer */}
                <motion.div
                    className="absolute inset-0 origin-top-left"
                    animate={{
                        x: camera.x,
                        y: camera.y,
                        scale: camera.scale,
                    }}
                    transition={cameraTransition}
                >
                    {/* Empty board indicator */}
                    {isEmpty && (
                        <EmptyBoardIndicator
                            isMyTurn={isMyTurn}
                            prefersReducedMotion={prefersReducedMotion}
                        />
                    )}

                    {/* Placed tiles */}
                    {!isEmpty &&
                        board.tiles.map((tile) => {
                            const layout = layouts.get(tile.id);
                            if (!layout) return null;
                            return (
                                <PlacedTile
                                    key={tile.id}
                                    tile={tile}
                                    layout={layout}
                                    unitSize={unitSize}
                                    tileSize={tileSize}
                                    prefersReducedMotion={prefersReducedMotion}
                                    layoutIdPrefix={layoutIdPrefix}
                                />
                            );
                        })}

                    {/* Ghost preview — LEFT end */}
                    <AnimatePresence>
                        {showGhostPreviews &&
                            canPlaceLeft &&
                            leftGhostTile &&
                            (leftEndPos || isEmpty) && (
                                <GhostPreview
                                    key="ghost-left"
                                    tile={leftGhostTile}
                                    side="left"
                                    position={leftEndPos ?? emptyBoardGhostPos}
                                    unitSize={unitSize}
                                    tileSize={effectiveGhostSize}
                                    isSelected={selectedGhostSide === "left"}
                                    onSelect={() => onSelectGhostSide("left")}
                                    prefersReducedMotion={prefersReducedMotion}
                                />
                            )}
                    </AnimatePresence>

                    {/* Ghost preview — RIGHT end */}
                    <AnimatePresence>
                        {showGhostPreviews &&
                            canPlaceRight &&
                            rightGhostTile &&
                            (rightEndPos || isEmpty) && (
                                <GhostPreview
                                    key="ghost-right"
                                    tile={rightGhostTile}
                                    side="right"
                                    position={rightEndPos ?? emptyBoardGhostPos}
                                    unitSize={unitSize}
                                    tileSize={effectiveGhostSize}
                                    isSelected={selectedGhostSide === "right"}
                                    onSelect={() => onSelectGhostSide("right")}
                                    prefersReducedMotion={prefersReducedMotion}
                                />
                            )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
