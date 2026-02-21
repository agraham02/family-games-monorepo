"use client";
import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { BoardState, Tile as TileType } from "@shared/types";
import Tile from "./Tile";
import { Button } from "@/components/ui/button";
import { Focus } from "lucide-react";
import { TileSize, usePrefersReducedMotion } from "@/hooks";
import { useDominoLayout } from "@/hooks/useDominoLayout";
import { useDominoCamera } from "@/hooks/useDominoCamera";
import { useContainerDimensions } from "@/hooks/useContainerDimensions";

interface BoardProps {
    board: BoardState;
    selectedTile: TileType | null;
    isMyTurn: boolean;
    canPlaceLeft: boolean;
    canPlaceRight: boolean;
    onPlaceTile: (side: "left" | "right") => void;
    onCancelSelection?: () => void;
    lastPlayedSide?: "left" | "right" | null;
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

export default function Board({
    board,
    selectedTile,
    isMyTurn,
    canPlaceLeft,
    canPlaceRight,
    onPlaceTile,
    lastPlayedSide,
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

    const { layouts, bounds, leftEndPos, rightEndPos } = useDominoLayout(
        board.tiles,
    );

    const activePoints = useMemo(() => {
        const points = [];
        if (selectedTile && isMyTurn) {
            if (canPlaceLeft && leftEndPos)
                points.push({ x: leftEndPos.x, y: leftEndPos.y });
            if (canPlaceRight && rightEndPos)
                points.push({ x: rightEndPos.x, y: rightEndPos.y });
        } else if (board.tiles.length > 0) {
            // Focus on the last played tile if we know the side, otherwise center
            if (lastPlayedSide === "left" && leftEndPos) {
                points.push({ x: leftEndPos.x, y: leftEndPos.y });
            } else if (lastPlayedSide === "right" && rightEndPos) {
                points.push({ x: rightEndPos.x, y: rightEndPos.y });
            }
        }
        return points;
    }, [
        selectedTile,
        isMyTurn,
        canPlaceLeft,
        canPlaceRight,
        leftEndPos,
        rightEndPos,
        board.tiles.length,
        lastPlayedSide,
    ]);

    const { camera, isManualPan, handlePan, handleZoom, recenter } =
        useDominoCamera({
            containerWidth,
            containerHeight,
            logicalBounds: bounds,
            activePoints,
            unitSize,
            padding: 60,
        });

    const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
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
    const showGhostPreviews = selectedTile && isMyTurn && !isEmpty;

    return (
        <div className={cn("relative w-full", className)}>
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
                className="relative bg-linear-to-b from-green-700 to-green-800 dark:from-green-800 dark:to-green-900 rounded-xl min-h-50 sm:min-h-75 shadow-inner border border-green-600/30 overflow-hidden touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {isManualPan && (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 z-40 bg-black/50 hover:bg-black/70 text-white border-none"
                        onClick={recenter}
                    >
                        <Focus className="w-4 h-4 mr-2" />
                        Recenter
                    </Button>
                )}

                <motion.div
                    className="absolute inset-0 origin-top-left"
                    animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
                    transition={
                        prefersReducedMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 300, damping: 30 }
                    }
                >
                    {isEmpty ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-green-200/80 italic text-center flex flex-col items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-400/50 animate-pulse" />
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

                                // Calculate physical position
                                // The layout x,y is the center of the tile.
                                // We need to position the top-left corner of the Tile component.
                                // A Tile component is always rendered vertically by default, unless isHorizontal is true.
                                // Wait, Tile.tsx has `isHorizontal` prop.
                                // If we pass `isHorizontal={true}`, its width is 2*unitSize, height is unitSize.
                                // If we pass `isHorizontal={false}`, its width is unitSize, height is 2*unitSize.
                                // Let's always render it horizontally and use CSS rotation, or use the prop.
                                // Actually, Tile.tsx handles `isHorizontal` and `perpendicularDoubles`.
                                // But since we are doing 2D layout, we should just use CSS rotation on a wrapper div,
                                // and always render the Tile in a fixed orientation (e.g. horizontal).
                                // Wait, if we render it horizontal, its center is at (width/2, height/2).
                                // So top-left is (x * unitSize - width/2, y * unitSize - height/2).

                                const width = 2 * unitSize;
                                const height = unitSize;
                                const px = layout.x * unitSize - width / 2;
                                const py = layout.y * unitSize - height / 2;

                                return (
                                    <motion.div
                                        key={tile.id}
                                        className="absolute"
                                        style={{
                                            left: px,
                                            top: py,
                                            width,
                                            height,
                                            rotate: layout.rotation,
                                        }}
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 25,
                                        }}
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
                                    leftEndPos && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="absolute z-30 cursor-pointer group"
                                            style={{
                                                left:
                                                    leftEndPos.x * unitSize -
                                                    (2 * unitSize) / 2,
                                                top:
                                                    leftEndPos.y * unitSize -
                                                    unitSize / 2,
                                                width: 2 * unitSize,
                                                height: unitSize,
                                                rotate:
                                                    leftEndPos.direction ===
                                                        "UP" ||
                                                    leftEndPos.direction ===
                                                        "DOWN"
                                                        ? 90
                                                        : 0,
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPlaceTile("left");
                                            }}
                                        >
                                            <div className="relative w-full h-full">
                                                <div className="opacity-50 group-hover:opacity-90 transition-opacity duration-200 w-full h-full">
                                                    <Tile
                                                        tile={selectedTile}
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
                                                    animate={{
                                                        opacity: [0.5, 1, 0.5],
                                                    }}
                                                    transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                    }}
                                                />
                                                <span
                                                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full"
                                                    style={{
                                                        rotate:
                                                            leftEndPos.direction ===
                                                                "UP" ||
                                                            leftEndPos.direction ===
                                                                "DOWN"
                                                                ? "-90deg"
                                                                : "0deg",
                                                    }}
                                                >
                                                    Tap to place
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}
                            </AnimatePresence>

                            {/* Ghost tile preview - RIGHT */}
                            <AnimatePresence>
                                {showGhostPreviews &&
                                    canPlaceRight &&
                                    rightEndPos && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="absolute z-30 cursor-pointer group"
                                            style={{
                                                left:
                                                    rightEndPos.x * unitSize -
                                                    (2 * unitSize) / 2,
                                                top:
                                                    rightEndPos.y * unitSize -
                                                    unitSize / 2,
                                                width: 2 * unitSize,
                                                height: unitSize,
                                                rotate:
                                                    rightEndPos.direction ===
                                                        "UP" ||
                                                    rightEndPos.direction ===
                                                        "DOWN"
                                                        ? 90
                                                        : 0,
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPlaceTile("right");
                                            }}
                                        >
                                            <div className="relative w-full h-full">
                                                <div className="opacity-50 group-hover:opacity-90 transition-opacity duration-200 w-full h-full">
                                                    <Tile
                                                        tile={selectedTile}
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
                                                    animate={{
                                                        opacity: [0.5, 1, 0.5],
                                                    }}
                                                    transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                    }}
                                                />
                                                <span
                                                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full"
                                                    style={{
                                                        rotate:
                                                            rightEndPos.direction ===
                                                                "UP" ||
                                                            rightEndPos.direction ===
                                                                "DOWN"
                                                                ? "-90deg"
                                                                : "0deg",
                                                    }}
                                                >
                                                    Tap to place
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
