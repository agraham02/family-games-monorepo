// src/components/games/shared/TurnTimer.tsx
"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TurnTimerProps {
    /** Total seconds for the turn */
    totalSeconds: number;
    /** Remaining seconds in the turn */
    remainingSeconds: number;
    /** Whether the timer is currently active */
    isActive: boolean;
    /** Size of the timer (diameter) - default 48 */
    size?: number;
    /** Additional class names */
    className?: string;
    /** Children to render inside the timer ring (e.g., avatar) */
    children?: React.ReactNode;
}

/**
 * Circular progress timer component for turn-based games.
 * Designed to wrap around player avatars.
 *
 * IMPORTANT: Only mount this component when the timer should be active.
 * This prevents the 0→100% animation bug that occurs when the component
 * is mounted before timer values are ready.
 *
 * Color transitions:
 * - Green (#22c55e) when >50% remaining
 * - Amber (#f59e0b) when 20-50% remaining
 * - Red (#ef4444) when <20% remaining
 *
 * Pulses when <30% time remaining.
 */
export function TurnTimer({
    totalSeconds,
    remainingSeconds,
    isActive,
    size = 48,
    className,
    children,
}: TurnTimerProps) {
    // Calculate percentage
    const percentage = useMemo(() => {
        if (totalSeconds <= 0) return 0;
        return Math.max(
            0,
            Math.min(100, (remainingSeconds / totalSeconds) * 100)
        );
    }, [totalSeconds, remainingSeconds]);

    // Determine color based on percentage
    const color = useMemo(() => {
        if (percentage > 50) return "#22c55e"; // green-500
        if (percentage > 20) return "#f59e0b"; // amber-500
        return "#ef4444"; // red-500
    }, [percentage]);

    // Background color (muted version)
    const bgColor = useMemo(() => {
        if (percentage > 50) return "#dcfce7"; // green-100
        if (percentage > 20) return "#fef3c7"; // amber-100
        return "#fee2e2"; // red-100
    }, [percentage]);

    // Should pulse when under 30% time left
    const shouldPulse =
        isActive &&
        remainingSeconds > 0 &&
        remainingSeconds <= totalSeconds * 0.3;

    // SVG calculations
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    // Invert: start full (0 offset) and drain to empty (full circumference offset)
    const strokeDashoffset = circumference * ((100 - percentage) / 100);

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

    return (
        <div
            className={cn(
                "relative inline-flex items-center justify-center",
                shouldPulse && "animate-pulse",
                className
            )}
            style={{ width: size, height: size }}
        >
            {/* SVG Timer Ring */}
            <svg
                className="absolute inset-0 -rotate-90"
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={bgColor}
                    strokeWidth={strokeWidth}
                    className="dark:opacity-30"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-linear"
                />
            </svg>
            {/* Content (avatar, etc.) */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
