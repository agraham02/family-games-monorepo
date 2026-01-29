/**
 * Dominoes Debug Page - Interactive testing ground for the layout engine.
 * Demonstrates the headless engine with React integration.
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import type { Domino, ChainEnd } from "./engine";
import { createLayoutConfig } from "./engine";
import { useDominoLayout } from "./hooks";
import { DominoTableViewport, DominoHand } from "./components";

// =============================================================================
// Test Data
// =============================================================================

/** Generate a standard double-six domino set (28 tiles) */
function generateDominoSet(): Domino[] {
    const tiles: Domino[] = [];
    let id = 0;

    for (let left = 0; left <= 6; left++) {
        for (let right = left; right <= 6; right++) {
            tiles.push({
                id: `d-${id++}`,
                left,
                right,
            });
        }
    }

    return tiles;
}

/** Shuffle an array */
function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// =============================================================================
// Page Component
// =============================================================================

export default function DominoesDebugPage() {
    const config = useMemo(
        () => createLayoutConfig({ boundaryDistance: 350 }),
        [],
    );

    const {
        chain,
        snapshot,
        ghostPreview,
        isPanEnabled,
        openEnds,
        placeDomino,
        clearChain,
        setGhost,
        switchGhostEnd,
        clearGhost,
        pan,
        zoom,
        fitToView,
        getPlacementValidity: getValidity,
        containerRef,
    } = useDominoLayout({ config });

    // Hand management
    const [hand, setHand] = useState<Domino[]>(() =>
        shuffle(generateDominoSet()).slice(0, 7),
    );
    const [boneyard, setBoneyard] = useState<Domino[]>(() =>
        shuffle(generateDominoSet()).slice(7),
    );
    const [selectedTile, setSelectedTile] = useState<Domino | null>(null);

    // Validity map for hand tiles
    const validityMap = useMemo(() => {
        const map = new Map<string, ReturnType<typeof getValidity>>();
        for (const tile of hand) {
            map.set(tile.id, getValidity(tile));
        }
        return map;
    }, [hand, getValidity]);

    // Tile selection handler
    const handleSelectTile = useCallback(
        (tile: Domino) => {
            if (selectedTile?.id === tile.id) {
                // Deselect
                setSelectedTile(null);
                clearGhost();
            } else {
                // Select and show ghost
                setSelectedTile(tile);
                setGhost(tile);
            }
        },
        [selectedTile, clearGhost, setGhost],
    );

    // Place tile handler
    const handlePlaceTile = useCallback(() => {
        if (!selectedTile || !ghostPreview) return;

        placeDomino(selectedTile, ghostPreview.activeEnd);

        // Remove from hand
        setHand((prev) => prev.filter((t) => t.id !== selectedTile.id));
        setSelectedTile(null);
    }, [selectedTile, ghostPreview, placeDomino]);

    // Draw tile from boneyard
    const handleDraw = useCallback(() => {
        if (boneyard.length === 0) return;

        const [drawn, ...remaining] = boneyard;
        setBoneyard(remaining);
        setHand((prev) => [...prev, drawn]);
    }, [boneyard]);

    // Reset game
    const handleReset = useCallback(() => {
        const allTiles = shuffle(generateDominoSet());
        setHand(allTiles.slice(0, 7));
        setBoneyard(allTiles.slice(7));
        setSelectedTile(null);
        clearChain();
    }, [clearChain]);

    // Quick place for testing - place first valid tile
    const handleQuickPlace = useCallback(
        (end: ChainEnd) => {
            const validTile = hand.find((tile) => {
                const validity = getValidity(tile);
                return end === "head"
                    ? validity.canPlaceAtHead
                    : validity.canPlaceAtTail;
            });

            if (validTile) {
                placeDomino(validTile, end);
                setHand((prev) => prev.filter((t) => t.id !== validTile.id));
            }
        },
        [hand, getValidity, placeDomino],
    );

    // Auto-play for stress testing
    const handleAutoPlay = useCallback(() => {
        const interval = setInterval(() => {
            setHand((currentHand) => {
                if (currentHand.length === 0) {
                    clearInterval(interval);
                    return currentHand;
                }

                // Find any playable tile
                for (const tile of currentHand) {
                    const validity = getValidity(tile);
                    if (validity.canPlaceAtHead) {
                        placeDomino(tile, "head");
                        return currentHand.filter((t) => t.id !== tile.id);
                    }
                    if (validity.canPlaceAtTail) {
                        placeDomino(tile, "tail");
                        return currentHand.filter((t) => t.id !== tile.id);
                    }
                }

                // No playable tile, draw from boneyard
                setBoneyard((currentBoneyard) => {
                    if (currentBoneyard.length === 0) {
                        clearInterval(interval);
                        return currentBoneyard;
                    }
                    const [drawn, ...remaining] = currentBoneyard;
                    setHand((h) => [...h, drawn]);
                    return remaining;
                });

                return currentHand;
            });
        }, 500);

        // Stop after 30 seconds
        setTimeout(() => clearInterval(interval), 30000);
    }, [getValidity, placeDomino]);

    return (
        <div className="h-screen bg-gray-900 text-white p-4 flex flex-col gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">
                    Dominoes Layout Engine Debug
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={fitToView}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                        Fit to View
                    </button>
                    <button
                        onClick={handleAutoPlay}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                    >
                        Auto Play
                    </button>
                </div>
            </div>

            {/* Info bar */}
            <div className="flex items-center gap-4 text-sm bg-gray-800 p-3 rounded">
                <span>
                    Chain: <strong>{chain.tiles.length}</strong> tiles
                </span>
                <span>
                    Hand: <strong>{hand.length}</strong> tiles
                </span>
                <span>
                    Boneyard: <strong>{boneyard.length}</strong> tiles
                </span>
                <span className="text-gray-400">|</span>
                <span>
                    Head:{" "}
                    <strong className="text-blue-400">
                        {openEnds.head ?? "—"}
                    </strong>
                </span>
                <span>
                    Tail:{" "}
                    <strong className="text-orange-400">
                        {openEnds.tail ?? "—"}
                    </strong>
                </span>
                {selectedTile && (
                    <>
                        <span className="text-gray-400">|</span>
                        <span className="text-green-400">
                            Selected: [{selectedTile.left}|{selectedTile.right}]
                        </span>
                        {ghostPreview?.canSwitchEnds && (
                            <span className="text-purple-400">
                                (can switch)
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* Main viewport */}
            <div className="flex-1 min-h-0 relative">
                <DominoTableViewport
                    containerRef={containerRef}
                    snapshot={snapshot}
                    config={config}
                    ghostPreview={ghostPreview}
                    isPanEnabled={isPanEnabled}
                    onPan={pan}
                    onZoom={zoom}
                    onGhostConfirm={handlePlaceTile}
                    onGhostSwitchEnd={switchGhostEnd}
                    className="absolute inset-0 rounded-lg"
                />
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Quick place:</span>
                <button
                    onClick={() => handleQuickPlace("head")}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                    disabled={!hand.some((t) => getValidity(t).canPlaceAtHead)}
                >
                    → Head
                </button>
                <button
                    onClick={() => handleQuickPlace("tail")}
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors"
                    disabled={!hand.some((t) => getValidity(t).canPlaceAtTail)}
                >
                    ← Tail
                </button>
                <button
                    onClick={handleDraw}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
                    disabled={boneyard.length === 0}
                >
                    Draw ({boneyard.length})
                </button>
            </div>

            {/* Hand */}
            <DominoHand
                tiles={hand}
                selectedId={selectedTile?.id}
                validityMap={validityMap}
                onSelect={handleSelectTile}
                tileWidth={48}
                tileHeight={96}
            />

            {/* Instructions */}
            <div className="text-sm text-gray-500 bg-gray-800/50 p-3 rounded">
                <strong>Instructions:</strong> Click a tile in your hand to
                select it and see the ghost preview. Click the ghost or use
                quick actions to place. Use mouse wheel to zoom, drag to pan
                (when zoomed in). The chain grows from center outward, turning
                at boundaries.
            </div>
        </div>
    );
}
