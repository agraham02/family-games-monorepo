"use client";

import React, { useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { LRCData, LRCPlayerData } from "@shared/types";
import LRCGameBoard from "./ui/LRCGameBoard";
import LRCWinnerModal from "./ui/LRCWinnerModal";
import { GameMenu } from "@/components/games/shared";

interface LRCProps {
    gameData: LRCData;
    playerData: LRCPlayerData | null;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    roomCode?: string;
}

export default function LRC({
    gameData,
    playerData: _playerData,
    dispatchOptimisticAction,
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
        <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
            <div className="flex justify-center py-4">
                <LRCGameBoard
                    gameData={gameData}
                    myUserId={userId ?? null}
                    isMyTurn={isMyTurn}
                    onRollDice={handleRollDice}
                />
            </div>

            {/* Game Menu */}
            <GameMenu isLeader={isLeader} roomCode={roomCode || roomId} />

            {/* Winner Modal */}
            <LRCWinnerModal gameData={gameData} myUserId={userId ?? null} />
        </div>
    );
}
