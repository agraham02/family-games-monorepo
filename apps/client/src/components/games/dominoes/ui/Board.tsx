"use client";

/**
 * Board - Dominoes game board with visual tile layout.
 *
 * Renders the domino chain as a snake pattern with auto-zoom/center
 * and manual pan functionality. Shows ghost tiles for valid placements.
 */

import React, {
    useRef,
    useEffect,
    useState,
    useMemo,
    useCallback,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Tile as TileType, BoardState } from "@family-games/shared";
import { cn } from "@/lib/utils";
import { TileSize, useDraggableViewport } from "@/hooks";
import DominoTile from "./DominoTile";
import {
    boardStateToVisualTiles,
    getGhostTiles,
    getBoundingBox,
    VisualTile,
    TILE_W,
    TILE_H,
} from "@/lib/dominoes/layoutUtils";
import { Button } from "@/components/ui/button";

interface BoardProps {
    /** Current board state from server */
    board: BoardState;
    /** Currently selected tile from player's hand */
    selectedTile: TileType | null;
    /** Whether it's the current player's turn */
    isMyTurn: boolean;
    /** Whether selected tile can be placed on left end */
    canPlaceLeft: boolean;
    /** Whether selected tile can be placed on right end */
    canPlaceRight: boolean;
    /** Callback when player places tile */
    onPlaceTile: (side: "left" | "right") => void;
    /** Callback to cancel tile selection */
    onCancelSelection: () => void;
    /** Which side was last played (for highlight animation) */
    lastPlayedSide: "left" | "right" | null;
    /** Tile size for board display */
    tileSize: TileSize;
    /** Tile size for ghost previews */
    ghostTileSize: TileSize;
    /** Optional className */
    className?: string;
    /** Layout ID prefix for motion animations */
    layoutIdPrefix?: string;
}

// Size multipliers for different TileSize variants
const SIZE_MULTIPLIERS: Record<TileSize, number> = {
    xs: 0.5,
    sm: 0.72,
    md: 0.96,
    lg: 1.2,
};

/**
 * Board Component
 *
 * Displays the domino chain with auto-zoom/center and pan functionality.
 * Shows ghost tiles at valid placement spots when a tile is selected.
 */
function Board({
    board,
    selectedTile,
    isMyTurn,
    canPlaceLeft,
    canPlaceRight,
    onPlaceTile,
    onCancelSelection,
    lastPlayedSide,
    tileSize,
    ghostTileSize,
    className,
    layoutIdPrefix = "board",
}: BoardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [autoCenter, setAutoCenter] = useState({ x: 0, y: 0 });

    // Custom Hook for Panning
    const {
        offset: manualOffset,
        eventHandlers,
        isDragging,
        setOffset,
    } = useDraggableViewport();

    // Convert backend state to visual tiles with positions
    const visualTiles = useMemo(() => boardStateToVisualTiles(board), [board]);

    // Calculate ghost tiles for valid placements
    const ghosts = useMemo(() => {
        if (!selectedTile || !isMyTurn) return null;
        return getGhostTiles(
            selectedTile,
            board,
            visualTiles,
            canPlaceLeft,
            canPlaceRight,
        );
    }, [
        selectedTile,
        board,
        visualTiles,
        canPlaceLeft,
        canPlaceRight,
        isMyTurn,
    ]);

    // Get effective tile dimensions based on size
    const effectiveTileW = TILE_W * SIZE_MULTIPLIERS[tileSize];
    const effectiveTileH = TILE_H * SIZE_MULTIPLIERS[tileSize];

    // Auto-Center & Zoom Logic
    useEffect(() => {
        if (visualTiles.length === 0 || !containerRef.current) {
            // Reset to center for empty board
            setScale(1);
            const { clientWidth: viewW, clientHeight: viewH } =
                containerRef.current || { clientWidth: 400, clientHeight: 300 };
            setAutoCenter({ x: viewW / 2, y: viewH / 2 });
            setOffset({ x: 0, y: 0 });
            return;
        }

        // 1. Calculate Bounding Box of Content
        const bbox = getBoundingBox(visualTiles);
        const contentW = bbox.width * SIZE_MULTIPLIERS[tileSize];
        const contentH = bbox.height * SIZE_MULTIPLIERS[tileSize];

        // 2. Get Viewport Size
        const { clientWidth: viewW, clientHeight: viewH } =
            containerRef.current;

        // 3. Determine Scale (Fit to screen)
        const padding = 80;
        const fitScale = Math.min(
            viewW / (contentW + padding),
            viewH / (contentH + padding),
            1.0, // Never zoom in past 100%
        );

        // 4. Clamp scale at minimum
        const MIN_SCALE = 0.4;
        const finalScale = Math.max(fitScale, MIN_SCALE);
        setScale(finalScale);

        // 5. Center the content
        const centerX =
            ((bbox.minX + bbox.maxX) / 2) * SIZE_MULTIPLIERS[tileSize];
        const centerY =
            ((bbox.minY + bbox.maxY) / 2) * SIZE_MULTIPLIERS[tileSize];

        setAutoCenter({
            x: viewW / 2 - centerX * finalScale,
            y: viewH / 2 - centerY * finalScale,
        });
    }, [visualTiles.length, tileSize, setOffset]);

    // Handle ghost click to place tile
    const handleGhostClick = useCallback(
        (side: "left" | "right") => {
            if (!selectedTile || !isMyTurn) return;
            onPlaceTile(side);
        },
        [selectedTile, isMyTurn, onPlaceTile],
    );

    // Render a single visual tile
    const renderTile = (tile: VisualTile, index: number) => {
        const sizeMultiplier = SIZE_MULTIPLIERS[tileSize];
        const isLastPlayed =
            lastPlayedSide &&
            index === (lastPlayedSide === "right" ? visualTiles.length - 1 : 0);

        return (
            <motion.div
                key={tile.id}
                className="absolute"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                style={{
                    left: tile.x * sizeMultiplier,
                    top: tile.y * sizeMultiplier,
                    transform: `translate(-50%, -50%) rotate(${tile.rotation}deg)`,
                }}
            >
                <DominoTile
                    left={tile.left}
                    right={tile.right}
                    size={tileSize}
                    isSelected={isLastPlayed ?? false}
                    layoutId={`${layoutIdPrefix}-tile-${tile.id}`}
                />
            </motion.div>
        );
    };

    // Render ghost tile with placement button
    const renderGhost = (ghost: VisualTile, side: "left" | "right") => {
        const sizeMultiplier = SIZE_MULTIPLIERS[ghostTileSize];

        return (
            <motion.div
                key={`ghost-${side}`}
                className="absolute z-50"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{
                    left: ghost.x * sizeMultiplier,
                    top: ghost.y * sizeMultiplier,
                    transform: `translate(-50%, -50%) rotate(${ghost.rotation}deg)`,
                }}
            >
                <div
                    className="relative cursor-pointer group"
                    onClick={() => handleGhostClick(side)}
                >
                    <DominoTile
                        left={selectedTile?.left ?? 0}
                        right={selectedTile?.right ?? 0}
                        size={ghostTileSize}
                        isGhost
                    />
                    {/* "Place Here" label */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs px-2 py-1 h-auto shadow-lg opacity-90 group-hover:opacity-100"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleGhostClick(side);
                            }}
                        >
                            Place {side === "left" ? "Left" : "Right"}
                        </Button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-lg",
                "bg-linear-to-br from-green-800 via-green-700 to-emerald-800",
                "touch-none select-none shadow-inner",
                isDragging ? "cursor-grabbing" : "cursor-grab",
                className,
            )}
            {...eventHandlers}
        >
            {/* Board surface pattern (subtle) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: "20px 20px",
                    }}
                />
            </div>

            {/* Tiles container with pan/zoom */}
            <div
                className="absolute top-0 left-0 transition-transform duration-300 ease-out will-change-transform"
                style={{
                    transform: `translate(${autoCenter.x + manualOffset.x}px, ${autoCenter.y + manualOffset.y}px) scale(${scale})`,
                    transformOrigin: "0 0",
                }}
            >
                {/* Placed Tiles */}
                {visualTiles.map((tile, index) => renderTile(tile, index))}

                {/* Ghost Tiles */}
                <AnimatePresence>
                    {ghosts?.left && renderGhost(ghosts.left, "left")}
                    {ghosts?.right && renderGhost(ghosts.right, "right")}
                </AnimatePresence>
            </div>

            {/* Empty board message */}
            {visualTiles.length === 0 && !selectedTile && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white/50 text-sm font-medium">
                        {isMyTurn
                            ? "Select a tile to play"
                            : "Waiting for first tile..."}
                    </div>
                </div>
            )}

            {/* Zoom indicator */}
            {scale < 0.9 && (
                <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm rounded px-2 py-1">
                    <span className="text-white/70 text-xs">
                        {Math.round(scale * 100)}% - Drag to pan
                    </span>
                </div>
            )}

            {/* Cancel selection button when ghosts visible */}
            {ghosts && (ghosts.left || ghosts.right) && (
                <div className="absolute top-2 right-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/70 hover:text-white hover:bg-white/20"
                        onClick={onCancelSelection}
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}

export default Board;
