"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Tile as TileType, BoardState } from "@shared/types";
import Tile from "./Tile";

interface TileHandProps {
    tiles: TileType[];
    board: BoardState;
    selectedTile: TileType | null;
    isMyTurn: boolean;
    onTileSelect: (tile: TileType | null) => void;
    className?: string;
    showHints?: boolean;
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
}: TileHandProps) {
    return (
        <div className={cn("w-full", className)}>
            {/* Hand label */}
            <div className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Your Hand ({tiles.length} tiles)
            </div>

            {/* Tiles container with horizontal scroll on mobile */}
            {/* Dim tiles when not player's turn */}
            <div
                className={cn(
                    "flex gap-2 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 transition-opacity duration-300",
                    !isMyTurn && "opacity-60 pointer-events-none"
                )}
            >
                {tiles.map((tile) => {
                    // Only check playability when hints are enabled
                    const playable =
                        isMyTurn && (!showHints || canPlayTile(tile, board));
                    const isSelected = selectedTile?.id === tile.id;

                    return (
                        <div key={tile.id} className="snap-start shrink-0">
                            <Tile
                                tile={tile}
                                isSelected={isSelected}
                                isPlayable={playable}
                                size="md"
                                onClick={
                                    isMyTurn
                                        ? () =>
                                              onTileSelect(
                                                  isSelected ? null : tile
                                              )
                                        : undefined
                                }
                            />
                        </div>
                    );
                })}

                {tiles.length === 0 && (
                    <div className="text-zinc-500 dark:text-zinc-400 italic py-4">
                        No tiles in hand
                    </div>
                )}
            </div>

            {/* Playable tiles hint */}
            {isMyTurn && (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {tiles.filter((t) => canPlayTile(t, board)).length > 0
                        ? "Tap a tile to select, then choose where to place it"
                        : "No playable tiles — you must pass"}
                </div>
            )}
        </div>
    );
}
