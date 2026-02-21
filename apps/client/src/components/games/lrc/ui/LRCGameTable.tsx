"use client";

import React from "react";
import { LRCData, LRCPlayerData, LRCDieFace } from "@shared/types";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LRCGameTableProps {
    gameData: LRCData;
    playerData: LRCPlayerData | null;
    isMyTurn: boolean;
    isSpectator: boolean;
    onRoll: () => void;
}

function DieFaceDisplay({ face }: { face: LRCDieFace }) {
    const faceConfig: Record<
        LRCDieFace,
        { label: string; className: string }
    > = {
        L: {
            label: "L",
            className: "bg-blue-500 text-white",
        },
        R: {
            label: "R",
            className: "bg-green-500 text-white",
        },
        C: {
            label: "C",
            className: "bg-amber-500 text-white",
        },
        "*": {
            label: "•",
            className: "bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200",
        },
    };

    const config = faceConfig[face];
    return (
        <div
            className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold shadow-md",
                config.className
            )}
        >
            {config.label}
        </div>
    );
}

function ChipDisplay({ count }: { count: number }) {
    const maxDisplay = 10;
    const displayed = Math.min(count, maxDisplay);

    if (count === 0) {
        return (
            <span className="text-sm text-zinc-400 dark:text-zinc-500 italic">
                No chips
            </span>
        );
    }

    return (
        <div className="flex flex-wrap gap-1 justify-center">
            {Array.from({ length: displayed }).map((_, i) => (
                <div
                    key={i}
                    className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-sm"
                />
            ))}
            {count > maxDisplay && (
                <span className="text-xs text-zinc-500 self-center">
                    +{count - maxDisplay}
                </span>
            )}
        </div>
    );
}

export default function LRCGameTable({
    gameData,
    isMyTurn,
    isSpectator,
    onRoll,
}: LRCGameTableProps) {
    const { userId } = useSession();

    const localOrdering = React.useMemo(() => {
        if (!userId) return gameData.playOrder;
        const idx = gameData.playOrder.indexOf(userId);
        if (idx === -1) return gameData.playOrder;
        return [
            ...gameData.playOrder.slice(idx),
            ...gameData.playOrder.slice(0, idx),
        ];
    }, [userId, gameData.playOrder]);

    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    const currentPlayerName =
        gameData.players[currentPlayerId]?.name ?? "Unknown";

    const totalChips = Object.values(gameData.chips).reduce((a, b) => a + b, 0);

    return (
        <div className="h-full w-full flex flex-col items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-4 gap-4">
            {/* Header: Current Turn & Pot */}
            <div className="w-full max-w-lg flex flex-col items-center gap-2 pt-4">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Left Right Center
                </h1>
                <div className="flex gap-6 items-center">
                    <div className="flex flex-col items-center">
                        <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Pot
                        </span>
                        <div className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-600 shadow-sm" />
                            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                {gameData.pot}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Total in Play
                        </span>
                        <span className="text-xl font-bold text-zinc-700 dark:text-zinc-300">
                            {totalChips + gameData.pot}
                        </span>
                    </div>
                    {gameData.settings.chipValue > 0 && (
                        <div className="flex flex-col items-center">
                            <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                Pot Value
                            </span>
                            <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                $
                                {(
                                    gameData.pot * gameData.settings.chipValue
                                ).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Turn indicator */}
                {gameData.phase === "playing" && (
                    <div
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-semibold",
                            isMyTurn
                                ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                        )}
                    >
                        {isMyTurn
                            ? "🎲 Your turn — roll the dice!"
                            : `${currentPlayerName}'s turn`}
                    </div>
                )}
            </div>

            {/* Players */}
            <div className="w-full max-w-2xl flex-1 flex flex-col justify-center gap-3">
                {localOrdering.map((playerId) => {
                    const player = gameData.players[playerId];
                    const chips = gameData.chips[playerId] ?? 0;
                    const isCurrentTurn = playerId === currentPlayerId;
                    const isMe = playerId === userId;

                    return (
                        <div
                            key={playerId}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-xl border-2 transition-all",
                                isCurrentTurn && gameData.phase === "playing"
                                    ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 shadow-md"
                                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
                                chips === 0 && "opacity-60"
                            )}
                        >
                            {/* Player name */}
                            <div className="flex-shrink-0 w-28">
                                <p
                                    className={cn(
                                        "font-semibold truncate",
                                        isMe
                                            ? "text-indigo-600 dark:text-indigo-400"
                                            : "text-zinc-800 dark:text-zinc-200"
                                    )}
                                >
                                    {player?.name ?? playerId}
                                    {isMe && (
                                        <span className="ml-1 text-xs font-normal text-zinc-500">
                                            (you)
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {chips === 1
                                        ? "1 chip"
                                        : `${chips} chips`}
                                </p>
                            </div>

                            {/* Chip display */}
                            <div className="flex-1 min-w-0">
                                <ChipDisplay count={chips} />
                            </div>

                            {/* Turn indicator icon */}
                            {isCurrentTurn && gameData.phase === "playing" && (
                                <div className="flex-shrink-0 text-lg">🎲</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Last Roll */}
            {gameData.lastRoll && (
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Last Roll —{" "}
                        {gameData.players[gameData.lastRoll.playerId]?.name ??
                            "Unknown"}
                    </span>
                    <div className="flex gap-2">
                        {gameData.lastRoll.dice.map((face, i) => (
                            <DieFaceDisplay key={i} face={face} />
                        ))}
                        {gameData.lastRoll.dice.length === 0 && (
                            <span className="text-sm text-zinc-400 italic">
                                No dice (0 chips)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Roll Button */}
            {gameData.phase === "playing" && !isSpectator && (
                <div className="pb-6">
                    <Button
                        size="lg"
                        disabled={!isMyTurn}
                        onClick={onRoll}
                        className={cn(
                            "px-10 text-lg font-bold transition-all",
                            isMyTurn
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg scale-105"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        )}
                    >
                        🎲 Roll Dice
                    </Button>
                </div>
            )}
        </div>
    );
}
