"use client";

import React, { useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { LRCData, LRCPlayerData } from "@shared/types";
import { GameMenu } from "@/components/games/shared";
import LRCGameTable from "./ui/LRCGameTable";
import LRCGameSummary from "./ui/LRCGameSummary";

interface LRCProps {
    gameData: LRCData;
    playerData: LRCPlayerData | null;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    isSpectator?: boolean;
    roomCode?: string;
}

export default function LRC({
    gameData,
    playerData,
    dispatchOptimisticAction,
    isSpectator,
    roomCode,
}: LRCProps) {
    const { socket, connected } = useWebSocket();
    const { roomId, userId } = useSession();

    const sendGameAction = useCallback(
        (type: string, payload: unknown) => {
            if (dispatchOptimisticAction) {
                dispatchOptimisticAction(type, payload);
            } else {
                if (!socket || !connected) return;
                const action = { type, payload, userId };
                socket.emit("game_action", { roomId, action });
            }
        },
        [dispatchOptimisticAction, socket, connected, userId, roomId]
    );

    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    const isMyTurn = currentPlayerId === userId && !isSpectator;
    const isLeader = userId === gameData.leaderId;

    const handleRoll = useCallback(() => {
        if (!isMyTurn) return;
        sendGameAction("ROLL_DICE", {});
    }, [isMyTurn, sendGameAction]);

    return (
        <div className="h-screen w-full overflow-hidden">
            <LRCGameTable
                gameData={gameData}
                playerData={playerData}
                isMyTurn={isMyTurn}
                isSpectator={isSpectator ?? false}
                onRoll={handleRoll}
            />

            {/* Game Menu */}
            <GameMenu isLeader={isLeader} roomCode={roomCode || roomId || ""} />

            {/* Game Summary */}
            {gameData.phase === "finished" && gameData.gameWinner && (
                <LRCGameSummary
                    gameData={gameData}
                    isLeader={isLeader}
                    onReturnToLobby={() => {
                        if (!socket || !connected) return;
                        socket.emit("abort_game", { roomId, userId });
                    }}
                />
            )}
        </div>
    );
}
