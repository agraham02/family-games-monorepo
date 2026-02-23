"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Tile as TileType, BoardState } from "@shared/types";
import Tile from "./Tile";
import { TileSize, useKeyboardNavigation } from "@/hooks";
import { useEdgeRegion } from "@/components/games/shared/EdgeRegion";

interface TileHandProps {
    tiles: TileType[];
    board: BoardState;
    selectedTile?: TileType | null;
    isMyTurn?: boolean;
    onTileSelect?: (tile: TileType | null) => void;
    className?: string;
    showHints?: boolean;
    /** Prefix for layoutId to enable shared animations with Board */
    layoutIdPrefix?: string;
    /** Tile size for responsive display */
    tileSize?: TileSize;
    /** Whether this is the local player's hand */
    isLocalPlayer?: boolean;
    /** Number of tiles (for opponents showing backs) */
    tileCount?: number;
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
    selectedTile = null,
    isMyTurn = false,
    onTileSelect,
    className,
    showHints = false,
    layoutIdPrefix,
    tileSize = "md",
    isLocalPlayer = true,
    tileCount = 0,
}: TileHandProps) {
    const edgeRegion = useEdgeRegion();
    const rotation = edgeRegion?.cardRotation ?? 0;

    const playableTiles = tiles.filter((t) => canPlayTile(t, board));
    const hasPlayableTile = playableTiles.length > 0;
    const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Find index of currently selected tile
    const selectedIndex = selectedTile
        ? tiles.findIndex((t) => t.id === selectedTile.id)
        : -1;

    // Keyboard navigation for tile selection
    const handleConfirm = useCallback(
        (index: number) => {
            const tile = tiles[index];
            if (tile && onTileSelect) {
                onTileSelect(selectedTile?.id === tile.id ? null : tile);
            }
        },
        [tiles, selectedTile, onTileSelect],
    );

    const handleCancel = useCallback(() => {
        if (selectedTile && onTileSelect) {
            onTileSelect(null);
        }
        setFocusedIndex(-1);
    }, [selectedTile, onTileSelect]);

    useKeyboardNavigation({
        items: tiles,
        selectedIndex: focusedIndex >= 0 ? focusedIndex : selectedIndex,
        onSelect: setFocusedIndex,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
        enabled: isLocalPlayer && isMyTurn && tiles.length > 0,
        wrap: true,
    });

    // Focus the tile element when focusedIndex changes via keyboard
    useEffect(() => {
        if (focusedIndex >= 0 && tileRefs.current[focusedIndex]) {
            tileRefs.current[focusedIndex]?.focus();
        }
    }, [focusedIndex]);

    // If not local player, render face-down tiles
    if (!isLocalPlayer) {
        const count = Math.max(0, tileCount);
        return (
            <div className={cn("flex items-center justify-center", className)}>
                <div
                    className="flex gap-1 sm:gap-2 flex-row"
                    style={{
                        transform:
                            rotation !== 0
                                ? `rotate(${rotation}deg)`
                                : undefined,
                        transformOrigin: "center center",
                    }}
                >
                    {Array.from({ length: count }).map((_, index) => (
                        <motion.div
                            key={`facedown-${index}`}
                            className="shrink-0"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <Tile
                                tile={{
                                    id: `facedown-${index}`,
                                    left: 0,
                                    right: 0,
                                }}
                                isFaceDown={true}
                                size={tileSize}
                                rotation={0} // Container handles rotation
                            />
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("w-full flex flex-col items-center", className)}>
            {/* Hand label with count and status */}
            <div className="mb-2 flex items-center justify-between px-1 w-full max-w-md">
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
                    "flex gap-1 sm:gap-2 overflow-x-auto overflow-y-visible py-2 px-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30 transition-opacity duration-300 justify-center w-full",
                    !isMyTurn && "opacity-50",
                )}
                role="listbox"
                aria-label="Your domino tiles"
                aria-activedescendant={
                    focusedIndex >= 0
                        ? `tile-${tiles[focusedIndex]?.id}`
                        : undefined
                }
            >
                {tiles.map((tile, index) => {
                    // Only check playability when hints are enabled
                    const isPlayable = !showHints || canPlayTile(tile, board);
                    const isSelected = selectedTile?.id === tile.id;
                    const isFocused = focusedIndex === index;
                    // Ensure we have a unique key even if tile.id is somehow missing
                    const key =
                        tile.id || `tile-${index}-${tile.left}-${tile.right}`;

                    return (
                        <motion.div
                            key={key}
                            className="shrink-0"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            role="option"
                            aria-selected={isSelected}
                            id={`tile-${tile.id}`}
                        >
                            <Tile
                                ref={(el) => {
                                    tileRefs.current[index] = el;
                                }}
                                tile={tile}
                                isSelected={isSelected}
                                isPlayable={isMyTurn && isPlayable}
                                isFocused={isFocused}
                                size={tileSize}
                                layoutId={
                                    layoutIdPrefix
                                        ? `${layoutIdPrefix}-tile-${tile.id}`
                                        : undefined
                                }
                                onClick={
                                    isMyTurn && onTileSelect
                                        ? () =>
                                              onTileSelect(
                                                  isSelected ? null : tile,
                                              )
                                        : undefined
                                }
                                onFocus={() => setFocusedIndex(index)}
                                rotation={rotation}
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
