"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { getInitials } from "@shared/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { RummyData } from "@shared/types";

export interface OpponentsStripProps {
    gameData: RummyData;
    heroId: string;
    className?: string;
}

/**
 * Horizontal bar at the top of every Rummy scene showing each non-hero
 * player's avatar, name, card count and active-turn highlight. Intentionally
 * minimal — this is the only place opponents surface now that seat-based
 * edges are gone.
 */
export default function OpponentsStrip({
    gameData,
    heroId,
    className,
}: OpponentsStripProps) {
    const currentTurnId = gameData.playOrder[gameData.currentTurnIndex];
    const opponents = gameData.playOrder.filter((id) => id !== heroId);

    if (opponents.length === 0) return null;

    return (
        <motion.div
            layout
            layoutId="rummy-opponents-strip"
            className={cn(
                "w-full flex items-center justify-center gap-2 md:gap-3 px-2 py-2 overflow-x-auto",
                className,
            )}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
            {opponents.map((pid) => {
                const player = gameData.players[pid];
                const isTurn = pid === currentTurnId;
                const handCount = gameData.handCounts[pid] ?? 0;
                const score = gameData.scores[pid] ?? 0;
                const name = player?.name ?? "Unknown";

                return (
                    <motion.div
                        key={pid}
                        layout
                        layoutId={`rummy-opponent-${pid}`}
                        className={cn(
                            "shrink-0 flex items-center gap-2 rounded-full px-2 py-1.5 border backdrop-blur-sm transition-colors",
                            isTurn
                                ? "bg-amber-500/25 border-amber-400/70 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
                                : "bg-black/40 border-white/10",
                        )}
                    >
                        <Avatar
                            className={cn(
                                "h-8 w-8 md:h-9 md:w-9",
                                isTurn && "ring-2 ring-amber-300",
                            )}
                        >
                            <AvatarFallback className="text-xs bg-emerald-900 text-white">
                                {getInitials(name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <span
                                className={cn(
                                    "text-xs font-medium truncate max-w-32",
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
                                handCount === 0 &&
                                    "bg-purple-500/40 border-purple-400",
                            )}
                            aria-label={`${name} has ${handCount} cards`}
                        >
                            {handCount}
                        </Badge>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
