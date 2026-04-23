"use client";

import React from "react";
import { motion } from "motion/react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useTurnTimer } from "@/hooks";
import { cn } from "@/lib/utils";
import type { RummyData } from "@shared/types";

export interface TurnIndicatorProps {
    gameData: RummyData;
    heroId: string;
    isMyTurn: boolean;
    className?: string;
}

/**
 * Top-center pill describing whose turn it is plus a countdown when the
 * server has attached a `turnTimer`. Replaces the bare round/substate pill.
 *
 * - When `isMyTurn` → emerald "Your turn" with amber timer.
 * - Otherwise → muted "<Name>'s turn" with amber timer.
 * - Round + substate rendered as a secondary line for quick reference.
 */
export default function TurnIndicator({
    gameData,
    heroId,
    isMyTurn,
    className,
}: TurnIndicatorProps) {
    const { clockOffset } = useWebSocket();
    const { remainingSeconds, isActive } = useTurnTimer(
        gameData.turnTimer,
        clockOffset,
    );

    const currentTurnId = gameData.playOrder[gameData.currentTurnIndex];
    const currentPlayer = gameData.players[currentTurnId];
    const label = isMyTurn
        ? "Your turn"
        : `${currentPlayer?.name ?? "Player"}'s turn`;

    const warn = isActive && remainingSeconds <= 10;
    const danger = isActive && remainingSeconds <= 5;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "pointer-events-none flex items-center gap-2 rounded-full border backdrop-blur-sm px-3 py-1 text-xs shadow-lg",
                isMyTurn
                    ? "bg-emerald-600/70 border-emerald-300/70 text-white"
                    : "bg-black/50 border-white/15 text-white/85",
                className,
            )}
            aria-live="polite"
        >
            {isMyTurn && (
                <motion.span
                    aria-hidden
                    className="inline-block size-2 rounded-full bg-emerald-300"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}
            <span className="font-semibold tracking-wide">{label}</span>
            {isActive && (
                <span
                    className={cn(
                        "font-mono tabular-nums rounded-full px-2 py-0.5 text-[10px] border",
                        danger
                            ? "bg-red-500/80 border-red-300 text-white"
                            : warn
                              ? "bg-amber-500/80 border-amber-200 text-white"
                              : "bg-white/10 border-white/20 text-white/90",
                    )}
                >
                    0:{String(Math.max(0, remainingSeconds)).padStart(2, "0")}
                </span>
            )}
            <span className="hidden sm:inline text-[10px] font-mono text-white/60">
                R{gameData.round} · {gameData.turnSubstate}
            </span>
        </motion.div>
    );
}
