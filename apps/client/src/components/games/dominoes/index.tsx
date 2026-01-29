"use client";

import React, { useCallback } from "react";
import { DominoesData, DominoesPlayerData, Tile } from "@family-games/shared";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { DominoesGameTable } from "./ui";

interface DominoesProps {
    gameData: DominoesData;
    playerData: DominoesPlayerData;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    roomCode?: string;
}

/**
 * Dominoes game component - Main entry point for the Dominoes game UI.
 */
export default function Dominoes({
    gameData,
    playerData,
    dispatchOptimisticAction,
    roomCode,
}: DominoesProps) {
    const { socket } = useWebSocket();

    // Get current player ID
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    const localPlayerId = playerData.localOrdering?.[0];
    const isMyTurn = currentPlayerId === localPlayerId;

    // Handle placing a tile
    const handlePlaceTile = useCallback(
        (tile: Tile, side: "left" | "right") => {
            if (!socket || !isMyTurn) return;

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
        [socket, isMyTurn, dispatchOptimisticAction, localPlayerId, roomCode],
    );

    // Handle passing turn
    const handlePass = useCallback(() => {
        if (!socket || !isMyTurn) return;

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
    }, [socket, isMyTurn, dispatchOptimisticAction, localPlayerId, roomCode]);

    return (
        <DominoesGameTable
            gameData={gameData}
            playerData={playerData}
            isMyTurn={isMyTurn}
            showHints={true}
            onPlaceTile={handlePlaceTile}
            onPass={handlePass}
        />
    );
}
