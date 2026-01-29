"use client";

import React, { useCallback } from "react";
import { DominoesData, DominoesPlayerData, Tile } from "@family-games/shared";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { GameMenu } from "@/components/games/shared";
import { DominoesGameTable } from "./ui";

interface DominoesProps {
    gameData: DominoesData;
    playerData: DominoesPlayerData | null;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    isSpectator?: boolean;
    roomCode?: string;
}

/**
 * Dominoes game component - Main entry point for the Dominoes game UI.
 * Supports both live play (with socket) and debug mode (without socket).
 */
export default function Dominoes({
    gameData,
    playerData,
    dispatchOptimisticAction,
    isSpectator = false,
    roomCode,
}: DominoesProps) {
    // Try to get socket, but it may not be available in debug mode
    let socket: ReturnType<typeof useWebSocket>["socket"] | null = null;
    try {
        const wsContext = useWebSocket();
        socket = wsContext.socket;
    } catch {
        // WebSocket context not available (debug mode)
    }

    // Try to get session context for user info
    let userId: string | undefined;
    let roomId: string | undefined;
    try {
        const sessionContext = useSession();
        userId = sessionContext.userId;
        roomId = sessionContext.roomId;
    } catch {
        // Session context not available (debug mode)
    }

    // Determine if we're in debug mode (no socket but have dispatchOptimisticAction)
    const isDebugMode = !socket && !!dispatchOptimisticAction;

    // Determine if current user is the room leader
    const isLeader = userId === gameData.leaderId;

    // Get current player ID
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    const localPlayerId = playerData?.localOrdering?.[0];
    const isMyTurn = currentPlayerId === localPlayerId && !isSpectator;

    // Handle placing a tile
    const handlePlaceTile = useCallback(
        (tile: Tile, side: "left" | "right") => {
            if (!isMyTurn) return;

            // In debug mode, just dispatch the action
            if (isDebugMode && dispatchOptimisticAction) {
                dispatchOptimisticAction("PLACE_TILE", {
                    tile,
                    side,
                    playerId: localPlayerId,
                });
                return;
            }

            // Live mode - requires socket
            if (!socket) return;

            // Dispatch optimistic update if available
            if (dispatchOptimisticAction) {
                dispatchOptimisticAction("PLACE_TILE", {
                    tile,
                    side,
                    playerId: localPlayerId,
                });
            }

            // Send to server
            socket.emit("game:action", {
                roomCode,
                action: {
                    type: "PLACE_TILE",
                    tile,
                    side,
                },
            });
        },
        [
            socket,
            isMyTurn,
            isDebugMode,
            dispatchOptimisticAction,
            localPlayerId,
            roomCode,
        ],
    );

    // Handle passing turn
    const handlePass = useCallback(() => {
        if (!isMyTurn) return;

        // In debug mode, just dispatch the action
        if (isDebugMode && dispatchOptimisticAction) {
            dispatchOptimisticAction("PASS", {
                playerId: localPlayerId,
            });
            return;
        }

        // Live mode - requires socket
        if (!socket) return;

        // Dispatch optimistic update if available
        if (dispatchOptimisticAction) {
            dispatchOptimisticAction("PASS", {
                playerId: localPlayerId,
            });
        }

        // Send to server
        socket.emit("game:action", {
            roomCode,
            action: {
                type: "PASS",
            },
        });
    }, [
        socket,
        isMyTurn,
        isDebugMode,
        dispatchOptimisticAction,
        localPlayerId,
        roomCode,
    ]);

    // If no player data (spectator), render with empty hand
    if (!playerData) {
        return (
            <>
                <GameMenu
                    isLeader={isLeader}
                    roomCode={roomCode || roomId || ""}
                />
                <DominoesGameTable
                    gameData={gameData}
                    playerData={{ hand: [], localOrdering: gameData.playOrder }}
                    isMyTurn={false}
                    showHints={false}
                    onPlaceTile={() => {}}
                    onPass={() => {}}
                />
            </>
        );
    }

    return (
        <>
            <GameMenu isLeader={isLeader} roomCode={roomCode || roomId || ""} />
            <DominoesGameTable
                gameData={gameData}
                playerData={playerData}
                isMyTurn={isMyTurn}
                showHints={true}
                onPlaceTile={handlePlaceTile}
                onPass={handlePass}
            />
        </>
    );
}
