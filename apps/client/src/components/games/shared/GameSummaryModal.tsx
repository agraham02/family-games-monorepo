"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/contexts/SessionContext";
import { GameSummary, LobbyData } from "@shared/types";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Clock, Target, Crown, Home, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Celebration } from "@/components/games/shared";

interface GameSummaryModalProps {
    /** The game summary data from the server */
    summary: GameSummary;
    /** Current room/lobby data for player name lookups */
    lobbyData: LobbyData;
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback when the user wants to return to lobby */
    onReturnToLobby: () => void;
    /** Auto-return countdown in seconds (0 to disable) */
    autoReturnSeconds?: number;
}

/**
 * Generic game summary modal that displays final game results.
 * Shows winner, final scores, game duration, and optionally auto-returns to lobby.
 */
export function GameSummaryModal({
    summary,
    lobbyData,
    isOpen,
    onReturnToLobby,
    autoReturnSeconds = 15,
}: GameSummaryModalProps) {
    // Session context may not be available in debug mode
    let userId: string | undefined;
    try {
        const sessionContext = useSession();
        userId = sessionContext.userId;
    } catch {
        // Session context not available (debug mode)
    }

    const [countdown, setCountdown] = useState(autoReturnSeconds);
    // Track if we've already triggered return to prevent double-calls
    const hasReturnedRef = useRef(false);
    // Store callback in ref to avoid effect restarts when callback changes
    const onReturnToLobbyRef = useRef(onReturnToLobby);

    // Keep ref updated with latest callback
    useEffect(() => {
        onReturnToLobbyRef.current = onReturnToLobby;
    }, [onReturnToLobby]);

    // Reset hasReturned when modal opens
    useEffect(() => {
        if (isOpen) {
            hasReturnedRef.current = false;
        }
    }, [isOpen]);

    // Determine if current user is the winner
    const isWinner = summary.winner === userId;

    // Determine if current user is leader (can return early)
    const isLeader = userId === lobbyData.leaderId;

    // Get player name from ID
    const getPlayerName = useCallback(
        (playerId: string): string => {
            const user = lobbyData.users.find((u) => u.id === playerId);
            return user?.name || "Unknown Player";
        },
        [lobbyData.users],
    );

    // Get winner display text
    const getWinnerDisplay = useCallback((): string => {
        if (summary.winner === null) {
            return "It's a tie!";
        }
        if (typeof summary.winner === "number") {
            return `Team ${summary.winner + 1}`;
        }
        return getPlayerName(summary.winner);
    }, [summary.winner, getPlayerName]);

    // Format duration
    const formatDuration = useCallback((ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes === 0) {
            return `${seconds}s`;
        }
        return `${minutes}m ${seconds}s`;
    }, []);

    // Sort scores (highest first)
    const sortedScores = Object.entries(summary.finalScores).sort(
        ([, a], [, b]) => b - a,
    );

    // Auto-return countdown with race condition protection
    useEffect(() => {
        if (!isOpen || autoReturnSeconds === 0) {
            return;
        }

        setCountdown(autoReturnSeconds);

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Prevent double-calls using ref
                    if (!hasReturnedRef.current) {
                        hasReturnedRef.current = true;
                        // Use ref to get latest callback without causing effect restart
                        onReturnToLobbyRef.current();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, autoReturnSeconds]); // Removed onReturnToLobby from deps - using ref instead

    return (
        <Dialog open={isOpen}>
            <DialogContent className="flex flex-col items-center gap-4 sm:gap-6 max-w-[95vw] sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white p-4 sm:p-8">
                {/* Hidden but accessible title for screen readers */}
                <DialogTitle className="sr-only">Game Over</DialogTitle>

                {/* Celebration animation for winners */}
                {isWinner && (
                    <Celebration show={true} type="confetti" duration={4000} />
                )}

                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Trophy Header */}
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

                                {/* Winner announcement */}
                                <div className="flex items-center gap-2 text-lg text-amber-400">
                                    <Crown className="w-5 h-5" />
                                    <span className="font-semibold">
                                        {getWinnerDisplay()}
                                    </span>
                                    {summary.winner !== null && (
                                        <span className="text-white/70">
                                            wins!
                                        </span>
                                    )}
                                </div>

                                {/* Personal result message */}
                                <p className="text-white/70">
                                    {isWinner
                                        ? "🎉 Congratulations! You won! 🎉"
                                        : "Better luck next time!"}
                                </p>
                            </motion.div>

                            {/* Game Stats */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex justify-center gap-6 text-sm text-white/60"
                            >
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {formatDuration(summary.durationMs)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    <span>
                                        {summary.roundsPlayed} round
                                        {summary.roundsPlayed !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </motion.div>

                            {/* Final Standings */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="w-full space-y-2"
                            >
                                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
                                    Final Standings
                                </h3>
                                <div className="space-y-2">
                                    {sortedScores.map(
                                        ([playerId, score], index) => {
                                            const isCurrentUser =
                                                playerId === userId;
                                            const isPlayerWinner =
                                                playerId === summary.winner;

                                            return (
                                                <motion.div
                                                    key={playerId}
                                                    initial={{
                                                        opacity: 0,
                                                        x: -20,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        x: 0,
                                                    }}
                                                    transition={{
                                                        delay:
                                                            0.4 + index * 0.1,
                                                    }}
                                                    className={cn(
                                                        "flex items-center justify-between rounded-lg p-3 border",
                                                        isPlayerWinner
                                                            ? "bg-amber-500/20 border-amber-400/50"
                                                            : isCurrentUser
                                                              ? "bg-blue-500/20 border-blue-400/50"
                                                              : "bg-white/5 border-white/10",
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Rank badge */}
                                                        <div
                                                            className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                                                index === 0
                                                                    ? "bg-amber-400 text-black"
                                                                    : index ===
                                                                        1
                                                                      ? "bg-gray-400 text-black"
                                                                      : index ===
                                                                          2
                                                                        ? "bg-amber-600 text-white"
                                                                        : "bg-white/20 text-white/70",
                                                            )}
                                                        >
                                                            {index + 1}
                                                        </div>
                                                        <span
                                                            className={cn(
                                                                "font-medium",
                                                                isCurrentUser &&
                                                                    "text-blue-300",
                                                            )}
                                                        >
                                                            {getPlayerName(
                                                                playerId,
                                                            )}
                                                            {isCurrentUser &&
                                                                " (You)"}
                                                        </span>
                                                        {isPlayerWinner && (
                                                            <Medal className="w-4 h-4 text-amber-400" />
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-lg">
                                                        {score}
                                                    </span>
                                                </motion.div>
                                            );
                                        },
                                    )}
                                </div>
                            </motion.div>

                            {/* MVP Section (if available) */}
                            {summary.mvp && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="w-full p-3 rounded-lg bg-purple-500/20 border border-purple-400/50"
                                >
                                    <div className="flex items-center gap-2 text-purple-300">
                                        <Trophy className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                            MVP
                                        </span>
                                    </div>
                                    <p className="mt-1 text-white">
                                        <span className="font-semibold">
                                            {summary.mvp.userName}
                                        </span>
                                        <span className="text-white/70">
                                            {" "}
                                            - {summary.mvp.stat}:{" "}
                                            {summary.mvp.value}
                                        </span>
                                    </p>
                                </motion.div>
                            )}

                            {/* Action Button */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="w-full pt-2"
                            >
                                <Button
                                    onClick={onReturnToLobby}
                                    className="w-full gap-2"
                                    size="lg"
                                >
                                    <Home className="w-4 h-4" />
                                    {isLeader
                                        ? "Return to Lobby"
                                        : autoReturnSeconds > 0
                                          ? `Returning in ${countdown}s...`
                                          : "Return to Lobby"}
                                </Button>
                                {autoReturnSeconds > 0 && (
                                    <p className="text-center text-xs text-white/50 mt-2">
                                        {isLeader
                                            ? "Click to return immediately"
                                            : "You'll automatically return to the lobby"}
                                    </p>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
