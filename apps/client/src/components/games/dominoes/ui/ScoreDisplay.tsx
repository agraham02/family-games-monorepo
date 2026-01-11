"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Players } from "@/types";

interface ScoreDisplayProps {
    players: Players;
    playerScores: Record<string, number>;
    playOrder: string[];
    currentTurnIndex: number;
    handsCounts: Record<string, number>;
    winTarget: number;
    localOrdering: string[];
    currentUserId: string;
    className?: string;
}

export default function ScoreDisplay({
    players,
    playerScores,
    playOrder,
    currentTurnIndex,
    handsCounts,
    winTarget,
    localOrdering,
    currentUserId,
    className,
}: ScoreDisplayProps) {
    const currentPlayerId = playOrder[currentTurnIndex];

    return (
        <div className={cn("w-full", className)}>
            {/* Win target display */}
            <div className="text-center mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                First to{" "}
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {winTarget}
                </span>{" "}
                points wins
            </div>

            {/* Players grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {localOrdering.map((playerId) => {
                    const player = players[playerId];
                    const score = playerScores[playerId] ?? 0;
                    const tilesInHand = handsCounts[playerId] ?? 0;
                    const isCurrentTurn = playerId === currentPlayerId;
                    const isMe = playerId === currentUserId;
                    const isDisconnected = player?.isConnected === false;

                    return (
                        <div
                            key={playerId}
                            className={cn(
                                "relative rounded-lg p-3 transition-all duration-300",
                                isCurrentTurn
                                    ? "bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-400"
                                    : "bg-zinc-100 dark:bg-zinc-800",
                                isDisconnected && "opacity-50"
                            )}
                        >
                            {/* Current turn indicator */}
                            {isCurrentTurn && (
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                                    Playing
                                </div>
                            )}

                            {/* Player name */}
                            <div className="font-medium text-sm truncate">
                                {player?.name || "Unknown"}
                                {isMe && (
                                    <span className="ml-1 text-xs text-blue-500">
                                        (You)
                                    </span>
                                )}
                            </div>

                            {/* Connection status */}
                            {isDisconnected && (
                                <div className="text-xs text-red-500">
                                    Disconnected
                                </div>
                            )}

                            {/* Score */}
                            <div className="text-2xl font-bold mt-1">
                                {score}
                            </div>

                            {/* Tiles in hand */}
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                {tilesInHand} tile{tilesInHand !== 1 ? "s" : ""}
                            </div>

                            {/* Progress bar to win */}
                            <div className="mt-2 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500",
                                        score >= winTarget
                                            ? "bg-green-500"
                                            : "bg-blue-500"
                                    )}
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            (score / winTarget) * 100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
