import { useState, useEffect, useRef, useCallback } from "react";
import { TurnTimerInfo } from "@shared/types";

interface TurnTimerResult {
    /** Remaining time in seconds (for display, updates once per second) */
    remainingSeconds: number;
    /** Whether the timer has expired */
    isExpired: boolean;
    /** Whether the timer is currently active */
    isActive: boolean;
}

/**
 * Hook to manage turn timer state with server synchronization.
 *
 * This is a lightweight hook that provides timer state for UI logic.
 * For the actual countdown animation, use the TurnTimer component which
 * handles its own high-performance animation via direct DOM manipulation.
 *
 * This hook:
 * - Fires onTimerStart callback when a new timer starts
 * - Updates remainingSeconds once per second (for text display)
 * - Provides isActive/isExpired state for UI logic
 *
 * @param turnTimer - Server-provided timer info (startedAt, duration, serverTime)
 * @param clockOffset - Offset in ms between server and client clocks (from WebSocketContext)
 * @param onTimerStart - Optional callback when timer starts (for audio/visual cues)
 * @returns Object with remainingSeconds, isExpired, and isActive
 */
export function useTurnTimer(
    turnTimer: TurnTimerInfo | undefined,
    clockOffset: number,
    onTimerStart?: () => void
): TurnTimerResult {
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const lastTimerStartRef = useRef<number | null>(null);
    const onTimerStartRef = useRef(onTimerStart);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Keep callback ref updated
    useEffect(() => {
        onTimerStartRef.current = onTimerStart;
    }, [onTimerStart]);

    // Calculate remaining seconds with clock offset compensation
    const calculateRemainingSeconds = useCallback((): number => {
        if (!turnTimer) return 0;
        const adjustedNow = Date.now() + clockOffset;
        const elapsed = adjustedNow - turnTimer.startedAt;
        return Math.max(0, Math.ceil((turnTimer.duration - elapsed) / 1000));
    }, [turnTimer, clockOffset]);

    useEffect(() => {
        // If no timer info, clear state
        if (!turnTimer) {
            setRemainingSeconds(0);
            lastTimerStartRef.current = null;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Detect new timer start (different startedAt value)
        if (lastTimerStartRef.current !== turnTimer.startedAt) {
            console.log(
                "⏱️ New timer detected:",
                turnTimer.startedAt,
                "previous:",
                lastTimerStartRef.current
            );
            lastTimerStartRef.current = turnTimer.startedAt;
            // Fire the onTimerStart callback for new timers
            onTimerStartRef.current?.();
        }

        // Set initial value
        setRemainingSeconds(calculateRemainingSeconds());

        // Update once per second for text display
        intervalRef.current = setInterval(() => {
            const remaining = calculateRemainingSeconds();
            setRemainingSeconds(remaining);
            if (remaining <= 0 && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [turnTimer, calculateRemainingSeconds]);

    const isActive = !!turnTimer && turnTimer.duration > 0;
    const isExpired = isActive && remainingSeconds <= 0;

    return {
        remainingSeconds,
        isExpired,
        isActive,
    };
}
