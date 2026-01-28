/**
 * usePrefersReducedMotion - Hook for detecting user's motion preferences
 *
 * Respects the `prefers-reduced-motion` media query to provide accessible
 * animation experiences. When reduced motion is preferred, animations should
 * be minimized or replaced with simpler alternatives.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
 */

import { useState, useEffect } from "react";

/**
 * Hook that detects if the user prefers reduced motion.
 *
 * @returns `true` if user has enabled reduced motion preference, `false` otherwise
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 *
 * <motion.div
 *   animate={{ x: 100 }}
 *   transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
 * />
 * ```
 */
export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        // Check if window is available (SSR safety)
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        );

        // Set initial value
        setPrefersReducedMotion(mediaQuery.matches);

        // Listen for changes
        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return prefersReducedMotion;
}

/**
 * Helper function to get animation duration respecting reduced motion preference
 *
 * @param normalDuration - Duration in seconds for normal motion
 * @param reducedDuration - Duration in seconds for reduced motion (defaults to 0)
 * @param prefersReduced - Whether reduced motion is preferred
 * @returns Appropriate duration value
 */
export function getAnimationDuration(
    normalDuration: number,
    reducedDuration: number = 0,
    prefersReduced: boolean,
): number {
    return prefersReduced ? reducedDuration : normalDuration;
}

/**
 * Animation preset configurations respecting reduced motion
 */
export interface MotionConfig {
    /** Animation duration in seconds */
    duration: number;
    /** Spring stiffness (for spring animations) */
    stiffness?: number;
    /** Spring damping (for spring animations) */
    damping?: number;
    /** Whether to skip animation entirely */
    skip: boolean;
}

/**
 * Get motion configuration based on user preference
 *
 * @param type - Type of animation
 * @param prefersReduced - Whether reduced motion is preferred
 * @returns Motion configuration object
 */
export function getMotionConfig(
    type: "micro" | "transition" | "movement" | "celebration",
    prefersReduced: boolean,
): MotionConfig {
    if (prefersReduced) {
        return {
            duration: type === "micro" ? 0 : 0.1,
            skip: type === "celebration",
        };
    }

    switch (type) {
        case "micro":
            return { duration: 0.15, skip: false };
        case "transition":
            return { duration: 0.25, stiffness: 300, damping: 25, skip: false };
        case "movement":
            return { duration: 0.5, stiffness: 200, damping: 20, skip: false };
        case "celebration":
            return { duration: 1.5, skip: false };
        default:
            return { duration: 0.3, skip: false };
    }
}
