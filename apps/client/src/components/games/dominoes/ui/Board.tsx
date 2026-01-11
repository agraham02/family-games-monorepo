"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BoardState, Tile as TileType } from "@/types";
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
    lastPlayedSide?: "left" | "right" | null;
    className?: string;
}

export default function Board({
    board,
    selectedTile,
    isMyTurn,
    canPlaceLeft,
    canPlaceRight,
    onPlaceTile,
    lastPlayedSide,
    className,
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
            <div className="relative bg-green-800 dark:bg-green-900 rounded-xl p-4 min-h-[140px] shadow-inner">
                {/* Left scroll arrow */}
                {showLeftArrow && (
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
                {showRightArrow && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 rounded-full shadow-md"
                        onClick={() => scrollToEnd("right")}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}

                {/* Place left button (when tile selected) */}
                {selectedTile && isMyTurn && canPlaceLeft && (
                    <Button
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow-lg animate-pulse"
                        size="sm"
                        onClick={() => onPlaceTile("left")}
                    >
                        Place Here
                    </Button>
                )}

                {/* Place right button (when tile selected) */}
                {selectedTile && isMyTurn && canPlaceRight && (
                    <Button
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow-lg animate-pulse"
                        size="sm"
                        onClick={() => onPlaceTile("right")}
                    >
                        Place Here
                    </Button>
                )}

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
