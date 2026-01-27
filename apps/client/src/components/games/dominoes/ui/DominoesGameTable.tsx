"use client";

import React, {
    useState,
    useCallback,
    useMemo,
    useEffect,
    useRef,
} from "react";
import { LayoutGroup, AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
    DominoesData,
    DominoesPlayerData,
    Tile as TileType,
} from "@shared/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TileHand from "./TileHand";
import Board from "./Board";
import DealingTile from "./DealingTile";
import {
    GameTable,
    TableCenter,
    EdgeRegion,
    PlayerInfo,
    EdgePosition,
    DealingItem,
    DealingOverlay,
    useGameTable,
} from "@/components/games/shared";
import { useTurnTimer } from "@/hooks";
import { useWebSocket } from "@/contexts/WebSocketContext";

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
 * Check if player has any legal move
 */
function hasLegalMove(
    tiles: TileType[],
    board: DominoesData["board"],
): boolean {
    if (board.tiles.length === 0) return tiles.length > 0;

    return tiles.some(
        (tile) =>
            canPlaceTileOnSide(tile, board, "left") ||
            canPlaceTileOnSide(tile, board, "right"),
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
    // Track which player just passed for pass animation
    const [passedPlayerId, setPassedPlayerId] = useState<string | null>(null);

    // Deal animation state
    const [isDealing, setIsDealing] = useState(false);
    const [dealingTiles, setDealingTiles] = useState<DealingItem[]>([]);
    const [visibleTileCounts, setVisibleTileCounts] = useState<
        Record<string, number>
    >({});

    // Refs for deal animation tracking
    const previousRoundRef = useRef<number | null>(null);
    const hasDealtRef = useRef(false);

    // Clock offset for turn timer synchronization
    const { clockOffset } = useWebSocket();

    const playerCount =
        playerData.localOrdering?.length || gameData.playOrder.length;
    const localOrdering = playerData.localOrdering || gameData.playOrder;
    const hand = useMemo(() => playerData.hand || [], [playerData.hand]);
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    const isPlaying = gameData.phase === "playing";

    // Turn timer integration - pass the turnTimer object directly (same format as TurnTimerInfo)
    const { isActive: timerIsActive } = useTurnTimer(
        gameData.turnTimer,
        clockOffset,
        undefined, // No audio callback for now
    );

    // Memoize timer props for PlayerInfo component
    const turnTimeLimit = gameData.settings?.turnTimeLimit ?? 0;
    const timerPropsCache = useMemo(() => {
        if (
            turnTimeLimit <= 0 ||
            isDealing ||
            !timerIsActive ||
            !gameData.turnTimer?.startedAt
        ) {
            return undefined;
        }
        return {
            totalMs: turnTimeLimit * 1000,
            startedAt: gameData.turnTimer.startedAt,
            clockOffset,
        };
    }, [
        turnTimeLimit,
        isDealing,
        timerIsActive,
        gameData.turnTimer?.startedAt,
        clockOffset,
    ]);

    // Calculate if selected tile can be placed on each side
    const canPlaceLeft = useMemo(
        () =>
            selectedTile !== null &&
            canPlaceTileOnSide(selectedTile, gameData.board, "left"),
        [selectedTile, gameData.board],
    );

    const canPlaceRight = useMemo(
        () =>
            selectedTile !== null &&
            canPlaceTileOnSide(selectedTile, gameData.board, "right"),
        [selectedTile, gameData.board],
    );

    // Check if player must pass
    const mustPass = useMemo(
        () => isMyTurn && isPlaying && !hasLegalMove(hand, gameData.board),
        [isMyTurn, isPlaying, hand, gameData.board],
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

    // Handle placing a tile
    const handlePlaceTile = useCallback(
        (side: "left" | "right") => {
            if (!isMyTurn || !isPlaying) return;

            // Use selectedTile from state or passed tile
            const tileToPlace = selectedTile;
            if (!tileToPlace) return;

            onPlaceTile(tileToPlace, side);
            setSelectedTile(null);
            setLastPlayedSide(side);
        },
        [selectedTile, isMyTurn, isPlaying, onPlaceTile],
    );

    // Smart tile selection - auto-place if only one side valid
    const handleTileSelect = useCallback(
        (tile: TileType | null) => {
            if (!isMyTurn || !isPlaying || !tile) {
                setSelectedTile(null);
                return;
            }

            const leftValid = canPlaceTileOnSide(tile, gameData.board, "left");
            const rightValid = canPlaceTileOnSide(
                tile,
                gameData.board,
                "right",
            );

            // Empty board - auto place on left
            if (gameData.board.tiles.length === 0) {
                onPlaceTile(tile, "left");
                setLastPlayedSide("left");
                setSelectedTile(null);
                return;
            }

            // Only one side valid - auto place
            if (leftValid && !rightValid) {
                onPlaceTile(tile, "left");
                setLastPlayedSide("left");
                setSelectedTile(null);
                return;
            }

            if (rightValid && !leftValid) {
                onPlaceTile(tile, "right");
                setLastPlayedSide("right");
                setSelectedTile(null);
                return;
            }

            // Both sides valid - show ghost previews, wait for board click
            if (leftValid && rightValid) {
                setSelectedTile(tile);
                return;
            }

            // Tile not playable (shouldn't happen with hints enabled)
            toast.error("This tile cannot be played");
        },
        [isMyTurn, isPlaying, gameData.board, onPlaceTile],
    );

    // Handle pass with animation
    const handlePass = useCallback(() => {
        setPassedPlayerId(currentPlayerId);
        onPass();
        // Clear pass animation after delay
        setTimeout(() => setPassedPlayerId(null), 1500);
    }, [currentPlayerId, onPass]);

    // Handle cancel selection
    const handleCancelSelection = useCallback(() => {
        setSelectedTile(null);
    }, []);

    // Show toast when it's the player's turn
    useEffect(() => {
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

    // Deal animation effect - triggered on new round
    useEffect(() => {
        const currentRound = gameData.round;
        const isNewRound =
            previousRoundRef.current !== null &&
            currentRound > previousRoundRef.current;
        const isFirstRound =
            previousRoundRef.current === null && currentRound === 1;

        // Reset dealt flag on new round
        if (isNewRound) {
            hasDealtRef.current = false;
        }

        // Run deal animation if we haven't dealt yet and round is valid
        if (!hasDealtRef.current && (isFirstRound || isNewRound)) {
            hasDealtRef.current = true;

            // Start deal animation
            const runDealAnimation = async () => {
                setIsDealing(true);
                setVisibleTileCounts({});
                setDealingTiles([]);

                // Brief pause before dealing
                await new Promise((resolve) => setTimeout(resolve, 300));

                // Calculate tiles per player based on player count (standard dominoes distribution)
                // 2 players: 7 tiles each, 3 players: 9 tiles each, 4 players: 7 tiles each
                const tilesPerPlayer = playerCount === 3 ? 9 : 7;

                // Build deal sequence - cycle through players like a real dealer
                const dealSequence: {
                    playerId: string;
                    position: EdgePosition;
                }[] = [];
                for (let round = 0; round < tilesPerPlayer; round++) {
                    for (let p = 0; p < playerCount; p++) {
                        const playerId = localOrdering[p];
                        dealSequence.push({
                            playerId,
                            position: getEdgePosition(p, playerCount),
                        });
                    }
                }

                // Deal tiles with animation
                const TILE_INTERVAL = 30; // Fast dealing
                for (let i = 0; i < dealSequence.length; i++) {
                    const { playerId, position } = dealSequence[i];
                    const dealingTileId = `deal-${currentRound}-${i}`;

                    // Show flying tile
                    setDealingTiles([
                        {
                            id: dealingTileId,
                            targetPosition: position,
                            delay: 0,
                        },
                    ]);

                    // Wait for animation
                    await new Promise((resolve) =>
                        setTimeout(resolve, TILE_INTERVAL - 8),
                    );

                    // Increment visible count for this player
                    setVisibleTileCounts((prev) => ({
                        ...prev,
                        [playerId]: (prev[playerId] || 0) + 1,
                    }));
                    setDealingTiles([]);

                    // Small gap
                    await new Promise((resolve) => setTimeout(resolve, 8));
                }

                setIsDealing(false);
            };

            runDealAnimation();
        }

        previousRoundRef.current = currentRound;
    }, [gameData.round, playerCount, localOrdering]);

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

    // Build turn timer props for current player
    const getPlayerTimerProps = (playerId: string) => {
        if (
            currentPlayerId === playerId &&
            isPlaying &&
            timerPropsCache &&
            timerIsActive
        ) {
            return timerPropsCache;
        }
        return undefined;
    };

    // Custom render function for dealing tiles
    const renderDealingTile = useCallback(
        (
            item: DealingItem,
            dimensions: { width: number; height: number },
        ): React.ReactNode => (
            <DealingTile
                key={item.id}
                targetPosition={item.targetPosition}
                delay={item.delay}
                containerDimensions={dimensions}
            />
        ),
        [],
    );

    return (
        <div className="h-full w-full relative">
            <LayoutGroup>
                <GameTable
                    playerCount={playerCount}
                    isDealing={isDealing}
                    feltGradient="from-green-800 via-green-700 to-emerald-800"
                >
                    {/* Player Edge Regions */}
                    {localOrdering.map((playerId, index) => {
                        const isLocal = index === 0;
                        const player = gameData.players[playerId];
                        const isCurrentTurn = currentPlayerId === playerId;
                        const edgePosition = getEdgePosition(
                            index,
                            playerCount,
                        );
                        const showPassBubble = passedPlayerId === playerId;

                        return (
                            <EdgeRegion
                                key={playerId}
                                position={edgePosition}
                                isHero={isLocal}
                            >
                                <div className="relative">
                                    <PlayerInfo
                                        playerId={playerId}
                                        playerName={player?.name || "Unknown"}
                                        isCurrentTurn={
                                            isCurrentTurn && isPlaying
                                        }
                                        isLocalPlayer={isLocal}
                                        seatPosition={edgePosition}
                                        connected={
                                            player?.isConnected !== false
                                        }
                                        customStats={createDominoesStats(
                                            playerId,
                                        )}
                                        turnTimer={getPlayerTimerProps(
                                            playerId,
                                        )}
                                    />

                                    {/* Pass bubble animation */}
                                    <AnimatePresence>
                                        {showPassBubble && (
                                            <motion.div
                                                initial={{
                                                    opacity: 0,
                                                    y: 10,
                                                    scale: 0.8,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    y: -10,
                                                    scale: 1,
                                                }}
                                                exit={{
                                                    opacity: 0,
                                                    y: -20,
                                                    scale: 0.8,
                                                }}
                                                transition={{ duration: 0.3 }}
                                                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-bold px-3 py-1 rounded-full text-sm shadow-lg whitespace-nowrap z-50"
                                            >
                                                Pass!
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Only show hand for local player */}
                                {isLocal && (
                                    <TileHand
                                        tiles={
                                            isDealing
                                                ? hand.slice(
                                                      0,
                                                      visibleTileCounts[
                                                          playerId
                                                      ] || 0,
                                                  )
                                                : hand
                                        }
                                        board={gameData.board}
                                        selectedTile={selectedTile}
                                        isMyTurn={
                                            isMyTurn && isPlaying && !isDealing
                                        }
                                        onTileSelect={handleTileSelect}
                                        showHints={showHints}
                                        layoutIdPrefix="dominoes"
                                    />
                                )}
                            </EdgeRegion>
                        );
                    })}

                    {/* Center Area - Dominoes Board */}
                    <TableCenter className="flex flex-col items-center gap-4 w-full max-w-3xl">
                        {/* Deal animation overlay */}
                        <DealingOverlay
                            dealingItems={dealingTiles}
                            renderItem={renderDealingTile}
                        />

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
                            onCancelSelection={handleCancelSelection}
                            lastPlayedSide={lastPlayedSide}
                            className="w-full"
                            layoutIdPrefix="dominoes"
                        />

                        {/* Pass button when must pass */}
                        {isMyTurn && isPlaying && mustPass && (
                            <Button
                                variant="destructive"
                                onClick={handlePass}
                                className="shadow-lg animate-pulse"
                            >
                                Pass (No Moves)
                            </Button>
                        )}

                        {/* Cancel selection hint when tile selected with both sides valid */}
                        {selectedTile && canPlaceLeft && canPlaceRight && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-white/70 text-sm text-center"
                            >
                                Tap a &quot;Place Here&quot; button, or{" "}
                                <button
                                    onClick={handleCancelSelection}
                                    className="underline hover:text-white"
                                >
                                    cancel
                                </button>
                            </motion.div>
                        )}
                    </TableCenter>
                </GameTable>
            </LayoutGroup>
        </div>
    );
}

export default DominoesGameTable;
