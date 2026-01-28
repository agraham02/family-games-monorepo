"use client";

import { useMemo, useRef, useCallback, useEffect } from "react";

// ============================================================================
// Layout Cache Utilities
// ============================================================================

/**
 * Memoization hook for layout calculations.
 * Uses standard useMemo with rounded dimensions to prevent recalc on micro-changes.
 *
 * @param factory - Factory function that receives rounded dimensions
 * @param tileIds - Array of tile IDs for cache key
 * @param containerWidth - Raw container width (will be rounded)
 * @param containerHeight - Raw container height (will be rounded)
 * @param enableSnaking - Whether snaking is enabled
 */
export function useLayoutMemo<T>(
    factory: (roundedWidth: number, roundedHeight: number) => T,
    tileIds: string[],
    containerWidth: number,
    containerHeight: number,
    enableSnaking: boolean,
): T {
    // Round dimensions to prevent recalc on micro-changes (nearest 10px)
    const roundedWidth = Math.round(containerWidth / 10) * 10;
    const roundedHeight = Math.round(containerHeight / 10) * 10;
    const tileKey = tileIds.join(",");

    // Pass rounded dimensions to factory to avoid stale closure issues
    return useMemo(
        () => factory(roundedWidth, roundedHeight),
        [factory, tileKey, roundedWidth, roundedHeight, enableSnaking],
    );
}

// ============================================================================
// Throttle Utility
// ============================================================================

/**
 * Throttled callback that limits execution frequency.
 * Useful for expensive calculations during resize/scroll.
 */
export function useThrottledCallback<
    T extends (...args: Parameters<T>) => void,
>(callback: T, delay: number = 100): T {
    const lastRun = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const throttled = useCallback(
        ((...args: Parameters<T>) => {
            const now = Date.now();
            const remaining = delay - (now - lastRun.current);

            if (remaining <= 0) {
                lastRun.current = now;
                callback(...args);
            } else {
                // Schedule for later
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                    lastRun.current = Date.now();
                    callback(...args);
                }, remaining);
            }
        }) as T,
        [callback, delay],
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return throttled;
}

// ============================================================================
// Spring Animation Presets (DRY - centralized animation configs)
// ============================================================================

/** Standard spring config for UI elements */
export const SPRING_PRESETS = {
    /** Default responsive spring */
    default: { stiffness: 300, damping: 25 },
    /** Snappy spring for quick feedback */
    snappy: { stiffness: 400, damping: 30 },
    /** Gentle spring for subtle animations */
    gentle: { stiffness: 200, damping: 20 },
    /** Bouncy spring for playful elements */
    bouncy: { stiffness: 350, damping: 15 },
    /** Smooth spring for pan/zoom transitions */
    smooth: { stiffness: 200, damping: 30 },
} as const;

export type SpringPreset = keyof typeof SPRING_PRESETS;
