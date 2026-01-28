"use client";

/**
 * LRCAdaptiveLayout - Automatically chooses the best layout based on screen size.
 *
 * Uses useResponsiveLayout to determine whether to render:
 * - MobileVerticalLayout (portrait mobile)
 * - MobileLandscapeLayout (landscape mobile)
 * - CircularPlayerLayout (tablet/desktop)
 */

import React, { useRef, ReactNode, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
    useResponsiveLayout,
    useOrientationChange,
    usePrefersReducedMotion,
    LayoutMode,
} from "@/hooks";
import { LRCPlayer } from "@shared/types";
import {
    MobileVerticalLayout,
    MobileLandscapeLayout,
    MobileLayoutPlayer,
} from "./MobileLayouts";
import {
    CircularPlayerLayout,
    CircularPlayerSlot,
    CircularCenter,
    DirectionArrows,
} from "@/components/games/shared/CircularPlayerLayout";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LRCAdaptiveLayoutProps {
    /** LRC players in seat order */
    players: LRCPlayer[];
    /** Player connection status map */
    connectionStatus: Record<string, boolean>;
    /** ID of the current turn player */
    currentPlayerId: string | null;
    /** ID of the hero (viewing) player */
    heroId: string;
    /** ID of the winner (if any) */
    winnerId: string | null;
    /** Chip value for money display */
    chipValue?: number;
    /** Whether to show money values */
    showMoney?: boolean;
    /** Render function for player slots (for circular layout) */
    renderPlayerSlot?: (player: LRCPlayer, index: number) => ReactNode;
    /** Center content (pot, dice, buttons) */
    centerContent?: ReactNode;
    /** Whether chip passing is in progress (shows direction arrows) */
    isPassingChips?: boolean;
    /** Additional class names */
    className?: string;
    /** Force a specific layout mode (for testing) */
    forceLayoutMode?: LayoutMode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function LRCAdaptiveLayout({
    players,
    connectionStatus,
    currentPlayerId,
    heroId,
    winnerId,
    chipValue = 0,
    showMoney = false,
    renderPlayerSlot,
    centerContent,
    isPassingChips = false,
    className,
    forceLayoutMode,
}: LRCAdaptiveLayoutProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();

    // Track orientation changes for smooth transitions
    const { isTransitioning } = useOrientationChange({
        transitionDuration: 300,
    });

    const layout = useResponsiveLayout(containerRef, {
        playerCount: players.length,
        forceLayoutMode,
    });

    // Convert LRCPlayers to MobileLayoutPlayer format
    const mobileLayoutPlayers: MobileLayoutPlayer[] = useMemo(() => {
        return players.map((player) => ({
            id: player.id,
            name: player.name,
            chips: player.chips,
            isConnected: connectionStatus[player.id] ?? true,
            isCurrentTurn: player.id === currentPlayerId,
            isHero: player.id === heroId,
            isWinner: player.id === winnerId,
        }));
    }, [players, connectionStatus, currentPlayerId, heroId, winnerId]);

    // Find hero index for circular layout
    const heroIndex = useMemo(() => {
        const idx = players.findIndex((p) => p.id === heroId);
        return idx >= 0 ? idx : 0;
    }, [players, heroId]);

    // Render the appropriate layout
    const renderLayout = () => {
        switch (layout.layoutMode) {
            case "stacked-vertical":
                return (
                    <MobileVerticalLayout
                        players={mobileLayoutPlayers}
                        heroId={heroId}
                        chipValue={chipValue}
                        showMoney={showMoney}
                        centerContent={centerContent}
                    />
                );

            case "stacked-horizontal":
                return (
                    <MobileLandscapeLayout
                        players={mobileLayoutPlayers}
                        heroId={heroId}
                        chipValue={chipValue}
                        showMoney={showMoney}
                        centerContent={centerContent}
                    />
                );

            case "semi-circular":
            case "full-circular":
                return (
                    <CircularPlayerLayout
                        playerCount={players.length}
                        heroPlayerIndex={heroIndex}
                        backgroundGradient="from-emerald-900 via-emerald-800 to-green-900"
                    >
                        {/* Player slots */}
                        {players.map((player, idx) =>
                            renderPlayerSlot ? (
                                <CircularPlayerSlot
                                    key={player.id}
                                    playerIndex={idx}
                                >
                                    {renderPlayerSlot(player, idx)}
                                </CircularPlayerSlot>
                            ) : (
                                <CircularPlayerSlot
                                    key={player.id}
                                    playerIndex={idx}
                                >
                                    <DefaultCircularPlayerSlot
                                        player={player}
                                        isConnected={
                                            connectionStatus[player.id] ?? true
                                        }
                                        isCurrentTurn={
                                            player.id === currentPlayerId
                                        }
                                        isHero={player.id === heroId}
                                        isWinner={player.id === winnerId}
                                        chipValue={chipValue}
                                        showMoney={showMoney}
                                    />
                                </CircularPlayerSlot>
                            ),
                        )}

                        {/* Center content */}
                        <CircularCenter>{centerContent}</CircularCenter>

                        {/* Direction arrows during chip passing */}
                        <DirectionArrows show={isPassingChips} />
                    </CircularPlayerLayout>
                );

            default:
                // Fallback to vertical layout if unknown mode (defensive)
                console.warn(
                    `Unknown layout mode: ${layout.layoutMode}, falling back to vertical`,
                );
                return (
                    <MobileVerticalLayout
                        players={mobileLayoutPlayers}
                        heroId={heroId}
                        chipValue={chipValue}
                        showMoney={showMoney}
                        centerContent={centerContent}
                    />
                );
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn("w-full h-full overflow-hidden", className)}
            role="region"
            aria-label={`LRC game table with ${players.length} players`}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={layout.layoutMode}
                    className={cn(
                        "w-full h-full",
                        isTransitioning && "pointer-events-none",
                    )}
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: isTransitioning ? 0.7 : 1 }}
                    exit={prefersReducedMotion ? {} : { opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                >
                    {renderLayout()}
                </motion.div>
            </AnimatePresence>

            {/* Debug overlay */}
            {process.env.NODE_ENV === "development" && (
                <div className="fixed bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono z-50 pointer-events-none">
                    {layout.layoutMode} | {Math.round(layout.dimensions.width)}×
                    {Math.round(layout.dimensions.height)}
                    {isTransitioning && " | rotating"}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Circular Player Slot (fallback when no custom renderer provided)
// ─────────────────────────────────────────────────────────────────────────────

interface DefaultCircularPlayerSlotProps {
    player: LRCPlayer;
    isConnected: boolean;
    isCurrentTurn: boolean;
    isHero: boolean;
    isWinner: boolean;
    chipValue: number;
    showMoney: boolean;
}

function DefaultCircularPlayerSlot({
    player,
    isConnected,
    isCurrentTurn,
    isHero,
    isWinner,
    chipValue,
    showMoney,
}: DefaultCircularPlayerSlotProps) {
    // This is a minimal fallback - the actual LRC component provides a richer version
    return (
        <motion.div
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl",
                "bg-black/20 backdrop-blur-sm",
                isCurrentTurn && "ring-2 ring-amber-400 bg-amber-500/20",
                isWinner && "ring-2 ring-green-400 bg-green-500/20",
                !isConnected && "opacity-40 grayscale",
                isHero && "scale-105",
            )}
            layout
        >
            <div
                className={cn(
                    "text-sm font-semibold truncate max-w-20 text-center",
                    isHero ? "text-amber-300" : "text-white/90",
                )}
            >
                {player.name}
                {isHero && (
                    <span className="text-amber-400/70 text-[10px] block">
                        (You)
                    </span>
                )}
            </div>
            <div className="text-lg font-bold text-amber-300">
                {player.chips} 🪙
            </div>
            {showMoney && chipValue > 0 && (
                <div className="text-xs text-green-400">
                    ${(player.chips * chipValue).toFixed(2)}
                </div>
            )}
        </motion.div>
    );
}

export default LRCAdaptiveLayout;
