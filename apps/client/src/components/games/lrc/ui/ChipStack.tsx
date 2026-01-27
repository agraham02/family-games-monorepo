"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ChipMovement } from "@shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChipStackProps {
    /** Number of chips in the stack */
    count: number;
    /** Size of each chip in pixels */
    chipSize?: number;
    /** Maximum visible chips (rest shown as +N) */
    maxVisible?: number;
    /** Monetary value per chip (0 = don't show money) */
    chipValue?: number;
    /** Whether this is a large center pot display */
    isLargePot?: boolean;
    /** Whether to show money value */
    showMoney?: boolean;
    /** Size preset for convenience */
    size?: "sm" | "md" | "lg";
    /** Additional class names */
    className?: string;
}

interface ChipProps {
    /** Size of the chip in pixels */
    size?: number;
    /** Offset for stacking effect (in pixels) */
    offset?: number;
    /** Z-index for stacking */
    zIndex?: number;
    /** Additional class names */
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Chip Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chip - A single poker-style chip with 3D appearance.
 */
export function Chip({
    size = 40,
    offset = 0,
    zIndex = 0,
    className,
}: ChipProps) {
    return (
        <div
            className={cn(
                "rounded-full relative",
                "bg-linear-to-br from-red-500 via-red-600 to-red-700",
                "shadow-lg",
                className,
            )}
            style={{
                width: size,
                height: size,
                transform: `translateY(${-offset}px)`,
                zIndex,
            }}
        >
            {/* Inner circle pattern */}
            <div
                className="absolute rounded-full bg-linear-to-br from-red-400 to-red-600"
                style={{
                    top: "15%",
                    left: "15%",
                    right: "15%",
                    bottom: "15%",
                }}
            />

            {/* Edge dashes */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <div
                    key={angle}
                    className="absolute bg-white/80"
                    style={{
                        width: "20%",
                        height: "6%",
                        top: "47%",
                        left: "40%",
                        transform: `rotate(${angle}deg) translateX(${size * 0.35}px)`,
                        transformOrigin: "center center",
                        borderRadius: 2,
                    }}
                />
            ))}

            {/* Shine effect */}
            <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
                }}
            />

            {/* 3D edge effect */}
            <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                    boxShadow:
                        "inset 2px 2px 3px rgba(255,255,255,0.3), inset -2px -2px 3px rgba(0,0,0,0.3)",
                }}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip Stack Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ChipStack - A stack of chips with count badge and optional money value.
 */
export function ChipStack({
    count,
    chipSize: chipSizeProp,
    maxVisible = 5,
    chipValue = 0,
    isLargePot = false,
    showMoney = false,
    size = "md",
    className,
}: ChipStackProps) {
    // Calculate chip size from size prop if chipSize not explicitly set
    const chipSize =
        chipSizeProp ?? (size === "sm" ? 28 : size === "lg" ? 56 : 40);

    // Calculate how many chips to actually render
    const visibleCount = Math.min(count, maxVisible);
    const stackOffset = isLargePot ? 4 : 3;

    // Calculate money value
    const moneyValue = count * chipValue;
    const formattedMoney = useMemo(() => {
        if (!showMoney || chipValue <= 0) return null;
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(moneyValue);
    }, [showMoney, moneyValue, chipValue]);

    if (count === 0) {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center opacity-50",
                    className,
                )}
            >
                <div
                    className="rounded-full border-2 border-dashed border-gray-400"
                    style={{ width: chipSize, height: chipSize }}
                />
                <span className="text-xs text-gray-400 mt-1">0</span>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col items-center", className)}>
            {/* Chip stack */}
            <div
                className="relative"
                style={{
                    height: chipSize + (visibleCount - 1) * stackOffset,
                    width: chipSize,
                }}
            >
                <AnimatePresence>
                    {Array.from({ length: visibleCount }).map((_, idx) => (
                        <motion.div
                            key={idx}
                            className="absolute"
                            style={{
                                bottom: idx * stackOffset,
                                zIndex: idx,
                            }}
                            initial={{ scale: 0, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0, y: -20 }}
                            transition={{
                                delay: idx * 0.05,
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                            }}
                        >
                            <Chip size={chipSize} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Count badge */}
            <motion.div
                className={cn(
                    "mt-2 px-2 py-0.5 rounded-full",
                    "bg-black/70 text-white font-bold",
                    isLargePot ? "text-lg" : "text-sm",
                )}
                key={count}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
                {count}
            </motion.div>

            {/* Money value (if enabled) */}
            {formattedMoney && (
                <motion.div
                    className={cn(
                        "mt-1 px-2 py-0.5 rounded-full",
                        "bg-green-600/90 text-white font-semibold",
                        isLargePot ? "text-base" : "text-xs",
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {formattedMoney}
                </motion.div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Flying Chip Component
// ─────────────────────────────────────────────────────────────────────────────

interface FlyingChipProps {
    /** Starting position (x, y) in pixels */
    from: { x: number; y: number };
    /** Ending position (x, y) in pixels */
    to: { x: number; y: number };
    /** Animation delay in seconds */
    delay?: number;
    /** Duration in seconds */
    duration?: number;
    /** Callback when animation completes */
    onComplete?: () => void;
    /** Chip size */
    size?: number;
}

/**
 * FlyingChip - A chip that animates from one position to another with an arc trajectory.
 */
export function FlyingChip({
    from,
    to,
    delay = 0,
    duration = 0.6,
    onComplete,
    size = 30,
}: FlyingChipProps) {
    // Calculate arc control point (above the midpoint)
    const midX = (from.x + to.x) / 2;
    const midY = Math.min(from.y, to.y) - 50; // Arc above

    return (
        <motion.div
            className="fixed pointer-events-none z-50"
            initial={{
                x: from.x - size / 2,
                y: from.y - size / 2,
                scale: 1,
                opacity: 1,
            }}
            animate={{
                x: [from.x - size / 2, midX - size / 2, to.x - size / 2],
                y: [from.y - size / 2, midY - size / 2, to.y - size / 2],
                scale: [1, 1.2, 1],
                opacity: [1, 1, 0.8],
            }}
            transition={{
                duration,
                delay,
                ease: "easeInOut",
                times: [0, 0.5, 1],
            }}
            onAnimationComplete={onComplete}
        >
            <Chip size={size} />
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip Animation Manager Component
// ─────────────────────────────────────────────────────────────────────────────

interface ChipAnimationManagerProps {
    /** Array of chip movements to animate */
    movements: ChipMovement[];
    /** Map of player IDs to their screen positions (optional - will be no-op if not provided) */
    playerPositions?: Record<string, { x: number; y: number }>;
    /** Position of the center pot (optional - will be no-op if not provided) */
    centerPosition?: { x: number; y: number };
    /** Callback when all animations complete */
    onComplete?: () => void;
    /** Whether animations are active */
    isActive?: boolean;
}

/**
 * ChipAnimationManager - Orchestrates multiple chip flying animations.
 */
export function ChipAnimationManager({
    movements,
    playerPositions,
    centerPosition,
    onComplete,
    isActive = true,
}: ChipAnimationManagerProps) {
    const hasPositions = !!playerPositions && !!centerPosition;

    // Reset completed count when movements change
    const [_completedCount, setCompletedCount] = React.useState(0);
    React.useEffect(() => {
        setCompletedCount(0);
    }, [movements]);

    // If positions not provided, just call onComplete immediately
    React.useEffect(() => {
        if (!hasPositions && isActive && movements.length > 0) {
            const timeout = setTimeout(() => {
                onComplete?.();
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [hasPositions, isActive, movements, onComplete]);

    // Handle individual chip animation completion
    const handleChipComplete = React.useCallback(() => {
        setCompletedCount((prev) => {
            const newCount = prev + 1;
            const totalChips = movements.reduce((sum, m) => sum + m.count, 0);
            if (newCount >= totalChips && onComplete) {
                onComplete();
            }
            return newCount;
        });
    }, [movements, onComplete]);

    // No positions - render nothing (effect above handles onComplete)
    if (!hasPositions || !isActive || movements.length === 0) {
        return null;
    }

    // Flatten movements into individual chip animations
    const chipAnimations: Array<{
        from: { x: number; y: number };
        to: { x: number; y: number };
        delay: number;
    }> = [];

    let animationIndex = 0;
    for (const movement of movements) {
        const fromPos = playerPositions[movement.fromPlayerId];
        const toPos =
            movement.toPlayerId === "center"
                ? centerPosition
                : playerPositions[movement.toPlayerId];

        if (!fromPos || !toPos) continue;

        for (let i = 0; i < movement.count; i++) {
            chipAnimations.push({
                from: fromPos,
                to: toPos,
                delay: animationIndex * 0.15, // Stagger animations
            });
            animationIndex++;
        }
    }

    return (
        <>
            {chipAnimations.map((anim, idx) => (
                <FlyingChip
                    key={`${idx}-${anim.from.x}-${anim.to.x}`}
                    from={anim.from}
                    to={anim.to}
                    delay={anim.delay}
                    onComplete={handleChipComplete}
                />
            ))}
        </>
    );
}

export default ChipStack;
