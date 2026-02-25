"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useGesture } from "@use-gesture/react";

// ============================================================================
// Types
// ============================================================================

export interface CameraState {
    x: number;
    y: number;
    scale: number;
}

interface AABB {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export interface UseBoardCameraProps {
    /** Container pixel width */
    containerWidth: number;
    /** Container pixel height */
    containerHeight: number;
    /** Logical bounds of the board content */
    logicalBounds: AABB;
    /** Pixels per logical unit (e.g., 2 * tileUnitSize) */
    unitSize: number;
    /** Padding in pixels around the content when fitting */
    padding?: number;
    /** Min zoom scale */
    minScale?: number;
    /** Max zoom scale */
    maxScale?: number;
}

export interface UseBoardCameraReturn {
    camera: CameraState;
    isUserControlled: boolean;
    /** Bind gesture handlers to the container element */
    bindGestures: ReturnType<typeof useGesture>;
    /** Zoom in by a fixed step */
    zoomIn: () => void;
    /** Zoom out by a fixed step */
    zoomOut: () => void;
    /** Recenter: fit all content in view, release user control */
    recenter: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const ZOOM_STEP = 0.2; // 20% per click
const DEFAULT_MIN_SCALE = 0.15;
const DEFAULT_MAX_SCALE = 3;
const DEFAULT_PADDING = 60;
const DRAG_THRESHOLD = 3; // pixels — prevents accidental pan from taps

// ============================================================================
// Hook
// ============================================================================

export function useBoardCamera({
    containerWidth,
    containerHeight,
    logicalBounds,
    unitSize,
    padding = DEFAULT_PADDING,
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
}: UseBoardCameraProps): UseBoardCameraReturn {
    const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, scale: 1 });
    const [isUserControlled, setIsUserControlled] = useState(false);

    // Refs to track gesture state
    const cameraAtGestureStart = useRef<CameraState>({ x: 0, y: 0, scale: 1 });
    const hasDraggedRef = useRef(false);

    // ========================================================================
    // Focus / fit-all logic
    // ========================================================================

    const fitAll = useCallback((): CameraState => {
        if (containerWidth === 0 || containerHeight === 0) {
            return { x: 0, y: 0, scale: 1 };
        }

        const centerX = (logicalBounds.minX + logicalBounds.maxX) / 2;
        const centerY = (logicalBounds.minY + logicalBounds.maxY) / 2;

        const logicalWidth = Math.max(
            logicalBounds.maxX - logicalBounds.minX,
            2,
        );
        const logicalHeight = Math.max(
            logicalBounds.maxY - logicalBounds.minY,
            2,
        );

        const physicalWidth = logicalWidth * unitSize;
        const physicalHeight = logicalHeight * unitSize;

        const scaleX = (containerWidth - padding * 2) / physicalWidth;
        const scaleY = (containerHeight - padding * 2) / physicalHeight;

        const scale = Math.min(scaleX, scaleY, 1.2); // Slight over-zoom OK for small boards
        const clampedScale = Math.max(minScale, Math.min(maxScale, scale));

        const x = containerWidth / 2 - centerX * unitSize * clampedScale;
        const y = containerHeight / 2 - centerY * unitSize * clampedScale;

        return { x, y, scale: clampedScale };
    }, [
        containerWidth,
        containerHeight,
        logicalBounds,
        unitSize,
        padding,
        minScale,
        maxScale,
    ]);

    // ========================================================================
    // Auto-focus on bounds change (only when not user-controlled)
    // ========================================================================

    const prevBoundsRef = useRef(logicalBounds);

    useEffect(() => {
        const prev = prevBoundsRef.current;
        const changed =
            prev.minX !== logicalBounds.minX ||
            prev.maxX !== logicalBounds.maxX ||
            prev.minY !== logicalBounds.minY ||
            prev.maxY !== logicalBounds.maxY;

        prevBoundsRef.current = logicalBounds;

        if (!isUserControlled && (changed || containerWidth > 0)) {
            const target = fitAll();
            setCamera((current) => {
                // Avoid no-op updates
                if (
                    Math.abs(current.x - target.x) < 0.5 &&
                    Math.abs(current.y - target.y) < 0.5 &&
                    Math.abs(current.scale - target.scale) < 0.002
                ) {
                    return current;
                }
                return target;
            });
        }
    }, [
        logicalBounds,
        isUserControlled,
        fitAll,
        containerWidth,
        containerHeight,
    ]);

    // ========================================================================
    // Gesture bindings via @use-gesture/react
    // ========================================================================

    const clampScale = useCallback(
        (s: number) => Math.max(minScale, Math.min(maxScale, s)),
        [minScale, maxScale],
    );

    const bindGestures = useGesture(
        {
            onDragStart: () => {
                cameraAtGestureStart.current = { ...camera };
                hasDraggedRef.current = false;
            },
            onDrag: ({
                offset: [ox, oy],
                movement: [mx, my],
                memo,
                cancel,
                event,
            }) => {
                // Ignore drags on control buttons
                if (
                    (event?.target as HTMLElement)?.closest?.(
                        "[data-board-control='true']",
                    )
                ) {
                    cancel();
                    return;
                }

                const dist = Math.sqrt(mx * mx + my * my);
                if (dist > DRAG_THRESHOLD) {
                    hasDraggedRef.current = true;
                    setIsUserControlled(true);
                }

                if (hasDraggedRef.current) {
                    setCamera((prev) => ({
                        ...prev,
                        x: cameraAtGestureStart.current.x + ox,
                        y: cameraAtGestureStart.current.y + oy,
                    }));
                }

                return memo;
            },

            onPinchStart: () => {
                cameraAtGestureStart.current = { ...camera };
            },
            onPinch: ({ offset: [scale], origin: [ox, oy], memo }) => {
                setIsUserControlled(true);
                const newScale = clampScale(scale);
                const startCam = cameraAtGestureStart.current;
                const scaleRatio = newScale / startCam.scale;

                setCamera({
                    x: ox - (ox - startCam.x) * scaleRatio,
                    y: oy - (oy - startCam.y) * scaleRatio,
                    scale: newScale,
                });

                return memo;
            },

            onWheel: ({ delta: [, dy], event }) => {
                event.preventDefault();
                setIsUserControlled(true);

                const scaleDelta = dy > 0 ? 0.92 : 1.08;
                const rect = (
                    event.currentTarget as HTMLElement
                ).getBoundingClientRect();
                const centerX = event.clientX - rect.left;
                const centerY = event.clientY - rect.top;

                setCamera((prev) => {
                    const newScale = clampScale(prev.scale * scaleDelta);
                    const scaleRatio = newScale / prev.scale;
                    return {
                        x: centerX - (centerX - prev.x) * scaleRatio,
                        y: centerY - (centerY - prev.y) * scaleRatio,
                        scale: newScale,
                    };
                });
            },
        },
        {
            drag: {
                from: () => [
                    camera.x - cameraAtGestureStart.current.x,
                    camera.y - cameraAtGestureStart.current.y,
                ],
                filterTaps: true,
                threshold: DRAG_THRESHOLD,
            },
            pinch: {
                scaleBounds: { min: minScale, max: maxScale },
                from: () => [camera.scale, 0],
            },
            wheel: {
                eventOptions: { passive: false },
            },
        },
    );

    // ========================================================================
    // Button controls
    // ========================================================================

    const zoomIn = useCallback(() => {
        setIsUserControlled(true);
        setCamera((prev) => {
            const newScale = clampScale(prev.scale * (1 + ZOOM_STEP));
            const scaleRatio = newScale / prev.scale;
            const cx = containerWidth / 2;
            const cy = containerHeight / 2;
            return {
                x: cx - (cx - prev.x) * scaleRatio,
                y: cy - (cy - prev.y) * scaleRatio,
                scale: newScale,
            };
        });
    }, [clampScale, containerWidth, containerHeight]);

    const zoomOut = useCallback(() => {
        setIsUserControlled(true);
        setCamera((prev) => {
            const newScale = clampScale(prev.scale * (1 - ZOOM_STEP));
            const scaleRatio = newScale / prev.scale;
            const cx = containerWidth / 2;
            const cy = containerHeight / 2;
            return {
                x: cx - (cx - prev.x) * scaleRatio,
                y: cy - (cy - prev.y) * scaleRatio,
                scale: newScale,
            };
        });
    }, [clampScale, containerWidth, containerHeight]);

    const recenter = useCallback(() => {
        setIsUserControlled(false);
        const target = fitAll();
        setCamera(target);
    }, [fitAll]);

    return {
        camera,
        isUserControlled,
        bindGestures,
        zoomIn,
        zoomOut,
        recenter,
    };
}
