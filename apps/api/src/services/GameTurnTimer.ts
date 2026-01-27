// src/services/GameTurnTimer.ts

/**
 * Game Turn Timer Integration
 *
 * This module integrates the TurnTimerService with game logic.
 * It handles:
 * - Starting timers after actions that result in a new turn
 * - Cancelling timers when actions are received
 * - Dispatching auto-actions when timeouts occur
 * - Emitting turn_timeout events to clients
 */

import { Server as SocketIOServer } from "socket.io";
import { Room } from "@family-games/shared";
import { gameManager, GameAction, GameState } from "./GameManager";
import { turnTimerService } from "./TurnTimerService";

// Type imports for game-specific logic
import {
    getAutoBid,
    getAutoPlayCard,
    shouldTimerBeActive as spadesTimerActive,
} from "../games/spades";
import { SpadesState } from "../games/spades";

import {
    getAutoPlayTile,
    shouldTimerBeActive as dominoesTimerActive,
} from "../games/dominoes";
import { DominoesState } from "../games/dominoes";

let io: SocketIOServer | null = null;

/**
 * Set the Socket.IO server instance for emitting events.
 */
export function setTurnTimerSocketServer(server: SocketIOServer): void {
    io = server;
}

/**
 * Interface for timeout event payload sent to clients.
 */
interface TurnTimeoutPayload {
    playerId: string;
    playerName: string;
    action: "auto-bid" | "auto-play";
    gameId: string;
}

/**
 * Emit a turn timeout event to all clients in a room.
 */
function emitTurnTimeout(
    roomId: string,
    payload: TurnTimeoutPayload,
    gameState: GameState,
): void {
    if (!io) {
        console.warn("Socket.IO not initialized for turn timer events");
        return;
    }

    io.to(roomId).emit("turn_timeout", {
        ...payload,
        timestamp: new Date().toISOString(),
    });

    // Also emit a game sync event with updated state
    io.to(roomId).emit("game_event", {
        event: "sync",
        gameState: gameManager.getGameState(gameState.id),
        timestamp: new Date().toISOString(),
    });
}

/**
 * Handle a timeout for a Spades game.
 * Dispatches the appropriate auto-action based on game phase.
 */
function handleSpadesTimeout(
    gameId: string,
    room: Room,
    state: SpadesState,
): void {
    const currentPlayerId = state.playOrder[state.currentTurnIndex];
    const player = state.players[currentPlayerId];
    const playerName = player?.name || "Unknown";

    console.log(
        `⏰ Handling Spades timeout for ${playerName} in ${state.phase} phase`,
    );

    let action: GameAction | null = null;
    let actionType: "auto-bid" | "auto-play" = "auto-bid";

    if (state.phase === "bidding") {
        const autoBid = getAutoBid(state, currentPlayerId);
        action = {
            type: "PLACE_BID",
            userId: currentPlayerId,
            payload: { bid: autoBid },
        };
        actionType = "auto-bid";
        console.log(`🤖 Auto-bidding ${autoBid.amount} for ${playerName}`);
    } else if (state.phase === "playing") {
        const autoCard = getAutoPlayCard(state, currentPlayerId);
        if (autoCard) {
            action = {
                type: "PLAY_CARD",
                userId: currentPlayerId,
                payload: { card: autoCard },
            };
            actionType = "auto-play";
            console.log(
                `🤖 Auto-playing ${autoCard.rank} of ${autoCard.suit} for ${playerName}`,
            );
        }
    }

    if (action) {
        try {
            // Dispatch the auto-action
            const newState = gameManager.dispatch(gameId, action);

            // Emit timeout event to clients
            emitTurnTimeout(
                room.id,
                {
                    playerId: currentPlayerId,
                    playerName,
                    action: actionType,
                    gameId,
                },
                newState,
            );

            // Check if we need to start a new timer for the next player
            maybeStartTimer(gameId, room, newState as SpadesState);
        } catch (err) {
            console.error("Error dispatching auto-action:", err);
        }
    }
}

/**
 * Handle a timeout for a Dominoes game.
 * Auto-plays the first legal tile or passes if no legal moves.
 */
function handleDominoesTimeout(
    gameId: string,
    room: Room,
    state: DominoesState,
): void {
    const currentPlayerId = state.playOrder[state.currentTurnIndex];
    const player = state.players[currentPlayerId];
    const playerName = player?.name || "Unknown";

    console.log(
        `⏰ Handling Dominoes timeout for ${playerName} in ${state.phase} phase`,
    );

    let action: GameAction;
    let actionType: "auto-play" | "auto-pass" = "auto-play";

    const autoPlay = getAutoPlayTile(state, currentPlayerId);

    if (autoPlay) {
        // Has a legal move - auto-play it
        action = {
            type: "PLACE_TILE",
            userId: currentPlayerId,
            payload: { tile: autoPlay.tile, side: autoPlay.side },
        };
        console.log(
            `🤖 Auto-playing tile [${autoPlay.tile.left}|${autoPlay.tile.right}] on ${autoPlay.side} for ${playerName}`,
        );
    } else {
        // No legal moves - auto-pass
        action = {
            type: "PASS",
            userId: currentPlayerId,
            payload: {},
        };
        actionType = "auto-pass";
        console.log(`🤖 Auto-passing for ${playerName}`);
    }

    try {
        // Dispatch the auto-action
        const newState = gameManager.dispatch(gameId, action);

        // Emit timeout event to clients
        emitTurnTimeout(
            room.id,
            {
                playerId: currentPlayerId,
                playerName,
                action: actionType as "auto-bid" | "auto-play",
                gameId,
            },
            newState,
        );

        // Check if we need to start a new timer for the next player
        maybeStartTimer(gameId, room, newState);
    } catch (err) {
        console.error("Error dispatching Dominoes auto-action:", err);
    }
}

/**
 * Maybe start a timer based on the current game state.
 * Only starts if the phase requires a timer (bidding or playing).
 */
export function maybeStartTimer(
    gameId: string,
    room: Room,
    state: GameState,
): void {
    // ========================================================================
    // SPADES
    // ========================================================================
    if (state.type === "spades") {
        const spadesState = state as SpadesState;
        const turnTimeLimit = spadesState.settings?.turnTimeLimit;

        if (!turnTimeLimit || turnTimeLimit <= 0) {
            return;
        }

        if (!spadesTimerActive(spadesState)) {
            turnTimerService.cancelTurn(gameId);
            return;
        }

        const currentPlayerId =
            spadesState.playOrder[spadesState.currentTurnIndex];

        turnTimerService.startTurn(
            gameId,
            currentPlayerId,
            turnTimeLimit,
            () => {
                const freshState = gameManager.getGame(gameId);
                if (freshState && freshState.type === "spades") {
                    handleSpadesTimeout(
                        gameId,
                        room,
                        freshState as SpadesState,
                    );
                }
            },
        );
        return;
    }

    // ========================================================================
    // DOMINOES
    // ========================================================================
    if (state.type === "dominoes") {
        const dominoesState = state as DominoesState;
        const turnTimeLimit = dominoesState.settings?.turnTimeLimit;

        if (!turnTimeLimit || turnTimeLimit <= 0) {
            return;
        }

        if (!dominoesTimerActive(dominoesState)) {
            turnTimerService.cancelTurn(gameId);
            return;
        }

        const currentPlayerId =
            dominoesState.playOrder[dominoesState.currentTurnIndex];

        turnTimerService.startTurn(
            gameId,
            currentPlayerId,
            turnTimeLimit,
            () => {
                const freshState = gameManager.getGame(gameId);
                if (freshState && freshState.type === "dominoes") {
                    handleDominoesTimeout(
                        gameId,
                        room,
                        freshState as DominoesState,
                    );
                }
            },
        );
        return;
    }
}

/**
 * Cancel any active timer for a game.
 * Called when a valid action is received.
 */
export function cancelTimer(gameId: string): void {
    turnTimerService.cancelTurn(gameId);
}

/**
 * Pause the timer for a game.
 * Called when a player disconnects.
 */
export function pauseTimer(gameId: string): void {
    turnTimerService.pauseTurn(gameId);
}

/**
 * Resume the timer for a game.
 * Called when all players have reconnected.
 */
export function resumeTimer(gameId: string, room: Room): void {
    const state = gameManager.getGame(gameId);
    if (!state) return;

    // If timer was paused, resume it
    if (turnTimerService.isTimerPaused(gameId)) {
        turnTimerService.resumeTurn(gameId);
    } else {
        // Otherwise, maybe start a fresh timer
        maybeStartTimer(gameId, room, state);
    }
}

/**
 * Clean up timers when a game ends.
 */
export function cleanupGameTimers(gameId: string): void {
    turnTimerService.cleanupGame(gameId);
}

/**
 * Handle a game action being dispatched.
 * This is the main integration point - called after every action.
 *
 * @param gameId - The game ID
 * @param room - The room containing the game
 * @param prevState - State before the action
 * @param newState - State after the action
 * @param action - The action that was dispatched
 */
export function handleActionDispatched(
    gameId: string,
    room: Room,
    newState: GameState,
    _action: GameAction,
): void {
    // Cancel any existing timer (action was received in time)
    cancelTimer(gameId);

    // Maybe start a new timer based on the new state
    maybeStartTimer(gameId, room, newState);
}

/**
 * Initialize timer for a new game.
 * Called when a game is created.
 */
export function initializeGameTimer(gameId: string, room: Room): void {
    const state = gameManager.getGame(gameId);
    if (state) {
        maybeStartTimer(gameId, room, state);
    }
}
