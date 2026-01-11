"use client";

import React, { useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useSession } from "@/contexts/SessionContext";
import { DominoesData, DominoesPlayerData, Tile as TileType } from "@/types";
import DominoesGameTable from "./ui/DominoesGameTable";
import RoundSummaryModal from "./ui/RoundSummaryModal";
import {
    GameMenu,
    GameSettingToggle,
    useGameSetting,
} from "@/components/games/shared";
import { Lightbulb } from "lucide-react";

interface DominoesProps {
    gameData: DominoesData;
    playerData: DominoesPlayerData;
    dispatchOptimisticAction?: (type: string, payload: unknown) => void;
    roomCode?: string;
}

export default function Dominoes({
    gameData,
    playerData,
    dispatchOptimisticAction,
    roomCode,
}: DominoesProps) {
    const { socket, connected } = useWebSocket();
    const { roomId, userId } = useSession();

    const sendGameAction = useCallback(
        (type: string, payload: unknown) => {
            // Use optimistic action dispatcher if available, otherwise fallback to direct emit
            if (dispatchOptimisticAction) {
                dispatchOptimisticAction(type, payload);
            } else {
                // Fallback for backwards compatibility
                if (!socket || !connected) return;
                const action = {
                    type,
                    payload,
                    userId,
                };
                socket.emit("game_action", { roomId, action });
            }
        },
        [dispatchOptimisticAction, socket, connected, userId, roomId]
    );

    // Derived state
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    const isMyTurn = currentPlayerId === userId;
    const isLeader = userId === gameData.leaderId;
    const showHints = useGameSetting("dominoes.showHints", false);

    // Handle placing a tile
    const handlePlaceTile = useCallback(
        (tile: TileType, side: "left" | "right") => {
            sendGameAction("PLACE_TILE", { tile, side });
        },
        [sendGameAction]
    );

    // Handle pass
    const handlePass = useCallback(() => {
        sendGameAction("PASS", {});
    }, [sendGameAction]);

    return (
        <div className="h-screen w-full overflow-hidden">
            <DominoesGameTable
                gameData={gameData}
                playerData={playerData}
                isMyTurn={isMyTurn}
                showHints={showHints}
                onPlaceTile={handlePlaceTile}
                onPass={handlePass}
            />

            {/* Game Menu */}
            <GameMenu isLeader={isLeader} roomCode={roomCode || roomId}>
                <GameSettingToggle
                    storageKey="dominoes.showHints"
                    label="Show Valid Moves"
                    icon={<Lightbulb className="h-4 w-4" />}
                    defaultValue={false}
                />
            </GameMenu>

            {/* Round Summary Modal */}
            <RoundSummaryModal
                gameData={gameData}
                sendGameAction={sendGameAction}
            />
        </div>
    );
}
