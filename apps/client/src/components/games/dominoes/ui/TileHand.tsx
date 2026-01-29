"use client";

/**
 * TileHand - Player's hand of domino tiles.
 *
 * Displays tiles in a horizontal scrollable row with playability hints
 * and selection state.
 */

import React, { useCallback, useMemo } from "react";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { Tile as TileType, BoardState } from "@family-games/shared";
import { cn } from "@/lib/utils";
import { TileSize } from "@/hooks";
import DominoTile from "./DominoTile";

interface TileHandProps {
    /** Array of tiles in player's hand */
    tiles: TileType[];
    /** Current board state (for determining playability) */
    board: BoardState;
    /** Currently selected tile */
    selectedTile: TileType | null;
    /** Whether it's this player's turn */
    isMyTurn: boolean;
    /** Callback when tile is selected/deselected */
    onTileSelect: (tile: TileType | null) => void;
    /** Whether to show playability hints */
    showHints?: boolean;
    /** Tile size variant */
    tileSize?: TileSize;
    /** Layout ID prefix for animations */
    layoutIdPrefix?: string;
}

/**
 * Check if a tile can be played on a specific side of the board.
 */
function canPlaceTileOnSide(
    tile: TileType,
    board: BoardState,
    side: "left" | "right",
): boolean {
    if (board.tiles.length === 0) {
        return true;
    }

    const end = side === "left" ? board.leftEnd : board.rightEnd;
    if (!end) return false;

    return tile.left === end.value || tile.right === end.value;
}

/**
 * Check if a tile can be played on either end.
 */
function canPlayTile(tile: TileType, board: BoardState): boolean {
    return (
        canPlaceTileOnSide(tile, board, "left") ||
        canPlaceTileOnSide(tile, board, "right")
    );
}

/**
 * TileHand Component
 *
 * Renders the player's hand as a horizontal row of clickable tiles.
 */
function TileHand({
    tiles,
    board,
    selectedTile,
    isMyTurn,
    onTileSelect,
    showHints = true,
    tileSize = "md",
    layoutIdPrefix = "hand",
}: TileHandProps) {
    // Calculate playability for each tile
    const tilePlayability = useMemo(() => {
        return tiles.map((tile) => ({
            tile,
            isPlayable: canPlayTile(tile, board),
        }));
    }, [tiles, board]);

    // Handle tile click
    const handleTileClick = useCallback(
        (tile: TileType) => {
            if (!isMyTurn) return;

            // Toggle selection if clicking the same tile
            if (selectedTile?.id === tile.id) {
                onTileSelect(null);
            } else {
                onTileSelect(tile);
            }
        },
        [isMyTurn, selectedTile, onTileSelect],
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, tile: TileType) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTileClick(tile);
            }
        },
        [handleTileClick],
    );

    if (tiles.length === 0) {
        return (
            <div className="flex items-center justify-center py-4">
                <span className="text-white/50 text-sm">No tiles in hand</span>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <LayoutGroup id={layoutIdPrefix}>
                <motion.div
                    className="flex items-center justify-center gap-2 md:gap-3 py-2 px-4 min-w-max"
                    layout
                >
                    <AnimatePresence mode="popLayout">
                        {tilePlayability.map(({ tile, isPlayable }, index) => {
                            const isSelected = selectedTile?.id === tile.id;
                            const canInteract =
                                isMyTurn && (isPlayable || !showHints);

                            return (
                                <motion.div
                                    key={tile.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                        y: isSelected ? -8 : 0,
                                    }}
                                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                    transition={{
                                        layout: { duration: 0.3 },
                                        scale: { duration: 0.2 },
                                        y: { duration: 0.15 },
                                    }}
                                    className={cn(
                                        "relative",
                                        !canInteract && "opacity-60",
                                    )}
                                >
                                    <DominoTile
                                        left={tile.left}
                                        right={tile.right}
                                        size={tileSize}
                                        isSelected={isSelected}
                                        isPlayable={
                                            showHints && isPlayable && isMyTurn
                                        }
                                        disabled={!canInteract}
                                        onClick={() => handleTileClick(tile)}
                                        layoutId={`${layoutIdPrefix}-tile-${tile.id}`}
                                    />

                                    {/* Playable indicator dot */}
                                    {showHints &&
                                        isPlayable &&
                                        isMyTurn &&
                                        !isSelected && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-md"
                                            />
                                        )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            </LayoutGroup>

            {/* Hand instructions */}
            {isMyTurn && tiles.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-1"
                >
                    <span className="text-white/50 text-xs">
                        {selectedTile
                            ? "Tap a placement spot on the board"
                            : showHints
                              ? "Tap a tile with a green dot to play"
                              : "Tap a tile to play"}
                    </span>
                </motion.div>
            )}
        </div>
    );
}

export default TileHand;
