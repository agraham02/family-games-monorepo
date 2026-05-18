"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
    CardHand,
    PlayerAvatar,
    type PlayerAvatarTurnTimer,
    useGameTable,
} from "@/components/games/shared";
import type { EdgePosition } from "@/components/games/shared";
import type { RummyData } from "@shared/types";

export interface RummyOpponentTileProps {
    playerId: string;
    gameData: RummyData;
    /** Edge this tile sits on — drives orientation (top=row, sides=column). */
    seatPosition?: EdgePosition;
    /** Timer state for the active player; only renders when this is the active seat. */
    turnTimer?: PlayerAvatarTurnTimer;
}

/**
 * Single-player opponent tile used inside EdgeRegion for the Rummy seat layout.
 *
 * Orientation rules (matches the new shared PlayerInfo matrix):
 * - top edge      → horizontal (avatar | name+stats)
 * - left/right    → vertical (avatar over name+stats), tighter on compact
 *
 * The card count rides on the avatar via `countBadge` so we don't double-print
 * it in a separate trailing pill.
 */
export default function RummyOpponentTile({
    playerId,
    gameData,
    seatPosition = "top",
    turnTimer,
}: RummyOpponentTileProps) {
    const player = gameData.players[playerId];
    const isTurn = gameData.playOrder[gameData.currentTurnIndex] === playerId;
    const handCount = gameData.handCounts[playerId] ?? 0;
    const score = gameData.scores[playerId] ?? 0;
    const name = player?.name ?? "Unknown";
    const connected = player?.isConnected ?? true;

    const { layoutConfig } = useGameTable();
    const density = layoutConfig.layoutMode;
    const isCompact = density === "compact";
    const isTop = seatPosition === "top";
    const isVertical = !isTop;

    // Compact side seats hide the name to keep the column narrow; the
    // count badge on the avatar still conveys hand size.
    const hideName = isCompact && isVertical;
    const avatarPx = isCompact ? 28 : 36;

    // On larger screens (badge mode off) we render face-down card backs
    // for the opponent — mirroring Spades / Dominoes — so the opponent's
    // hand is visible at a glance instead of just a numeric badge.
    const showCardBacks = !layoutConfig.useBadgeMode && handCount > 0;

    return (
        <motion.div
            layout
            layoutId={`rummy-opponent-${playerId}`}
            className={cn(
                "flex items-center",
                isVertical ? "flex-col gap-1" : "flex-row gap-2",
            )}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
            <div
                className={cn(
                    "flex items-center rounded-full border backdrop-blur-sm transition-colors",
                    isVertical
                        ? "flex-col gap-1 px-1.5 py-1"
                        : "flex-row gap-2 px-2 py-1.5",
                    isTurn
                        ? "bg-amber-500/25 border-amber-400/70 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
                        : "bg-black/40 border-white/10",
                )}
            >
                <PlayerAvatar
                    playerId={playerId}
                    playerName={name}
                    size={avatarPx}
                    isCurrentTurn={isTurn}
                    connected={connected}
                    turnTimer={isTurn ? turnTimer : undefined}
                    countBadge={{
                        value: handCount,
                        tone: handCount === 0 ? "neutral" : "card",
                        ariaLabel: `${name} has ${handCount} cards`,
                    }}
                />
                {!hideName && (
                    <div
                        className={cn(
                            "flex flex-col min-w-0",
                            isVertical ? "items-center" : "items-start",
                        )}
                    >
                        <span
                            className={cn(
                                "text-xs font-medium truncate",
                                isCompact ? "max-w-16" : "max-w-28",
                                isTurn ? "text-amber-100" : "text-white/90",
                            )}
                        >
                            {name}
                        </span>
                        {!isCompact && (
                            <span className="text-[10px] font-mono text-white/60 leading-tight">
                                {score} pts
                            </span>
                        )}
                    </div>
                )}
            </div>
            {showCardBacks && (
                <CardHand
                    cards={[]}
                    cardCount={handCount}
                    isLocalPlayer={false}
                    interactive={false}
                    playerId={playerId}
                />
            )}
        </motion.div>
    );
}
