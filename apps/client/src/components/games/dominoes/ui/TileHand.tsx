"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Tile as TileType, BoardState } from "@shared/types";
import Tile from "./Tile";
import { TileSize } from "@/hooks";

interface TileHandProps {
    tiles: TileType[];
    board: BoardState;
    selectedTile: TileType | null;
    isMyTurn: boolean;
    onTileSelect: (tile: TileType | null) => void;
    className?: string;
    showHints?: boolean;
    /** Prefix for layoutId to enable shared animations with Board */
    layoutIdPrefix?: string;
    /** Tile size for responsive display */
    tileSize?: TileSize;
}

/**
 * Check if a tile can be played on either end of the board
 */
function canPlayTile(tile: TileType, board: BoardState): boolean {
    // If board is empty, any tile can be played
    if (board.tiles.length === 0) {
        return true;
    }

    const leftValue = board.leftEnd?.value;
    const rightValue = board.rightEnd?.value;

    // Tile can be played if either side matches either board end
    return (
        tile.left === leftValue ||
        tile.right === leftValue ||
        tile.left === rightValue ||
        tile.right === rightValue
    );
}

export default function TileHand({
    tiles,
    board,
    selectedTile,
    isMyTurn,
    onTileSelect,
    className,
    showHints = false,
    layoutIdPrefix,
    tileSize = "md",
}: TileHandProps) {
    const playableTiles = tiles.filter((t) => canPlayTile(t, board));
    const hasPlayableTile = playableTiles.length > 0;

    return (
        <div className={cn("w-full", className)}>
            {/* Hand label with count and status */}
            <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-medium text-white/70 flex items-center gap-2">
                    Your Hand
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                        {tiles.length} tiles
                    </span>
                </span>
                {isMyTurn && (
                    <span
                        className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            hasPlayableTile
                                ? "bg-green-500/20 text-green-300"
                                : "bg-red-500/20 text-red-300",
                        )}
                    >
                        {hasPlayableTile
                            ? `${playableTiles.length} playable`
                            : "Must pass"}
                    </span>
                )}
            </div>

            {/* Tiles container with horizontal scroll */}
            <div
                className={cn(
                    "flex gap-1 sm:gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30 transition-opacity duration-300",
                    !isMyTurn && "opacity-50",
                )}
            >
                {tiles.map((tile, index) => {
                    // Only check playability when hints are enabled
                    const isPlayable = !showHints || canPlayTile(tile, board);
                    const isSelected = selectedTile?.id === tile.id;

                    return (
                        <motion.div
                            key={tile.id}
                            className="shrink-0"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <Tile
                                tile={tile}
                                isSelected={isSelected}
                                isPlayable={isMyTurn && isPlayable}
                                size={tileSize}
                                layoutId={
                                    layoutIdPrefix
                                        ? `${layoutIdPrefix}-tile-${tile.id}`
                                        : undefined
                                }
                                onClick={
                                    isMyTurn
                                        ? () =>
                                              onTileSelect(
                                                  isSelected ? null : tile,
                                              )
                                        : undefined
                                }
                            />
                        </motion.div>
                    );
                })}

                {tiles.length === 0 && (
                    <div className="text-white/50 italic py-4 text-sm">
                        No tiles in hand
                    </div>
                )}
            </div>

            {/* Hint text */}
            {isMyTurn && (
                <motion.div
                    className="mt-2 text-xs text-white/50 px-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {hasPlayableTile
                        ? selectedTile
                            ? "Now tap where to place it on the board"
                            : "Tap a tile to select it"
                        : "No playable tiles — use the Pass button"}
                </motion.div>
            )}
        </div>
    );
}
