"use client";

import React, { useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { LRCData, LRCPlayerData } from "@shared/types";
import LRCGameTable from "./ui/LRCGameTable";
import GameSummaryModal from "./ui/GameSummaryModal";
import { GameMenu } from "@/components/games/shared";

interface LRCProps {
    gameData: LRCData;
    playerData: LRCPlayerData | null;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    isSpectator?: boolean;
    roomCode?: string;
}

export default function LRC({
    gameData,
    playerData: _playerData,
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
    const isMyTurn = currentPlayerId === userId;
    const isLeader = userId === gameData.leaderId;

    const handleRollDice = useCallback(() => {
        sendGameAction("ROLL_DICE", {});
    }, [sendGameAction]);

    return (
        <div className="h-screen w-full overflow-hidden">
            <LRCGameTable
                gameData={gameData}
                isMyTurn={isMyTurn}
                userId={userId}
                onRollDice={handleRollDice}
                isSpectator={isSpectator}
            />

            {/* Game Menu */}
            <GameMenu isLeader={isLeader} roomCode={roomCode || roomId || ""} />

            {/* Game Summary Modal (shown when game is finished) */}
            <GameSummaryModal gameData={gameData} roomCode={roomCode} />
        </div>
    );
}
