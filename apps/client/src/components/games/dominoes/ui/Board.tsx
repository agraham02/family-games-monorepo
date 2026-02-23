"use client";
import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { BoardState, Tile as TileType } from "@shared/types";
import Tile from "./Tile";
import { Button } from "@/components/ui/button";
import { Focus, Minus, Plus } from "lucide-react";
import { TileSize, usePrefersReducedMotion } from "@/hooks";
import { useDominoLayout } from "@/hooks/useDominoLayout";
import { useDominoCamera } from "@/hooks/useDominoCamera";
import { useContainerDimensions } from "@/hooks/useContainerDimensions";

interface BoardProps {
    board: BoardState;
    layoutSeed?: string;
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

const TILE_UNIT_SIZES = {
    xs: 20,
    sm: 28,
    md: 40,
    lg: 56,
};

function orientTileForPlacement(
    tile: TileType,
    endValue: number | undefined,
): TileType {
    if (endValue === undefined) return tile;

    if (tile.left === endValue) {
        return tile;
    }

    if (tile.right === endValue) {
        return {
            ...tile,
            left: tile.right,
            right: tile.left,
        };
    }

    return tile;
}

export default function Board({
    board,
    layoutSeed,
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
    const ghostUnitSize = TILE_UNIT_SIZES[effectiveGhostSize];
    const prefersReducedMotion = usePrefersReducedMotion();
    const containerRef = useRef<HTMLDivElement>(null);
    const { width: containerWidth, height: containerHeight } =
        useContainerDimensions(containerRef);

    const unitSize = TILE_UNIT_SIZES[tileSize];
    const serverLayouts = board.layout?.tileLayouts;
    const hasServerLayout =
        !!serverLayouts &&
        Object.keys(serverLayouts).length === board.tiles.length &&
        !!board.layout?.bounds;

    const fallbackLayout = useDominoLayout(
        hasServerLayout ? [] : board.tiles,
        layoutSeed,
    );

    const layouts = hasServerLayout
        ? new Map(
              Object.values(serverLayouts ?? {}).map((layout) => [
                  layout.id,
                  layout,
              ]),
          )
        : fallbackLayout.layouts;

    const bounds = board.layout?.bounds ?? fallbackLayout.bounds;
    const leftEndPos = board.layout?.leftEndPos ?? fallbackLayout.leftEndPos;
    const rightEndPos = board.layout?.rightEndPos ?? fallbackLayout.rightEndPos;

    const {
        camera,
        isManualPan,
        handlePan,
        handleZoom,
        zoomIn,
        zoomOut,
        recenter,
    } = useDominoCamera({
        containerWidth,
        containerHeight,
        logicalBounds: bounds,
        activePoints: [], // Always auto-scale to fit the entire board
        unitSize: 2 * unitSize,
        padding: 60,
    });

    const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest("[data-board-control='true']")) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        if (!lastPointerRef.current) return;

        const dx = e.clientX - lastPointerRef.current.x;
        const dy = e.clientY - lastPointerRef.current.y;
        handlePan(dx, dy);
        lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        lastPointerRef.current = null;
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
            const rect = el.getBoundingClientRect();
            const centerX = e.clientX - rect.left;
            const centerY = e.clientY - rect.top;
            handleZoom(scaleDelta, centerX, centerY);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [handleZoom]);

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

    const getGhostRotation = (direction: string, isDouble: boolean) => {
        if (direction === "RIGHT") return isDouble ? 90 : 0;
        if (direction === "LEFT") return isDouble ? 90 : 180;
        if (direction === "DOWN") return isDouble ? 0 : 90;
        if (direction === "UP") return isDouble ? 0 : 270;
        return 0;
    };

    return (
        <div className={cn("relative w-full flex flex-col", className)}>
            {/* Board label with end values */}
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

            {/* Board container */}
            <div
                ref={containerRef}
                className="relative flex-1 w-full overflow-hidden touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
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

                {isManualPan && (
                    <div className="absolute top-12 right-2 z-40 text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded-md">
                        View locked to manual pan/zoom
                    </div>
                )}

                <motion.div
                    className="absolute inset-0 origin-top-left"
                    animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : isManualPan
                              ? { duration: 0 }
                              : {
                                    type: "spring",
                                    stiffness: 220,
                                    damping: 34,
                                }
                    }
                >
                    {isEmpty ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-green-200/80 italic text-center flex flex-col items-center gap-2">
                                <div
                                    className={cn(
                                        "w-3 h-3 rounded-full bg-green-400/50",
                                        !prefersReducedMotion &&
                                            "animate-pulse",
                                    )}
                                />
                                <span className="text-sm">
                                    {isMyTurn
                                        ? "Select a tile from your hand to start"
                                        : "Waiting for first tile..."}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {board.tiles.map((tile) => {
                                const layout = layouts.get(tile.id);
                                if (!layout) return null;

                                const width = 2 * unitSize;
                                const height = unitSize;
                                const logicalUnit = 2 * unitSize;
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
                                                : { opacity: 0, scale: 0.5 }
                                        }
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={
                                            prefersReducedMotion
                                                ? { duration: 0 }
                                                : {
                                                      type: "spring",
                                                      stiffness: 300,
                                                      damping: 25,
                                                  }
                                        }
                                    >
                                        <Tile
                                            tile={tile}
                                            isHorizontal={true}
                                            size={tileSize}
                                            highlightDouble={false}
                                            perpendicularDoubles={false} // We handle rotation ourselves
                                            layoutId={
                                                layoutIdPrefix
                                                    ? `${layoutIdPrefix}-tile-${tile.id}`
                                                    : undefined
                                            }
                                        />
                                    </motion.div>
                                );
                            })}

                            {/* Ghost tile preview - LEFT */}
                            <AnimatePresence>
                                {showGhostPreviews &&
                                    canPlaceLeft &&
                                    leftGhostTile &&
                                    (leftEndPos || isEmpty) && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="absolute z-30 cursor-pointer group"
                                            style={{
                                                left:
                                                    (
                                                        leftEndPos ??
                                                        emptyBoardGhostPos
                                                    ).x *
                                                        (2 * ghostUnitSize) -
                                                    ghostUnitSize,
                                                top:
                                                    (
                                                        leftEndPos ??
                                                        emptyBoardGhostPos
                                                    ).y *
                                                        (2 * ghostUnitSize) -
                                                    ghostUnitSize / 2,
                                                width: 2 * ghostUnitSize,
                                                height: ghostUnitSize,
                                                rotate: getGhostRotation(
                                                    (
                                                        leftEndPos ??
                                                        emptyBoardGhostPos
                                                    ).direction,
                                                    leftGhostTile.left ===
                                                        leftGhostTile.right,
                                                ),
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectGhostSide("left");
                                            }}
                                        >
                                            <div className="relative w-full h-full">
                                                <div className="opacity-50 group-hover:opacity-90 transition-opacity duration-200 w-full h-full">
                                                    <Tile
                                                        tile={leftGhostTile}
                                                        isHorizontal={true}
                                                        size={
                                                            effectiveGhostSize
                                                        }
                                                        highlightDouble={false}
                                                        perpendicularDoubles={
                                                            false
                                                        }
                                                    />
                                                </div>
                                                <motion.div
                                                    className="absolute inset-0 rounded-lg ring-2 ring-yellow-400"
                                                    animate={
                                                        prefersReducedMotion
                                                            ? {
                                                                  opacity:
                                                                      selectedGhostSide ===
                                                                      "left"
                                                                          ? 1
                                                                          : 0.7,
                                                              }
                                                            : {
                                                                  opacity:
                                                                      selectedGhostSide ===
                                                                      "left"
                                                                          ? [
                                                                                0.8,
                                                                                1,
                                                                                0.8,
                                                                            ]
                                                                          : [
                                                                                0.5,
                                                                                1,
                                                                                0.5,
                                                                            ],
                                                              }
                                                    }
                                                    transition={
                                                        prefersReducedMotion
                                                            ? { duration: 0 }
                                                            : {
                                                                  duration: 1.5,
                                                                  repeat: Infinity,
                                                              }
                                                    }
                                                />
                                                <span
                                                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full"
                                                    style={{
                                                        rotate: `-${getGhostRotation(
                                                            (
                                                                leftEndPos ??
                                                                emptyBoardGhostPos
                                                            ).direction,
                                                            leftGhostTile.left ===
                                                                leftGhostTile.right,
                                                        )}deg`,
                                                    }}
                                                >
                                                    {selectedGhostSide ===
                                                    "left"
                                                        ? "End selected"
                                                        : "Tap to choose end"}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}
                            </AnimatePresence>

                            {/* Ghost tile preview - RIGHT */}
                            <AnimatePresence>
                                {showGhostPreviews &&
                                    canPlaceRight &&
                                    rightGhostTile &&
                                    rightEndPos && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="absolute z-30 cursor-pointer group"
                                            style={{
                                                left:
                                                    rightEndPos.x *
                                                        (2 * ghostUnitSize) -
                                                    ghostUnitSize,
                                                top:
                                                    rightEndPos.y *
                                                        (2 * ghostUnitSize) -
                                                    ghostUnitSize / 2,
                                                width: 2 * ghostUnitSize,
                                                height: ghostUnitSize,
                                                rotate: getGhostRotation(
                                                    rightEndPos.direction,
                                                    rightGhostTile.left ===
                                                        rightGhostTile.right,
                                                ),
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectGhostSide("right");
                                            }}
                                        >
                                            <div className="relative w-full h-full">
                                                <div className="opacity-50 group-hover:opacity-90 transition-opacity duration-200 w-full h-full">
                                                    <Tile
                                                        tile={rightGhostTile}
                                                        isHorizontal={true}
                                                        size={
                                                            effectiveGhostSize
                                                        }
                                                        highlightDouble={false}
                                                        perpendicularDoubles={
                                                            false
                                                        }
                                                    />
                                                </div>
                                                <motion.div
                                                    className="absolute inset-0 rounded-lg ring-2 ring-yellow-400"
                                                    animate={
                                                        prefersReducedMotion
                                                            ? {
                                                                  opacity:
                                                                      selectedGhostSide ===
                                                                      "right"
                                                                          ? 1
                                                                          : 0.7,
                                                              }
                                                            : {
                                                                  opacity:
                                                                      selectedGhostSide ===
                                                                      "right"
                                                                          ? [
                                                                                0.8,
                                                                                1,
                                                                                0.8,
                                                                            ]
                                                                          : [
                                                                                0.5,
                                                                                1,
                                                                                0.5,
                                                                            ],
                                                              }
                                                    }
                                                    transition={
                                                        prefersReducedMotion
                                                            ? { duration: 0 }
                                                            : {
                                                                  duration: 1.5,
                                                                  repeat: Infinity,
                                                              }
                                                    }
                                                />
                                                <span
                                                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full"
                                                    style={{
                                                        rotate: `-${getGhostRotation(
                                                            rightEndPos.direction,
                                                            rightGhostTile.left ===
                                                                rightGhostTile.right,
                                                        )}deg`,
                                                    }}
                                                >
                                                    {selectedGhostSide ===
                                                    "right"
                                                        ? "End selected"
                                                        : "Tap to choose end"}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}
                            </AnimatePresence>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
