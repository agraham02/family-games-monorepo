"use client";

import React from "react";
import { motion } from "motion/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@shared/utils";
import { cn } from "@/lib/utils";
import { TurnTimer } from "./TurnTimer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerAvatarTurnTimer {
    /** Total time for the turn in milliseconds */
    totalMs: number;
    /** Server timestamp (ms) when the timer started */
    startedAt: number;
    /** Clock offset in ms (serverTime - clientTime) for sync */
    clockOffset?: number;
}

export interface PlayerAvatarProps {
    /** Stable id used to key the timer ring on player switch */
    playerId: string;
    /** Display name; initials are derived from this */
    playerName: string;
    /** Avatar diameter in px (default 40). Timer ring auto-sizes ~10–12px larger. */
    size?: number;
    /**
     * Optional Tailwind classes for responsive avatar sizing
     * (e.g. "h-10 w-10 md:h-12 md:w-12"). When provided, overrides the
     * inline width/height derived from `size`. `size` is still used for
     * the timer ring diameter.
     */
    sizeClassName?: string;
    /** Whether this player is the active turn-holder */
    isCurrentTurn: boolean;
    /** Whether this avatar belongs to the local user (hero accents) */
    isLocalPlayer?: boolean;
    /** Connection state — false renders the red "!" badge */
    connected?: boolean;
    /** Optional team color (overrides amber turn-border) */
    teamColor?: string;
    /** Optional turn timer state — when present and isCurrentTurn, draws the ring */
    turnTimer?: PlayerAvatarTurnTimer;
    /** Extra classes applied to the outer wrapper */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse Indicator (used when current turn but no timer)
// ─────────────────────────────────────────────────────────────────────────────

function PulseIndicator() {
    return (
        <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.4, 1],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            style={{
                background:
                    "radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, transparent 70%)",
                boxShadow:
                    "0 0 25px 8px rgba(251, 191, 36, 0.6), inset 0 0 15px 2px rgba(251, 191, 36, 0.5)",
            }}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlayerAvatar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared avatar primitive used by every game's player slot.
 *
 * Renders a circular avatar with initials, layered with:
 *  - a synchronized circular `TurnTimer` ring when it's this player's turn
 *    and a `turnTimer` is provided
 *  - a soft amber pulse when it's their turn but no timer is active
 *  - a small red "!" badge when `connected === false`
 *  - hero accents (blue glow) and optional team color border
 *
 * Composition is intentional: shells (PlayerInfo, RummyOpponentTile,
 * LRC PlayerSlot) own layout/labels; this primitive owns the avatar block.
 */
export function PlayerAvatar({
    playerId,
    playerName,
    size = 40,
    sizeClassName,
    isCurrentTurn,
    isLocalPlayer = false,
    connected = true,
    teamColor,
    turnTimer,
    className,
}: PlayerAvatarProps) {
    const initials = getInitials(playerName);
    const hasActiveTimer = !!(
        isCurrentTurn &&
        turnTimer &&
        turnTimer.totalMs > 0
    );
    // Ring is drawn ~10–12px outside the avatar; pad timer container to fit.
    const timerSize = size + (size >= 48 ? 12 : 10);

    const avatar = (
        <Avatar
            className={cn(
                "border-2 shadow-md transition-all duration-200",
                isCurrentTurn ? "border-amber-400" : "border-white/30",
                sizeClassName,
            )}
            style={{
                width: sizeClassName ? undefined : size,
                height: sizeClassName ? undefined : size,
                borderColor: teamColor || undefined,
                boxShadow: isLocalPlayer
                    ? "0 0 0 2px #3b82f6, 0 0 8px 2px rgba(59, 130, 246, 0.5)"
                    : undefined,
            }}
        >
            <AvatarFallback
                className={cn(
                    "text-sm font-bold",
                    isLocalPlayer
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-200",
                )}
            >
                {initials}
            </AvatarFallback>
        </Avatar>
    );

    return (
        <div className={cn("relative inline-flex", className)}>
            {/* Soft pulse when current turn but no timer ring is drawing */}
            {isCurrentTurn && !hasActiveTimer && <PulseIndicator />}

            {hasActiveTimer ? (
                <TurnTimer
                    key={`timer-${playerId}-${turnTimer!.startedAt}`}
                    totalMs={turnTimer!.totalMs}
                    startedAt={turnTimer!.startedAt}
                    clockOffset={turnTimer!.clockOffset}
                    isActive={true}
                    size={timerSize}
                >
                    {avatar}
                </TurnTimer>
            ) : (
                avatar
            )}

            {/* Disconnected badge */}
            {!connected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">!</span>
                </div>
            )}
        </div>
    );
}

export default PlayerAvatar;
