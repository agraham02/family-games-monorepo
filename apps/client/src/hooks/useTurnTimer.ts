import { useState, useEffect, useRef } from "react";

interface TurnTimerResult {
    remainingSeconds: number;
    isExpired: boolean;
}

/**
 * Hook to manage turn timer countdown with server synchronization.
 * Uses server-provided remainingSeconds as the authoritative starting value,
 * then counts down locally for smooth animation.
 *
 * @param serverRemainingSeconds - Server-calculated remaining seconds (for sync)
 * @param totalSeconds - Total seconds allowed for the turn (0 or undefined means no limit)
 * @returns Object with remainingSeconds and isExpired
 */
export function useTurnTimer(
    serverRemainingSeconds: number | undefined,
    totalSeconds: number | undefined
): TurnTimerResult {
    // Track the last server value to detect when we need to resync
    const lastServerValueRef = useRef<number | undefined>(
        serverRemainingSeconds
    );

    // Initialize with server value, fallback to totalSeconds
    const [remainingSeconds, setRemainingSeconds] = useState(() => {
        if (
            serverRemainingSeconds !== undefined &&
            serverRemainingSeconds > 0
        ) {
            return serverRemainingSeconds;
        }
        return totalSeconds ?? 0;
    });

    // Resync when server provides a new value
    useEffect(() => {
        // If server value changed significantly (more than 2 seconds difference),
        // resync to correct any drift
        if (
            serverRemainingSeconds !== undefined &&
            serverRemainingSeconds > 0
        ) {
            const diff = Math.abs(serverRemainingSeconds - remainingSeconds);
            if (
                diff > 2 ||
                lastServerValueRef.current !== serverRemainingSeconds
            ) {
                setRemainingSeconds(serverRemainingSeconds);
            }
            lastServerValueRef.current = serverRemainingSeconds;
        }
    }, [serverRemainingSeconds]);

    // Local countdown interval
    useEffect(() => {
        // Don't set up interval if no time limit
        if (!totalSeconds || totalSeconds <= 0) {
            return;
        }

        // Update every second
        const interval = setInterval(() => {
            setRemainingSeconds((prev) => {
                const next = prev - 1;
                if (next <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [totalSeconds, serverRemainingSeconds]);

    return {
        remainingSeconds,
        isExpired: remainingSeconds <= 0 && !!totalSeconds && totalSeconds > 0,
    };
}
