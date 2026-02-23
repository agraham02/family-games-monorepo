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
    ActionConfirmationBar,
} from "@/components/games/shared";
import { useTurnTimer, useResponsiveTileSize } from "@/hooks";
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
    board: DominoesData["board"] | undefined,
    side: "left" | "right",
): boolean {
    if (!board || board.tiles.length === 0) {
        return side === "left";
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
    board: DominoesData["board"] | undefined,
): boolean {
    if (!board || board.tiles.length === 0) return tiles.length > 0;

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
    const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(
        null,
    );
    // Track which player just passed for pass animation
    const [passedPlayerId, setPassedPlayerId] = useState<string | null>(null);

    // Deal animation state
    const [isDealing, setIsDealing] = useState(false);
    const [dealingTiles, setDealingTiles] = useState<DealingItem[]>([]);
    const [visibleTileCounts, setVisibleTileCounts] = useState<
        Record<string, number>
    >({});

    // Responsive tile sizing
    const { boardTileSize, handTileSize, ghostTileSize } =
        useResponsiveTileSize();

    // Refs for deal animation tracking
    const previousRoundRef = useRef<number | null>(null);
    const hasDealtRef = useRef(false);

    // Clock offset for turn timer synchronization
    const { clockOffset } = useWebSocket();

    const playerCount =
        playerData.localOrdering?.length || gameData.playOrder.length;
    const localOrdering = playerData.localOrdering || gameData.playOrder;
    const hand = useMemo(() => playerData.hand || [], [playerData.hand]);
    const board = useMemo(
        () =>
            gameData.board ?? {
                tiles: [],
                leftEnd: null,
                rightEnd: null,
            },
        [gameData.board],
    );
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
            canPlaceTileOnSide(selectedTile, board, "left"),
        [selectedTile, board],
    );

    const canPlaceRight = useMemo(
        () =>
            selectedTile !== null &&
            canPlaceTileOnSide(selectedTile, board, "right"),
        [selectedTile, board],
    );

    // Check if player must pass
    const mustPass = useMemo(
        () => isMyTurn && isPlaying && !hasLegalMove(hand, board),
        [isMyTurn, isPlaying, hand, board],
    );

    // Handle placing a tile
    const handlePlaceTile = useCallback(
        (side: "left" | "right") => {
            if (!isMyTurn || !isPlaying) return;

            // Use selectedTile from state or passed tile
            const tileToPlace = selectedTile;
            if (!tileToPlace) return;

            onPlaceTile(tileToPlace, side);
            setSelectedTile(null);
            setSelectedSide(null);
        },
        [selectedTile, isMyTurn, isPlaying, onPlaceTile],
    );

    // Tile selection creates/updates a move draft with optional end preselection
    const handleTileSelect = useCallback(
        (tile: TileType | null) => {
            if (!isMyTurn || !isPlaying || !tile) {
                setSelectedTile(null);
                setSelectedSide(null);
                return;
            }

            const leftValid = canPlaceTileOnSide(tile, board, "left");
            const rightValid = canPlaceTileOnSide(tile, board, "right");

            // Only one side valid - preselect that side, require explicit confirm
            if (leftValid && !rightValid) {
                setSelectedTile(tile);
                setSelectedSide("left");
                return;
            }

            if (rightValid && !leftValid) {
                setSelectedTile(tile);
                setSelectedSide("right");
                return;
            }

            // Both sides valid - show two ghost previews and require end selection + confirm
            if (leftValid && rightValid) {
                setSelectedTile(tile);
                setSelectedSide(null);
                return;
            }

            // Tile not playable (shouldn't happen with hints enabled)
            toast.error("This tile cannot be played");
        },
        [isMyTurn, isPlaying, board],
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
        setSelectedSide(null);
    }, []);

    const handleGhostSideSelect = useCallback((side: "left" | "right") => {
        setSelectedSide(side);
    }, []);

    const handleConfirmPlacement = useCallback(() => {
        if (!selectedSide) return;
        handlePlaceTile(selectedSide);
    }, [handlePlaceTile, selectedSide]);

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
        const score = gameData?.playerScores?.[playerId] ?? 0;
        const tilesCount = gameData?.handsCounts?.[playerId] ?? 0;
        const winTarget = gameData?.settings?.winTarget ?? 150;

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
                    {localOrdering?.map((playerId, index) => {
                        const isLocal = index === 0;
                        const player = gameData?.players?.[playerId];
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

                                <TileHand
                                    tiles={
                                        isLocal
                                            ? isDealing
                                                ? hand.slice(
                                                      0,
                                                      visibleTileCounts[
                                                          playerId
                                                      ] || 0,
                                                  )
                                                : hand
                                            : []
                                    }
                                    board={board}
                                    selectedTile={isLocal ? selectedTile : null}
                                    isMyTurn={
                                        isLocal &&
                                        isMyTurn &&
                                        isPlaying &&
                                        !isDealing
                                    }
                                    onTileSelect={
                                        isLocal ? handleTileSelect : undefined
                                    }
                                    showHints={isLocal ? showHints : false}
                                    tileSize={handTileSize}
                                    layoutIdPrefix="dominoes"
                                    isLocalPlayer={isLocal}
                                    tileCount={
                                        isDealing
                                            ? visibleTileCounts[playerId] || 0
                                            : gameData?.handsCounts?.[
                                                  playerId
                                              ] || 0
                                    }
                                />
                            </EdgeRegion>
                        );
                    })}

                    {/* Center Area - Dominoes Board */}
                    <TableCenter
                        className="flex flex-col items-center gap-2 w-full h-full max-w-5xl"
                        style={{ placeSelf: "stretch" }}
                    >
                        {/* Deal animation overlay */}
                        <DealingOverlay
                            dealingItems={dealingTiles}
                            renderItem={renderDealingTile}
                        />

                        {/* Round indicator */}
                        <div className="bg-black/30 backdrop-blur-sm rounded-full px-4 py-1 mt-4">
                            <span className="text-white/80 text-sm font-medium">
                                Round {gameData.round}
                            </span>
                        </div>

                        {/* Dominoes Board */}
                        <Board
                            board={board}
                            layoutSeed={`${gameData.id}-r${gameData.round}`}
                            selectedTile={selectedTile}
                            isMyTurn={isMyTurn && isPlaying}
                            canPlaceLeft={canPlaceLeft}
                            canPlaceRight={canPlaceRight}
                            selectedGhostSide={selectedSide}
                            onSelectGhostSide={handleGhostSideSelect}
                            tileSize={boardTileSize}
                            ghostTileSize={ghostTileSize}
                            className="w-full flex-1 min-h-[260px] rounded-2xl border border-white/10 bg-black/15 backdrop-blur-[1px] p-3"
                            layoutIdPrefix="dominoes"
                        />

                        {/* Cancel selection hint when tile selected */}
                        {selectedTile && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-white/70 text-sm text-center"
                            >
                                {canPlaceLeft && canPlaceRight
                                    ? "Choose an end preview, then confirm your move, or "
                                    : "Review the ghost placement, then confirm your move, or "}
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

            {/* Place Tile Confirmation Bar */}
            <ActionConfirmationBar
                isVisible={
                    isMyTurn &&
                    isPlaying &&
                    !mustPass &&
                    selectedTile !== null &&
                    selectedSide !== null
                }
                onConfirm={handleConfirmPlacement}
                onCancel={handleCancelSelection}
                confirmLabel="Confirm Tile"
                confirmVariant="default"
                message={
                    canPlaceLeft && canPlaceRight
                        ? "Choose an end and confirm"
                        : "Confirm this placement"
                }
            />

            {/* Pass Action Confirmation Bar */}
            <ActionConfirmationBar
                isVisible={isMyTurn && isPlaying && mustPass}
                onConfirm={handlePass}
                confirmLabel="Pass Turn"
                confirmVariant="destructive"
                message="No playable tiles in hand"
            />
        </div>
    );
}

export default DominoesGameTable;
