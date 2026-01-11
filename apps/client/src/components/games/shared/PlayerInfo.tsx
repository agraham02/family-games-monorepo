"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/playerUtils";
import { motion } from "motion/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SeatPosition } from "@/hooks";
import { TurnTimer } from "./TurnTimer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TurnTimerState {
    totalSeconds: number;
    remainingSeconds: number;
}

interface PlayerInfoProps {
    playerId: string;
    playerName: string;
    isCurrentTurn: boolean;
    isLocalPlayer?: boolean;
    seatPosition: SeatPosition;
    /**
     * Spades-specific: Player's bid (deprecated, use customStats instead)
     * @deprecated Use customStats render prop for game-specific data
     */
    bid?: number | null;
    /**
     * Spades-specific: Tricks won (deprecated, use customStats instead)
     * @deprecated Use customStats render prop for game-specific data
     */
    tricksWon?: number;
    teamColor?: string;
    connected?: boolean;
    className?: string;
    /**
     * Turn timer state. When provided and isCurrentTurn is true,
     * displays a circular progress ring around the avatar.
     */
    turnTimer?: TurnTimerState;
    /**
     * Render prop for game-specific stats display.
     * Receives the text alignment based on seat position.
     * Use this instead of bid/tricksWon for game-specific data.
     *
     * @example
     * ```tsx
     * // Spades
     * customStats={(textAlign) => (
     *   <div className="flex gap-1 items-center">
     *     <Badge>Bid: {bid}</Badge>
     *     <Badge>Won: {tricksWon}</Badge>
     *   </div>
     * )}
     *
     * // Dominoes
     * customStats={(textAlign) => (
     *   <div className="flex gap-1 items-center">
     *     <Badge>Tiles: {tilesCount}</Badge>
     *     <Badge>Score: {score}</Badge>
     *   </div>
     * )}
     * ```
     */
    customStats?: (textAlign: "left" | "center" | "right") => ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

// Layout configuration based on seat position
function getLayoutConfig(position: SeatPosition): {
    direction: "row" | "row-reverse" | "column" | "column-reverse";
    textAlign: "left" | "center" | "right";
} {
    switch (position) {
        case "bottom":
            return { direction: "column-reverse", textAlign: "center" };
        case "top":
            return { direction: "column", textAlign: "center" };
        case "left":
        case "bottom-left":
        case "top-left":
            return { direction: "row", textAlign: "left" };
        case "right":
        case "bottom-right":
        case "top-right":
            return { direction: "row-reverse", textAlign: "right" };
        default:
            return { direction: "column", textAlign: "center" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn Indicator Component
// ─────────────────────────────────────────────────────────────────────────────

function TurnIndicator({ isActive }: { isActive: boolean }) {
    if (!isActive) return null;

    return (
        <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: [0.5, 0.9, 0.5],
                scale: [1, 1.3, 1],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            style={{
                background:
                    "radial-gradient(circle, rgba(251, 191, 36, 0.6) 0%, transparent 70%)",
                boxShadow: "0 0 20px 5px rgba(251, 191, 36, 0.4)",
            }}
        />
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlayerInfo Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PlayerInfo - Displays player information (avatar, name, bid, tricks).
 *
 * Uses Shadcn components and adapts layout based on seat position.
 */
function PlayerInfo({
    playerName,
    isCurrentTurn,
    isLocalPlayer = false,
    seatPosition,
    bid,
    tricksWon,
    teamColor,
    connected = true,
    className,
    turnTimer,
    customStats,
}: PlayerInfoProps) {
    const layout = getLayoutConfig(seatPosition);
    const initials = getInitials(playerName);

    // Responsive avatar size
    const avatarSize = isLocalPlayer
        ? "h-10 w-10 md:h-12 md:w-12"
        : "h-8 w-8 md:h-10 md:w-10";

    // Timer size based on avatar size - needs to be larger than avatar to show ring
    // Hero: 48px avatar + ~12px for ring = 60px
    // Other: 40px avatar + ~10px for ring = 50px
    const timerSize = isLocalPlayer ? 60 : 50;

    return (
        <motion.div
            className={cn(
                "flex gap-2 items-center",
                !connected && "opacity-50",
                className
            )}
            style={{ flexDirection: layout.direction }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Avatar with turn indicator or timer */}
            <div className="relative">
                {/* Only show pulse indicator if there's no timer */}
                {!turnTimer && <TurnIndicator isActive={isCurrentTurn} />}
                <TurnTimer
                    totalSeconds={turnTimer?.totalSeconds ?? 0}
                    remainingSeconds={turnTimer?.remainingSeconds ?? 0}
                    isActive={
                        isCurrentTurn &&
                        !!turnTimer &&
                        turnTimer.totalSeconds > 0
                    }
                    size={timerSize}
                >
                    <Avatar
                        className={cn(
                            avatarSize,
                            "border-2 shadow-md transition-all duration-200",
                            isCurrentTurn
                                ? "border-amber-400"
                                : "border-white/30"
                        )}
                        style={{
                            borderColor: teamColor || undefined,
                            // Use box-shadow for hero indicator instead of ring (doesn't add to bounding box)
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
                                    : "bg-slate-700 text-slate-200"
                            )}
                        >
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </TurnTimer>

                {/* Disconnected indicator */}
                {!connected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">
                            !
                        </span>
                    </div>
                )}
            </div>

            {/* Player info */}
            <div
                className={cn(
                    "flex flex-col min-w-0",
                    layout.textAlign === "right" && "items-end"
                )}
                style={{ textAlign: layout.textAlign }}
            >
                {/* Name */}
                <span
                    className={cn(
                        "text-white font-medium truncate max-w-[100px] text-sm",
                        isCurrentTurn && "text-amber-300"
                    )}
                >
                    {playerName}
                    {isLocalPlayer && " (You)"}
                </span>

                {/* Game-specific stats via render prop */}
                {customStats && customStats(layout.textAlign)}

                {/* Legacy Spades-specific stats (deprecated, use customStats) */}
                {!customStats && bid !== null && bid !== undefined && (
                    <div className="flex gap-1 items-center">
                        <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 bg-black/30 border-white/20 text-white/80"
                        >
                            Bid: {bid}
                        </Badge>
                        {tricksWon !== undefined && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-[10px] px-1.5 py-0 border-white/20",
                                    tricksWon >= bid
                                        ? "bg-green-500/30 text-green-300"
                                        : "bg-black/30 text-white/80"
                                )}
                            >
                                Won: {tricksWon}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default PlayerInfo;
