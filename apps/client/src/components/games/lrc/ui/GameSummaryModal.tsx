"use client";

import React from "react";
import { LRCData } from "@shared/types";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { useWebSocket } from "@/contexts/WebSocketContext";

interface GameSummaryModalProps {
    gameData: LRCData;
    roomCode?: string;
}

/**
 * Displayed when the LRC game ends with a winner.
 */
export default function GameSummaryModal({
    gameData,
    roomCode,
}: GameSummaryModalProps) {
    const { userId, roomId } = useSession();
    const { socket } = useWebSocket();

    if (gameData.phase !== "finished" || !gameData.winnerId) return null;

    const winner = gameData.players[gameData.winnerId];
    const isWinner = gameData.winnerId === userId;
    const chipValue = gameData.settings.chipValue;
    const totalPot = Object.values(gameData.chips).reduce((a, b) => a + b, 0);

    function handleReturnToLobby() {
        if (socket && roomId && userId) {
            socket.emit("leave_game", { roomId, userId });
        }
        if (roomCode) {
            window.location.href = `/lobby/${roomCode}`;
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
                {/* Winner announcement */}
                <div className="text-center">
                    <div className="text-5xl mb-2">{isWinner ? "🏆" : "🎲"}</div>
                    <h2 className="text-2xl font-bold">
                        {isWinner ? "You Won!" : `${winner?.name || "Unknown"} Wins!`}
                    </h2>
                    {chipValue > 0 && totalPot > 0 && (
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
                            Pot worth: ${(totalPot * chipValue).toFixed(2)}
                        </p>
                    )}
                </div>

                {/* Final chip counts */}
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                        Final Chips
                    </h3>
                    <div className="flex flex-col gap-2">
                        {gameData.playOrder.map((playerId) => {
                            const player = gameData.players[playerId];
                            const chips = gameData.chips[playerId] ?? 0;
                            const isPlayerWinner = playerId === gameData.winnerId;
                            return (
                                <div
                                    key={playerId}
                                    className={`flex items-center justify-between p-2 rounded-lg ${
                                        isPlayerWinner
                                            ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold"
                                            : "text-zinc-700 dark:text-zinc-300"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        {isPlayerWinner && "🏆 "}
                                        {player?.name || "Unknown"}
                                        {playerId === userId && " (You)"}
                                    </span>
                                    <span>
                                        {chips} chip{chips !== 1 ? "s" : ""}
                                        {chipValue > 0 && chips > 0 && (
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                                                (${(chips * chipValue).toFixed(2)})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Button onClick={handleReturnToLobby} className="w-full" size="lg">
                    Return to Lobby
                </Button>
            </div>
        </div>
    );
}
