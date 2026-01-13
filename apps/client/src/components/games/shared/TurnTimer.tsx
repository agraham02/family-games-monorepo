// src/components/games/shared/TurnTimer.tsx
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface TurnTimerProps {
    /** Total time for the turn in milliseconds */
    totalMs: number;
    /** Server timestamp (ms) when the timer started */
    startedAt: number;
    /** Clock offset in ms (serverTime - clientTime) for sync */
    clockOffset?: number;
    /** Whether the timer is currently active */
    isActive: boolean;
    /** Size of the timer (diameter) - default 48 */
    size?: number;
    /** Additional class names */
    className?: string;
    /** Children to render inside the timer ring (e.g., avatar) */
    children?: React.ReactNode;
}

// Color thresholds
const COLOR_GREEN = "#22c55e";
const COLOR_AMBER = "#f59e0b";
const COLOR_RED = "#ef4444";
const BG_GREEN = "#dcfce7";
const BG_AMBER = "#fef3c7";
const BG_RED = "#fee2e2";

function getColors(percentage: number) {
    if (percentage > 50) return { stroke: COLOR_GREEN, bg: BG_GREEN };
    if (percentage > 20) return { stroke: COLOR_AMBER, bg: BG_AMBER };
    return { stroke: COLOR_RED, bg: BG_RED };
}

/**
 * High-performance circular progress timer component for turn-based games.
 * Designed to wrap around player avatars.
 *
 * PERFORMANCE OPTIMIZATION:
 * This component uses direct DOM manipulation via refs and its own
 * requestAnimationFrame loop to achieve 60fps animation without triggering
 * React re-renders on every frame. Only color threshold changes trigger re-renders.
 *
 * Features:
 * - Expanding ring animation when timer starts
 * - Smooth 60fps countdown using direct DOM manipulation
 * - Color transitions based on remaining time (only re-renders at thresholds)
 * - Pulse animation when time is low
 *
 * IMPORTANT: Use a unique `key` prop (e.g., `key={startedAt}`) when mounting
 * to ensure fresh animation state on each turn.
 *
 * Color transitions:
 * - Green (#22c55e) when >50% remaining
 * - Amber (#f59e0b) when 20-50% remaining
 * - Red (#ef4444) when <20% remaining
 *
 * Pulses when <30% time remaining.
 */
export function TurnTimer({
    totalMs,
    startedAt,
    clockOffset = 0,
    isActive,
    size = 48,
    className,
    children,
}: TurnTimerProps) {
    // Refs for direct DOM manipulation (no re-renders on animation)
    const progressCircleRef = useRef<SVGCircleElement>(null);
    const bgCircleRef = useRef<SVGCircleElement>(null);
    const rafIdRef = useRef<number | null>(null);

    // Track if we should show the start animation
    const [showStartAnimation, setShowStartAnimation] = useState(true);

    // Color state - only updates when crossing thresholds (50%, 20%)
    const [colorState, setColorState] = useState<"green" | "amber" | "red">(
        "green"
    );

    // Track if pulsing
    const [shouldPulse, setShouldPulse] = useState(false);

    // SVG calculations (constant for a given size)
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Get colors based on state
    const colors = getColors(
        colorState === "green" ? 100 : colorState === "amber" ? 40 : 10
    );

    // Calculate remaining ms at a given point in time
    const calculateRemainingMs = useCallback((): number => {
        const adjustedNow = Date.now() + clockOffset;
        const elapsed = adjustedNow - startedAt;
        return Math.max(0, totalMs - elapsed);
    }, [totalMs, startedAt, clockOffset]);

    // Hide start animation after it plays
    useEffect(() => {
        if (isActive && showStartAnimation) {
            const timeout = setTimeout(() => {
                setShowStartAnimation(false);
            }, 600);
            return () => clearTimeout(timeout);
        }
    }, [isActive, showStartAnimation]);

    // Main animation loop - runs independently of React render cycle
    useEffect(() => {
        if (!isActive) {
            return;
        }

        // Track current color state to avoid unnecessary setState calls
        let currentColorState: "green" | "amber" | "red" = "green";
        let currentPulseState = false;

        const tick = () => {
            const remainingMs = calculateRemainingMs();
            const percentage = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;

            // Direct DOM update for strokeDashoffset (no React re-render)
            if (progressCircleRef.current) {
                const offset = circumference * ((100 - percentage) / 100);
                progressCircleRef.current.style.strokeDashoffset =
                    String(offset);

                // Update stroke color directly
                const { stroke, bg } = getColors(percentage);
                progressCircleRef.current.style.stroke = stroke;
                if (bgCircleRef.current) {
                    bgCircleRef.current.style.stroke = bg;
                }
            }

            // Check if color state changed (for the start animation border color)
            const newColorState: "green" | "amber" | "red" =
                percentage > 50 ? "green" : percentage > 20 ? "amber" : "red";

            if (newColorState !== currentColorState) {
                currentColorState = newColorState;
                setColorState(newColorState);
            }

            // Check if pulse state changed
            const newPulseState = remainingMs > 0 && percentage <= 30;
            if (newPulseState !== currentPulseState) {
                currentPulseState = newPulseState;
                setShouldPulse(newPulseState);
            }

            // Continue animation if time remaining
            if (remainingMs > 0) {
                rafIdRef.current = requestAnimationFrame(tick);
            } else {
                rafIdRef.current = null;
            }
        };

        // Start the animation loop
        rafIdRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [isActive, totalMs, circumference, calculateRemainingMs]);

    if (!isActive) {
        // Just render children without timer ring when inactive
        return (
            <div
                className={cn(
                    "relative inline-flex items-center justify-center",
                    className
                )}
                style={{ width: size, height: size }}
            >
                {children}
            </div>
        );
    }

    // Calculate initial offset for first render
    const initialRemainingMs = calculateRemainingMs();
    const initialPercentage =
        totalMs > 0 ? (initialRemainingMs / totalMs) * 100 : 0;
    const initialOffset = circumference * ((100 - initialPercentage) / 100);
    const initialColors = getColors(initialPercentage);

    return (
        <div
            className={cn(
                "relative inline-flex items-center justify-center",
                shouldPulse && "animate-pulse",
                className
            )}
            style={{ width: size, height: size }}
        >
            {/* Start animation - expanding ring that fades out */}
            <AnimatePresence>
                {showStartAnimation && (
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                            border: `2px solid ${colors.stroke}`,
                        }}
                        initial={{ scale: 0.8, opacity: 0.8 }}
                        animate={{ scale: 1.4, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                )}
            </AnimatePresence>

            {/* SVG Timer Ring */}
            <svg
                className="absolute inset-0 -rotate-90"
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
            >
                {/* Background circle */}
                <circle
                    ref={bgCircleRef}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={initialColors.bg}
                    strokeWidth={strokeWidth}
                    className="dark:opacity-30"
                    style={{ willChange: "stroke" }}
                />
                {/* Progress circle - animated via direct DOM manipulation */}
                <circle
                    ref={progressCircleRef}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={initialColors.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={initialOffset}
                    style={{ willChange: "stroke-dashoffset, stroke" }}
                />
            </svg>
            {/* Content (avatar, etc.) */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
