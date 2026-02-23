// src/games/dominoes/helpers/board.ts
// Board state management and tile placement logic for Dominoes

import {
    Tile,
    BoardEnd,
    BoardState,
    computeDominoBoardLayout,
    orientDominoTileForEnd,
} from "@family-games/shared";

// Re-export BoardState for convenience
export type { BoardState };

/**
 * Initialize an empty domino board.
 * @returns Empty board state with no tiles and null ends
 */
export function initializeBoard(layoutSeed?: string): BoardState {
    return {
        tiles: [],
        leftEnd: null,
        rightEnd: null,
        layout: layoutSeed
            ? computeDominoBoardLayout([], layoutSeed)
            : undefined,
    };
}

/**
 * Check if a tile can be placed on the board at the specified side.
 *
 * @param tile - The tile to check
 * @param board - Current board state
 * @param side - Which end of the board to check ("left" or "right")
 * @returns True if the tile can be legally placed on that side
 */
export function canPlaceTile(
    tile: Tile,
    board: BoardState,
    side: "left" | "right",
): boolean {
    // If board is empty, any tile can be placed
    if (board.tiles.length === 0) {
        return true;
    }

    const end = side === "left" ? board.leftEnd : board.rightEnd;
    if (!end) return false;

    // Tile can be placed if either of its values matches the end value
    return tile.left === end.value || tile.right === end.value;
}

/**
 * Check if a tile can be played on either end of the board.
 *
 * @param tile - The tile to check
 * @param board - Current board state
 * @returns True if the tile can be played on at least one end
 */
export function canPlayTile(tile: Tile, board: BoardState): boolean {
    if (board.tiles.length === 0) return true;
    return (
        canPlaceTile(tile, board, "left") || canPlaceTile(tile, board, "right")
    );
}

/**
 * Check if any tile in the hand can be legally played.
 *
 * @param hand - Array of tiles in player's hand
 * @param board - Current board state
 * @returns True if at least one tile can be played
 */
export function hasLegalMove(hand: Tile[], board: BoardState): boolean {
    return hand.some((tile) => canPlayTile(tile, board));
}

/**
 * Place a tile on the board at the specified side.
 * Handles tile orientation so the connecting pip faces the board.
 *
 * @param tile - The tile to place
 * @param board - Current board state
 * @param side - Which end to place on ("left" or "right")
 * @returns Updated board state with the new tile
 * @throws Error if tile doesn't match the board end
 */
export function placeTileOnBoard(
    tile: Tile,
    board: BoardState,
    side: "left" | "right",
    layoutSeed?: string,
): BoardState {
    // If board is empty, place the first tile
    if (board.tiles.length === 0) {
        const tiles = [tile];
        return {
            tiles,
            leftEnd: { value: tile.left, tileId: tile.id },
            rightEnd: { value: tile.right, tileId: tile.id },
            layout: layoutSeed
                ? computeDominoBoardLayout(tiles, layoutSeed)
                : undefined,
        };
    }

    // Determine which value of the tile should connect to the board
    const end = side === "left" ? board.leftEnd : board.rightEnd;
    if (!end) {
        throw new Error("Invalid board state");
    }

    const { orientedTile, newEndValue } = orientDominoTileForEnd(
        tile,
        end.value,
    );

    // Update board state
    const newTiles =
        side === "left"
            ? [orientedTile, ...board.tiles]
            : [...board.tiles, orientedTile];

    const newEnd: BoardEnd = {
        value: newEndValue,
        tileId: tile.id,
    };

    return {
        tiles: newTiles,
        leftEnd: side === "left" ? newEnd : board.leftEnd,
        rightEnd: side === "right" ? newEnd : board.rightEnd,
        layout: layoutSeed
            ? computeDominoBoardLayout(newTiles, layoutSeed, board.layout)
            : undefined,
    };
}
