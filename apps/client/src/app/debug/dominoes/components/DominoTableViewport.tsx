/**
 * DominoTableViewport - Container component that handles camera transform,
 * pan/zoom interactions, and renders the domino chain with ghost previews.
 */

"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import type { LayoutSnapshot, LayoutConfig, ChainEnd } from "../engine";
import { createLayoutConfig } from "../engine";
import { DominoChain } from "./DominoChain";
import { DominoGhost } from "./DominoGhost";
import type { GhostPreviewState } from "../engine/ghostSimulator";

// =============================================================================
// Types
// =============================================================================

export interface DominoTableViewportProps {
    /** The layout snapshot to render */
    snapshot: LayoutSnapshot;
    /** Layout configuration */
    config?: LayoutConfig;
    /** Ghost preview state (optional, uses snapshot.ghost if not provided) */
    ghostPreview?: GhostPreviewState | null;
    /** Whether pan is enabled */
    isPanEnabled?: boolean;
    /** Pan handler */
    onPan?: (delta: { x: number; y: number }) => void;
    /** Zoom handler */
    onZoom?: (delta: number, center: { x: number; y: number }) => void;
    /** Handler when ghost is confirmed (clicked) */
    onGhostConfirm?: () => void;
    /** Handler to switch ghost end */
    onGhostSwitchEnd?: () => void;
    /** Click handler for placed tiles */
    onTileClick?: (tileId: string) => void;
    /** Selected tile ID */
    selectedTileId?: string | null;
    /** Container ref for measuring */
    containerRef?: React.RefObject<HTMLDivElement | null>;
    /** Background color */
    backgroundColor?: string;
    /** Custom class name */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const DominoTableViewport = memo(function DominoTableViewport({
    snapshot,
    config = createLayoutConfig(),
    ghostPreview,
    isPanEnabled = false,
    onPan,
    onZoom,
    onGhostConfirm,
    onGhostSwitchEnd,
    onTileClick,
    selectedTileId,
    containerRef,
    backgroundColor = "#2d4a2d",
    className = "",
}: DominoTableViewportProps) {
    const internalRef = useRef<HTMLDivElement>(null);
    const ref = containerRef ?? internalRef;

    // Pan state
    const [isPanning, setIsPanning] = useState(false);
    const lastPanPoint = useRef<{ x: number; y: number } | null>(null);

    // Pan handlers
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!isPanEnabled) return;
            setIsPanning(true);
            lastPanPoint.current = { x: e.clientX, y: e.clientY };
        },
        [isPanEnabled],
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isPanning || !lastPanPoint.current || !onPan) return;

            const delta = {
                x: e.clientX - lastPanPoint.current.x,
                y: e.clientY - lastPanPoint.current.y,
            };

            onPan(delta);
            lastPanPoint.current = { x: e.clientX, y: e.clientY };
        },
        [isPanning, onPan],
    );

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        lastPanPoint.current = null;
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsPanning(false);
        lastPanPoint.current = null;
    }, []);

    // Zoom handler
    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            if (!onZoom) return;
            e.preventDefault();

            const rect = ref.current?.getBoundingClientRect();
            if (!rect) return;

            const center = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };

            // Normalize wheel delta
            const delta = -e.deltaY * 0.001;
            onZoom(delta, center);
        },
        [onZoom, ref],
    );

    // Get ghost data from either prop or snapshot
    const ghost = ghostPreview?.ghost ?? snapshot.ghost;
    const ghostEnd = ghostPreview?.activeEnd ?? snapshot.ghostEnd;
    const canSwitchEnds = ghostPreview?.canSwitchEnds ?? false;

    return (
        <div
            ref={ref}
            className={`relative overflow-hidden w-full h-full ${className}`}
            style={{
                backgroundColor,
                cursor: isPanEnabled
                    ? isPanning
                        ? "grabbing"
                        : "grab"
                    : "default",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
        >
            <svg width="100%" height="100%" style={{ display: "block" }}>
                {/* Transform group for camera */}
                <g
                    transform={`translate(${snapshot.camera.offset.x}, ${snapshot.camera.offset.y}) scale(${snapshot.camera.scale})`}
                >
                    {/* Placed tiles */}
                    <DominoChain
                        tiles={snapshot.chain.tiles}
                        config={config}
                        selectedTileId={selectedTileId}
                        onTileClick={onTileClick}
                    />

                    {/* Ghost preview */}
                    {ghost && ghostEnd && (
                        <DominoGhost
                            ghost={ghost}
                            config={config}
                            end={ghostEnd}
                            canSwitch={canSwitchEnds}
                            onConfirm={onGhostConfirm}
                            onSwitchEnd={onGhostSwitchEnd}
                        />
                    )}
                </g>
            </svg>

            {/* Debug overlay */}
            <div className="absolute bottom-2 left-2 text-xs text-white/70 font-mono">
                Tiles: {snapshot.chain.tiles.length} | Scale:{" "}
                {snapshot.camera.scale.toFixed(2)}
                {isPanEnabled && " | Pan: enabled"}
            </div>
        </div>
    );
});
