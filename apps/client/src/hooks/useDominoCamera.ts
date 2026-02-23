import { useState, useEffect, useCallback, useRef } from "react";

interface CameraState {
    x: number;
    y: number;
    scale: number;
}

interface UseDominoCameraProps {
    containerWidth: number;
    containerHeight: number;
    logicalBounds: { minX: number; maxX: number; minY: number; maxY: number };
    activePoints: { x: number; y: number }[]; // Logical coordinates to focus on
    unitSize: number; // Physical pixels per logical unit
    padding?: number; // Padding in pixels
}

export function useDominoCamera({
    containerWidth,
    containerHeight,
    logicalBounds,
    activePoints,
    unitSize,
    padding = 40,
}: UseDominoCameraProps) {
    const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, scale: 1 });
    const [isManualPan, setIsManualPan] = useState(false);
    const prevActivePointsRef = useRef(activePoints);
    const prevBoundsRef = useRef(logicalBounds);

    const focusOnPoints = useCallback(
        (points: { x: number; y: number }[]) => {
            if (containerWidth === 0 || containerHeight === 0) return;

            let targetX = 0;
            let targetY = 0;
            let targetScale = 1;

            if (points.length === 0) {
                // Focus on the center of the bounds
                const centerX = (logicalBounds.minX + logicalBounds.maxX) / 2;
                const centerY = (logicalBounds.minY + logicalBounds.maxY) / 2;

                const logicalWidth = Math.max(
                    logicalBounds.maxX - logicalBounds.minX,
                    4,
                );
                const logicalHeight = Math.max(
                    logicalBounds.maxY - logicalBounds.minY,
                    4,
                );

                const physicalWidth = logicalWidth * unitSize;
                const physicalHeight = logicalHeight * unitSize;

                const scaleX = (containerWidth - padding * 2) / physicalWidth;
                const scaleY = (containerHeight - padding * 2) / physicalHeight;

                targetScale = Math.min(scaleX, scaleY, 1); // Don't zoom in more than 1x
                targetX = containerWidth / 2 - centerX * unitSize * targetScale;
                targetY =
                    containerHeight / 2 - centerY * unitSize * targetScale;
            } else if (points.length === 1) {
                // Focus on a single point
                targetScale = 1;
                targetX =
                    containerWidth / 2 - points[0].x * unitSize * targetScale;
                targetY =
                    containerHeight / 2 - points[0].y * unitSize * targetScale;
            } else {
                // Focus on multiple points (bounding box of points)
                let minX = Infinity,
                    maxX = -Infinity,
                    minY = Infinity,
                    maxY = -Infinity;
                points.forEach((p) => {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                });

                // Add some margin around the points
                const margin = 2; // logical units
                minX -= margin;
                maxX += margin;
                minY -= margin;
                maxY += margin;

                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;

                const logicalWidth = Math.max(maxX - minX, 4);
                const logicalHeight = Math.max(maxY - minY, 4);

                const physicalWidth = logicalWidth * unitSize;
                const physicalHeight = logicalHeight * unitSize;

                const scaleX = (containerWidth - padding * 2) / physicalWidth;
                const scaleY = (containerHeight - padding * 2) / physicalHeight;

                targetScale = Math.min(scaleX, scaleY, 1);
                targetX = containerWidth / 2 - centerX * unitSize * targetScale;
                targetY =
                    containerHeight / 2 - centerY * unitSize * targetScale;
            }

            setCamera((prev) => {
                const xDelta = Math.abs(prev.x - targetX);
                const yDelta = Math.abs(prev.y - targetY);
                const scaleDelta = Math.abs(prev.scale - targetScale);

                if (xDelta < 0.5 && yDelta < 0.5 && scaleDelta < 0.002) {
                    return prev;
                }

                return { x: targetX, y: targetY, scale: targetScale };
            });
        },
        [containerWidth, containerHeight, logicalBounds, unitSize, padding],
    );

    // Auto-focus when active points or bounds change
    useEffect(() => {
        const prevPoints = prevActivePointsRef.current;
        const prevBounds = prevBoundsRef.current;

        const pointsChangedFlag = pointsChanged(prevPoints, activePoints);
        const boundsChangedFlag =
            prevBounds.minX !== logicalBounds.minX ||
            prevBounds.maxX !== logicalBounds.maxX ||
            prevBounds.minY !== logicalBounds.minY ||
            prevBounds.maxY !== logicalBounds.maxY;

        if (pointsChangedFlag || boundsChangedFlag) {
            prevActivePointsRef.current = activePoints;
            prevBoundsRef.current = logicalBounds;
            if (!isManualPan) {
                focusOnPoints(activePoints);
            }
        }
    }, [activePoints, logicalBounds, isManualPan, focusOnPoints]);

    // Initial focus
    useEffect(() => {
        if (!isManualPan && containerWidth > 0) {
            focusOnPoints(activePoints);
        }
    }, [
        containerWidth,
        containerHeight,
        isManualPan,
        activePoints,
        focusOnPoints,
    ]); // Re-run if container resizes

    const handlePan = useCallback((dx: number, dy: number) => {
        setIsManualPan(true);
        setCamera((prev) => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
        }));
    }, []);

    const handleZoom = useCallback(
        (scaleDelta: number, centerX: number, centerY: number) => {
            setIsManualPan(true);
            setCamera((prev) => {
                const newScale = Math.max(
                    0.2,
                    Math.min(prev.scale * scaleDelta, 2),
                );
                // Adjust x/y to zoom around the center point
                const scaleRatio = newScale / prev.scale;
                const newX = centerX - (centerX - prev.x) * scaleRatio;
                const newY = centerY - (centerY - prev.y) * scaleRatio;
                return { x: newX, y: newY, scale: newScale };
            });
        },
        [],
    );

    const recenter = useCallback(() => {
        setIsManualPan(false);
        focusOnPoints([]);
    }, [focusOnPoints]);

    const zoomIn = useCallback(() => {
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        handleZoom(1.15, centerX, centerY);
    }, [containerWidth, containerHeight, handleZoom]);

    const zoomOut = useCallback(() => {
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        handleZoom(0.85, centerX, centerY);
    }, [containerWidth, containerHeight, handleZoom]);

    return {
        camera,
        isManualPan,
        handlePan,
        handleZoom,
        zoomIn,
        zoomOut,
        recenter,
    };
}

function pointsChanged(
    a: { x: number; y: number }[],
    b: { x: number; y: number }[],
) {
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) {
        if (a[i].x !== b[i].x || a[i].y !== b[i].y) return true;
    }
    return false;
}
