"use client";

import React, { useState, useCallback, useMemo } from "react";
import { LayoutGroup } from "motion/react";
import { toast } from "sonner";
import { DominoesData, DominoesPlayerData, Tile as TileType } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TileHand from "./TileHand";
import Board from "./Board";
import {
    GameTable,
    TableCenter,
    EdgeRegion,
    PlayerInfo,
    ActionConfirmationBar,
    EdgePosition,
} from "@/components/games/shared";

interface DominoesGameTableProps {
    gameData: DominoesData;
    playerData: DominoesPlayerData;
    isMyTurn: boolean;
    showHints?: boolean;
    onPlaceTile: (tile: TileType, side: "left" | "right") => void;
    onPass: () => void;
}

// Helper function to map player index to edge position
function getEdgePosition(index: number, playerCount: number): EdgePosition {
    if (playerCount === 2) {
        return index === 0 ? "bottom" : "top";
    }
    if (playerCount === 3) {
        if (index === 0) return "bottom";
        if (index === 1) return "left";
        return "right";
    }
    // 4 players
    if (index === 0) return "bottom";
    if (index === 1) return "left";
    if (index === 2) return "top";
    if (index === 3) return "right";
    return "top";
}

/**
 * Check if a tile can be placed on a specific side of the board
 */
function canPlaceTileOnSide(
    tile: TileType,
    board: DominoesData["board"],
    side: "left" | "right"
): boolean {
    if (board.tiles.length === 0) {
        return true;
    }

    const end = side === "left" ? board.leftEnd : board.rightEnd;
    if (!end) return false;

    return tile.left === end.value || tile.right === end.value;
}

/**
 * Check if player has any legal move
 */
function hasLegalMove(
    tiles: TileType[],
    board: DominoesData["board"]
): boolean {
    if (board.tiles.length === 0) return tiles.length > 0;

    return tiles.some(
        (tile) =>
            canPlaceTileOnSide(tile, board, "left") ||
            canPlaceTileOnSide(tile, board, "right")
    );
}

/**
 * DominoesGameTable - Game table layout for Dominoes using shared CardLayout system.
 *
 * Places the board in the center, with player hands and info at the edges.
 */
function DominoesGameTable({
    gameData,
    playerData,
    isMyTurn,
    showHints = false,
    onPlaceTile,
    onPass,
}: DominoesGameTableProps) {
    const [selectedTile, setSelectedTile] = useState<TileType | null>(null);
    const [lastPlayedSide, setLastPlayedSide] = useState<
        "left" | "right" | null
    >(null);

    const playerCount =
        playerData.localOrdering?.length || gameData.playOrder.length;
    const localOrdering = playerData.localOrdering || gameData.playOrder;
    const hand = useMemo(() => playerData.hand || [], [playerData.hand]);
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    const isPlaying = gameData.phase === "playing";

    // Calculate if selected tile can be placed on each side
    const canPlaceLeft = useMemo(
        () =>
            selectedTile !== null &&
            canPlaceTileOnSide(selectedTile, gameData.board, "left"),
        [selectedTile, gameData.board]
    );

    const canPlaceRight = useMemo(
        () =>
            selectedTile !== null &&
            canPlaceTileOnSide(selectedTile, gameData.board, "right"),
        [selectedTile, gameData.board]
    );

    // Check if player must pass
    const mustPass = useMemo(
        () => isMyTurn && isPlaying && !hasLegalMove(hand, gameData.board),
        [isMyTurn, isPlaying, hand, gameData.board]
    );

    // Can auto-place (only one valid side)
    const canAutoPlace = useMemo(() => {
        if (!selectedTile || !isMyTurn || !isPlaying) return false;
        if (gameData.board.tiles.length === 0) return true;
        return (
            (canPlaceLeft && !canPlaceRight) || (canPlaceRight && !canPlaceLeft)
        );
    }, [
        selectedTile,
        isMyTurn,
        isPlaying,
        gameData.board.tiles.length,
        canPlaceLeft,
        canPlaceRight,
    ]);

    // Handle tile selection
    const handleTileSelect = useCallback(
        (tile: TileType | null) => {
            if (!isMyTurn || !isPlaying) return;
            setSelectedTile(tile);
        },
        [isMyTurn, isPlaying]
    );

    // Handle placing a tile
    const handlePlaceTile = useCallback(
        (side: "left" | "right") => {
            if (!selectedTile || !isMyTurn || !isPlaying) return;

            onPlaceTile(selectedTile, side);
            setSelectedTile(null);
            setLastPlayedSide(side);
        },
        [selectedTile, isMyTurn, isPlaying, onPlaceTile]
    );

    // Handle auto-place (when only one side is valid)
    const handleAutoPlace = useCallback(() => {
        if (!selectedTile) return;

        if (gameData.board.tiles.length === 0) {
            handlePlaceTile("left"); // Default to left for first tile
        } else if (canPlaceLeft && !canPlaceRight) {
            handlePlaceTile("left");
        } else if (canPlaceRight && !canPlaceLeft) {
            handlePlaceTile("right");
        }
    }, [
        selectedTile,
        gameData.board.tiles.length,
        canPlaceLeft,
        canPlaceRight,
        handlePlaceTile,
    ]);

    // Handle cancel selection
    const handleCancelSelection = useCallback(() => {
        setSelectedTile(null);
    }, []);

    // Show toast when it's the player's turn
    React.useEffect(() => {
        if (isMyTurn && isPlaying) {
            if (mustPass) {
                toast.warning("No playable tiles — you must pass", {
                    id: "dominoes-must-pass",
                    duration: 4000,
                });
            } else {
                toast.info("Your turn! Select a tile to play", {
                    id: "dominoes-your-turn",
                    duration: 4000,
                    dismissible: true,
                });
            }
        }
    }, [isMyTurn, isPlaying, mustPass, gameData.currentTurnIndex]);

    // Create customStats render function for dominoes
    const createDominoesStats = (playerId: string) => {
        const score = gameData.playerScores[playerId] ?? 0;
        const tilesCount = gameData.handsCounts[playerId] ?? 0;
        const winTarget = gameData.settings.winTarget;

        function DominoesStatsDisplay() {
            return (
                <div className="flex gap-1 items-center flex-wrap">
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-black/30 border-white/20 text-white/80"
                    >
                        Score: {score}/{winTarget}
                    </Badge>
                    <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-black/30 border-white/20 text-white/80"
                    >
                        Tiles: {tilesCount}
                    </Badge>
                </div>
            );
        }
        return DominoesStatsDisplay;
    };

    return (
        <div className="h-full w-full">
            <LayoutGroup>
                <GameTable
                    playerCount={playerCount}
                    isDealing={false}
                    feltGradient="from-green-800 via-green-700 to-emerald-800"
                >
                    {/* Player Edge Regions */}
                    {localOrdering.map((playerId, index) => {
                        const isLocal = index === 0;
                        const player = gameData.players[playerId];
                        const isCurrentTurn = currentPlayerId === playerId;
                        const edgePosition = getEdgePosition(
                            index,
                            playerCount
                        );

                        return (
                            <EdgeRegion
                                key={playerId}
                                position={edgePosition}
                                isHero={isLocal}
                            >
                                <PlayerInfo
                                    playerId={playerId}
                                    playerName={player?.name || "Unknown"}
                                    isCurrentTurn={isCurrentTurn && isPlaying}
                                    isLocalPlayer={isLocal}
                                    seatPosition={edgePosition}
                                    connected={player?.isConnected !== false}
                                    customStats={createDominoesStats(playerId)}
                                />

                                {/* Only show hand for local player */}
                                {isLocal && (
                                    <TileHand
                                        tiles={hand}
                                        board={gameData.board}
                                        selectedTile={selectedTile}
                                        isMyTurn={isMyTurn && isPlaying}
                                        onTileSelect={handleTileSelect}
                                        showHints={showHints}
                                    />
                                )}
                            </EdgeRegion>
                        );
                    })}

                    {/* Center Area - Dominoes Board */}
                    <TableCenter className="flex flex-col items-center gap-4 w-full max-w-3xl">
                        {/* Round indicator */}
                        <div className="bg-black/30 backdrop-blur-sm rounded-full px-4 py-1">
                            <span className="text-white/80 text-sm font-medium">
                                Round {gameData.round}
                            </span>
                        </div>

                        {/* Dominoes Board */}
                        <Board
                            board={gameData.board}
                            selectedTile={selectedTile}
                            isMyTurn={isMyTurn && isPlaying}
                            canPlaceLeft={canPlaceLeft}
                            canPlaceRight={canPlaceRight}
                            onPlaceTile={handlePlaceTile}
                            lastPlayedSide={lastPlayedSide}
                            className="w-full"
                        />

                        {/* Pass button when must pass */}
                        {isMyTurn && isPlaying && mustPass && (
                            <Button
                                variant="destructive"
                                onClick={onPass}
                                className="shadow-lg"
                            >
                                Pass (No Moves)
                            </Button>
                        )}
                    </TableCenter>
                </GameTable>
            </LayoutGroup>

            {/* Action confirmation bar - for auto-place when only one side valid */}
            <ActionConfirmationBar
                isVisible={canAutoPlace && selectedTile !== null}
                onConfirm={handleAutoPlace}
                onCancel={handleCancelSelection}
                confirmLabel="Place Tile"
            />
        </div>
    );
}

export default DominoesGameTable;
