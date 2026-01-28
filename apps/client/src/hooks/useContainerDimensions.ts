"use client";

import { useState, useEffect, useCallback, useRef, RefObject } from "react";

export interface ContainerDimensions {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    isLandscape: boolean;
    isPortrait: boolean;
    aspectRatio: number;
}

export interface UseContainerDimensionsOptions {
    /** Callback when dimensions change */
    onResize?: (dimensions: ContainerDimensions) => void;
}

/**
 * Custom hook that observes a container's dimensions using ResizeObserver.
 * Returns responsive measurements for layout calculations.
 *
 * Features:
 * - Debounced updates to prevent layout thrashing
 * - Optional RAF-based updates for smooth animations
 * - Orientation detection (landscape/portrait)
 */
export function useContainerDimensions(
    ref: RefObject<HTMLElement | null>,
    options: UseContainerDimensionsOptions = {},
): ContainerDimensions {
    const { onResize } = options;

    const [dimensions, setDimensions] = useState<ContainerDimensions>({
        width: 0,
        height: 0,
        centerX: 0,
        centerY: 0,
        isLandscape: true,
        isPortrait: false,
        aspectRatio: 1,
    });

    const rafRef = useRef<number | null>(null);
    const lastDimensionsRef = useRef<{ width: number; height: number }>({
        width: 0,
        height: 0,
    });

    const updateDimensions = useCallback(() => {
        if (!ref.current) return;

        const { width, height } = ref.current.getBoundingClientRect();

        // Skip update if dimensions haven't changed (prevents unnecessary re-renders)
        if (
            lastDimensionsRef.current.width === width &&
            lastDimensionsRef.current.height === height
        ) {
            return;
        }

        lastDimensionsRef.current = { width, height };

        const centerX = width / 2;
        const centerY = height / 2;
        const aspectRatio = height > 0 ? width / height : 1;
        const isLandscape = aspectRatio >= 1;
        const isPortrait = aspectRatio < 1;

        const newDimensions: ContainerDimensions = {
            width,
            height,
            centerX,
            centerY,
            isLandscape,
            isPortrait,
            aspectRatio,
        };

        setDimensions(newDimensions);

        if (onResize) {
            onResize(newDimensions);
        }
    }, [ref, onResize]);

    const debouncedUpdate = useCallback(() => {
        // Cancel any pending RAF
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        // Use RAF for frame-aligned, smooth updates
        rafRef.current = requestAnimationFrame(() => {
            updateDimensions();
        });
    }, [updateDimensions]);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Initial measurement (immediate, no debounce)
        updateDimensions();

        // Set up ResizeObserver with debounced callback
        const resizeObserver = new ResizeObserver(() => {
            debouncedUpdate();
        });

        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();

            // Cleanup pending RAF
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [ref, updateDimensions, debouncedUpdate]);

    return dimensions;
}

export default useContainerDimensions;
