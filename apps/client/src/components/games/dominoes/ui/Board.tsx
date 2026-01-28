"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { BoardState, Tile as TileType } from "@shared/types";
import Tile from "./Tile";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TileSize, usePrefersReducedMotion } from "@/hooks";

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
    /** Tile size for responsive display */
    tileSize?: TileSize;
    /** Ghost tile size for placement previews (defaults to tileSize) */
    ghostTileSize?: TileSize;
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
    tileSize = "sm",
    ghostTileSize,
}: BoardProps) {
    // Use ghostTileSize if provided, otherwise fall back to tileSize
    const effectiveGhostSize = ghostTileSize ?? tileSize;
    const prefersReducedMotion = usePrefersReducedMotion();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    // Track previous end values for animation
    const [prevLeftEnd, setPrevLeftEnd] = useState<number | null>(null);
    const [prevRightEnd, setPrevRightEnd] = useState<number | null>(null);
    const [leftEndChanged, setLeftEndChanged] = useState(false);
    const [rightEndChanged, setRightEndChanged] = useState(false);

    // Detect end value changes for animation
    useEffect(() => {
        const newLeft = board.leftEnd?.value ?? null;
        const newRight = board.rightEnd?.value ?? null;

        if (prevLeftEnd !== null && prevLeftEnd !== newLeft) {
            setLeftEndChanged(true);
            setTimeout(() => setLeftEndChanged(false), 600);
        }
        if (prevRightEnd !== null && prevRightEnd !== newRight) {
            setRightEndChanged(true);
            setTimeout(() => setRightEndChanged(false), 600);
        }

        setPrevLeftEnd(newLeft);
        setPrevRightEnd(newRight);
    }, [
        board.leftEnd?.value,
        board.rightEnd?.value,
        prevLeftEnd,
        prevRightEnd,
    ]);

    // Check scroll position to show/hide arrows and fades
    function updateScrollIndicators() {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const hasOverflow = scrollWidth > clientWidth;

        setShowLeftArrow(scrollLeft > 20);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
        setShowLeftFade(hasOverflow && scrollLeft > 0);
        setShowRightFade(
            hasOverflow && scrollLeft < scrollWidth - clientWidth - 1,
        );
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
        updateScrollIndicators();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener("scroll", updateScrollIndicators);
            // Also update on resize
            const resizeObserver = new ResizeObserver(updateScrollIndicators);
            resizeObserver.observe(container);
            return () => {
                container.removeEventListener("scroll", updateScrollIndicators);
                resizeObserver.disconnect();
            };
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

    // Determine ghost tile size (use dedicated ghost size if provided)
    const ghostSize = effectiveGhostSize;

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
                            <motion.span
                                key={`left-${board.leftEnd.value}`}
                                initial={
                                    prefersReducedMotion
                                        ? false
                                        : {
                                              scale: 1.2,
                                              backgroundColor:
                                                  "rgb(251 191 36)",
                                          }
                                }
                                animate={{
                                    scale:
                                        leftEndChanged && !prefersReducedMotion
                                            ? [1, 1.3, 1]
                                            : 1,
                                    backgroundColor: "rgb(245 158 11 / 0.8)",
                                }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="bg-amber-500/80 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm"
                            >
                                {board.leftEnd.value}
                            </motion.span>
                            <span className="text-white/50">—</span>
                            <motion.span
                                key={`right-${board.rightEnd.value}`}
                                initial={
                                    prefersReducedMotion
                                        ? false
                                        : {
                                              scale: 1.2,
                                              backgroundColor:
                                                  "rgb(251 191 36)",
                                          }
                                }
                                animate={{
                                    scale:
                                        rightEndChanged && !prefersReducedMotion
                                            ? [1, 1.3, 1]
                                            : 1,
                                    backgroundColor: "rgb(245 158 11 / 0.8)",
                                }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="bg-amber-500/80 text-black font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm"
                            >
                                {board.rightEnd.value}
                            </motion.span>
                        </span>
                    </div>
                )}
            </div>

            {/* Board container */}
            <div className="relative bg-gradient-to-b from-green-700 to-green-800 dark:from-green-800 dark:to-green-900 rounded-xl p-3 sm:p-4 min-h-[100px] sm:min-h-[120px] shadow-inner border border-green-600/30">
                {/* Left gradient fade */}
                <div
                    className={cn(
                        "absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-green-700 dark:from-green-800 to-transparent z-10 pointer-events-none rounded-l-xl transition-opacity duration-200",
                        showLeftFade ? "opacity-100" : "opacity-0",
                    )}
                />

                {/* Right gradient fade */}
                <div
                    className={cn(
                        "absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-green-700 dark:from-green-800 to-transparent z-10 pointer-events-none rounded-r-xl transition-opacity duration-200",
                        showRightFade ? "opacity-100" : "opacity-0",
                    )}
                />

                {/* Left scroll arrow */}
                <AnimatePresence>
                    {showLeftArrow && !showGhostPreviews && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-lg h-8 w-8 sm:h-10 sm:w-10"
                                onClick={() => scrollToEnd("left")}
                            >
                                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Right scroll arrow */}
                <AnimatePresence>
                    {showRightArrow && !showGhostPreviews && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-lg h-8 w-8 sm:h-10 sm:w-10"
                                onClick={() => scrollToEnd("right")}
                            >
                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Ghost tile preview - LEFT */}
                <AnimatePresence>
                    {showGhostPreviews && canPlaceLeft && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: 20 }}
                            onClick={() => onPlaceTile("left")}
                            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 cursor-pointer group"
                        >
                            <motion.div
                                className="relative"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                {/* Ghost tile with reduced opacity */}
                                <div className="opacity-50 group-hover:opacity-90 transition-opacity duration-200">
                                    <Tile
                                        tile={selectedTile}
                                        isHorizontal={true}
                                        size={ghostSize}
                                        highlightDouble={false}
                                    />
                                </div>
                                {/* Pulsing ring */}
                                <motion.div
                                    className="absolute inset-0 rounded-lg ring-2 ring-yellow-400"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                    }}
                                />
                                {/* Label */}
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full">
                                    Tap to place
                                </span>
                            </motion.div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Ghost tile preview - RIGHT */}
                <AnimatePresence>
                    {showGhostPreviews && canPlaceRight && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8, x: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: -20 }}
                            onClick={() => onPlaceTile("right")}
                            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 cursor-pointer group"
                        >
                            <motion.div
                                className="relative"
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                {/* Ghost tile with reduced opacity */}
                                <div className="opacity-50 group-hover:opacity-90 transition-opacity duration-200">
                                    <Tile
                                        tile={selectedTile}
                                        isHorizontal={true}
                                        size={ghostSize}
                                        highlightDouble={false}
                                    />
                                </div>
                                {/* Pulsing ring */}
                                <motion.div
                                    className="absolute inset-0 rounded-lg ring-2 ring-yellow-400"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                    }}
                                />
                                {/* Label */}
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap bg-black/40 px-2 py-0.5 rounded-full">
                                    Tap to place
                                </span>
                            </motion.div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Scrollable tiles container */}
                <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto scroll-smooth scrollbar-thin scrollbar-thumb-green-600/50 scrollbar-track-transparent hover:scrollbar-thumb-green-600"
                >
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-max px-8 sm:px-12 py-2">
                        {isEmpty ? (
                            <motion.div
                                className="text-green-200/80 italic py-6 sm:py-8 text-center w-full flex flex-col items-center gap-2"
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
                                <span className="text-sm">
                                    {isMyTurn
                                        ? "Select a tile from your hand to start"
                                        : "Waiting for first tile..."}
                                </span>
                            </motion.div>
                        ) : (
                            board.tiles.map((tile) => (
                                <motion.div
                                    key={tile.id}
                                    className="shrink-0"
                                    initial={{ opacity: 0, scale: 0.8 }}
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
                                        perpendicularDoubles={true}
                                        layoutId={
                                            layoutIdPrefix
                                                ? `${layoutIdPrefix}-tile-${tile.id}`
                                                : undefined
                                        }
                                    />
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
