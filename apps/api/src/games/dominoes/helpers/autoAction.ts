// src/games/dominoes/helpers/autoAction.ts
// Auto-action helpers for turn timer timeout handling
//
// These functions are used by TurnTimerService to:
// 1. Determine if a timer should be running
// 2. Get the action to perform when timer expires

import { Tile, DominoesPhase } from "@family-games/shared";
import { canPlaceTile, hasLegalMove } from "./board";
import { BoardState } from "./board";

/**
 * Minimal state interface for auto-action checks.
 * Avoids importing the full DominoesState to prevent circular dependencies.
 */
interface DominoesStateForAutoAction {
    phase: DominoesPhase;
    hands: Record<string, Tile[]>;
    board: BoardState;
}

/**
 * Determines if the turn timer should be active for the current game state.
 * Timer is only active during the playing phase when players need to act.
 *
 * @param state - Current game state
 * @returns True if timer should be counting down
 */
export function shouldTimerBeActive(
    state: DominoesStateForAutoAction,
): boolean {
    return state.phase === "playing";
}

/**
 * Gets the auto-play action for a player when their turn timer expires.
 * Finds the first legal tile that can be played on either side.
 *
 * Strategy: Play the first playable tile found (no optimization).
 * This is intentionally suboptimal as a "penalty" for timing out.
 *
 * @param state - Current game state
 * @param playerId - ID of the player whose turn it is
 * @returns Object with tile and side to play, or null if no legal move (must pass)
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

    // Find first playable tile (prefer left side for consistency)
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
