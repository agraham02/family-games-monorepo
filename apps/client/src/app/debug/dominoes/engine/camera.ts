/**
 * Camera and Viewport utilities for the domino layout engine.
 * Handles zoom, pan, and viewport positioning calculations.
 */

import type {
    BoundingBox,
    CameraTransform,
    Point,
    Size,
    ViewportState,
} from "./types";

// =============================================================================
// Camera Transform Computation
// =============================================================================

/**
 * Compute the camera transform to fit a bounding box within a container.
 * Automatically zooms to fit, respecting minimum scale.
 */
export function computeCameraTransform(
    bounds: BoundingBox,
    containerSize: Size,
    minScale: number = 0.3,
    maxScale: number = 1.5,
): CameraTransform {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    // Handle empty or zero-size content
    if (contentWidth <= 0 || contentHeight <= 0) {
        return {
            scale: 1,
            offset: { x: containerSize.width / 2, y: containerSize.height / 2 },
        };
    }

    // Calculate scale to fit content in container
    const scaleX = containerSize.width / contentWidth;
    const scaleY = containerSize.height / contentHeight;
    const idealScale = Math.min(scaleX, scaleY);

    // Clamp scale between min and max
    const scale = Math.max(minScale, Math.min(maxScale, idealScale));

    // Calculate offset to center content
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const offset: Point = {
        x: containerSize.width / 2 - centerX * scale,
        y: containerSize.height / 2 - centerY * scale,
    };

    return { scale, offset };
}

/**
 * Create an initial camera transform centered at origin.
 */
export function createInitialCamera(containerSize: Size): CameraTransform {
    return {
        scale: 1,
        offset: {
            x: containerSize.width / 2,
            y: containerSize.height / 2,
        },
    };
}

// =============================================================================
// Pan Operations
// =============================================================================

/**
 * Apply a pan delta to the camera offset.
 */
export function applyPanOffset(
    camera: CameraTransform,
    delta: Point,
): CameraTransform {
    return {
        scale: camera.scale,
        offset: {
            x: camera.offset.x + delta.x,
            y: camera.offset.y + delta.y,
        },
    };
}

/**
 * Apply a pan delta with bounds constraints.
 * Prevents panning beyond the content bounds.
 */
export function applyConstrainedPan(
    camera: CameraTransform,
    delta: Point,
    bounds: BoundingBox,
    containerSize: Size,
    padding: number = 50,
): CameraTransform {
    const newOffset = {
        x: camera.offset.x + delta.x,
        y: camera.offset.y + delta.y,
    };

    // Calculate the visible content bounds
    const scaledMinX = bounds.minX * camera.scale + newOffset.x;
    const scaledMaxX = bounds.maxX * camera.scale + newOffset.x;
    const scaledMinY = bounds.minY * camera.scale + newOffset.y;
    const scaledMaxY = bounds.maxY * camera.scale + newOffset.y;

    // Constrain so content stays visible
    const minVisibleX = padding;
    const maxVisibleX = containerSize.width - padding;
    const minVisibleY = padding;
    const maxVisibleY = containerSize.height - padding;

    // Adjust X offset if content is pushed out of view
    if (scaledMaxX < minVisibleX) {
        newOffset.x = minVisibleX - bounds.maxX * camera.scale;
    } else if (scaledMinX > maxVisibleX) {
        newOffset.x = maxVisibleX - bounds.minX * camera.scale;
    }

    // Adjust Y offset if content is pushed out of view
    if (scaledMaxY < minVisibleY) {
        newOffset.y = minVisibleY - bounds.maxY * camera.scale;
    } else if (scaledMinY > maxVisibleY) {
        newOffset.y = maxVisibleY - bounds.minY * camera.scale;
    }

    return {
        scale: camera.scale,
        offset: newOffset,
    };
}

// =============================================================================
// Zoom Operations
// =============================================================================

/**
 * Apply a zoom delta centered on a point in container space.
 */
export function applyZoom(
    camera: CameraTransform,
    zoomDelta: number,
    centerPoint: Point,
    minScale: number = 0.3,
    maxScale: number = 2,
): CameraTransform {
    const newScale = Math.max(
        minScale,
        Math.min(maxScale, camera.scale + zoomDelta),
    );

    // Calculate the world position of the center point before zoom
    const worldX = (centerPoint.x - camera.offset.x) / camera.scale;
    const worldY = (centerPoint.y - camera.offset.y) / camera.scale;

    // Calculate new offset so the center point stays in the same screen position
    const newOffset: Point = {
        x: centerPoint.x - worldX * newScale,
        y: centerPoint.y - worldY * newScale,
    };

    return {
        scale: newScale,
        offset: newOffset,
    };
}

/**
 * Set zoom to a specific scale centered on a point.
 */
export function setZoomLevel(
    camera: CameraTransform,
    newScale: number,
    centerPoint: Point,
    minScale: number = 0.3,
    maxScale: number = 2,
): CameraTransform {
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));

    // Calculate the world position of the center point
    const worldX = (centerPoint.x - camera.offset.x) / camera.scale;
    const worldY = (centerPoint.y - camera.offset.y) / camera.scale;

    // Calculate new offset
    const newOffset: Point = {
        x: centerPoint.x - worldX * clampedScale,
        y: centerPoint.y - worldY * clampedScale,
    };

    return {
        scale: clampedScale,
        offset: newOffset,
    };
}

// =============================================================================
// Viewport State
// =============================================================================

/**
 * Create a viewport state from camera and content bounds.
 */
export function createViewportState(
    camera: CameraTransform,
    contentBounds: BoundingBox,
    containerSize: Size,
    minScale: number = 0.3,
): ViewportState {
    return {
        camera,
        contentBounds,
        containerSize,
        isPanEnabled: camera.scale <= minScale * 1.1, // Small buffer for floating point
    };
}

/**
 * Check if panning should be enabled based on scale and content size.
 */
export function shouldEnablePan(
    camera: CameraTransform,
    bounds: BoundingBox,
    containerSize: Size,
): boolean {
    const contentWidth = (bounds.maxX - bounds.minX) * camera.scale;
    const contentHeight = (bounds.maxY - bounds.minY) * camera.scale;

    // Enable pan if content exceeds container in either dimension
    return (
        contentWidth > containerSize.width ||
        contentHeight > containerSize.height
    );
}

// =============================================================================
// Coordinate Conversions
// =============================================================================

/**
 * Convert a point from container (screen) coordinates to world coordinates.
 */
export function containerToWorld(point: Point, camera: CameraTransform): Point {
    return {
        x: (point.x - camera.offset.x) / camera.scale,
        y: (point.y - camera.offset.y) / camera.scale,
    };
}

/**
 * Convert a point from world coordinates to container (screen) coordinates.
 */
export function worldToContainer(point: Point, camera: CameraTransform): Point {
    return {
        x: point.x * camera.scale + camera.offset.x,
        y: point.y * camera.scale + camera.offset.y,
    };
}

// =============================================================================
// Camera Animation Helpers
// =============================================================================

/**
 * Interpolate between two camera transforms for smooth animation.
 */
export function lerpCamera(
    from: CameraTransform,
    to: CameraTransform,
    t: number,
): CameraTransform {
    const clampedT = Math.max(0, Math.min(1, t));

    return {
        scale: from.scale + (to.scale - from.scale) * clampedT,
        offset: {
            x: from.offset.x + (to.offset.x - from.offset.x) * clampedT,
            y: from.offset.y + (to.offset.y - from.offset.y) * clampedT,
        },
    };
}

/**
 * Check if two cameras are approximately equal.
 */
export function camerasEqual(
    a: CameraTransform,
    b: CameraTransform,
    epsilon: number = 0.001,
): boolean {
    return (
        Math.abs(a.scale - b.scale) < epsilon &&
        Math.abs(a.offset.x - b.offset.x) < epsilon &&
        Math.abs(a.offset.y - b.offset.y) < epsilon
    );
}
