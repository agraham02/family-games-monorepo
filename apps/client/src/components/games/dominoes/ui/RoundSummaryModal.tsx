"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/contexts/SessionContext";
import { DominoesData } from "@shared/types";
import { cn } from "@/lib/utils";
import { Trophy, Users, Target } from "lucide-react";

const AUTO_CONTINUE_SECONDS = 8;

interface RoundSummaryModalProps {
    gameData: DominoesData;
    sendGameAction: (type: string, payload: unknown) => void;
}

export default function RoundSummaryModal({
    gameData,
    sendGameAction,
}: RoundSummaryModalProps) {
    const { userId } = useSession();
    const isLeader = userId === gameData.leaderId;

    // Only show for round-summary, not finished (GameSummaryModal handles that)
    const isRoundSummary = gameData.phase === "round-summary";
    const isOpen = isRoundSummary;
    const isTeamMode = gameData.settings.gameMode === "team";

    const roundWinner = gameData.roundWinner;
    const isRoundTie = gameData.isRoundTie;
    const players = gameData.players;
    const playerScores = gameData.playerScores;
    const roundPipCounts = gameData.roundPipCounts || {};
    const teams = gameData.teams;
    const teamScores = gameData.teamScores;
    const winningTeam = gameData.winningTeam;

    // Auto-continue countdown
    const [countdown, setCountdown] = useState(AUTO_CONTINUE_SECONDS);

    useEffect(() => {
        if (!isOpen || !isLeader) {
            setCountdown(AUTO_CONTINUE_SECONDS);
            return;
        }

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    sendGameAction("CONTINUE_AFTER_ROUND_SUMMARY", {});
                    return AUTO_CONTINUE_SECONDS;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, isLeader, sendGameAction]);

    // Reset countdown when modal opens
    useEffect(() => {
        if (isOpen) {
            setCountdown(AUTO_CONTINUE_SECONDS);
        }
    }, [isOpen, gameData.round]);

    // Sort players by score (descending)
    const sortedPlayers = Object.keys(playerScores).sort(
        (a, b) => playerScores[b] - playerScores[a],
    );

    return (
        <Dialog open={isOpen}>
            <DialogContent className="flex flex-col items-center gap-4 sm:gap-6 max-w-[95vw] sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white p-4 sm:p-6">
                <DialogTitle className="flex items-center gap-2">
                    <Trophy className="h-7 w-7 text-amber-400" />
                    <span className="text-xl sm:text-2xl font-bold text-white">
                        Round {gameData.round} Complete
                    </span>
                </DialogTitle>

                {/* Round winner announcement */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-2"
                >
                    {isTeamMode && winningTeam != null ? (
                        <div className="text-lg font-semibold text-cyan-400">
                            Team {winningTeam + 1} wins this round!
                        </div>
                    ) : roundWinner ? (
                        <div className="text-lg font-semibold text-cyan-400">
                            {players[roundWinner]?.name || "Unknown"} wins this
                            round!
                        </div>
                    ) : isRoundTie ? (
                        <div className="text-lg font-semibold text-amber-400">
                            It&apos;s a tie! No points awarded.
                        </div>
                    ) : (
                        <div className="text-lg font-semibold text-amber-400">
                            Blocked game - lowest pip count wins!
                        </div>
                    )}
                </motion.div>

                {/* Team mode scoreboard */}
                {isTeamMode && teams && teamScores && (
                    <div className="w-full space-y-3">
                        {Object.entries(teams).map(([key, team], idx) => {
                            const index = Number(key);
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={cn(
                                        "rounded-xl p-4",
                                        index === 0
                                            ? "bg-linear-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30"
                                            : "bg-linear-to-br from-red-500/20 to-red-600/10 border border-red-500/30",
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Users
                                                className={cn(
                                                    "w-5 h-5",
                                                    index === 0
                                                        ? "text-blue-400"
                                                        : "text-red-400",
                                                )}
                                            />
                                            <span className="font-bold text-base sm:text-lg">
                                                Team {index + 1}
                                            </span>
                                            {winningTeam === index && (
                                                <Trophy className="w-4 h-4 text-amber-400" />
                                            )}
                                        </div>
                                        <div className="text-xl sm:text-2xl font-bold">
                                            {teamScores[index] ?? 0}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {team.players.map((pid: string) => {
                                            const pips = roundPipCounts[pid];
                                            return (
                                                <div
                                                    key={pid}
                                                    className="flex items-center justify-between bg-white/5 rounded-lg px-2 sm:px-3 py-2"
                                                >
                                                    <span className="font-medium text-white/90 truncate max-w-30 text-sm">
                                                        {players[pid]?.name ||
                                                            pid}
                                                        {pid === userId && (
                                                            <span className="text-xs text-blue-400 ml-1">
                                                                (You)
                                                            </span>
                                                        )}
                                                    </span>
                                                    {pips !== undefined && (
                                                        <span className="text-xs text-white/60">
                                                            <Target className="w-3 h-3 inline mr-1" />
                                                            {pips} pips
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Individual mode - Pip counts (round summary only) */}
                {!isTeamMode &&
                    isRoundSummary &&
                    Object.keys(roundPipCounts).length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full bg-white/5 rounded-lg p-3 mb-2"
                        >
                            <div className="text-sm font-medium text-white/60 mb-2">
                                Remaining Pips
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {(() => {
                                    const lowestPips = Math.min(
                                        ...Object.values(roundPipCounts),
                                    );
                                    const tiedPlayerIds = isRoundTie
                                        ? Object.entries(roundPipCounts)
                                              .filter(
                                                  ([, pips]) =>
                                                      pips === lowestPips,
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
                                                        ? "bg-green-500/20"
                                                        : tiedPlayerIds.includes(
                                                                playerId,
                                                            )
                                                          ? "bg-amber-500/20"
                                                          : "bg-white/5",
                                                )}
                                            >
                                                <span className="text-sm truncate text-white/80">
                                                    {players[playerId]?.name ||
                                                        "Unknown"}
                                                </span>
                                                <span className="font-bold text-white/90">
                                                    {pips}
                                                </span>
                                            </div>
                                        ),
                                    );
                                })()}
                            </div>
                        </motion.div>
                    )}

                {/* Individual mode scoreboard */}
                {!isTeamMode && (
                    <div className="w-full">
                        <div className="text-sm font-medium text-white/60 mb-2">
                            Current Scores
                        </div>
                        <div className="space-y-2">
                            {sortedPlayers.map((playerId, index) => (
                                <motion.div
                                    key={playerId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex justify-between items-center px-3 py-2 rounded-lg bg-white/5"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white/50">
                                            #{index + 1}
                                        </span>
                                        <span className="font-medium text-white/90">
                                            {players[playerId]?.name ||
                                                "Unknown"}
                                        </span>
                                        {playerId === userId && (
                                            <span className="text-xs text-blue-400">
                                                (You)
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-bold text-lg text-white">
                                        {playerScores[playerId]}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Continue button (leader only) */}
                {isLeader && (
                    <Button
                        className="mt-2 w-full h-10 sm:h-12 text-sm sm:text-base font-semibold rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                        onClick={() =>
                            sendGameAction("CONTINUE_AFTER_ROUND_SUMMARY", {})
                        }
                    >
                        Continue {countdown > 0 && `(${countdown}s)`}
                    </Button>
                )}

                {/* Non-leader waiting message */}
                {!isLeader && (
                    <p className="text-xs sm:text-sm text-white/50 text-center">
                        Waiting for the host to continue...
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
