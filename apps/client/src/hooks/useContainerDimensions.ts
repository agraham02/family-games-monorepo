"use client";

import { useState, useEffect, useCallback, RefObject } from "react";

export interface ContainerDimensions {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    isLandscape: boolean;
    isPortrait: boolean;
    aspectRatio: number;
}

/**
 * Custom hook that observes a container's dimensions using ResizeObserver.
 * Returns responsive measurements for layout calculations.
 */
export function useContainerDimensions(
    ref: RefObject<HTMLElement | null>
): ContainerDimensions {
    const [dimensions, setDimensions] = useState<ContainerDimensions>({
        width: 0,
        height: 0,
        centerX: 0,
        centerY: 0,
        isLandscape: true,
        isPortrait: false,
        aspectRatio: 1,
    });

    const updateDimensions = useCallback(() => {
        if (!ref.current) return;

        const { width, height } = ref.current.getBoundingClientRect();
        const centerX = width / 2;
        const centerY = height / 2;
        const aspectRatio = width / height;
        const isLandscape = aspectRatio >= 1;
        const isPortrait = aspectRatio < 1;

        setDimensions({
            width,
            height,
            centerX,
            centerY,
            isLandscape,
            isPortrait,
            aspectRatio,
        });
    }, [ref]);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Initial measurement
        updateDimensions();

        // Set up ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
            updateDimensions();
        });

        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, [ref, updateDimensions]);

    return dimensions;
}

export default useContainerDimensions;
