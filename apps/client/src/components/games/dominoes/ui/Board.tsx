"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { BoardState, Tile as TileType } from "@shared/types";
import Tile from "./Tile";

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

// Number of tiles per row before snaking to the next row.
// At sm size (56px wide + 4px gap = 60px each) and ~720px board,
// roughly 12 tiles fit per row.
const TILES_PER_ROW = 12;

/**
 * Split tiles into rows for the snaking layout.
 * Odd-indexed rows are rendered right-to-left to create the U-shaped snake.
 */
function buildSnakeRows(tiles: TileType[]): TileType[][] {
    const rows: TileType[][] = [];
    for (let i = 0; i < tiles.length; i += TILES_PER_ROW) {
        rows.push(tiles.slice(i, i + TILES_PER_ROW));
    }
    return rows;
}

export default function Board({
    board,
    selectedTile,
    isMyTurn,
    canPlaceLeft,
    canPlaceRight,
    onPlaceTile,
    className,
}: BoardProps) {
    const isEmpty = board.tiles.length === 0;
    const snakeRows = buildSnakeRows(board.tiles);
    const isSnaking = snakeRows.length > 1;

    return (
        <div className={cn("relative w-full", className)}>
            {/* Board header: tile count + end pip values */}
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-zinc-600 dark:text-zinc-400">
                <span>
                    Board ({board.tiles.length} tile
                    {board.tiles.length !== 1 ? "s" : ""})
                </span>
                {board.leftEnd && board.rightEnd && (
                    <span className="text-xs">
                        Ends:{" "}
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {board.leftEnd.value}
                        </span>{" "}
                        —{" "}
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {board.rightEnd.value}
                        </span>
                    </span>
                )}
            </div>

            {/* Placement action buttons — shown above the board when a tile is selected */}
            {selectedTile && isMyTurn && !isEmpty && (
                <div className="mb-2 flex items-center justify-between gap-2">
                    {canPlaceLeft ? (
                        <button
                            type="button"
                            onClick={() => onPlaceTile("left")}
                            className="flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-yellow-900 shadow-md transition-colors hover:bg-yellow-500 animate-pulse"
                        >
                            ← Place Left ({board.leftEnd?.value})
                        </button>
                    ) : (
                        <div />
                    )}
                    {canPlaceRight ? (
                        <button
                            type="button"
                            onClick={() => onPlaceTile("right")}
                            className="flex items-center gap-1 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-yellow-900 shadow-md transition-colors hover:bg-yellow-500 animate-pulse"
                        >
                            Place Right ({board.rightEnd?.value}) →
                        </button>
                    ) : (
                        <div />
                    )}
                </div>
            )}

            {/* Board surface */}
            <div className="bg-green-800 dark:bg-green-900 rounded-xl p-3 min-h-[80px] shadow-inner overflow-hidden">
                {isEmpty ? (
                    <div className="flex items-center justify-center min-h-[60px]">
                        {selectedTile && isMyTurn ? (
                            <button
                                type="button"
                                onClick={() => onPlaceTile("left")}
                                className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-900 shadow-md hover:bg-yellow-500 animate-pulse"
                            >
                                Place First Tile
                            </button>
                        ) : (
                            <p className="text-green-300 italic text-sm text-center">
                                {isMyTurn
                                    ? "Select a tile to start the game"
                                    : "Waiting for first tile…"}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {snakeRows.map((rowTiles, rowIdx) => {
                            // Odd rows run right-to-left to create the snake effect
                            const isReversed = isSnaking && rowIdx % 2 === 1;

                            return (
                                <div
                                    key={rowIdx}
                                    className={cn(
                                        "flex items-center gap-1",
                                        isReversed && "flex-row-reverse"
                                    )}
                                >
                                    {rowTiles.map((tile) => (
                                        <div key={tile.id} className="shrink-0">
                                            <Tile
                                                tile={tile}
                                                isHorizontal={true}
                                                size="sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
