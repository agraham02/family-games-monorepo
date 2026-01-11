import { useState, useEffect, useCallback } from "react";

interface TurnTimerResult {
    remainingSeconds: number;
    isExpired: boolean;
}

/**
 * Hook to calculate remaining time for a turn timer.
 * Updates every second when active.
 *
 * @param turnStartedAt - ISO timestamp when the turn started
 * @param totalSeconds - Total seconds allowed for the turn (0 or undefined means no limit)
 * @returns Object with remainingSeconds and isExpired
 */
export function useTurnTimer(
    turnStartedAt: string | undefined,
    totalSeconds: number | undefined
): TurnTimerResult {
    const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds ?? 0);

    const calculateRemaining = useCallback(() => {
        if (!turnStartedAt || !totalSeconds || totalSeconds <= 0) {
            return totalSeconds ?? 0;
        }

        const startTime = new Date(turnStartedAt).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        return Math.max(0, totalSeconds - elapsedSeconds);
    }, [turnStartedAt, totalSeconds]);

    useEffect(() => {
        // Calculate initial remaining time
        setRemainingSeconds(calculateRemaining());

        // Don't set up interval if no time limit
        if (!totalSeconds || totalSeconds <= 0) {
            return;
        }

        // Update every second
        const interval = setInterval(() => {
            const remaining = calculateRemaining();
            setRemainingSeconds(remaining);

            // Clear interval if expired
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [turnStartedAt, totalSeconds, calculateRemaining]);

    return {
        remainingSeconds,
        isExpired: remainingSeconds <= 0 && !!totalSeconds && totalSeconds > 0,
    };
}
