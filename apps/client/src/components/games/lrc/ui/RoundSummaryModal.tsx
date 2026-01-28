"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { LRCPlayer } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Trophy, PartyPopper, DollarSign, RotateCcw, Home } from "lucide-react";
import { Celebration } from "@/components/games/shared";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RoundSummaryModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** The winning player */
    winner: LRCPlayer | null;
    /** All players (for displaying final standings) */
    players: LRCPlayer[];
    /** Chips in center pot that winner receives */
    potChips: number;
    /** Chip monetary value */
    chipValue: number;
    /** Starting chips per player (for calculating net) */
    startingChips: number;
    /** Current round number */
    roundNumber: number;
    /** Whether current user is the leader (can start new round) */
    isLeader: boolean;
    /** Whether Last Chip Challenge was involved */
    lastChipChallengeSuccess?: boolean | null;
    /** Callback for Play Again button */
    onPlayAgain: () => void;
    /** Callback for Return to Lobby button */
    onReturnToLobby: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Round Summary Modal Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RoundSummaryModal - Displays the winner and round summary.
 *
 * Features:
 * - Winner celebration animation
 * - Chips won display
 * - Monetary value calculation
 * - Play Again / Return to Lobby options
 * - Last Chip Challenge victory indicator
 */
export function RoundSummaryModal({
    isOpen,
    winner,
    players,
    potChips,
    chipValue,
    startingChips,
    roundNumber,
    isLeader,
    lastChipChallengeSuccess,
    onPlayAgain,
    onReturnToLobby,
}: RoundSummaryModalProps) {
    // Calculate winner's total winnings
    const winnerChips = winner?.chips ?? 0;
    const netChips = winnerChips - startingChips;
    const netValue = netChips * chipValue;

    const formattedNetValue = useMemo(() => {
        if (chipValue <= 0) return null;
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(netValue);
    }, [netValue, chipValue]);

    // Sort players by net chips this round
    const sortedPlayers = useMemo(() => {
        return [...players].sort(
            (a, b) => b.netChipsThisRound - a.netChipsThisRound,
        );
    }, [players]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="relative w-full max-w-md mx-4 bg-linear-to-br from-amber-900 to-amber-950 rounded-2xl shadow-2xl overflow-hidden"
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: 50 }}
                        transition={{ type: "spring", damping: 20 }}
                    >
                        {/* Celebration confetti effect */}
                        <Celebration
                            show={true}
                            type="confetti"
                            duration={5000}
                        />

                        {/* Header */}
                        <div className="relative p-6 text-center border-b border-amber-700/50">
                            <motion.div
                                className="flex items-center justify-center gap-2 text-amber-400 mb-2"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                            >
                                <Trophy className="w-8 h-8" />
                                <span className="text-2xl font-bold">
                                    Winner!
                                </span>
                                <PartyPopper className="w-8 h-8" />
                            </motion.div>

                            {winner && (
                                <motion.div
                                    className="text-3xl font-bold text-white"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    {winner.name}
                                </motion.div>
                            )}

                            {lastChipChallengeSuccess && (
                                <motion.div
                                    className="mt-2 px-3 py-1 bg-purple-600 text-white text-sm rounded-full inline-block"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    🎯 Last Chip Challenge Victory!
                                </motion.div>
                            )}

                            <motion.div
                                className="text-amber-300/70 text-sm mt-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                Round {roundNumber}
                            </motion.div>
                        </div>

                        {/* Winnings */}
                        <div className="p-6 space-y-4">
                            <motion.div
                                className="text-center"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <div className="text-amber-200 text-sm mb-1">
                                    Chips Won
                                </div>
                                <div className="text-4xl font-bold text-white">
                                    {winnerChips}
                                </div>
                                {potChips > 0 && (
                                    <div className="text-amber-400 text-sm mt-1">
                                        (including {potChips} from pot)
                                    </div>
                                )}
                            </motion.div>

                            {formattedNetValue && (
                                <motion.div
                                    className="text-center"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <div className="flex items-center justify-center gap-1 text-green-400">
                                        <DollarSign className="w-5 h-5" />
                                        <span className="text-2xl font-bold">
                                            {netValue >= 0 ? "+" : ""}
                                            {formattedNetValue}
                                        </span>
                                    </div>
                                    <div className="text-green-300/70 text-xs">
                                        Net winnings this round
                                    </div>
                                </motion.div>
                            )}

                            {/* Player standings */}
                            <motion.div
                                className="mt-4 space-y-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                <div className="text-amber-200/70 text-xs uppercase tracking-wide">
                                    Final Standings
                                </div>
                                {sortedPlayers.map((player, idx) => (
                                    <div
                                        key={player.id}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg",
                                            player.id === winner?.id
                                                ? "bg-amber-500/30"
                                                : "bg-black/20",
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-amber-400 font-bold w-5">
                                                #{idx + 1}
                                            </span>
                                            <span className="text-white">
                                                {player.name}
                                            </span>
                                        </div>
                                        <span className="text-amber-300">
                                            {player.chips} chips
                                        </span>
                                    </div>
                                ))}
                            </motion.div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-amber-700/50 flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 border-amber-600 text-amber-300 hover:bg-amber-800/50"
                                onClick={onReturnToLobby}
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Lobby
                            </Button>
                            <Button
                                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                                onClick={onPlayAgain}
                                disabled={!isLeader}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                {isLeader ? "Play Again" : "Waiting for Leader"}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wild Target Modal Component
// ─────────────────────────────────────────────────────────────────────────────

interface WildTargetModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Available target players */
    targets: LRCPlayer[];
    /** Currently auto-selected target */
    autoSelectedId: string | null;
    /** Countdown seconds remaining before auto-confirm */
    countdown: number;
    /** Callback when a target is selected */
    onSelectTarget: (playerId: string) => void;
    /** Callback to confirm auto-selection */
    onConfirmAuto: () => void;
}

/**
 * WildTargetModal - Allows selecting a target for Wild dice.
 *
 * Auto-selects the richest player with a countdown to confirm.
 * Player can manually override the selection.
 */
export function WildTargetModal({
    isOpen,
    targets,
    autoSelectedId,
    countdown,
    onSelectTarget,
    onConfirmAuto,
}: WildTargetModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="w-full max-w-sm mx-4 bg-linear-to-br from-purple-900 to-purple-950 rounded-2xl shadow-2xl overflow-hidden"
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: 50 }}
                    >
                        {/* Header */}
                        <div className="p-4 text-center border-b border-purple-700/50">
                            <div className="text-2xl font-bold text-purple-300">
                                🎲 Wild Die!
                            </div>
                            <div className="text-purple-400/80 text-sm mt-1">
                                Choose who to steal from
                            </div>
                        </div>

                        {/* Target list */}
                        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                            {targets.map((player) => (
                                <motion.button
                                    key={player.id}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors",
                                        player.id === autoSelectedId
                                            ? "bg-purple-500/40 ring-2 ring-purple-400"
                                            : "bg-black/30 hover:bg-purple-600/30",
                                    )}
                                    onClick={() => onSelectTarget(player.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <span className="text-white font-medium">
                                        {player.name}
                                    </span>
                                    <span className="text-purple-300">
                                        {player.chips} chips
                                    </span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Auto-confirm countdown */}
                        <div className="p-4 border-t border-purple-700/50">
                            <Button
                                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold"
                                onClick={onConfirmAuto}
                            >
                                Confirm ({countdown}s)
                            </Button>
                            <div className="text-center text-purple-400/60 text-xs mt-2">
                                Auto-selecting richest player
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Last Chip Challenge Modal Component
// ─────────────────────────────────────────────────────────────────────────────

interface LastChipChallengeBannerProps {
    /** Whether to show the banner */
    isActive: boolean;
    /** The player facing the challenge */
    challengerName: string;
    /** Number of dice they need to roll */
    diceCount: number;
}

/**
 * LastChipChallengeBanner - Dramatic banner for the Last Chip Challenge.
 */
export function LastChipChallengeBanner({
    isActive,
    challengerName,
    diceCount,
}: LastChipChallengeBannerProps) {
    return (
        <AnimatePresence>
            {isActive && (
                <motion.div
                    className="fixed inset-x-0 top-1/4 z-40 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", damping: 15 }}
                >
                    <motion.div
                        className="bg-linear-to-r from-purple-600 via-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl shadow-2xl"
                        animate={{
                            boxShadow: [
                                "0 0 20px rgba(168, 85, 247, 0.5)",
                                "0 0 40px rgba(168, 85, 247, 0.8)",
                                "0 0 20px rgba(168, 85, 247, 0.5)",
                            ],
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        <div className="text-center">
                            <div className="text-3xl font-black uppercase tracking-widest">
                                Last Chip Challenge!
                            </div>
                            <div className="text-lg mt-1">
                                {challengerName} must roll {diceCount} dots to
                                win
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default RoundSummaryModal;
