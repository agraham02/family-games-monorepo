"use client";

import React from "react";
import { LRCData } from "@shared/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import LRCDie from "./LRCDie";
import { Crown, CircleDot } from "lucide-react";

interface LRCGameBoardProps {
    gameData: LRCData;
    myUserId: string | null;
    isMyTurn: boolean;
    onRollDice: () => void;
}

export default function LRCGameBoard({
    gameData,
    myUserId,
    isMyTurn,
    onRollDice,
}: LRCGameBoardProps) {
    const { playOrder, currentTurnIndex, chips, pot, players, lastRoll, phase, gameWinner, settings } =
        gameData;

    const currentPlayerId = playOrder[currentTurnIndex];
    const chipValueLabel = settings.chipValue > 0 ? `$${settings.chipValue}/chip` : null;
    const potDollarValue = pot * settings.chipValue;

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-6">
            {/* Game title */}
            <div className="text-center">
                <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                    Left Right Center
                </h1>
                {chipValueLabel && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {chipValueLabel}
                    </p>
                )}
            </div>

            {/* Center Pot */}
            <div className="flex flex-col items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl px-8 py-4 shadow-md">
                <div className="flex items-center gap-2">
                    <CircleDot className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                        Center Pot
                    </span>
                </div>
                <div className="text-4xl font-bold text-amber-600 dark:text-amber-300">
                    {pot}
                </div>
                <div className="text-xs text-amber-500 dark:text-amber-400">
                    chips
                </div>
                {potDollarValue > 0 && (
                    <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        ${potDollarValue.toFixed(2)} value
                    </div>
                )}
            </div>

            {/* Last Roll Display */}
            {lastRoll && (
                <div className="flex flex-col items-center gap-2">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-medium">
                        {players[lastRoll.playerId]?.name ?? "Unknown"}&apos;s last roll
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        {lastRoll.dice.length > 0 ? (
                            lastRoll.dice.map((face, idx) => (
                                <LRCDie key={idx} face={face} size="md" />
                            ))
                        ) : (
                            <span className="text-zinc-400 text-sm italic">No dice rolled (0 chips)</span>
                        )}
                    </div>
                </div>
            )}

            {/* Player List */}
            <div className="w-full space-y-2">
                {playOrder.map((playerId) => {
                    const player = players[playerId];
                    const playerChips = chips[playerId] ?? 0;
                    const isCurrentTurn = playerId === currentPlayerId && phase === "playing";
                    const isMe = playerId === myUserId;
                    const isWinner = playerId === gameWinner;

                    return (
                        <div
                            key={playerId}
                            className={cn(
                                "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                                isWinner
                                    ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
                                    : isCurrentTurn
                                    ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                                    : playerChips === 0
                                    ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 opacity-60"
                                    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {isWinner && (
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                )}
                                {isCurrentTurn && !isWinner && (
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                )}
                                <span
                                    className={cn(
                                        "font-medium",
                                        isWinner
                                            ? "text-yellow-700 dark:text-yellow-300"
                                            : isCurrentTurn
                                            ? "text-green-700 dark:text-green-300"
                                            : "text-zinc-700 dark:text-zinc-300"
                                    )}
                                >
                                    {player?.name ?? "Unknown"}
                                    {isMe && (
                                        <span className="ml-1 text-xs text-blue-500">
                                            (You)
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <ChipDisplay count={playerChips} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Area */}
            {phase === "playing" && (
                <div className="flex flex-col items-center gap-2 w-full">
                    {isMyTurn ? (
                        <>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
                                {(chips[myUserId ?? ""] ?? 0) > 0
                                    ? `You have ${chips[myUserId ?? ""] ?? 0} chip${(chips[myUserId ?? ""] ?? 0) !== 1 ? "s" : ""}. Roll ${Math.min(chips[myUserId ?? ""] ?? 0, 3)} ${Math.min(chips[myUserId ?? ""] ?? 0, 3) !== 1 ? "dice" : "die"}!`
                                    : "You have no chips. Waiting to receive chips..."}
                            </div>
                            <Button
                                onClick={onRollDice}
                                size="lg"
                                className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-6 rounded-2xl shadow-lg"
                            >
                                🎲 Roll Dice
                            </Button>
                        </>
                    ) : (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center italic">
                            Waiting for{" "}
                            <span className="font-semibold not-italic text-zinc-700 dark:text-zinc-300">
                                {players[currentPlayerId]?.name ?? "Unknown"}
                            </span>{" "}
                            to roll...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/** Visual chip count display */
function ChipDisplay({ count }: { count: number }) {
    if (count === 0) {
        return (
            <span className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">
                0 chips
            </span>
        );
    }

    const displayChips = Math.min(count, 10);
    const hasMore = count > 10;

    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: displayChips }).map((_, i) => (
                <div
                    key={i}
                    className="w-4 h-4 rounded-full bg-amber-400 dark:bg-amber-500 border border-amber-600 dark:border-amber-700 shadow-sm"
                />
            ))}
            {hasMore && (
                <span className="text-xs text-zinc-500 ml-1">+{count - 10}</span>
            )}
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                ({count})
            </span>
        </div>
    );
}
