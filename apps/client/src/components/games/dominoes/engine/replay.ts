/**
 * Rebuild a DominoChainState from the server's board tile array.
 *
 * The server stores tiles in chain order (left-to-right). We replay them
 * through autoPlace() to reconstruct visual positions deterministically.
 */
import type { Tile, BoardState } from "@shared/types/games/dominoes";
import type { Domino, DominoChainState, PipValue } from "./types";
import {
    createEmptyChain,
    placeFirstTile,
    autoPlace,
    addSegmentToChain,
} from "./chain";
import { canPlayAt } from "./rules";

/** Convert a monorepo Tile to a dominoes-ui Domino. */
export function tileToDomino(tile: Tile): Domino {
    return {
        id: tile.id,
        pip1: tile.left as PipValue,
        pip2: tile.right as PipValue,
        isDouble: tile.left === tile.right,
    };
}

/**
 * Replay the server's board tile list into a full DominoChainState.
 *
 * Center-anchored: when `centerTileId` is provided, that tile is placed at
 * the visual center. Tiles to its right build the tail, tiles to its left
 * build the head. This ensures existing tile positions stay stable as new
 * tiles are added to either end — only the newly-appended/prepended tile
 * gets a fresh position.
 *
 * board.tiles is ordered left-to-right in chain order:
 *   tiles[0] = leftmost tile (chain head)
 *   tiles[n-1] = rightmost tile (chain tail)
 *
 * The server orients every tile so that tile.left = connecting pip (facing
 * inward toward the chain). The first tile played is NOT reoriented, so
 * tile.left = left-facing pip and tile.right = right-facing pip.
 */
export function replayBoardToChain(
    board: BoardState,
    centerTileId?: string,
): DominoChainState {
    if (!board.tiles || board.tiles.length === 0) {
        return createEmptyChain();
    }

    // Find center tile index (defaults to 0 for backwards compatibility)
    let centerIdx = 0;
    if (centerTileId) {
        const idx = board.tiles.findIndex((t) => t.id === centerTileId);
        if (idx >= 0) centerIdx = idx;
    }

    // Place center tile at board center.
    // The first tile played was NOT reoriented, so tile.left = left pip,
    // tile.right = right pip. For pip1 (head-facing), use tile.left.
    const centerTile = board.tiles[centerIdx];
    const centerDomino = tileToDomino(centerTile);

    // Safety: use board.leftEnd to verify orientation when center is tiles[0]
    // (handles edge cases where the server stores pips differently)
    let orientedCenter = centerDomino;
    if (centerIdx === 0) {
        const headValue = board.leftEnd?.value as PipValue | undefined;
        if (
            headValue != null &&
            centerDomino.pip1 !== headValue &&
            centerDomino.pip2 === headValue
        ) {
            orientedCenter = {
                ...centerDomino,
                pip1: centerDomino.pip2,
                pip2: centerDomino.pip1,
            };
        }
    }

    // Use placeFirstTile directly — it sets BOTH headOpenPip and tailOpenPip.
    // (autoPlace returns only a segment; addSegmentToChain("tail") would
    //  preserve the empty-chain headOpenPip = null, breaking all head tiles.)
    // Seed the chain from the center tile id so the snake-direction
    // tiebreaker varies per game but stays deterministic across re-renders.
    const seedSource = centerTile.id;
    let snakeSeed = 0;
    for (let i = 0; i < seedSource.length; i++) {
        snakeSeed = (snakeSeed * 31 + seedSource.charCodeAt(i)) | 0;
    }
    let chain = placeFirstTile(
        { ...createEmptyChain(), snakeSeed },
        orientedCenter,
    );

    // Build TAIL: tiles to the right of center (centerIdx+1 → end).
    // Each tile's .left = connecting pip matching the previous tile's right pip.
    for (let i = centerIdx + 1; i < board.tiles.length; i++) {
        const domino = tileToDomino(board.tiles[i]);
        const tailPip = canPlayAt(domino, chain, "tail");
        if (tailPip !== null) {
            const result = autoPlace(chain, domino, "tail", tailPip);
            if (result.success && result.segment) {
                chain = addSegmentToChain(chain, result.segment, "tail");
            } else {
                console.warn(`replay: failed to place tail tile ${domino.id}`);
            }
        } else {
            console.warn(
                `replay: tail tile ${domino.id} cannot connect to chain`,
            );
        }
    }

    // Build HEAD: tiles to the left of center (centerIdx-1 → 0).
    // Process closest-to-center first, so the chain grows outward.
    // Each tile's .left = connecting pip matching the next tile's left pip
    // (its neighbor toward center).
    for (let i = centerIdx - 1; i >= 0; i--) {
        const domino = tileToDomino(board.tiles[i]);
        const headPip = canPlayAt(domino, chain, "head");
        if (headPip !== null) {
            const result = autoPlace(chain, domino, "head", headPip);
            if (result.success && result.segment) {
                chain = addSegmentToChain(chain, result.segment, "head");
            } else {
                console.warn(`replay: failed to place head tile ${domino.id}`);
            }
        } else {
            console.warn(
                `replay: head tile ${domino.id} cannot connect to chain`,
            );
        }
    }

    return chain;
}
