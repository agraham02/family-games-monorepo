"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/contexts/SessionContext";
import type { DominoesData } from "@shared/types";
import { motion } from "motion/react";
import { Trophy, Users, User, TrendingUp } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const AUTO_CONTINUE_SECONDS = 10;

export default function DominoesRoundSummaryModal({
    gameData,
    sendGameAction,
}: {
    gameData: DominoesData;
    sendGameAction: (type: string, payload: unknown) => void;
}) {
    const { userId } = useSession();
    const isLeader = userId === gameData.leaderId;
    const isOpen = gameData.phase === "round-summary";

    const isTeamMode = gameData.gameMode === "team";
    const roundPoints = gameData.roundPoints ?? 0;
    const isTie = gameData.isRoundTie ?? false;

    // Countdown timer for auto-continue (leader only).
    const [countdown, setCountdown] = useState(AUTO_CONTINUE_SECONDS);
    const autoFiredRef = useRef(false);

    useEffect(() => {
        if (!isOpen || !isLeader) {
            setCountdown(AUTO_CONTINUE_SECONDS);
            autoFiredRef.current = false;
            return;
        }
        const interval = setInterval(() => {
            setCountdown((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen, isLeader]);

    useEffect(() => {
        if (
            isOpen &&
            isLeader &&
            countdown === 0 &&
            !autoFiredRef.current
        ) {
            autoFiredRef.current = true;
            sendGameAction("CONTINUE_AFTER_ROUND_SUMMARY", {});
        }
    }, [isOpen, isLeader, countdown, sendGameAction]);

    // Resolve the round winner display name
    let winnerLabel = "No winner";
    if (isTie) {
        winnerLabel = "Round tied";
    } else if (isTeamMode && gameData.winningTeam != null) {
        winnerLabel = `Team ${gameData.winningTeam + 1}`;
    } else if (gameData.roundWinner) {
        winnerLabel =
            gameData.players?.[gameData.roundWinner]?.name ??
            gameData.roundWinner;
    }

    return (
        <Dialog open={isOpen}>
            <DialogContent className="flex flex-col items-center gap-4 sm:gap-6 max-w-[95vw] sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white p-4 sm:p-6">
                <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-white">
                    <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                    Round {gameData.round} Complete
                </DialogTitle>

                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-1"
                >
                    <p className="text-base sm:text-lg text-white/80">
                        {isTie ? "Blocked round" : `${winnerLabel} wins`}
                    </p>
                    {!isTie && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                            <TrendingUp className="w-4 h-4" />+{roundPoints}{" "}
                            points
                        </span>
                    )}
                </motion.div>

                {/* Standings */}
                <div className="w-full space-y-3">
                    {isTeamMode && gameData.teams
                        ? Object.entries(gameData.teams).map(
                              ([teamId, team], index) => {
                                  const tid = Number(teamId);
                                  const isWinningTeam =
                                      gameData.winningTeam === tid;
                                  return (
                                      <motion.div
                                          key={teamId}
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: index * 0.1 }}
                                          className={`rounded-xl p-3 border ${
                                              isWinningTeam
                                                  ? "bg-linear-to-br from-amber-500/20 to-amber-600/10 border-amber-400/40"
                                                  : "bg-white/5 border-white/10"
                                          }`}
                                      >
                                          <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                  <Users className="w-5 h-5 text-amber-300" />
                                                  <div>
                                                      <div className="font-semibold">
                                                          Team {tid + 1}
                                                      </div>
                                                      <div className="text-xs text-white/60">
                                                          {team.players
                                                              .map(
                                                                  (pid) =>
                                                                      gameData
                                                                          .players?.[
                                                                          pid
                                                                      ]?.name ??
                                                                      pid,
                                                              )
                                                              .join(" & ")}
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="text-right">
                                                  <div className="text-xs text-white/50">
                                                      Total
                                                  </div>
                                                  <div className="text-2xl font-bold">
                                                      {gameData.teamScores?.[
                                                          tid
                                                      ] ?? team.score}
                                                  </div>
                                              </div>
                                          </div>
                                      </motion.div>
                                  );
                              },
                          )
                        : gameData.playOrder.map((pid, index) => {
                              const isWinner = gameData.roundWinner === pid;
                              const pips = gameData.roundPipCounts?.[pid];
                              return (
                                  <motion.div
                                      key={pid}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: index * 0.08 }}
                                      className={`rounded-xl p-3 border flex items-center justify-between ${
                                          isWinner
                                              ? "bg-linear-to-br from-amber-500/20 to-amber-600/10 border-amber-400/40"
                                              : "bg-white/5 border-white/10"
                                      }`}
                                  >
                                      <div className="flex items-center gap-2">
                                          <User className="w-5 h-5 text-white/70" />
                                          <span className="font-medium">
                                              {gameData.players?.[pid]?.name ??
                                                  pid}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          {pips != null && (
                                              <span className="text-xs text-white/60">
                                                  {pips} pip
                                                  {pips === 1 ? "" : "s"} left
                                              </span>
                                          )}
                                          <span className="text-xl font-bold">
                                              {gameData.playerScores?.[pid] ??
                                                  0}
                                          </span>
                                      </div>
                                  </motion.div>
                              );
                          })}
                </div>

                {isLeader ? (
                    <Button
                        className="mt-2 w-full h-10 sm:h-12 text-sm sm:text-base font-semibold rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                        onClick={() =>
                            sendGameAction("CONTINUE_AFTER_ROUND_SUMMARY", {})
                        }
                    >
                        Start Next Round{countdown > 0 && ` (${countdown}s)`}
                    </Button>
                ) : (
                    <p className="text-xs sm:text-sm text-white/50 text-center">
                        Waiting for the host to start the next round...
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
