"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    PlayerAvatar,
    type PlayerAvatarTurnTimer,
} from "@/components/games/shared";
import type { RummyData } from "@shared/types";

export interface RummyOpponentTileProps {
    playerId: string;
    gameData: RummyData;
    /** Timer state for the active player; only renders when this is the active seat. */
    turnTimer?: PlayerAvatarTurnTimer;
}

/**
 * Single-player opponent tile used inside EdgeRegion for the Rummy seat layout.
 * Composes the shared `PlayerAvatar` primitive (avatar + ring + connected
 * indicator) with Rummy-specific labels (name, card count, score).
 */
export default function RummyOpponentTile({
    playerId,
    gameData,
    turnTimer,
}: RummyOpponentTileProps) {
    const player = gameData.players[playerId];
    const isTurn = gameData.playOrder[gameData.currentTurnIndex] === playerId;
    const handCount = gameData.handCounts[playerId] ?? 0;
    const score = gameData.scores[playerId] ?? 0;
    const name = player?.name ?? "Unknown";
    const connected = player?.isConnected ?? true;

    return (
        <motion.div
            layout
            layoutId={`rummy-opponent-${playerId}`}
            className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1.5 border backdrop-blur-sm transition-colors",
                isTurn
                    ? "bg-amber-500/25 border-amber-400/70 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
                    : "bg-black/40 border-white/10",
            )}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
            <PlayerAvatar
                playerId={playerId}
                playerName={name}
                size={36}
                isCurrentTurn={isTurn}
                connected={connected}
                turnTimer={isTurn ? turnTimer : undefined}
            />
            <div className="flex flex-col min-w-0">
                <span
                    className={cn(
                        "text-xs font-medium truncate max-w-28",
                        isTurn ? "text-amber-100" : "text-white/90",
                    )}
                >
                    {name}
                </span>
                <span className="text-[10px] font-mono text-white/60 leading-tight">
                    {handCount} cards · {score} pts
                </span>
            </div>
            <Badge
                variant="secondary"
                className={cn(
                    "text-[10px] font-mono bg-white/10 text-white border-white/10",
                    handCount === 0 && "bg-purple-500/40 border-purple-400",
                )}
                aria-label={`${name} has ${handCount} cards`}
            >
                {handCount}
            </Badge>
        </motion.div>
    );
}
