import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/contexts/SessionContext";
import { SpadesData } from "@shared/types";
import { motion } from "motion/react";
import { Trophy, Target, TrendingUp, Users } from "lucide-react";
import React, { useEffect, useState } from "react";

const AUTO_CONTINUE_SECONDS = 10;

export default function RoundSummaryModal({
    gameData,
    sendGameAction,
}: {
    gameData: SpadesData;
    sendGameAction: (type: string, payload: unknown) => void;
}) {
    const { userId } = useSession();
    const isLeader = userId === gameData.leaderId;
    const isOpen = gameData.phase === "round-summary";

    // Countdown timer for auto-continue
    const [countdown, setCountdown] = useState(AUTO_CONTINUE_SECONDS);

    useEffect(() => {
        if (!isOpen || !isLeader) {
            setCountdown(AUTO_CONTINUE_SECONDS);
            return;
        }

        const interval = setInterval(() => {
            setCountdown((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, isLeader]);

    return (
        <Dialog open={isOpen}>
            <DialogContent className="flex flex-col items-center gap-4 sm:gap-6 max-w-[95vw] sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white p-4 sm:p-6">
                <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-white">
                    <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                    Round {gameData.round} Complete
                </DialogTitle>

                <div className="w-full space-y-4">
                    {Object.entries(gameData.teams).map(
                        ([teamId, team], index) => {
                            const roundScore =
                                gameData.roundTeamScores[Number(teamId)] ?? 0;
                            const isPositive = roundScore >= 0;

                            return (
                                <motion.div
                                    key={teamId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`rounded-xl p-4 ${
                                        index === 0
                                            ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30"
                                            : "bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Users
                                                className={`w-5 h-5 ${
                                                    index === 0
                                                        ? "text-blue-400"
                                                        : "text-red-400"
                                                }`}
                                            />
                                            <span className="font-bold text-base sm:text-lg">
                                                Team {Number(teamId) + 1}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <motion.div
                                                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                                                    isPositive
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : "bg-red-500/20 text-red-400"
                                                }`}
                                                initial={{ scale: 0.8 }}
                                                animate={{ scale: 1 }}
                                                transition={{
                                                    delay: 0.3 + index * 0.1,
                                                }}
                                            >
                                                <TrendingUp
                                                    className={`w-4 h-4 ${
                                                        !isPositive &&
                                                        "rotate-180"
                                                    }`}
                                                />
                                                {isPositive ? "+" : ""}
                                                {roundScore}
                                            </motion.div>
                                            <div className="text-xl sm:text-2xl font-bold">
                                                {team.score}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {team.players.map((pid) => (
                                            <div
                                                key={pid}
                                                className="flex items-center justify-between bg-white/5 rounded-lg px-2 sm:px-3 py-2"
                                            >
                                                <span className="font-medium text-white/90 truncate max-w-[120px] sm:max-w-[100px] text-sm">
                                                    {gameData.players[pid]
                                                        ?.name || pid}
                                                </span>
                                                <div className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
                                                    <span className="text-white/60">
                                                        <Target className="w-3 h-3 inline mr-1" />
                                                        {gameData.bids[pid]
                                                            ?.amount ?? 0}
                                                    </span>
                                                    <span
                                                        className={
                                                            (gameData
                                                                .roundTrickCounts[
                                                                pid
                                                            ] ?? 0) >=
                                                            (gameData.bids[pid]
                                                                ?.amount ?? 0)
                                                                ? "text-emerald-400"
                                                                : "text-red-400"
                                                        }
                                                    >
                                                        {gameData
                                                            .roundTrickCounts[
                                                            pid
                                                        ] ?? 0}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        }
                    )}
                </div>
                {isLeader && (
                    <Button
                        className="mt-2 w-full h-10 sm:h-12 text-sm sm:text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                        onClick={() =>
                            sendGameAction("CONTINUE_AFTER_ROUND_SUMMARY", {})
                        }
                    >
                        Continue {countdown > 0 && `(${countdown}s)`}
                    </Button>
                )}

                {!isLeader && (
                    <p className="text-xs sm:text-sm text-white/50 text-center">
                        Waiting for the host to continue...
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
