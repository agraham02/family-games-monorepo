/**
 * Chain Manager - handles domino chain state and placement logic.
 * All operations are immutable, returning new state without mutation.
 */

import type {
    Domino,
    PlacedDomino,
    ChainState,
    ChainEndState,
    ChainEnd,
    LayoutConfig,
    PlacementResult,
    PlacementValidity,
    Direction,
    Point,
} from "./types";
import { isDouble, EMPTY_CHAIN, createLayoutConfig } from "./types";
import {
    oppositeDirection,
    computeNextPosition,
    shouldTurn,
    selectTurnDirection,
    getRotation,
} from "./pathBuilder";

// =============================================================================
// Placement Validation
// =============================================================================

/**
 * Check if a domino can connect to a specific pip value.
 */
export function canConnect(domino: Domino, openValue: number): boolean {
    return domino.left === openValue || domino.right === openValue;
}

/**
 * Get the connecting pip and open pip for a domino placed at a given end.
 * Returns [connecting, open] tuple where connecting matches the chain's open value.
 */
export function getOrientedPips(
    domino: Domino,
    openValue: number,
): readonly [number, number] {
    if (domino.left === openValue) {
        return [domino.left, domino.right];
    }
    return [domino.right, domino.left];
}

/**
 * Check which ends a domino can be placed at.
 */
export function getPlacementValidity(
    chain: ChainState,
    domino: Domino,
): PlacementValidity {
    if (chain.isEmpty) {
        // First tile can be placed at either end (they're the same initially)
        return { canPlaceAtHead: true, canPlaceAtTail: true };
    }

    return {
        canPlaceAtHead: chain.head
            ? canConnect(domino, chain.head.openValue)
            : false,
        canPlaceAtTail: chain.tail
            ? canConnect(domino, chain.tail.openValue)
            : false,
    };
}

/**
 * Check if a domino can be placed anywhere on the chain.
 */
export function canPlace(chain: ChainState, domino: Domino): boolean {
    const validity = getPlacementValidity(chain, domino);
    return validity.canPlaceAtHead || validity.canPlaceAtTail;
}

// =============================================================================
// First Tile Placement
// =============================================================================

/**
 * Place the first tile at the center of the board.
 * Establishes both head (East) and tail (West) ends.
 */
function placeFirstTile(domino: Domino, config: LayoutConfig): ChainState {
    const isDbl = isDouble(domino);

    // First tile is at origin, oriented East-West
    const initialDirection: Direction = "E";
    const rotation = getRotation(initialDirection, isDbl);

    const placedTile: PlacedDomino = {
        id: domino.id,
        pips: [domino.left, domino.right],
        position: { x: 0, y: 0 },
        rotation,
        isDouble: isDbl,
        entryDirection: "W", // Conceptually entered from west
        exitDirection: "E",
    };

    // Head goes East, tail goes West
    const head: ChainEndState = {
        openValue: domino.right,
        tileId: domino.id,
        direction: "E",
        position: placedTile.position,
    };

    const tail: ChainEndState = {
        openValue: domino.left,
        tileId: domino.id,
        direction: "W",
        position: placedTile.position,
    };

    return {
        tiles: [placedTile],
        head,
        tail,
        isEmpty: false,
    };
}

// =============================================================================
// Chain Extension
// =============================================================================

/**
 * Extend the chain at a specific end with a new domino.
 */
function extendChain(
    chain: ChainState,
    domino: Domino,
    end: ChainEnd,
    config: LayoutConfig,
): ChainState {
    const endState = end === "head" ? chain.head : chain.tail;
    if (!endState) {
        throw new Error(`Cannot extend ${end}: end state is null`);
    }

    const isDbl = isDouble(domino);
    const [connectingPip, openPip] = getOrientedPips(
        domino,
        endState.openValue,
    );

    // Find the tile at this end to check if it's a double
    const endTile = chain.tiles.find((t) => t.id === endState.tileId);
    const prevIsDouble = endTile?.isDouble ?? false;

    // Determine direction and whether to turn
    let direction = endState.direction;

    if (
        shouldTurn(
            endState.position,
            config,
            prevIsDouble,
            isDbl,
            direction,
            chain.tiles,
        )
    ) {
        direction = selectTurnDirection(
            endState.position,
            config,
            direction,
            isDbl,
            chain.tiles,
            end,
        );
    }

    // Compute new position
    const position = computeNextPosition(
        endState.position,
        config,
        prevIsDouble,
        isDbl,
        direction,
    );

    const rotation = getRotation(direction, isDbl);

    const placedTile: PlacedDomino = {
        id: domino.id,
        pips: [connectingPip, openPip],
        position,
        rotation,
        isDouble: isDbl,
        entryDirection: oppositeDirection(direction),
        exitDirection: direction,
    };

    // Create new end state
    const newEndState: ChainEndState = {
        openValue: openPip,
        tileId: domino.id,
        direction,
        position,
    };

    // Update chain immutably
    if (end === "head") {
        return {
            tiles: [...chain.tiles, placedTile],
            head: newEndState,
            tail: chain.tail,
            isEmpty: false,
        };
    } else {
        return {
            tiles: [...chain.tiles, placedTile],
            head: chain.head,
            tail: newEndState,
            isEmpty: false,
        };
    }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Place a domino on the chain at a specific end.
 * Returns a new ChainState without mutating the original.
 */
export function placeDomino(
    chain: ChainState,
    domino: Domino,
    end: ChainEnd,
    config: LayoutConfig = createLayoutConfig(),
): PlacementResult {
    // First tile placement
    if (chain.isEmpty) {
        return {
            success: true,
            chain: placeFirstTile(domino, config),
        };
    }

    // Validate placement
    const validity = getPlacementValidity(chain, domino);
    const canPlaceAtEnd =
        end === "head" ? validity.canPlaceAtHead : validity.canPlaceAtTail;

    if (!canPlaceAtEnd) {
        return {
            success: false,
            reason: `Domino ${domino.id} cannot connect at ${end}`,
        };
    }

    // Extend chain
    return {
        success: true,
        chain: extendChain(chain, domino, end, config),
    };
}

/**
 * Get the open pip values at both ends of the chain.
 */
export function getOpenEnds(chain: ChainState): {
    head: number | null;
    tail: number | null;
} {
    return {
        head: chain.head?.openValue ?? null,
        tail: chain.tail?.openValue ?? null,
    };
}

/**
 * Get the tile at a specific end of the chain.
 */
export function getTileAtEnd(
    chain: ChainState,
    end: ChainEnd,
): PlacedDomino | null {
    const endState = end === "head" ? chain.head : chain.tail;
    if (!endState) return null;

    return chain.tiles.find((t) => t.id === endState.tileId) ?? null;
}

/**
 * Create a new chain from an array of dominoes.
 * Places dominoes sequentially, alternating between head and tail.
 */
export function createChainFromDominoes(
    dominoes: readonly Domino[],
    config: LayoutConfig = createLayoutConfig(),
): ChainState {
    if (dominoes.length === 0) {
        return EMPTY_CHAIN;
    }

    let chain = EMPTY_CHAIN;

    for (let i = 0; i < dominoes.length; i++) {
        const domino = dominoes[i];
        // Alternate between head and tail for balanced growth
        const end: ChainEnd = i % 2 === 0 ? "head" : "tail";

        const result = placeDomino(
            chain,
            domino,
            chain.isEmpty ? "head" : end,
            config,
        );

        if (result.success) {
            chain = result.chain;
        } else {
            console.warn(
                `Failed to place domino ${domino.id}: ${result.reason}`,
            );
        }
    }

    return chain;
}
