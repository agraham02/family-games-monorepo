// apps/api/src/games/lrc/helpers/autoAction.ts
// Auto-action helpers for LRC turn timer timeout handling
//
// These functions are used by TurnTimerService to:
// 1. Determine if a timer should be running
// 2. Get the action to perform when timer expires
// 3. Handle auto-confirm for showing-results phase

import { LRCState, LRCAction, LRCPhase } from "@family-games/shared";

/** Phases where the turn timer should be active */
const ACTIVE_TIMER_PHASES: LRCPhase[] = [
    "waiting-for-roll",
    "wild-target-selection",
    "last-chip-challenge",
];

/**
 * Determine if the turn timer should be active for the current game state.
 * Timer runs during phases where a player needs to take action.
 *
 * @param state - Current LRC game state
 * @returns True if timer should be counting down
 */
export function shouldTimerBeActive(state: LRCState): boolean {
    return ACTIVE_TIMER_PHASES.includes(state.phase);
}

/**
 * Get the automatic action to take when the turn timer expires.
 * This ensures the game keeps moving even if a player is AFK.
 *
 * @param state - Current LRC game state
 * @param playerId - ID of the player whose turn it is
 * @returns The action to dispatch, or null if no auto-action applies
 */
export function getAutoAction(
    state: LRCState,
    playerId: string,
): LRCAction | null {
    const currentPlayer = state.lrcPlayers[state.currentPlayerIndex];

    // Only auto-act for the current player
    if (currentPlayer?.id !== playerId) {
        return null;
    }

    switch (state.phase) {
        case "waiting-for-roll":
            // Auto-roll the dice
            return { type: "ROLL_DICE" };

        case "wild-target-selection":
            // Auto-select (this will be handled by the reducer with default target)
            // The reducer should auto-select richest player when no target specified
            return { type: "CONFIRM_RESULTS" };

        case "last-chip-challenge":
            // Auto-roll the challenge
            return { type: "LAST_CHIP_CHALLENGE_ROLL" };

        default:
            return null;
    }
}

/**
 * Determine if auto-confirm should trigger for showing-results phase.
 * This is separate from the turn timer - it's a shorter delay for viewing results.
 *
 * @param state - Current LRC game state
 * @returns True if in showing-results phase and auto-confirm should apply
 */
export function shouldAutoConfirm(state: LRCState): boolean {
    return state.phase === "showing-results" && state.autoConfirmAt != null;
}

/**
 * Check if the auto-confirm deadline has passed.
 *
 * @param state - Current LRC game state
 * @returns True if auto-confirm should trigger now
 */
export function isAutoConfirmDue(state: LRCState): boolean {
    if (!state.autoConfirmAt) {
        return false;
    }

    const deadline = new Date(state.autoConfirmAt).getTime();
    const now = Date.now();

    return now >= deadline;
}
