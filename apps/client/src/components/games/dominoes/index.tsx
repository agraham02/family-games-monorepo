"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGroup } from "motion/react";
import type { DominoesData, DominoesPlayerData } from "@shared/types";
import type { GameComponentProps } from "../registry";
import { useSession } from "@/contexts/SessionContext";
import {
    GameTable,
    EdgeRegion,
    PlayerInfo,
    ActionConfirmationBar,
    GameScoreboard,
    GameMenu,
    RotateDeviceOverlay,
    type EdgePosition,
} from "@/components/games/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDominoesStore } from "./store";
import { replayBoardToChain, tileToDomino } from "./engine/replay";
import { createEmptyChain } from "./engine/chain";
import { getPlayableEnds } from "./engine/rules";
import BoardControls from "./board/BoardControls";
import FlyingTile from "./board/FlyingTile";
import DominoHand, { OpponentTiles } from "./ui/DominoHand";
import type { ChainEnd } from "./engine/types";

// react-konva must be loaded client-side only (no SSR)
const GameBoard = dynamic(() => import("./board/GameBoard"), {
    ssr: false,
});

/** Map player index to edge position (same pattern as Spades) */
function getEdgePosition(index: number, playerCount: number): EdgePosition {
    if (playerCount === 2) return index === 0 ? "bottom" : "top";
    if (playerCount === 3) {
        if (index === 0) return "bottom";
        if (index === 1) return "left";
        return "right";
    }
    // 4 players
    if (index === 0) return "bottom";
    if (index === 1) return "left";
    if (index === 2) return "top";
    return "right";
}

export default function Dominoes({
    gameData,
    playerData,
    dispatchOptimisticAction,
    isSpectator,
    roomCode,
}: GameComponentProps<DominoesData, DominoesPlayerData>) {
    const { userId } = useSession();
    const store = useDominoesStore;

    // Track previous board tile count to detect new placements
    const prevTileCountRef = useRef(0);
    const centerTileIdRef = useRef<string | null>(null);
    const prevTileIdsRef = useRef<string[]>([]);
    const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(
        null,
    );

    // Replay server board → chain whenever board changes.
    // Center-anchored: the first tile placed (center of the chain) always
    // stays at the visual center. Adding tiles to either end only affects
    // the new tile's position, never existing ones.
    const boardTiles = gameData.board?.tiles;
    const chain = useMemo(() => {
        if (!gameData.board || !gameData.board.tiles?.length) {
            centerTileIdRef.current = null;
            prevTileIdsRef.current = [];
            return createEmptyChain();
        }

        const tiles = gameData.board.tiles;

        // Capture the center tile ID on the first tile placed in a round.
        // This is the anchor that keeps the layout stable.
        if (!centerTileIdRef.current || tiles.length === 1) {
            // For a fresh round (1 tile), that tile is the center.
            // For reconnection (many tiles, no prior state), use the middle.
            if (tiles.length === 1) {
                centerTileIdRef.current = tiles[0].id;
            } else if (prevTileIdsRef.current.length === 0) {
                // Reconnect: pick the midpoint as best guess
                centerTileIdRef.current =
                    tiles[Math.floor(tiles.length / 2)].id;
            }
        }

        return replayBoardToChain(
            gameData.board,
            centerTileIdRef.current ?? undefined,
        );
    }, [boardTiles]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep prevTileIds in sync (outside useMemo to avoid side effects)
    useEffect(() => {
        store.getState().setChain(chain);

        // Detect new tile placement for animation.
        // Read prevTileIds BEFORE updating it so the new tile isn't in the set yet.
        const currentCount = chain.segments.length;
        if (currentCount > prevTileCountRef.current && currentCount > 0) {
            const prevIds = new Set(prevTileIdsRef.current);
            const newSeg = chain.segments.find(
                (s) => !prevIds.has(s.domino.id),
            );
            if (newSeg) {
                store.getState().setLastPlacedTileId(newSeg.domino.id);
            }
        }
        prevTileCountRef.current = currentCount;

        // Now sync prevTileIds for next render
        prevTileIdsRef.current = gameData.board?.tiles?.map((t) => t.id) ?? [];
    }, [chain, store]); // eslint-disable-line react-hooks/exhaustive-deps

    // Current turn info
    const currentTurnPlayerId =
        gameData.playOrder[gameData.currentTurnIndex] ?? "";
    const isMyTurn = currentTurnPlayerId === userId;
    const playerCount =
        playerData?.localOrdering?.length ?? gameData.playOrder.length;
    const isLeader = userId === gameData.leaderId;
    const ordering = playerData?.localOrdering ?? gameData.playOrder;

    // Sync selected tile to store for ghost previews
    const selectedTile = useMemo(() => {
        if (selectedTileIndex === null || !playerData?.hand) return null;
        const tile = playerData.hand[selectedTileIndex];
        return tile ? tileToDomino(tile) : null;
    }, [selectedTileIndex, playerData?.hand]);

    useEffect(() => {
        store.getState().selectTile(selectedTile);
    }, [selectedTile, store]);

    // Reset selection on turn change
    useEffect(() => {
        setSelectedTileIndex(null);
    }, [gameData.currentTurnIndex]);

    // Calculate disabled (unplayable) tile indices
    const disabledIndices = useMemo(() => {
        if (!isMyTurn || !playerData?.hand) return [];
        const indices: number[] = [];
        for (let i = 0; i < playerData.hand.length; i++) {
            const domino = tileToDomino(playerData.hand[i]);
            // First play: all tiles playable
            if (chain.segments.length === 0) continue;
            if (getPlayableEnds(domino, chain).length === 0) indices.push(i);
        }
        return indices;
    }, [isMyTurn, playerData?.hand, chain]);

    // Handle tile selection toggle
    const handleTileClick = useCallback((index: number) => {
        setSelectedTileIndex((prev) => (prev === index ? null : index));
    }, []);

    // Handle confirmed tile placement
    const handlePlaceTile = useCallback(() => {
        if (
            selectedTileIndex === null ||
            !playerData?.hand ||
            !dispatchOptimisticAction
        )
            return;
        const tile = playerData.hand[selectedTileIndex];
        if (!tile) return;

        const ghost = useDominoesStore.getState().ghostPlacements;
        if (ghost.length === 1) {
            const side = ghost[0].end === "head" ? "left" : "right";
            dispatchOptimisticAction("PLACE_TILE", { tile, side });
            setSelectedTileIndex(null);
            store.getState().clearSelection();
        }
    }, [selectedTileIndex, playerData?.hand, dispatchOptimisticAction, store]);

    // Handle ghost click → place at specific end
    const handlePlaceAtEnd = useCallback(
        (end: ChainEnd) => {
            if (
                selectedTileIndex === null ||
                !playerData?.hand ||
                !dispatchOptimisticAction
            )
                return;
            const tile = playerData.hand[selectedTileIndex];
            if (!tile) return;

            const side: "left" | "right" = end === "head" ? "left" : "right";
            dispatchOptimisticAction("PLACE_TILE", { tile, side });
            setSelectedTileIndex(null);
            store.getState().clearSelection();
        },
        [selectedTileIndex, playerData?.hand, dispatchOptimisticAction, store],
    );

    // Handle pass
    const handlePass = useCallback(() => {
        if (!dispatchOptimisticAction) return;
        dispatchOptimisticAction("PASS", {});
    }, [dispatchOptimisticAction]);

    // Check if current player must pass (no playable tiles)
    const mustPass = useMemo(() => {
        if (gameData.phase !== "playing") return false;
        if (!isMyTurn || !playerData?.hand || playerData.hand.length === 0)
            return false;
        if (chain.segments.length === 0) return false;
        return playerData.hand.every((tile) => {
            const d = tileToDomino(tile);
            return getPlayableEnds(d, chain).length === 0;
        });
    }, [gameData.phase, isMyTurn, playerData?.hand, chain]);

    // Ghost placements from store
    const ghostPlacements = useDominoesStore((s) => s.ghostPlacements);

    // Score data for GameScoreboard
    const teamScores = useMemo(() => {
        if (!gameData.playerScores) return [];
        return gameData.playOrder.map((pid) => ({
            teamId: pid,
            teamName: gameData.players?.[pid]?.name || pid,
            players: [gameData.players?.[pid]?.name || pid],
            score: gameData.playerScores[pid] ?? 0,
        }));
    }, [gameData.playOrder, gameData.players, gameData.playerScores]);

    // Guard: during debug game switching, stale data from another game may arrive
    // Placed after all hooks to satisfy Rules of Hooks
    if (!gameData.playerScores || !gameData.handsCounts) {
        return null;
    }

    // Action bar visibility
    const tileSelected = selectedTileIndex !== null && isMyTurn && !isSpectator;
    const showPlaceAction = tileSelected && ghostPlacements.length === 1;
    const showDualChoice = tileSelected && ghostPlacements.length === 2;

    return (
        <div className="h-[100dvh] w-full overflow-hidden">
            <RotateDeviceOverlay />
            <LayoutGroup>
                <GameTable
                    playerCount={playerCount}
                    feltGradient="from-[#0f3d26] via-[#1a5c3a] to-[#0f3d26]"
                >
                    {/* Player Edge Regions */}
                    {ordering.map((playerId, index) => {
                        const isLocal = index === 0;
                        const edgePosition = getEdgePosition(
                            index,
                            playerCount,
                        );
                        const isCurrentTurn = currentTurnPlayerId === playerId;
                        const player = gameData.players?.[playerId];

                        return (
                            <EdgeRegion
                                key={playerId}
                                position={edgePosition}
                                isHero={isLocal}
                            >
                                <PlayerInfo
                                    playerId={playerId}
                                    playerName={player?.name || "Unknown"}
                                    isCurrentTurn={isCurrentTurn}
                                    isLocalPlayer={isLocal}
                                    seatPosition={edgePosition}
                                    customStats={() => (
                                        <div className="flex gap-1 items-center">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 bg-black/30 border-white/20 text-white/80"
                                            >
                                                {gameData.playerScores[
                                                    playerId
                                                ] ?? 0}{" "}
                                                pts
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 bg-black/30 border-white/20 text-white/80"
                                            >
                                                {gameData.handsCounts[
                                                    playerId
                                                ] ?? 0}{" "}
                                                tiles
                                            </Badge>
                                        </div>
                                    )}
                                />
                                {isLocal && playerData?.hand && !isSpectator ? (
                                    <DominoHand
                                        tiles={playerData.hand}
                                        interactive={
                                            isMyTurn &&
                                            gameData.phase === "playing"
                                        }
                                        selectedIndex={selectedTileIndex}
                                        disabledIndices={disabledIndices}
                                        onTileClick={(i) => handleTileClick(i)}
                                    />
                                ) : (
                                    <OpponentTiles
                                        tileCount={
                                            gameData.handsCounts[playerId] ?? 0
                                        }
                                        playerId={playerId}
                                    />
                                )}
                            </EdgeRegion>
                        );
                    })}

                    {/* Center: Game Board */}
                    <div
                        className="relative overflow-hidden rounded-xl z-10"
                        style={{
                            gridArea: "center",
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0,
                            minHeight: 0,
                            margin: "4px",
                        }}
                    >
                        <GameBoard onPlaceAtEnd={handlePlaceAtEnd} />
                        <BoardControls />
                    </div>
                </GameTable>
            </LayoutGroup>

            {/* Game Menu */}
            <GameMenu isLeader={isLeader} roomCode={roomCode || ""} />

            {/* Scoreboard */}
            <GameScoreboard
                teams={teamScores}
                round={gameData.round}
                phase={gameData.phase}
                winTarget={gameData.settings?.winTarget}
            />

            {/* Action confirmation: Place tile */}
            <ActionConfirmationBar
                isVisible={showPlaceAction}
                onConfirm={handlePlaceTile}
                onCancel={() => setSelectedTileIndex(null)}
                confirmLabel="Place Tile"
            />

            {/* Dual-end choice: Head or Tail */}
            {showDualChoice && (
                <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                    <span className="text-white/90 text-xs md:text-sm font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                        Play at which end?
                    </span>
                    <div className="flex gap-2 md:gap-3">
                        <Button
                            onClick={() => handlePlaceAtEnd("head")}
                            className="shadow-lg text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 h-auto bg-emerald-600 hover:bg-emerald-700"
                        >
                            Place Left
                        </Button>
                        <Button
                            onClick={() => handlePlaceAtEnd("tail")}
                            className="shadow-lg text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 h-auto bg-emerald-600 hover:bg-emerald-700"
                        >
                            Place Right
                        </Button>
                        <Button
                            onClick={() => setSelectedTileIndex(null)}
                            variant="secondary"
                            className="shadow-lg text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 h-auto"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Must pass */}
            {mustPass && !isSpectator && (
                <ActionConfirmationBar
                    isVisible={true}
                    onConfirm={handlePass}
                    confirmLabel="Pass"
                    confirmVariant="destructive"
                    message="No playable tiles"
                />
            )}

            {/* Flying tile animation overlay */}
            <FlyingTile />
        </div>
    );
}
