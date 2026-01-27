"use client";

import React, {
    useRef,
    ReactNode,
    createContext,
    useContext,
    useMemo,
} from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useContainerDimensions, ContainerDimensions } from "@/hooks";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerPosition {
    /** Angle in radians from top (12 o'clock = 0) */
    angle: number;
    /** X position as percentage (0-100) */
    x: number;
    /** Y position as percentage (0-100) */
    y: number;
    /** Left neighbor index */
    leftNeighborIndex: number;
    /** Right neighbor index */
    rightNeighborIndex: number;
    /** Whether this is the hero (bottom) position */
    isHero: boolean;
}

interface CircularLayoutContextValue {
    dimensions: ContainerDimensions;
    playerCount: number;
    /** Player positions around the circle */
    positions: PlayerPosition[];
    /** Index of the hero player (always at bottom) */
    heroIndex: number;
    /** Radius of the player circle as percentage of container min dimension */
    radiusPercent: number;
    /** Whether we're in compact mode (mobile) */
    isCompact: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const CircularLayoutContext = createContext<CircularLayoutContextValue | null>(
    null,
);

export function useCircularLayout() {
    const context = useContext(CircularLayoutContext);
    if (!context) {
        throw new Error(
            "useCircularLayout must be used within a CircularPlayerLayout",
        );
    }
    return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate player positions around a circle.
 * Hero player is always at the bottom (6 o'clock position).
 *
 * @param playerCount - Number of players
 * @param heroPlayerIndex - Index of the hero player in the player array
 * @returns Array of player positions
 */
function calculatePlayerPositions(
    playerCount: number,
    heroPlayerIndex: number,
): PlayerPosition[] {
    const positions: PlayerPosition[] = [];

    // Angle between each player
    const angleStep = (2 * Math.PI) / playerCount;

    // Hero position is at bottom (180 degrees = π radians from top)
    // We need to rotate the whole circle so hero ends up at bottom
    const heroAngle = Math.PI; // Bottom of circle
    const startAngle = heroAngle - heroPlayerIndex * angleStep;

    for (let i = 0; i < playerCount; i++) {
        // Calculate angle for this player (clockwise from top)
        const angle = startAngle + i * angleStep;

        // Convert to x,y percentages (0-100)
        // sin gives us x offset, -cos gives us y offset (because y increases downward)
        const x = 50 + Math.sin(angle) * 40; // 40% radius from center
        const y = 50 - Math.cos(angle) * 40; // Negative because CSS y increases downward

        // Calculate neighbor indices (wrap around)
        const leftNeighborIndex = (i - 1 + playerCount) % playerCount;
        const rightNeighborIndex = (i + 1) % playerCount;

        positions.push({
            angle,
            x,
            y,
            leftNeighborIndex,
            rightNeighborIndex,
            isHero: i === heroPlayerIndex,
        });
    }

    return positions;
}

/**
 * Determine if layout should be compact based on dimensions.
 */
function getIsCompact(width: number, height: number): boolean {
    const minDim = Math.min(width, height);
    return minDim < 500;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface CircularPlayerLayoutProps {
    /** Number of players in the game */
    playerCount: number;
    /** Index of the hero player (viewing player) */
    heroPlayerIndex: number;
    /** Content to render */
    children: ReactNode;
    /** Custom background gradient */
    backgroundGradient?: string;
    /** Additional class names */
    className?: string;
    /** Show debug overlay */
    showDebug?: boolean;
    /** Callback when background is clicked */
    onBackgroundClick?: () => void;
}

/**
 * CircularPlayerLayout - A radial player arrangement for games like LRC.
 *
 * Positions players around a circle with the hero player always at the bottom.
 * The center is reserved for the game content (dice, pot, etc.).
 *
 * Key features:
 * - Hero player always at bottom (6 o'clock position)
 * - Clear left/right neighbor visualization
 * - Responsive sizing based on container dimensions
 * - Supports 3-10 players
 */
export function CircularPlayerLayout({
    playerCount,
    heroPlayerIndex,
    children,
    backgroundGradient = "from-amber-900 via-amber-800 to-yellow-900",
    className,
    showDebug = false,
    onBackgroundClick,
}: CircularPlayerLayoutProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dimensions = useContainerDimensions(containerRef);

    const isCompact = getIsCompact(dimensions.width, dimensions.height);

    // Calculate radius as percentage - smaller for more players
    const radiusPercent = useMemo(() => {
        // Base radius, reduced for more players to avoid overlap
        const baseRadius = 40;
        const reduction = Math.max(0, (playerCount - 4) * 2);
        return Math.max(30, baseRadius - reduction);
    }, [playerCount]);

    // Calculate positions
    const positions = useMemo(
        () => calculatePlayerPositions(playerCount, heroPlayerIndex),
        [playerCount, heroPlayerIndex],
    );

    const contextValue: CircularLayoutContextValue = {
        dimensions,
        playerCount,
        positions,
        heroIndex: heroPlayerIndex,
        radiusPercent,
        isCompact,
    };

    return (
        <CircularLayoutContext.Provider value={contextValue}>
            <div
                ref={containerRef}
                className={cn(
                    "relative w-full h-full overflow-hidden",
                    `bg-linear-to-br ${backgroundGradient}`,
                    className,
                )}
                onClick={onBackgroundClick}
            >
                {/* Wood/felt texture overlay */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%),
                            repeating-linear-gradient(
                                90deg,
                                transparent,
                                transparent 30px,
                                rgba(0,0,0,0.05) 30px,
                                rgba(0,0,0,0.05) 60px
                            )
                        `,
                    }}
                />

                {/* Inner shadow for depth */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        boxShadow: "inset 0 0 80px rgba(0,0,0,0.4)",
                    }}
                />

                {/* Debug overlay */}
                {showDebug && (
                    <CircularDebugOverlay
                        dimensions={dimensions}
                        positions={positions}
                        playerCount={playerCount}
                        radiusPercent={radiusPercent}
                    />
                )}

                {/* Main content */}
                <div className="relative z-10 w-full h-full">{children}</div>
            </div>
        </CircularLayoutContext.Provider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Slot Component
// ─────────────────────────────────────────────────────────────────────────────

interface CircularPlayerSlotProps {
    /** Index of this player in the positions array */
    playerIndex: number;
    /** Content to render for this player */
    children: ReactNode;
    /** Additional class names */
    className?: string;
}

/**
 * CircularPlayerSlot - Positions a player at their calculated spot on the circle.
 */
export function CircularPlayerSlot({
    playerIndex,
    children,
    className,
}: CircularPlayerSlotProps) {
    const { positions } = useCircularLayout();
    const position = positions[playerIndex];

    if (!position) {
        return null;
    }

    return (
        <motion.div
            className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2",
                position.isHero ? "z-30" : "z-20",
                className,
            )}
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: playerIndex * 0.05 }}
        >
            {children}
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Center Slot Component
// ─────────────────────────────────────────────────────────────────────────────

interface CircularCenterProps {
    children: ReactNode;
    className?: string;
}

/**
 * CircularCenter - The center region for dice, pot, etc.
 */
export function CircularCenter({ children, className }: CircularCenterProps) {
    return (
        <motion.div
            className={cn(
                "absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2",
                "flex flex-col items-center justify-center z-10",
                className,
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Direction Arrows Component
// ─────────────────────────────────────────────────────────────────────────────

interface DirectionArrowsProps {
    /** Show the arrows */
    show?: boolean;
    /** Custom class for left arrow */
    leftClassName?: string;
    /** Custom class for right arrow */
    rightClassName?: string;
}

/**
 * DirectionArrows - Shows L and R direction indicators around the circle.
 */
export function DirectionArrows({
    show = true,
    leftClassName,
    rightClassName,
}: DirectionArrowsProps) {
    const { dimensions } = useCircularLayout();

    if (!show) return null;

    const arrowSize = dimensions.width < 400 ? "text-sm" : "text-base";

    return (
        <>
            {/* Left arrow (counter-clockwise) */}
            <motion.div
                className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2",
                    "bg-blue-500/80 text-white px-3 py-1 rounded-full",
                    "font-bold shadow-lg",
                    arrowSize,
                    leftClassName,
                )}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
            >
                ← L
            </motion.div>

            {/* Right arrow (clockwise) */}
            <motion.div
                className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2",
                    "bg-green-500/80 text-white px-3 py-1 rounded-full",
                    "font-bold shadow-lg",
                    arrowSize,
                    rightClassName,
                )}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
            >
                R →
            </motion.div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug Overlay
// ─────────────────────────────────────────────────────────────────────────────

function CircularDebugOverlay({
    dimensions,
    positions,
    playerCount,
    radiusPercent,
}: {
    dimensions: ContainerDimensions;
    positions: PlayerPosition[];
    playerCount: number;
    radiusPercent: number;
}) {
    return (
        <div className="absolute inset-0 pointer-events-none z-50">
            {/* Center point */}
            <div
                className="absolute w-4 h-4 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{ left: "50%", top: "50%" }}
            />

            {/* Circle outline */}
            <div
                className="absolute border-2 border-dashed border-yellow-400/50 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{
                    left: "50%",
                    top: "50%",
                    width: `${radiusPercent * 2}%`,
                    height: `${radiusPercent * 2}%`,
                }}
            />

            {/* Player position markers */}
            {positions.map((pos, idx) => (
                <div
                    key={idx}
                    className={cn(
                        "absolute w-8 h-8 rounded-full -translate-x-1/2 -translate-y-1/2",
                        "flex items-center justify-center text-white text-xs font-bold",
                        pos.isHero ? "bg-red-500" : "bg-blue-500",
                    )}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                    {idx}
                </div>
            ))}

            {/* Info panel */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded font-mono">
                <div>
                    Size: {Math.round(dimensions.width)} ×{" "}
                    {Math.round(dimensions.height)}
                </div>
                <div>Players: {playerCount}</div>
                <div>Radius: {radiusPercent}%</div>
                <div className="mt-1 text-yellow-400">Circular Layout</div>
            </div>
        </div>
    );
}

export default CircularPlayerLayout;
