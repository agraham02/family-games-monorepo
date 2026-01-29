/**
 * DominoChain - Renders the chain of placed dominoes.
 * Maps PlacedDomino data to positioned DominoTile components.
 */

import React, { memo } from "react";
import type { PlacedDomino, LayoutConfig } from "../engine";
import { getTileWorldSize } from "../engine";
import { DominoTile } from "./DominoTile";

// =============================================================================
// Types
// =============================================================================

export interface DominoChainProps {
    /** Array of placed dominoes to render */
    tiles: readonly PlacedDomino[];
    /** Layout configuration for size calculations */
    config: LayoutConfig;
    /** Scale multiplier for rendering */
    scale?: number;
    /** Tile ID that is currently selected */
    selectedTileId?: string | null;
    /** Click handler for tiles */
    onTileClick?: (tileId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export const DominoChain = memo(function DominoChain({
    tiles,
    config,
    scale = 1,
    selectedTileId,
    onTileClick,
}: DominoChainProps) {
    if (tiles.length === 0) {
        return null;
    }

    return (
        <g className="domino-chain">
            {tiles.map((tile) => {
                const size = getTileWorldSize(
                    config,
                    tile.isDouble,
                    tile.exitDirection,
                );
                const scaledWidth = size.width * scale;
                const scaledHeight = size.height * scale;

                // Position is center-based
                const x = tile.position.x * scale;
                const y = tile.position.y * scale;

                // pips is [connecting, open] relative to entry/exit direction
                // connecting faces entryDirection, open faces exitDirection
                // Visual mapping:
                //   Exit E/S: connecting on left/top, open on right/bottom → NO swap
                //   Exit W/N: open on left/top, connecting on right/bottom → SWAP
                const shouldSwapVisual =
                    tile.exitDirection === "W" || tile.exitDirection === "N";
                const leftPips = shouldSwapVisual ? tile.pips[1] : tile.pips[0];
                const rightPips = shouldSwapVisual
                    ? tile.pips[0]
                    : tile.pips[1];

                return (
                    <g key={tile.id} transform={`translate(${x}, ${y})`}>
                        <foreignObject
                            x={-scaledWidth / 2}
                            y={-scaledHeight / 2}
                            width={scaledWidth}
                            height={scaledHeight}
                            style={{ overflow: "visible" }}
                        >
                            <DominoTile
                                leftPips={leftPips}
                                rightPips={rightPips}
                                width={config.tileWidth}
                                height={config.tileHeight}
                                rotation={tile.rotation}
                                isSelected={tile.id === selectedTileId}
                                onClick={
                                    onTileClick
                                        ? () => onTileClick(tile.id)
                                        : undefined
                                }
                            />
                        </foreignObject>
                    </g>
                );
            })}
        </g>
    );
});
