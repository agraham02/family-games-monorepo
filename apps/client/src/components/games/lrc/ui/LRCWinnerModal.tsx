"use client";

import React from "react";
import { LRCData } from "@shared/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Crown, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LRCWinnerModalProps {
    gameData: LRCData;
    myUserId: string | null;
}

export default function LRCWinnerModal({ gameData, myUserId }: LRCWinnerModalProps) {
    const { gameWinner, players, chips, settings, playOrder } = gameData;
    const isOpen = gameData.phase === "finished" && !!gameWinner;

    if (!isOpen || !gameWinner) return null;

    const winner = players[gameWinner];
    const isIWon = gameWinner === myUserId;
    const chipValue = settings.chipValue;
    const winnerChips = chips[gameWinner] ?? 0;
    const potWinnings = winnerChips * chipValue;

    // Sort players: winner first, then others by chip count (descending)
    const sortedPlayers = [...playOrder].sort((a, b) => {
        if (a === gameWinner) return -1;
        if (b === gameWinner) return 1;
        return (chips[b] ?? 0) - (chips[a] ?? 0);
    });

    return (
        <Dialog open={isOpen}>
            <DialogContent className="flex flex-col items-center gap-4 max-w-md">
                <DialogTitle className="flex flex-col items-center gap-2">
                    <Crown className="h-12 w-12 text-yellow-500" />
                    <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {isIWon ? "You Win! 🎉" : "Game Over!"}
                    </span>
                </DialogTitle>

                {/* Winner announcement */}
                <div className="text-center">
                    <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                        🏆 {winner?.name ?? "Unknown"} wins the pot!
                    </div>
                    {chipValue > 0 && (
                        <div className="text-base text-green-600 dark:text-green-400 font-medium mt-1">
                            +${potWinnings.toFixed(2)} ({winnerChips} chips × ${chipValue})
                        </div>
                    )}
                </div>

                {/* Final chip standings */}
                <div className="w-full space-y-2">
                    <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Final Standings
                    </div>
                    {sortedPlayers.map((playerId, index) => {
                        const player = players[playerId];
                        const playerChips = chips[playerId] ?? 0;
                        const isWinner = playerId === gameWinner;
                        const isMe = playerId === myUserId;
                        const netValue = isWinner
                            ? (playerChips - settings.startingChips) * chipValue
                            : -settings.startingChips * chipValue;

                        return (
                            <div
                                key={playerId}
                                className={cn(
                                    "flex justify-between items-center px-3 py-2 rounded-lg",
                                    isWinner
                                        ? "bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-400"
                                        : "bg-zinc-100 dark:bg-zinc-800"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-zinc-500">
                                        #{index + 1}
                                    </span>
                                    {isWinner && (
                                        <Crown className="w-4 h-4 text-yellow-500" />
                                    )}
                                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                                        {player?.name ?? "Unknown"}
                                    </span>
                                    {isMe && (
                                        <span className="text-xs text-blue-500">
                                            (You)
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {playerChips} chips
                                    </span>
                                    {chipValue > 0 && (
                                        <span
                                            className={cn(
                                                "text-sm font-medium flex items-center gap-0.5",
                                                netValue >= 0
                                                    ? "text-green-600 dark:text-green-400"
                                                    : "text-red-600 dark:text-red-400"
                                            )}
                                        >
                                            {netValue >= 0 ? (
                                                <TrendingUp className="w-3 h-3" />
                                            ) : (
                                                <TrendingDown className="w-3 h-3" />
                                            )}
                                            {netValue >= 0 ? "+" : ""}${netValue.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-2">
                    Return to lobby to play again
                </div>
            </DialogContent>
        </Dialog>
    );
}
