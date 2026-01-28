"use client";

/**
 * LRC Mobile Layout Components
 *
 * Stacked layouts optimized for mobile devices where circular layouts
 * cause overlapping. Includes directional indicators to show left/right
 * neighbor relationships.
 */

import React, { ReactNode, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import {
    PositionIndicator,
    TurnDirectionIndicator,
    RelativePosition,
} from "@/components/games/shared/PositionIndicator";
import { ChipStack } from "../ui/ChipStack";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Cached currency formatter - creating Intl.NumberFormat is expensive */
const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MobileLayoutPlayer {
    id: string;
    name: string;
    chips: number;
    isConnected: boolean;
    isCurrentTurn: boolean;
    isHero: boolean;
    isWinner: boolean;
}

export interface MobileLayoutProps {
    /** Players in seat order */
    players: MobileLayoutPlayer[];
    /** ID of the hero (viewing) player */
    heroId: string;
    /** Chip value for money display */
    chipValue?: number;
    /** Whether to show money values */
    showMoney?: boolean;
    /** Center content (pot, dice, buttons) */
    centerContent?: ReactNode;
    /** Additional class names */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the relative position of a player to the hero.
 * In LRC, play goes clockwise, so:
 * - Player immediately after hero in array = hero's RIGHT (receives chips on "R")
 * - Player immediately before hero in array = hero's LEFT (receives chips on "L")
 */
function getRelativePosition(
    playerIndex: number,
    heroIndex: number,
    playerCount: number,
): RelativePosition {
    if (playerIndex === heroIndex) return "hero";

    // Calculate clockwise distance from hero
    const clockwiseDistance =
        (playerIndex - heroIndex + playerCount) % playerCount;
    const counterClockwiseDistance =
        (heroIndex - playerIndex + playerCount) % playerCount;

    // Immediate neighbors
    if (clockwiseDistance === 1) return "right"; // Next player clockwise = right
    if (counterClockwiseDistance === 1) return "left"; // Previous player clockwise = left

    // For players further away, determine which side they're closer to
    if (clockwiseDistance <= counterClockwiseDistance) {
        return "right";
    }
    return "left";
}

/**
 * Annotate players with their relative position to the hero.
 * Note: Does not reorder players, only adds position metadata.
 */
function annotatePlayersWithPosition(
    players: MobileLayoutPlayer[],
    heroId: string,
): { player: MobileLayoutPlayer; relativePosition: RelativePosition }[] {
    const heroIndex = players.findIndex((p) => p.id === heroId);
    if (heroIndex === -1) {
        return players.map((player) => ({
            player,
            relativePosition: "right" as RelativePosition,
        }));
    }

    const playerCount = players.length;

    // Create array with relative positions
    return players.map((player, idx) => ({
        player,
        relativePosition: getRelativePosition(idx, heroIndex, playerCount),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Card Component (shared between layouts)
// ─────────────────────────────────────────────────────────────────────────────

interface PlayerCardProps {
    player: MobileLayoutPlayer;
    relativePosition: RelativePosition;
    chipValue?: number;
    showMoney?: boolean;
    variant?: "vertical" | "horizontal";
    size?: "sm" | "md";
}

function PlayerCard({
    player,
    relativePosition,
    chipValue = 0,
    showMoney = false,
    variant = "horizontal",
    size = "md",
}: PlayerCardProps) {
    // Use cached formatter for performance
    const moneyValue = useMemo(() => {
        if (!showMoney || chipValue <= 0) return null;
        return currencyFormatter.format(player.chips * chipValue);
    }, [player.chips, chipValue, showMoney]);

    const isVertical = variant === "vertical";
    const isSmall = size === "sm";

    return (
        <motion.div
            className={cn(
                "relative rounded-xl transition-all duration-300",
                "bg-black/20 backdrop-blur-sm",
                player.isCurrentTurn &&
                    "ring-2 ring-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/20",
                player.isWinner &&
                    "ring-2 ring-green-400 bg-green-500/20 shadow-lg shadow-green-500/20",
                !player.isConnected && "opacity-40 grayscale",
                player.isHero && "ring-2 ring-blue-400/50 bg-blue-500/10",
                isVertical
                    ? cn(
                          "flex flex-col items-center gap-1 p-2",
                          isSmall ? "min-w-16" : "min-w-20",
                      )
                    : cn(
                          "flex items-center gap-3 p-2.5",
                          isSmall ? "py-2" : "py-3",
                      ),
            )}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
                opacity: 1,
                scale: player.isCurrentTurn ? 1.02 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            {/* Position indicator (for non-hero players) */}
            {!player.isHero && (
                <div
                    className={cn(
                        "absolute",
                        isVertical
                            ? "top-1 right-1"
                            : "top-1/2 -translate-y-1/2",
                        !isVertical && relativePosition === "left" && "left-1",
                        !isVertical &&
                            relativePosition === "right" &&
                            "right-1",
                    )}
                >
                    <PositionIndicator
                        position={relativePosition}
                        size="sm"
                        isActive={player.isCurrentTurn}
                    />
                </div>
            )}

            {/* Player name */}
            <div
                className={cn(
                    "font-semibold truncate text-center",
                    player.isHero ? "text-blue-300" : "text-white/90",
                    isSmall ? "text-xs max-w-14" : "text-sm max-w-20",
                    !isVertical && "flex-1 text-left pl-6",
                )}
            >
                {player.name}
                {player.isHero && (
                    <span
                        className={cn(
                            "text-blue-400/70 block",
                            isSmall ? "text-[8px]" : "text-[10px]",
                        )}
                    >
                        (You)
                    </span>
                )}
            </div>

            {/* Chip stack */}
            <ChipStack
                count={player.chips}
                chipValue={chipValue}
                showMoney={false}
                size="sm"
            />

            {/* Money value */}
            {moneyValue && (
                <div
                    className={cn(
                        "text-green-400 font-medium bg-green-500/20 px-1.5 py-0.5 rounded-full",
                        isSmall ? "text-[8px]" : "text-[10px]",
                    )}
                >
                    {moneyValue}
                </div>
            )}

            {/* Current turn indicator */}
            {player.isCurrentTurn && (
                <motion.div
                    className={cn(
                        "absolute bg-amber-400 rounded-full shadow-lg",
                        isVertical
                            ? "-top-1 -right-1 w-2.5 h-2.5"
                            : "-top-1 left-1/2 -translate-x-1/2 w-2 h-2",
                    )}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [1, 0.7, 1],
                    }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                />
            )}

            {/* Winner crown */}
            {player.isWinner && (
                <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-base"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                    👑
                </motion.div>
            )}

            {/* Disconnected overlay */}
            {!player.isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                    <span className="text-[10px] text-white/60">Offline</span>
                </div>
            )}
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Vertical Layout (Portrait)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MobileVerticalLayout - Stacked vertical layout for portrait mobile screens.
 *
 * Layout structure:
 * ┌──────────────────────┐
 * │  → Turn Direction →  │
 * ├──────────────────────┤
 * │ [←L] Player 1        │  (Other players with position indicators)
 * │ [R→] Player 2        │
 * ├──────────────────────┤
 * │                      │
 * │   Center Content     │  (Pot, dice, buttons)
 * │                      │
 * ├──────────────────────┤
 * │ ★ You (Hero) ★       │  (Hero player - prominent)
 * └──────────────────────┘
 */
export function MobileVerticalLayout({
    players,
    heroId,
    chipValue = 0,
    showMoney = false,
    centerContent,
    className,
}: MobileLayoutProps) {
    const arrangedPlayers = useMemo(
        () => annotatePlayersWithPosition(players, heroId),
        [players, heroId],
    );

    // Separate hero from others
    const heroData = arrangedPlayers.find((p) => p.player.isHero);
    const otherPlayers = arrangedPlayers.filter((p) => !p.player.isHero);

    return (
        <div
            className={cn(
                "flex flex-col h-full w-full p-2 gap-2",
                "bg-linear-to-b from-emerald-900 to-emerald-950",
                className,
            )}
        >
            {/* Turn direction indicator */}
            <TurnDirectionIndicator direction="clockwise" size="sm" />

            {/* Other players (scrollable if many) */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                    <AnimatePresence mode="popLayout">
                        {otherPlayers.map(({ player, relativePosition }) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                relativePosition={relativePosition}
                                chipValue={chipValue}
                                showMoney={showMoney}
                                variant="horizontal"
                                size="md"
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Center content */}
            {centerContent && (
                <motion.div
                    className="shrink-0 flex items-center justify-center py-4"
                    layout
                >
                    {centerContent}
                </motion.div>
            )}

            {/* Hero player (bottom, prominent) */}
            {heroData && (
                <div className="shrink-0">
                    <PlayerCard
                        player={heroData.player}
                        relativePosition="hero"
                        chipValue={chipValue}
                        showMoney={showMoney}
                        variant="horizontal"
                        size="md"
                    />
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Horizontal Layout (Landscape)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MobileLandscapeLayout - Horizontal layout for landscape mobile screens.
 *
 * Layout structure:
 * ┌─────────────────────────────────────────────────────────┐
 * │              → Turn Direction →                         │
 * ├───────────┬─────────────────────────────┬───────────────┤
 * │   [←L]    │                             │    [R→]       │
 * │ Player 1  │      Center Content         │  Player 3     │
 * │ Player 2  │    (Pot, dice, buttons)     │  Player 4     │
 * ├───────────┼─────────────────────────────┼───────────────┤
 * │           │       ★ You (Hero) ★        │               │
 * └───────────┴─────────────────────────────┴───────────────┘
 */
export function MobileLandscapeLayout({
    players,
    heroId,
    chipValue = 0,
    showMoney = false,
    centerContent,
    className,
}: MobileLayoutProps) {
    const arrangedPlayers = useMemo(
        () => annotatePlayersWithPosition(players, heroId),
        [players, heroId],
    );

    // Separate hero from others, and group by left/right
    const heroData = arrangedPlayers.find((p) => p.player.isHero);
    const leftPlayers = arrangedPlayers.filter(
        (p) => !p.player.isHero && p.relativePosition === "left",
    );
    const rightPlayers = arrangedPlayers.filter(
        (p) => !p.player.isHero && p.relativePosition === "right",
    );

    return (
        <div
            className={cn(
                "flex flex-col h-full w-full p-2",
                "bg-linear-to-b from-emerald-900 to-emerald-950",
                className,
            )}
        >
            {/* Turn direction indicator */}
            <TurnDirectionIndicator
                direction="clockwise"
                size="sm"
                className="mb-1"
            />

            {/* Main content area */}
            <div className="flex-1 flex gap-2 min-h-0">
                {/* Left side players */}
                <div className="flex flex-col gap-1.5 justify-center w-24 shrink-0 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {leftPlayers.map(({ player, relativePosition }) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                relativePosition={relativePosition}
                                chipValue={chipValue}
                                showMoney={showMoney}
                                variant="vertical"
                                size="sm"
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Center content + hero */}
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    {/* Center content */}
                    {centerContent && (
                        <motion.div
                            className="flex items-center justify-center"
                            layout
                        >
                            {centerContent}
                        </motion.div>
                    )}

                    {/* Hero player (centered at bottom) */}
                    {heroData && (
                        <PlayerCard
                            player={heroData.player}
                            relativePosition="hero"
                            chipValue={chipValue}
                            showMoney={showMoney}
                            variant="horizontal"
                            size="sm"
                        />
                    )}
                </div>

                {/* Right side players */}
                <div className="flex flex-col gap-1.5 justify-center w-24 shrink-0 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {rightPlayers.map(({ player, relativePosition }) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                relativePosition={relativePosition}
                                chipValue={chipValue}
                                showMoney={showMoney}
                                variant="vertical"
                                size="sm"
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default MobileVerticalLayout;
