// src/games/dominoes/helpers/autoAction.ts
// Auto-action helpers for turn timer timeout handling

import { Tile, DominoesPhase } from "@family-games/shared";
import { canPlaceTile, hasLegalMove } from "./board";
import { BoardState } from "./board";

interface DominoesStateForAutoAction {
    phase: DominoesPhase;
    hands: Record<string, Tile[]>;
    board: BoardState;
}

/**
 * Determines if the timer should be active for the current game state.
 * Timer is only active during the playing phase.
 */
export function shouldTimerBeActive(
    state: DominoesStateForAutoAction,
): boolean {
    return state.phase === "playing";
}

/**
 * Gets the first legal tile a player can play, or null if they must pass.
 * Used for auto-action when turn timer expires.
 *
 * @returns Object with tile and side to play, or null if no legal move
 */
export function getAutoPlayTile(
    state: DominoesStateForAutoAction,
    playerId: string,
): { tile: Tile; side: "left" | "right" } | null {
    const hand = state.hands[playerId];
    if (!hand || hand.length === 0) {
        return null;
    }

    // If no legal moves, player must pass
    if (!hasLegalMove(hand, state.board)) {
        return null;
    }

    // Find first playable tile
    for (const tile of hand) {
        if (canPlaceTile(tile, state.board, "left")) {
            return { tile, side: "left" };
        }
        if (canPlaceTile(tile, state.board, "right")) {
            return { tile, side: "right" };
        }
    }

    return null;
}
