"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LRCData } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Die, ChipStack, CenterPot } from "./LRCComponents";

interface LRCGameTableProps {
    gameData: LRCData;
    isMyTurn: boolean;
    userId: string | null;
    onRollDice: () => void;
    isSpectator?: boolean;
}

/**
 * The main LRC game table UI.
 */
export default function LRCGameTable({
    gameData,
    isMyTurn,
    userId,
    onRollDice,
    isSpectator,
}: LRCGameTableProps) {
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    const currentPlayerName =
        gameData.players[currentPlayerId]?.name || "Unknown";
    const myChips = userId ? (gameData.chips[userId] ?? 0) : 0;

    return (
        <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">🎲 Left Right Center</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Round {gameData.round}
                    </span>
                </div>
                {gameData.settings.chipValue > 0 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        ${gameData.settings.chipValue.toFixed(2)}/chip
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Current turn indicator */}
                {gameData.phase === "rolling" && (
                    <div
                        className={cn(
                            "text-center py-2 px-4 rounded-xl text-sm font-medium",
                            isMyTurn
                                ? "bg-primary text-primary-foreground"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        )}
                    >
                        {isMyTurn
                            ? "🎲 Your turn to roll!"
                            : `Waiting for ${currentPlayerName} to roll...`}
                    </div>
                )}

                {/* Center pot */}
                <CenterPot
                    amount={gameData.centerPot}
                    chipValue={gameData.settings.chipValue}
                />

                {/* Players */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {gameData.playOrder.map((playerId) => (
                        <ChipStack
                            key={playerId}
                            count={gameData.chips[playerId] ?? 0}
                            playerId={playerId}
                            players={gameData.players}
                            isCurrentPlayer={
                                playerId === currentPlayerId &&
                                gameData.phase === "rolling"
                            }
                            isMe={playerId === userId}
                        />
                    ))}
                </div>

                {/* Last roll display */}
                {gameData.lastRoll && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                            Last Roll -{" "}
                            {gameData.players[gameData.lastRoll.playerId]
                                ?.name || "Unknown"}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {gameData.lastRoll.dice.length > 0 ? (
                                gameData.lastRoll.dice.map((face, i) => (
                                    <Die key={i} face={face} />
                                ))
                            ) : (
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                    No dice rolled (0 chips)
                                </span>
                            )}
                        </div>
                        {gameData.lastRoll.dice.length > 0 && (
                            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex gap-3 flex-wrap">
                                {gameData.lastRoll.lefts > 0 && (
                                    <span>
                                        ← {gameData.lastRoll.lefts} chip
                                        {gameData.lastRoll.lefts !== 1
                                            ? "s"
                                            : ""}{" "}
                                        left
                                    </span>
                                )}
                                {gameData.lastRoll.rights > 0 && (
                                    <span>
                                        → {gameData.lastRoll.rights} chip
                                        {gameData.lastRoll.rights !== 1
                                            ? "s"
                                            : ""}{" "}
                                        right
                                    </span>
                                )}
                                {gameData.lastRoll.centers > 0 && (
                                    <span>
                                        ⬤ {gameData.lastRoll.centers} chip
                                        {gameData.lastRoll.centers !== 1
                                            ? "s"
                                            : ""}{" "}
                                        to center
                                    </span>
                                )}
                                {gameData.lastRoll.dots > 0 && (
                                    <span>
                                        ● {gameData.lastRoll.dots} chip
                                        {gameData.lastRoll.dots !== 1
                                            ? "s"
                                            : ""}{" "}
                                        kept
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Roll button */}
            {gameData.phase === "rolling" && !isSpectator && (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <Button
                        onClick={onRollDice}
                        disabled={!isMyTurn}
                        className="w-full h-14 text-lg font-bold"
                        size="lg"
                    >
                        {isMyTurn
                            ? `🎲 Roll ${Math.min(myChips, 3)} ${Math.min(myChips, 3) === 1 ? "Die" : "Dice"}`
                            : `Waiting for ${currentPlayerName}...`}
                    </Button>
                </div>
            )}
        </div>
    );
}
