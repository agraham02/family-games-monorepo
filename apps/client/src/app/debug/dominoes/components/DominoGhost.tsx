/**
 * DominoGhost - Renders a ghost/preview tile.
 * Uses the same DominoTile component with ghost styling.
 */

import React, { memo } from "react";
import type { PlacedDomino, LayoutConfig, ChainEnd } from "../engine";
import { getTileWorldSize } from "../engine";
import { DominoTile } from "./DominoTile";

// =============================================================================
// Types
// =============================================================================

export interface DominoGhostProps {
    /** The ghost tile data */
    ghost: PlacedDomino;
    /** Layout configuration for size calculations */
    config: LayoutConfig;
    /** Scale multiplier for rendering */
    scale?: number;
    /** Which end this ghost is attached to */
    end: ChainEnd;
    /** Whether switching ends is available */
    canSwitch?: boolean;
    /** Click handler to place the tile */
    onConfirm?: () => void;
    /** Handler to switch ends */
    onSwitchEnd?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export const DominoGhost = memo(function DominoGhost({
    ghost,
    config,
    scale = 1,
    end,
    canSwitch = false,
    onConfirm,
    onSwitchEnd,
}: DominoGhostProps) {
    const size = getTileWorldSize(config, ghost.isDouble, ghost.exitDirection);
    const scaledWidth = size.width * scale;
    const scaledHeight = size.height * scale;

    // Extra padding for badges/buttons that overflow
    const padding = 20;
    const totalWidth = scaledWidth + padding * 2;
    const totalHeight = scaledHeight + padding * 2;

    // Position is center-based
    const x = ghost.position.x * scale;
    const y = ghost.position.y * scale;

    return (
        <g
            className="domino-ghost"
            transform={`translate(${x}, ${y})`}
            style={{ pointerEvents: "auto" }}
        >
            <foreignObject
                x={-totalWidth / 2}
                y={-totalHeight / 2}
                width={totalWidth}
                height={totalHeight}
                style={{ overflow: "visible" }}
            >
                <div
                    className="relative flex items-center justify-center"
                    style={{ width: totalWidth, height: totalHeight }}
                >
                    <div className="relative">
                        <DominoTile
                            leftPips={ghost.pips[0]}
                            rightPips={ghost.pips[1]}
                            width={config.tileWidth}
                            height={config.tileHeight}
                            rotation={ghost.rotation}
                            isGhost
                            onClick={onConfirm}
                        />

                        {/* End indicator badge */}
                        <div
                            className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ fontSize: 10 }}
                        >
                            {end === "head" ? "H" : "T"}
                        </div>

                        {/* Switch end button */}
                        {canSwitch && onSwitchEnd && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSwitchEnd();
                                }}
                                className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-0.5 rounded hover:bg-gray-600 transition-colors z-10"
                                style={{ fontSize: 10 }}
                            >
                                ⇄
                            </button>
                        )}
                    </div>
                </div>
            </foreignObject>
        </g>
    );
});
