/**
 * DominoHand - Renders a player's hand of dominoes.
 * Horizontal scrollable row with selection and playability indicators.
 */

"use client";

import React, { memo } from "react";
import type { Domino, PlacementValidity } from "../engine";
import { DominoTile } from "./DominoTile";

// =============================================================================
// Types
// =============================================================================

export interface DominoHandProps {
    /** Array of dominoes in hand */
    tiles: readonly Domino[];
    /** Currently selected tile ID */
    selectedId?: string | null;
    /** Map of tile ID to placement validity */
    validityMap?: Map<string, PlacementValidity>;
    /** Tile selection handler */
    onSelect?: (domino: Domino) => void;
    /** Tile width */
    tileWidth?: number;
    /** Tile height */
    tileHeight?: number;
    /** Custom class name */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const DominoHand = memo(function DominoHand({
    tiles,
    selectedId,
    validityMap,
    onSelect,
    tileWidth = 48,
    tileHeight = 96,
    className = "",
}: DominoHandProps) {
    return (
        <div
            className={`flex items-center gap-2 overflow-x-auto p-4 bg-gray-800/50 rounded-lg ${className}`}
            style={{ minHeight: tileHeight + 32 }}
        >
            {tiles.length === 0 && (
                <div className="text-gray-400 text-sm italic">
                    No tiles in hand
                </div>
            )}

            {tiles.map((tile) => {
                const validity = validityMap?.get(tile.id);
                const isPlayable = validity
                    ? validity.canPlaceAtHead || validity.canPlaceAtTail
                    : false;
                const isSelected = tile.id === selectedId;

                return (
                    <div key={tile.id} className="shrink-0 relative">
                        <DominoTile
                            leftPips={tile.left}
                            rightPips={tile.right}
                            width={tileWidth}
                            height={tileHeight}
                            isSelected={isSelected}
                            isPlayable={isPlayable}
                            onClick={
                                onSelect ? () => onSelect(tile) : undefined
                            }
                        />

                        {/* Playability indicator */}
                        {validity && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                {validity.canPlaceAtHead && (
                                    <span
                                        className="bg-blue-500 text-white rounded px-1"
                                        style={{ fontSize: 8 }}
                                    >
                                        H
                                    </span>
                                )}
                                {validity.canPlaceAtTail && (
                                    <span
                                        className="bg-orange-500 text-white rounded px-1"
                                        style={{ fontSize: 8 }}
                                    >
                                        T
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});
