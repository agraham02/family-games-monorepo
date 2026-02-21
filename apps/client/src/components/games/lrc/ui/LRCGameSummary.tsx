"use client";

import React from "react";
import { LRCData } from "@shared/types";
import { Button } from "@/components/ui/button";

interface LRCGameSummaryProps {
    gameData: LRCData;
    isLeader: boolean;
    onReturnToLobby: () => void;
}

export default function LRCGameSummary({
    gameData,
    isLeader,
    onReturnToLobby,
}: LRCGameSummaryProps) {
    const winner = gameData.gameWinner
        ? gameData.players[gameData.gameWinner]
        : null;
    const chipValue = gameData.settings.chipValue ?? 0;
    const potValue = gameData.pot * chipValue;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5">
                {/* Trophy Icon */}
                <div className="text-6xl">🏆</div>

                {/* Winner */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {winner?.name ?? "Unknown"} wins!
                    </h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        Last player standing
                    </p>
                </div>

                {/* Pot Summary */}
                <div className="w-full bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 flex flex-col items-center gap-1">
                    <span className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">
                        Final Pot
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                            {gameData.pot}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400">
                            chips
                        </span>
                    </div>
                    {chipValue > 0 && (
                        <span className="text-xl font-semibold text-green-600 dark:text-green-400">
                            ${potValue.toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Final chip counts */}
                <div className="w-full">
                    <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                        Final Standings
                    </h3>
                    <div className="flex flex-col gap-1">
                        {gameData.playOrder.map((playerId) => {
                            const player = gameData.players[playerId];
                            const chips = gameData.chips[playerId] ?? 0;
                            const isWinner =
                                playerId === gameData.gameWinner;
                            return (
                                <div
                                    key={playerId}
                                    className={`flex justify-between items-center px-3 py-1.5 rounded-lg ${
                                        isWinner
                                            ? "bg-amber-100 dark:bg-amber-900/30"
                                            : "bg-zinc-50 dark:bg-zinc-800"
                                    }`}
                                >
                                    <span
                                        className={`font-medium ${
                                            isWinner
                                                ? "text-amber-700 dark:text-amber-300"
                                                : "text-zinc-700 dark:text-zinc-300"
                                        }`}
                                    >
                                        {isWinner && "🏆 "}
                                        {player?.name ?? playerId}
                                    </span>
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {chips} chip{chips !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Return to lobby - only leader can trigger for all */}
                {isLeader && (
                    <Button
                        onClick={onReturnToLobby}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                        Return to Lobby
                    </Button>
                )}
                {!isLeader && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                        Waiting for the leader to return to lobby...
                    </p>
                )}
            </div>
        </div>
    );
}
