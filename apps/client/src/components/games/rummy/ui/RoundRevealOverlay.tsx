"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MeldStrip } from "@/components/games/shared/MeldStrip";
import { RummyData, RummyRoundSummary, RummyMeldView } from "@shared/types";

const AUTO_CONTINUE_SECONDS = 10;

export interface RoundRevealOverlayProps {
    isOpen: boolean;
    summary: RummyRoundSummary | null;
    melds: RummyMeldView[];
    players: RummyData["players"];
    /** Total scores after this round was applied. */
    totals: Record<string, number>;
    onContinue: () => void;
    /** Whether the current viewer is the room leader (controls auto-continue). */
    isLeader: boolean;
}

/**
 * Round reveal overlay — shows each player's melds (grouped) plus their score
 * breakdown (melded − deadwood + bonus = delta) and the new running totals.
 */
export default function RoundRevealOverlay({
    isOpen,
    summary,
    melds,
    players,
    totals,
    onContinue,
    isLeader,
}: RoundRevealOverlayProps) {
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
            onContinue();
        }
    }, [isOpen, isLeader, countdown, onContinue]);

    if (!summary) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.94, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 280,
                            damping: 26,
                        }}
                        className="bg-neutral-900 border border-white/10 rounded-2xl p-5 shadow-2xl max-w-3xl w-full text-white max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">
                                Round {summary.round} results
                            </h2>
                            {summary.wentOut && (
                                <Badge className="bg-emerald-600 text-white">
                                    {players[summary.wentOut]?.name ?? "?"} went
                                    out
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-4">
                            {Object.entries(summary.perPlayer).map(
                                ([playerId, score]) => {
                                    const playerMelds = melds.filter(
                                        (m) => m.ownerId === playerId,
                                    );
                                    const isWinner =
                                        summary.winnerId === playerId;
                                    return (
                                        <div
                                            key={playerId}
                                            className={`rounded-lg p-3 border ${
                                                isWinner
                                                    ? "border-amber-400/60 bg-amber-400/5"
                                                    : "border-white/10 bg-white/[0.02]"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium">
                                                    {players[playerId]?.name ??
                                                        "Unknown"}
                                                    {isWinner && (
                                                        <span className="ml-2 text-amber-400">
                                                            🏆
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="font-mono text-sm">
                                                    {score.delta >= 0
                                                        ? "+"
                                                        : ""}
                                                    {score.delta} →{" "}
                                                    <span className="font-semibold">
                                                        {totals[playerId]}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-3 mb-2">
                                                {playerMelds.length === 0 ? (
                                                    <span className="text-white/40 text-xs italic">
                                                        No melds
                                                    </span>
                                                ) : (
                                                    playerMelds.map((m) => (
                                                        <MeldStrip
                                                            key={m.id}
                                                            meld={m}
                                                            size="xs"
                                                            compact
                                                        />
                                                    ))
                                                )}
                                            </div>
                                            <div className="text-[11px] text-white/60 font-mono">
                                                Melded {score.meldedPoints} −
                                                deadwood {score.deadwoodPoints}
                                                {score.goingOutBonus > 0 &&
                                                    ` + bonus ${score.goingOutBonus}`}
                                            </div>
                                        </div>
                                    );
                                },
                            )}
                        </div>

                        <Button className="w-full mt-5" onClick={onContinue}>
                            {isLeader
                                ? `Continue${countdown > 0 ? ` (${countdown}s)` : ""}`
                                : "Continue"}
                        </Button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
