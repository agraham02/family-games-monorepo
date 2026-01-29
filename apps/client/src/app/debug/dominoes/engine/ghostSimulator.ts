/**
 * Ghost Placement Simulator - generates preview layouts for candidate dominoes.
 * All operations are side-effect free, returning new snapshots without mutation.
 */

import type {
    Domino,
    PlacedDomino,
    ChainState,
    ChainEnd,
    LayoutConfig,
    LayoutSnapshot,
    PlacementValidity,
    Point,
    Direction,
} from "./types";
import { isDouble, createLayoutConfig } from "./types";
import { computeBoundingBox } from "./pathBuilder";
import {
    getPlacementValidity,
    getOrientedPips,
    placeDomino,
} from "./chainManager";
import { computeCameraTransform } from "./camera";

// =============================================================================
// Ghost Tile Generation
// =============================================================================

/**
 * Generate a ghost placement preview for a candidate domino at a specific end.
 * Returns null if placement is not valid at that end.
 */
export function generateGhostTile(
    chain: ChainState,
    candidate: Domino,
    end: ChainEnd,
    config: LayoutConfig = createLayoutConfig(),
): PlacedDomino | null {
    // Attempt placement to get the computed position
    const result = placeDomino(chain, candidate, end, config);

    if (!result.success) {
        return null;
    }

    // Find the newly placed tile (it will be the last one or the one with matching id)
    const newTile = result.chain.tiles.find((t) => t.id === candidate.id);

    return newTile ?? null;
}

// =============================================================================
// Layout Snapshot Generation
// =============================================================================

/**
 * Generate a complete layout snapshot with ghost preview.
 * The snapshot includes camera adjustments to fit the ghost in view.
 */
export function simulatePlacement(
    chain: ChainState,
    candidate: Domino,
    end: ChainEnd,
    config: LayoutConfig = createLayoutConfig(),
    containerSize: { width: number; height: number } = {
        width: 800,
        height: 600,
    },
    minScale: number = 0.3,
): LayoutSnapshot | null {
    const ghost = generateGhostTile(chain, candidate, end, config);

    if (!ghost) {
        return null;
    }

    // Create a temporary chain with the ghost to compute bounds
    const allTiles = [...chain.tiles, ghost];
    const bounds = computeBoundingBox(allTiles, config);

    // Compute camera that fits all tiles including ghost
    const camera = computeCameraTransform(bounds, containerSize, minScale);

    return {
        chain,
        bounds,
        camera,
        ghost,
        ghostEnd: end,
    };
}

/**
 * Generate preview snapshots for all valid placements of a candidate domino.
 * Returns an object with head and tail previews (null if not valid at that end).
 */
export function generateAllPreviews(
    chain: ChainState,
    candidate: Domino,
    config: LayoutConfig = createLayoutConfig(),
    containerSize: { width: number; height: number } = {
        width: 800,
        height: 600,
    },
    minScale: number = 0.3,
): {
    head: LayoutSnapshot | null;
    tail: LayoutSnapshot | null;
    validity: PlacementValidity;
} {
    const validity = getPlacementValidity(chain, candidate);

    return {
        head: validity.canPlaceAtHead
            ? simulatePlacement(
                  chain,
                  candidate,
                  "head",
                  config,
                  containerSize,
                  minScale,
              )
            : null,
        tail: validity.canPlaceAtTail
            ? simulatePlacement(
                  chain,
                  candidate,
                  "tail",
                  config,
                  containerSize,
                  minScale,
              )
            : null,
        validity,
    };
}

// =============================================================================
// Multiple Ghost Preview
// =============================================================================

/**
 * Generate ghost previews for multiple candidate dominoes.
 * Useful for showing all playable tiles from a hand.
 */
export function generateMultiplePreviews(
    chain: ChainState,
    candidates: readonly Domino[],
    config: LayoutConfig = createLayoutConfig(),
): Map<
    string,
    {
        headGhost: PlacedDomino | null;
        tailGhost: PlacedDomino | null;
        validity: PlacementValidity;
    }
> {
    const results = new Map<
        string,
        {
            headGhost: PlacedDomino | null;
            tailGhost: PlacedDomino | null;
            validity: PlacementValidity;
        }
    >();

    for (const candidate of candidates) {
        const validity = getPlacementValidity(chain, candidate);

        results.set(candidate.id, {
            headGhost: validity.canPlaceAtHead
                ? generateGhostTile(chain, candidate, "head", config)
                : null,
            tailGhost: validity.canPlaceAtTail
                ? generateGhostTile(chain, candidate, "tail", config)
                : null,
            validity,
        });
    }

    return results;
}

// =============================================================================
// Placement Preview State
// =============================================================================

/**
 * State for managing active ghost preview.
 */
export interface GhostPreviewState {
    /** The candidate domino being previewed */
    candidate: Domino;
    /** Which end is being previewed */
    activeEnd: ChainEnd;
    /** The ghost tile data */
    ghost: PlacedDomino;
    /** Whether both ends are valid (allows switching) */
    canSwitchEnds: boolean;
}

/**
 * Create a ghost preview state from a candidate domino.
 * Defaults to head if valid, otherwise tail.
 */
export function createGhostPreviewState(
    chain: ChainState,
    candidate: Domino,
    preferredEnd: ChainEnd = "head",
    config: LayoutConfig = createLayoutConfig(),
): GhostPreviewState | null {
    const validity = getPlacementValidity(chain, candidate);

    // Determine which end to show
    let activeEnd: ChainEnd;
    if (preferredEnd === "head" && validity.canPlaceAtHead) {
        activeEnd = "head";
    } else if (preferredEnd === "tail" && validity.canPlaceAtTail) {
        activeEnd = "tail";
    } else if (validity.canPlaceAtHead) {
        activeEnd = "head";
    } else if (validity.canPlaceAtTail) {
        activeEnd = "tail";
    } else {
        return null; // Cannot place at either end
    }

    const ghost = generateGhostTile(chain, candidate, activeEnd, config);
    if (!ghost) {
        return null;
    }

    return {
        candidate,
        activeEnd,
        ghost,
        canSwitchEnds: validity.canPlaceAtHead && validity.canPlaceAtTail,
    };
}

/**
 * Switch the active end of a ghost preview.
 * Returns null if switching is not possible.
 */
export function switchGhostEnd(
    state: GhostPreviewState,
    chain: ChainState,
    config: LayoutConfig = createLayoutConfig(),
): GhostPreviewState | null {
    if (!state.canSwitchEnds) {
        return null;
    }

    const newEnd: ChainEnd = state.activeEnd === "head" ? "tail" : "head";
    const ghost = generateGhostTile(chain, state.candidate, newEnd, config);

    if (!ghost) {
        return null;
    }

    return {
        ...state,
        activeEnd: newEnd,
        ghost,
    };
}
