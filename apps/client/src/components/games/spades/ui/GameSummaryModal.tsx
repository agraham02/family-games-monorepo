"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/contexts/SessionContext";
import { SpadesData } from "@shared/types";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Crown, Users, Award, Home } from "lucide-react";
import React from "react";
import { Celebration } from "@/components/games/shared";

export default function GameSummaryModal({
    gameData,
    onReturnToLobby,
}: {
    gameData: SpadesData;
    onReturnToLobby: () => void;
}) {
    const { userId } = useSession();
    const isLeader = userId === gameData.leaderId;
    const isOpen = gameData.phase === "finished";

    // Find winning team
    const teams = Object.entries(gameData.teams);
    const sortedTeams = [...teams].sort((a, b) => b[1].score - a[1].score);
    const [winningTeamId, winningTeam] = sortedTeams[0] || [];

    // Check if current user is on winning team
    const currentUserTeamId = Object.entries(gameData.teams).find(([_, team]) =>
        team.players.includes(userId),
    )?.[0];
    const isWinner = currentUserTeamId === winningTeamId;

    return (
        <Dialog open={isOpen}>
            <DialogContent className="flex flex-col items-center gap-4 sm:gap-6 max-w-[95vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white p-4 sm:p-8">
                {/* Hidden but accessible title for screen readers */}
                <DialogTitle className="sr-only">Game Over</DialogTitle>

                {/* Celebration animation for winners */}
                {isWinner && (
                    <Celebration show={true} type="confetti" duration={4000} />
                )}

                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Celebration Header */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 15,
                                }}
                                className="flex flex-col items-center gap-3"
                            >
                                <motion.div
                                    animate={{
                                        rotate: [0, -10, 10, -10, 0],
                                        scale: [1, 1.1, 1, 1.1, 1],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatDelay: 1,
                                    }}
                                >
                                    <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400" />
                                </motion.div>
                                <p
                                    className="text-2xl sm:text-3xl font-bold text-center"
                                    aria-hidden="true"
                                >
                                    Game Over!
                                </p>
                                <p className="text-lg text-white/70">
                                    {isWinner
                                        ? "🎉 Congratulations! Your team won! 🎉"
                                        : "Better luck next time!"}
                                </p>
                            </motion.div>

                            {/* Final Standings */}
                            <div className="w-full space-y-3">
                                {sortedTeams.map(([teamId, team], index) => {
                                    const teamNumber = Number(teamId) + 1;
                                    const isWinningTeam = index === 0;

                                    return (
                                        <motion.div
                                            key={teamId}
                                            initial={{
                                                opacity: 0,
                                                x: -30,
                                            }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                                delay: 0.2 + index * 0.15,
                                            }}
                                            className={`rounded-xl p-4 border ${
                                                isWinningTeam
                                                    ? "bg-linear-to-br from-amber-500/30 to-yellow-600/20 border-amber-400/50 shadow-lg shadow-amber-500/20"
                                                    : index === 0
                                                      ? "bg-linear-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30"
                                                      : "bg-linear-to-br from-red-500/20 to-red-600/10 border-red-500/30"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                {/* Team Info */}
                                                <div className="flex items-center gap-3">
                                                    {isWinningTeam && (
                                                        <motion.div
                                                            animate={{
                                                                rotate: [
                                                                    0, 15, -15,
                                                                    0,
                                                                ],
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                            }}
                                                        >
                                                            <Crown className="w-6 h-6 text-amber-400" />
                                                        </motion.div>
                                                    )}
                                                    <Users
                                                        className={`w-5 h-5 ${
                                                            isWinningTeam
                                                                ? "text-amber-400"
                                                                : index === 0
                                                                  ? "text-blue-400"
                                                                  : "text-red-400"
                                                        }`}
                                                    />
                                                    <div>
                                                        <div className="font-bold text-lg">
                                                            Team {teamNumber}
                                                        </div>
                                                        <div className="text-sm text-white/60">
                                                            {team.players
                                                                .map(
                                                                    (
                                                                        playerId,
                                                                    ) =>
                                                                        gameData
                                                                            .players[
                                                                            playerId
                                                                        ]
                                                                            ?.name ||
                                                                        playerId,
                                                                )
                                                                .join(" & ")}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Score Display */}
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-sm text-white/60 font-medium">
                                                            Final Score
                                                        </div>
                                                        <motion.div
                                                            className={`text-3xl font-bold ${
                                                                isWinningTeam
                                                                    ? "text-amber-400"
                                                                    : "text-white"
                                                            }`}
                                                            initial={{
                                                                scale: 0.5,
                                                            }}
                                                            animate={{
                                                                scale: 1,
                                                            }}
                                                            transition={{
                                                                delay:
                                                                    0.4 +
                                                                    index *
                                                                        0.15,
                                                                type: "spring",
                                                                stiffness: 200,
                                                            }}
                                                        >
                                                            {team.score}
                                                        </motion.div>
                                                    </div>
                                                    {isWinningTeam && (
                                                        <Award className="w-8 h-8 text-amber-400" />
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Game Stats */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="w-full rounded-lg bg-white/5 border border-white/10 p-4"
                            >
                                <div className="flex items-center justify-around text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-amber-400">
                                            {gameData.round}
                                        </div>
                                        <div className="text-sm text-white/60">
                                            Rounds
                                        </div>
                                    </div>
                                    <div className="h-12 w-px bg-white/10" />
                                    <div>
                                        <div className="text-2xl font-bold text-blue-400">
                                            {gameData.settings.winTarget}
                                        </div>
                                        <div className="text-sm text-white/60">
                                            Target
                                        </div>
                                    </div>
                                    <div className="h-12 w-px bg-white/10" />
                                    <div>
                                        <div className="text-2xl font-bold text-emerald-400">
                                            {winningTeam?.score}
                                        </div>
                                        <div className="text-sm text-white/60">
                                            Winner
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Return to Lobby Button (Leader only) */}
                            {isLeader && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="w-full"
                                >
                                    <Button
                                        onClick={onReturnToLobby}
                                        size="lg"
                                        className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                                    >
                                        <Home className="w-5 h-5 mr-2" />
                                        Return to Lobby
                                    </Button>
                                </motion.div>
                            )}

                            {/* Waiting message for non-leaders */}
                            {!isLeader && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="text-white/60 text-sm"
                                >
                                    Waiting for room leader to return to
                                    lobby...
                                </motion.p>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
