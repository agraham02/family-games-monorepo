"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/contexts/SessionContext";
import type { DominoesData } from "@shared/types";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Crown, Users, Award, Home, User } from "lucide-react";
import React from "react";
import { Celebration } from "@/components/games/shared";

export default function DominoesGameSummaryModal({
    gameData,
    onReturnToLobby,
}: {
    gameData: DominoesData;
    onReturnToLobby: () => void;
}) {
    const { userId } = useSession();
    const isLeader = userId === gameData.leaderId;
    const isOpen = gameData.phase === "finished";
    const isTeamMode = gameData.gameMode === "team";

    // Determine if current user is on/is the winner
    let isWinner = false;
    let winnerLabel = "";
    if (isTeamMode && gameData.winningTeamId != null && gameData.teams) {
        const winningTeam = gameData.teams[gameData.winningTeamId];
        winnerLabel = `Team ${gameData.winningTeamId + 1}`;
        isWinner = winningTeam?.players.includes(userId) ?? false;
    } else if (gameData.gameWinner) {
        winnerLabel =
            gameData.players?.[gameData.gameWinner]?.name ??
            gameData.gameWinner;
        isWinner = gameData.gameWinner === userId;
    }

    // Build sorted standings
    const teamStandings = isTeamMode
        ? Object.entries(gameData.teams ?? {})
              .map(([teamId, team]) => ({
                  teamId: Number(teamId),
                  team,
                  score:
                      gameData.teamScores?.[Number(teamId)] ?? team.score ?? 0,
              }))
              .sort((a, b) => b.score - a.score)
        : [];

    const playerStandings = !isTeamMode
        ? gameData.playOrder
              .map((pid) => ({
                  pid,
                  score: gameData.playerScores?.[pid] ?? 0,
              }))
              .sort((a, b) => b.score - a.score)
        : [];

    return (
        <Dialog open={isOpen}>
            <DialogContent className="flex flex-col items-center gap-4 sm:gap-6 max-w-[95vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white p-4 sm:p-8">
                <DialogTitle className="sr-only">Game Over</DialogTitle>

                {isWinner && (
                    <Celebration show={true} type="confetti" duration={4000} />
                )}

                <AnimatePresence>
                    {isOpen && (
                        <>
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
                                <p className="text-2xl sm:text-3xl font-bold text-center">
                                    Game Over!
                                </p>
                                <p className="text-base sm:text-lg text-white/80 text-center">
                                    {winnerLabel
                                        ? `${winnerLabel} wins!`
                                        : "Game complete"}
                                </p>
                                <p className="text-sm text-white/60 text-center">
                                    {isWinner
                                        ? "🎉 Congratulations! 🎉"
                                        : "Better luck next time!"}
                                </p>
                            </motion.div>

                            {/* Final Standings */}
                            <div className="w-full space-y-3">
                                {isTeamMode
                                    ? teamStandings.map(
                                          ({ teamId, team, score }, index) => {
                                              const isWinningTeam =
                                                  teamId ===
                                                  gameData.winningTeamId;
                                              return (
                                                  <motion.div
                                                      key={teamId}
                                                      initial={{
                                                          opacity: 0,
                                                          x: -30,
                                                      }}
                                                      animate={{
                                                          opacity: 1,
                                                          x: 0,
                                                      }}
                                                      transition={{
                                                          delay:
                                                              0.2 +
                                                              index * 0.15,
                                                      }}
                                                      className={`rounded-xl p-4 border ${
                                                          isWinningTeam
                                                              ? "bg-linear-to-br from-amber-500/30 to-yellow-600/20 border-amber-400/50 shadow-lg shadow-amber-500/20"
                                                              : "bg-linear-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30"
                                                      }`}
                                                  >
                                                      <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-3">
                                                              {isWinningTeam && (
                                                                  <Crown className="w-6 h-6 text-amber-400" />
                                                              )}
                                                              <Users
                                                                  className={`w-5 h-5 ${
                                                                      isWinningTeam
                                                                          ? "text-amber-400"
                                                                          : "text-blue-400"
                                                                  }`}
                                                              />
                                                              <div>
                                                                  <div className="font-bold text-lg">
                                                                      Team{" "}
                                                                      {teamId +
                                                                          1}
                                                                  </div>
                                                                  <div className="text-sm text-white/60">
                                                                      {team.players
                                                                          .map(
                                                                              (
                                                                                  pid,
                                                                              ) =>
                                                                                  gameData
                                                                                      .players?.[
                                                                                      pid
                                                                                  ]
                                                                                      ?.name ??
                                                                                  pid,
                                                                          )
                                                                          .join(
                                                                              " & ",
                                                                          )}
                                                                  </div>
                                                              </div>
                                                          </div>
                                                          <div className="flex items-center gap-3">
                                                              <div className="flex flex-col items-end">
                                                                  <div className="text-xs text-white/60">
                                                                      Final
                                                                      Score
                                                                  </div>
                                                                  <div
                                                                      className={`text-2xl sm:text-3xl font-bold ${
                                                                          isWinningTeam
                                                                              ? "text-amber-400"
                                                                              : "text-white"
                                                                      }`}
                                                                  >
                                                                      {score}
                                                                  </div>
                                                              </div>
                                                              {isWinningTeam && (
                                                                  <Award className="w-7 h-7 text-amber-400" />
                                                              )}
                                                          </div>
                                                      </div>
                                                  </motion.div>
                                              );
                                          },
                                      )
                                    : playerStandings.map(
                                          ({ pid, score }, index) => {
                                              const isWinningPlayer =
                                                  pid === gameData.gameWinner;
                                              return (
                                                  <motion.div
                                                      key={pid}
                                                      initial={{
                                                          opacity: 0,
                                                          x: -30,
                                                      }}
                                                      animate={{
                                                          opacity: 1,
                                                          x: 0,
                                                      }}
                                                      transition={{
                                                          delay:
                                                              0.2 + index * 0.1,
                                                      }}
                                                      className={`rounded-xl p-4 border flex items-center justify-between ${
                                                          isWinningPlayer
                                                              ? "bg-linear-to-br from-amber-500/30 to-yellow-600/20 border-amber-400/50 shadow-lg shadow-amber-500/20"
                                                              : "bg-white/5 border-white/10"
                                                      }`}
                                                  >
                                                      <div className="flex items-center gap-3">
                                                          {isWinningPlayer && (
                                                              <Crown className="w-6 h-6 text-amber-400" />
                                                          )}
                                                          <User
                                                              className={`w-5 h-5 ${
                                                                  isWinningPlayer
                                                                      ? "text-amber-400"
                                                                      : "text-white/70"
                                                              }`}
                                                          />
                                                          <span className="font-semibold">
                                                              {gameData
                                                                  .players?.[
                                                                  pid
                                                              ]?.name ?? pid}
                                                          </span>
                                                      </div>
                                                      <div className="flex items-center gap-3">
                                                          <div
                                                              className={`text-2xl font-bold ${
                                                                  isWinningPlayer
                                                                      ? "text-amber-400"
                                                                      : "text-white"
                                                              }`}
                                                          >
                                                              {score}
                                                          </div>
                                                          {isWinningPlayer && (
                                                              <Award className="w-6 h-6 text-amber-400" />
                                                          )}
                                                      </div>
                                                  </motion.div>
                                              );
                                          },
                                      )}
                            </div>

                            {/* Stats */}
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
                                            {gameData.settings?.winTarget ??
                                                "—"}
                                        </div>
                                        <div className="text-sm text-white/60">
                                            Target
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {isLeader ? (
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
                            ) : (
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
