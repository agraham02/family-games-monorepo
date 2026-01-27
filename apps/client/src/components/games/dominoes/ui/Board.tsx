"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { BoardState, Tile as TileType } from "@shared/types";
import Tile from "./Tile";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    /** Prefix for layoutId to enable shared animations with TileHand */
    layoutIdPrefix?: string;
}

export default function Board({
    board,
    selectedTile,
    isMyTurn,
    canPlaceLeft,
    canPlaceRight,
    onPlaceTile,
    onCancelSelection,
    lastPlayedSide,
    className,
    layoutIdPrefix,
}: BoardProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    // Check scroll position to show/hide arrows
    function updateArrowVisibility() {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }

    // Auto-scroll to the side where the last tile was played
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !lastPlayedSide) return;

        // Wait for DOM update
        setTimeout(() => {
            if (lastPlayedSide === "left") {
                container.scrollTo({ left: 0, behavior: "smooth" });
            } else {
                container.scrollTo({
                    left: container.scrollWidth,
                    behavior: "smooth",
                });
            }
        }, 100);
    }, [board.tiles.length, lastPlayedSide]);

    // Update arrows on mount and scroll
    useEffect(() => {
        updateArrowVisibility();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener("scroll", updateArrowVisibility);
            return () =>
                container.removeEventListener("scroll", updateArrowVisibility);
        }
    }, [board.tiles.length]);

    function scrollToEnd(side: "left" | "right") {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (side === "left") {
            container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
            container.scrollTo({
                left: container.scrollWidth,
                behavior: "smooth",
            });
        }
    }

    const isEmpty = board.tiles.length === 0;
    const showGhostPreviews = selectedTile && isMyTurn && !isEmpty;

    return (
        <div className={cn("relative w-full", className)}>
            {/* Board label */}
            <div className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                <span>Board ({board.tiles.length} tiles)</span>
                {board.leftEnd && board.rightEnd && (
                    <span className="text-xs">
                        Ends: {board.leftEnd.value} — {board.rightEnd.value}
                    </span>
                )}
            </div>

            {/* Board container */}
            <div className="relative bg-green-800 dark:bg-green-900 rounded-xl p-4 min-h-35 shadow-inner">
                {/* Left scroll arrow */}
                {showLeftArrow && !showGhostPreviews && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-md"
                        onClick={() => scrollToEnd("left")}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}

                {/* Right scroll arrow */}
                {showRightArrow && !showGhostPreviews && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-md"
                        onClick={() => scrollToEnd("right")}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}

                {/* Ghost tile preview - LEFT */}
                <AnimatePresence>
                    {showGhostPreviews && canPlaceLeft && (
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onClick={() => onPlaceTile("left")}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 cursor-pointer group"
                        >
                            <div className="relative">
                                {/* Ghost tile with reduced opacity */}
                                <div className="opacity-50 group-hover:opacity-80 transition-opacity">
                                    <Tile
                                        tile={selectedTile}
                                        isHorizontal={true}
                                        size="sm"
                                    />
                                </div>
                                {/* Pulsing ring */}
                                <div className="absolute inset-0 rounded-lg ring-2 ring-yellow-400 animate-pulse" />
                                {/* Label */}
                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-yellow-300 whitespace-nowrap">
                                    Place Left
                                </span>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Ghost tile preview - RIGHT */}
                <AnimatePresence>
                    {showGhostPreviews && canPlaceRight && (
                        <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onClick={() => onPlaceTile("right")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 cursor-pointer group"
                        >
                            <div className="relative">
                                {/* Ghost tile with reduced opacity */}
                                <div className="opacity-50 group-hover:opacity-80 transition-opacity">
                                    <Tile
                                        tile={selectedTile}
                                        isHorizontal={true}
                                        size="sm"
                                    />
                                </div>
                                {/* Pulsing ring */}
                                <div className="absolute inset-0 rounded-lg ring-2 ring-yellow-400 animate-pulse" />
                                {/* Label */}
                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium text-yellow-300 whitespace-nowrap">
                                    Place Right
                                </span>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Scrollable tiles container */}
                <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-green-600 scrollbar-track-green-900"
                >
                    <div className="flex items-center gap-1 min-w-max px-12">
                        {isEmpty ? (
                            <div className="text-green-300 italic py-8 text-center w-full">
                                {isMyTurn
                                    ? "Place the first tile to start the game"
                                    : "Waiting for first tile..."}
                            </div>
                        ) : (
                            board.tiles.map((tile) => (
                                <div key={tile.id} className="snap-center">
                                    <Tile
                                        tile={tile}
                                        isHorizontal={true}
                                        size="sm"
                                        layoutId={
                                            layoutIdPrefix
                                                ? `${layoutIdPrefix}-tile-${tile.id}`
                                                : undefined
                                        }
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
