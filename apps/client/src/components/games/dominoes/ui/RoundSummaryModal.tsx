"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/contexts/SessionContext";
import { DominoesData } from "@/types";
import { cn } from "@/lib/utils";
import { Trophy, Crown } from "lucide-react";

interface RoundSummaryModalProps {
    gameData: DominoesData;
    sendGameAction: (type: string, payload: unknown) => void;
}

export default function RoundSummaryModal({
    gameData,
    sendGameAction,
}: RoundSummaryModalProps) {
    const { userId } = useSession();

    const isRoundSummary = gameData.phase === "round-summary";
    const isFinished = gameData.phase === "finished";
    const isOpen = isRoundSummary || isFinished;

    const roundWinner = gameData.roundWinner;
    const isRoundTie = gameData.isRoundTie;
    const gameWinner = gameData.gameWinner;
    const players = gameData.players;
    const playerScores = gameData.playerScores;
    const roundPipCounts = gameData.roundPipCounts || {};

    // Sort players by score (descending)
    const sortedPlayers = Object.keys(playerScores).sort(
        (a, b) => playerScores[b] - playerScores[a]
    );

    return (
        <Dialog open={isOpen}>
            <DialogContent className="flex flex-col items-center gap-4 max-w-md">
                <DialogTitle className="flex flex-col items-center gap-2">
                    {isFinished ? (
                        <>
                            <Crown className="h-10 w-10 text-yellow-500" />
                            <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                                Game Over!
                            </span>
                        </>
                    ) : (
                        <>
                            <Trophy className="h-8 w-8 text-yellow-500" />
                            <span className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">
                                Round {gameData.round} Complete
                            </span>
                        </>
                    )}
                </DialogTitle>

                {/* Game winner announcement */}
                {isFinished && gameWinner && (
                    <div className="text-center mb-4">
                        <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                            🎉 {players[gameWinner]?.name || "Unknown"} wins! 🎉
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                            Final Score: {playerScores[gameWinner]} points
                        </div>
                    </div>
                )}

                {/* Round winner announcement */}
                {isRoundSummary && (
                    <div className="text-center mb-2">
                        {roundWinner ? (
                            <div className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">
                                {players[roundWinner]?.name || "Unknown"} wins
                                this round!
                            </div>
                        ) : isRoundTie ? (
                            <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                                It&apos;s a tie! No points awarded.
                            </div>
                        ) : (
                            <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                                Blocked game - lowest pip count wins!
                            </div>
                        )}
                    </div>
                )}

                {/* Pip counts (round summary only) */}
                {isRoundSummary && Object.keys(roundPipCounts).length > 0 && (
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 mb-2">
                        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                            Remaining Pips
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {(() => {
                                // Find the lowest pip count for highlighting ties
                                const lowestPips = Math.min(
                                    ...Object.values(roundPipCounts)
                                );
                                const tiedPlayerIds = isRoundTie
                                    ? Object.entries(roundPipCounts)
                                          .filter(
                                              ([, pips]) => pips === lowestPips
                                          )
                                          .map(([id]) => id)
                                    : [];

                                return Object.entries(roundPipCounts).map(
                                    ([playerId, pips]) => (
                                        <div
                                            key={playerId}
                                            className={cn(
                                                "flex justify-between items-center px-2 py-1 rounded",
                                                playerId === roundWinner
                                                    ? "bg-green-100 dark:bg-green-900/30"
                                                    : tiedPlayerIds.includes(
                                                          playerId
                                                      )
                                                    ? "bg-amber-100 dark:bg-amber-900/30"
                                                    : "bg-white dark:bg-zinc-700"
                                            )}
                                        >
                                            <span className="text-sm truncate">
                                                {players[playerId]?.name ||
                                                    "Unknown"}
                                            </span>
                                            <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                                {pips}
                                            </span>
                                        </div>
                                    )
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Scoreboard */}
                <div className="w-full">
                    <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        {isFinished ? "Final Standings" : "Current Scores"}
                    </div>
                    <div className="space-y-2">
                        {sortedPlayers.map((playerId, index) => (
                            <div
                                key={playerId}
                                className={cn(
                                    "flex justify-between items-center px-3 py-2 rounded-lg",
                                    index === 0 && isFinished
                                        ? "bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-400"
                                        : "bg-zinc-100 dark:bg-zinc-800"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        #{index + 1}
                                    </span>
                                    <span className="font-medium">
                                        {players[playerId]?.name || "Unknown"}
                                    </span>
                                    {playerId === userId && (
                                        <span className="text-xs text-blue-500">
                                            (You)
                                        </span>
                                    )}
                                </div>
                                <span className="font-bold text-lg">
                                    {playerScores[playerId]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Continue button (leader only, round summary only) */}
                {isRoundSummary && userId === gameData.leaderId && (
                    <Button
                        className="mt-4 w-full text-base font-semibold py-3 rounded-lg shadow-md"
                        onClick={() =>
                            sendGameAction("CONTINUE_AFTER_ROUND_SUMMARY", {})
                        }
                    >
                        Start Next Round
                    </Button>
                )}

                {/* Close button (finished) */}
                {isFinished && (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                        Return to lobby to play again
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
