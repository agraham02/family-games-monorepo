"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { SeatPosition } from "@/hooks";
import { PlayerAvatar } from "./PlayerAvatar";
import { useGameTableOptional } from "./GameTable";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TurnTimerState {
    /** Total time for the turn in milliseconds */
    totalMs: number;
    /** Server timestamp (ms) when the timer started */
    startedAt: number;
    /** Clock offset in ms (serverTime - clientTime) for sync */
    clockOffset?: number;
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
// PlayerInfo Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PlayerInfo - Displays player information (avatar, name, bid, tricks).
 *
 * Uses Shadcn components and adapts layout based on seat position.
 */
function PlayerInfo({
    playerId,
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

    // When inside a GameTable, shrink the info block on compact layouts so
    // side seats (left/right) don't overflow their narrow column.
    const tableCtx = useGameTableOptional();
    const isCompact = tableCtx?.layoutConfig.layoutMode === "compact";
    const isSideSeat =
        seatPosition === "left" ||
        seatPosition === "right" ||
        seatPosition === "top-left" ||
        seatPosition === "top-right" ||
        seatPosition === "bottom-left" ||
        seatPosition === "bottom-right";
    const isTopSeat =
        seatPosition === "top" ||
        seatPosition === "top-left" ||
        seatPosition === "top-right";
    // On compact side seats, collapse name + stats to keep the column narrow.
    // The count badge next to the avatar already conveys hand size.
    const hideTextBlock = !isLocalPlayer && isCompact && isSideSeat;
    // On compact top seat, hide the name label to keep the stacked top region
    // (hand + info) within its grid row. The avatar initials already identify
    // the player; stats (bid/won, pts/tiles) remain useful and stay visible.
    const hideTopName = !isLocalPlayer && isCompact && isTopSeat;
    // On compact mobile the hero's own avatar adds little value (the hand is
    // face-up) and steals vertical space from the trick pile. Hide it.
    const hideHeroAvatar = isLocalPlayer && isCompact;

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
                className,
            )}
            style={{
                // On compact top seat, stack avatar + stats horizontally so
                // the whole seat fits under the OpponentTiles badge within
                // the top grid row.
                flexDirection:
                    isCompact && isTopSeat && !isLocalPlayer
                        ? "row"
                        : layout.direction,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Avatar with turn indicator or timer (shared primitive) */}
            <div className={cn(hideHeroAvatar && "hidden")}>
                <PlayerAvatar
                    playerId={playerId}
                    playerName={playerName}
                    size={timerSize - 12}
                    sizeClassName={avatarSize}
                    isCurrentTurn={isCurrentTurn}
                    isLocalPlayer={isLocalPlayer}
                    connected={connected}
                    teamColor={teamColor}
                    turnTimer={turnTimer}
                />
            </div>

            {/* Player info */}
            <div
                className={cn(
                    "flex flex-col min-w-0",
                    layout.textAlign === "right" && "items-end",
                    hideTextBlock && "hidden",
                )}
                style={{ textAlign: layout.textAlign }}
            >
                {/* Name */}
                <span
                    className={cn(
                        "text-white font-medium truncate max-w-25 text-sm",
                        isCurrentTurn && "text-amber-300",
                        hideTopName && "hidden",
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
                                        : "bg-black/30 text-white/80",
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
