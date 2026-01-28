"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// Types
// ============================================================================

export type OrientationType = "portrait" | "landscape";

export interface OrientationState {
    /** Current orientation */
    orientation: OrientationType;
    /** Angle of rotation (0, 90, 180, 270) */
    angle: number;
    /** Whether orientation just changed (for transition animations) */
    isTransitioning: boolean;
    /** Previous orientation (useful for animation direction) */
    previousOrientation: OrientationType | null;
    /** Whether device supports orientation API */
    isSupported: boolean;
}

export interface UseOrientationChangeOptions {
    /** Callback when orientation changes */
    onOrientationChange?: (state: OrientationState) => void;
    /** Duration in ms to keep isTransitioning true after change */
    transitionDuration?: number;
    /** Debounce time in ms for orientation changes */
    debounceMs?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get current orientation from screen.orientation API or window dimensions.
 */
function getCurrentOrientation(): OrientationType {
    if (typeof window === "undefined") return "portrait";

    // Use screen.orientation if available
    if (window.screen?.orientation?.type) {
        const type = window.screen.orientation.type;
        return type.includes("landscape") ? "landscape" : "portrait";
    }

    // Fallback to window dimensions
    return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
}

/**
 * Get current rotation angle.
 */
function getCurrentAngle(): number {
    if (typeof window === "undefined") return 0;

    // Use screen.orientation if available
    if (window.screen?.orientation?.angle !== undefined) {
        return window.screen.orientation.angle;
    }

    // Fallback based on dimensions
    return window.innerWidth > window.innerHeight ? 90 : 0;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook that tracks device orientation changes with smooth transition handling.
 *
 * Provides:
 * - Current orientation (portrait/landscape)
 * - Rotation angle
 * - Transition state for animation coordination
 * - Previous orientation for animation direction
 *
 * @example
 * ```tsx
 * const { orientation, isTransitioning, previousOrientation } = useOrientationChange({
 *   onOrientationChange: (state) => console.log('Changed to', state.orientation),
 *   transitionDuration: 300,
 * });
 *
 * return (
 *   <motion.div
 *     animate={{ opacity: isTransitioning ? 0.7 : 1 }}
 *     transition={{ duration: 0.3 }}
 *   >
 *     {orientation === 'portrait' ? <PortraitLayout /> : <LandscapeLayout />}
 *   </motion.div>
 * );
 * ```
 */
export function useOrientationChange(
    options: UseOrientationChangeOptions = {},
): OrientationState {
    const {
        onOrientationChange,
        transitionDuration = 300,
        debounceMs = 100,
    } = options;

    const [state, setState] = useState<OrientationState>(() => ({
        orientation: getCurrentOrientation(),
        angle: getCurrentAngle(),
        isTransitioning: false,
        previousOrientation: null,
        isSupported: typeof window !== "undefined" && "orientation" in screen,
    }));

    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const isMountedRef = useRef(true);

    const handleOrientationChange = useCallback(() => {
        // Clear existing debounce
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            // Guard against unmounted component
            if (!isMountedRef.current) return;

            const newOrientation = getCurrentOrientation();
            const newAngle = getCurrentAngle();

            setState((prev) => {
                // Only update if orientation actually changed
                if (prev.orientation === newOrientation) {
                    return prev;
                }

                const newState: OrientationState = {
                    orientation: newOrientation,
                    angle: newAngle,
                    isTransitioning: true,
                    previousOrientation: prev.orientation,
                    isSupported: prev.isSupported,
                };

                // Call callback
                if (onOrientationChange) {
                    onOrientationChange(newState);
                }

                return newState;
            });

            // Clear transition state after duration
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
            transitionTimeoutRef.current = setTimeout(() => {
                // Guard against unmounted component
                if (!isMountedRef.current) return;
                setState((prev) => ({ ...prev, isTransitioning: false }));
            }, transitionDuration);
        }, debounceMs);
    }, [onOrientationChange, transitionDuration, debounceMs]);

    useEffect(() => {
        isMountedRef.current = true;

        if (typeof window === "undefined") return;

        // Listen to orientation change events
        const orientationAPI = window.screen?.orientation;

        if (orientationAPI) {
            orientationAPI.addEventListener("change", handleOrientationChange);
        }

        // Fallback: also listen to resize events
        window.addEventListener("resize", handleOrientationChange);

        // Also listen to orientationchange event (older API)
        window.addEventListener("orientationchange", handleOrientationChange);

        return () => {
            isMountedRef.current = false;

            if (orientationAPI) {
                orientationAPI.removeEventListener(
                    "change",
                    handleOrientationChange,
                );
            }
            window.removeEventListener("resize", handleOrientationChange);
            window.removeEventListener(
                "orientationchange",
                handleOrientationChange,
            );

            // Cleanup timeouts
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
        };
    }, [handleOrientationChange]);

    return state;
}

export default useOrientationChange;
