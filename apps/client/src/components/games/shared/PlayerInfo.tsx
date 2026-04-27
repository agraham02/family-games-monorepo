"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { SeatPosition } from "@/hooks";
import { PlayerAvatar, type PlayerAvatarCountBadge } from "./PlayerAvatar";
import { useGameTableOptional, type LayoutMode } from "./GameTable";
import { TurnTimer } from "./TurnTimer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render-prop context handed to `customStats`. Lets each game adjust its
 * stats display density based on layout mode + seat alignment without
 * inspecting GameTable internals.
 */
export interface CustomStatsContext {
    textAlign: "left" | "center" | "right";
    /** Current GameTable layout mode (compact|comfortable|spacious). */
    density: LayoutMode;
    /** Hero (local player) seat — games may want richer stats here. */
    isLocalPlayer: boolean;
}

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
     * Optional small pill rendered in the bottom-right corner of the avatar
     * showing a count (tiles, cards, chips remaining). On compact/comfortable
     * layouts this saves rail space versus a separate badge column.
     */
    countBadge?: PlayerAvatarCountBadge;
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
     * customStats={({ textAlign, density }) => (
     *   <div className="flex gap-1 items-center">
     *     <Badge>Tiles: {tilesCount}</Badge>
     *     <Badge>Score: {score}</Badge>
     *   </div>
     * )}
     * ```
     *
     * The legacy single-arg signature `(textAlign) => ReactNode` is still
     * accepted for backward-compatibility — the function will be called with
     * just the alignment string in that case via duck typing.
     */
    customStats?: (
        ctxOrAlign: CustomStatsContext | "left" | "center" | "right",
    ) => ReactNode;
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
    countBadge,
    customStats,
}: PlayerInfoProps) {
    const layout = getLayoutConfig(seatPosition);

    // Read GameTable layout mode (compact|comfortable|spacious). When this
    // PlayerInfo is rendered standalone we fall back to "spacious".
    const tableCtx = useGameTableOptional();
    const density: LayoutMode = tableCtx?.layoutConfig.layoutMode ?? "spacious";
    const isCompact = density === "compact";
    const isComfortable = density === "comfortable";
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

    // ---- Orientation matrix --------------------------------------------
    // Hero (bottom): unchanged — stacked column with avatar below the name.
    // Top opponents:
    //   compact      → horizontal (avatar | stats), name hidden (initials suffice)
    //   comfortable  → horizontal, name truncated
    //   spacious     → vertical (column), full name + stats
    // Side opponents:
    //   compact      → vertical (avatar over single-line name + stats), tight
    //   comfortable  → vertical, name truncated
    //   spacious     → horizontal (default), full info
    //
    // The bottom-side and top-side diagonal positions follow their dominant
    // edge.
    let flexDirection = layout.direction;
    if (!isLocalPlayer) {
        if (isTopSeat && (isCompact || isComfortable)) {
            flexDirection = "row";
        } else if (isSideSeat && (isCompact || isComfortable)) {
            flexDirection = "column";
        }
    }

    // Avatar size: shrink for opponents on tight layouts; further on crowded
    // tables (7+ players) which always run in badge mode.
    const playerCount = tableCtx?.playerCount ?? 4;
    const isCrowded = playerCount >= 7;
    const avatarSizeClass = isLocalPlayer
        ? "h-10 w-10 md:h-12 md:w-12"
        : isCompact
          ? isCrowded
              ? "h-6 w-6"
              : "h-7 w-7"
          : isComfortable
            ? isCrowded
                ? "h-7 w-7"
                : "h-9 w-9"
            : "h-8 w-8 md:h-10 md:w-10";

    // Pixel size used by the timer ring and the count-badge scale.
    const avatarPx = isLocalPlayer
        ? 48
        : isCompact
          ? isCrowded
              ? 24
              : 28
          : isComfortable
            ? isCrowded
                ? 28
                : 36
            : 40;

    // Hero on compact: hide the avatar to give the trick pile every pixel.
    const hideHeroAvatar = isLocalPlayer && isCompact;

    // Stats text: show name on compact side seats now (single-line truncated)
    // since count badge rides the avatar; preserve old behavior for top.
    const hideTopName = !isLocalPlayer && isCompact && isTopSeat;
    const hideTextBlock = false;

    const containerGap = isCompact
        ? "gap-1"
        : isComfortable
          ? "gap-1.5"
          : "gap-2";

    const customStatsCtx: CustomStatsContext = {
        textAlign: layout.textAlign,
        density,
        isLocalPlayer,
    };
    // Backward-compat: single-arg legacy callers expect a string.
    const renderedStats = customStats
        ? (customStats as (a: unknown) => ReactNode)(
              customStats.length <= 1 && !isCompact && !isComfortable
                  ? layout.textAlign
                  : customStatsCtx,
          )
        : null;
    // Fall back to plain alignment string if anything goes wrong with the
    // duck-typed call — ensures legacy `(textAlign) => ...` users keep working.
    const statsNode = renderedStats ?? null;

    return (
        <motion.div
            className={cn(
                "flex items-center",
                containerGap,
                !connected && "opacity-50",
                className,
            )}
            style={{ flexDirection }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Avatar with optional turn timer + count badge (shared primitive) */}
            <div className={cn(hideHeroAvatar && "hidden")}>
                <PlayerAvatar
                    playerId={playerId}
                    playerName={playerName}
                    size={avatarPx}
                    sizeClassName={avatarSizeClass}
                    isCurrentTurn={isCurrentTurn}
                    isLocalPlayer={isLocalPlayer}
                    connected={connected}
                    teamColor={teamColor}
                    turnTimer={turnTimer}
                    countBadge={countBadge}
                />
            </div>

            {/*
             * Standalone timer ring shown when the hero's avatar is hidden
             * (compact-mode hero) but a turn timer is active. Without this
             * the hero would lose all visual countdown feedback on mobile.
             */}
            {hideHeroAvatar && turnTimer && isCurrentTurn && (
                <div className="flex items-center justify-center">
                    <TurnTimer
                        key={turnTimer.startedAt}
                        totalMs={turnTimer.totalMs}
                        startedAt={turnTimer.startedAt}
                        clockOffset={turnTimer.clockOffset}
                        isActive
                        size={22}
                    />
                </div>
            )}
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
                        "text-white font-medium truncate text-sm",
                        isCompact ? "max-w-16" : "max-w-25",
                        isCurrentTurn && "text-amber-300",
                        hideTopName && "hidden",
                    )}
                >
                    {playerName}
                    {isLocalPlayer && " (You)"}
                </span>

                {/* Game-specific stats via render prop */}
                {statsNode}

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
