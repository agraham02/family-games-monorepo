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

import {
    getAutoAction as getRummyAutoAction,
    shouldTimerBeActive as rummyTimerActive,
} from "../games/rummy";
import { RummyState } from "@family-games/shared";

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

            // Arm the next player's timer FIRST so the sync emitted by
            // emitTurnTimeout includes the freshly-started turnTimer.
            // Otherwise clients receive a sync with turnTimer=undefined
            // (timer was just cancelled) and never see the next ring.
            maybeStartTimer(gameId, room, newState as SpadesState);

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

        // Arm the next player's timer BEFORE emitting sync (see Spades
        // handler above for the full explanation).
        maybeStartTimer(gameId, room, newState);

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
    } catch (err) {
        console.error("Error dispatching Dominoes auto-action:", err);
    }
}

/**
 * Handle a timeout for a Rummy game.
 * Asks the auto-action helper for an action and dispatches it.
 */
function handleRummyTimeout(
    gameId: string,
    room: Room,
    state: RummyState,
): void {
    const currentPlayerId = state.playOrder[state.currentTurnIndex];
    const player = state.players[currentPlayerId];
    const playerName = player?.name || "Unknown";

    console.log(
        `⏰ Handling Rummy timeout for ${playerName} in substate ${state.turnSubstate}`,
    );

    const autoAction = getRummyAutoAction(state, currentPlayerId);
    if (!autoAction) {
        console.log(`No auto-action available for Rummy in current state`);
        return;
    }

    const action: GameAction = {
        type: autoAction.type,
        userId: currentPlayerId,
        payload: autoAction as unknown as Record<string, unknown>,
    };

    try {
        const newState = gameManager.dispatch(gameId, action);
        // Arm the next player's timer BEFORE emitting sync (see Spades
        // handler above for the full explanation).
        maybeStartTimer(gameId, room, newState);
        emitTurnTimeout(
            room.id,
            {
                playerId: currentPlayerId,
                playerName,
                action: "auto-play",
                gameId,
            },
            newState,
        );
    } catch (err) {
        console.error("Error dispatching Rummy auto-action:", err);
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

        // The blind-bid-window has its own deadline that runs even when the
        // per-turn timer is disabled (turnTimeLimit unset). Schedule a one-shot
        // expiry that auto-reveals any still-pending teams and lets the game
        // advance into the normal bidding phase.
        if (
            spadesState.phase === "blind-bid-window" &&
            spadesState.blindWindow
        ) {
            const remainingMs = Math.max(
                0,
                spadesState.blindWindow.deadline - Date.now(),
            );
            turnTimerService.startTurn(
                gameId,
                "system-blind-window",
                remainingMs / 1000,
                () => {
                    try {
                        gameManager.dispatch(gameId, {
                            type: "_BLIND_WINDOW_EXPIRED",
                            userId: "system",
                            payload: {},
                        });
                    } catch (err) {
                        console.error(
                            "Error dispatching blind-window expiry:",
                            err,
                        );
                        return;
                    }
                    if (io) {
                        io.to(room.id).emit("game_event", {
                            event: "sync",
                            gameState: gameManager.getGameState(gameId),
                            timestamp: new Date().toISOString(),
                        });
                    }
                    const fresh = gameManager.getGame(gameId);
                    if (fresh) maybeStartTimer(gameId, room, fresh);
                },
            );
            return;
        }

        if (!turnTimeLimit || turnTimeLimit <= 0) {
            return;
        }

        if (!spadesTimerActive(spadesState)) {
            turnTimerService.cancelTurn(gameId);
            return;
        }

        const currentPlayerId =
            spadesState.playOrder[spadesState.currentTurnIndex];

        // Don't tick down the per-turn timer for a player whose client
        // hasn't yet acked readiness (initial load, refresh, or reconnect).
        // The next `client_game_ready` from them re-triggers this function.
        if (!isPlayerReady(gameId, currentPlayerId)) {
            turnTimerService.cancelTurn(gameId);
            deferTimerStart(gameId, room);
            return;
        }

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

        if (!isPlayerReady(gameId, currentPlayerId)) {
            turnTimerService.cancelTurn(gameId);
            deferTimerStart(gameId, room);
            return;
        }

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

    // ========================================================================
    // RUMMY
    // ========================================================================
    if (state.type === "rummy") {
        const rummyState = state as unknown as RummyState;

        // Special-case: an open Rummy! call window has its own deadline
        // and parks the per-turn timer entirely. Schedule a one-shot
        // timer that closes the window once it expires; no auto-action
        // for any player runs during this interval.
        if (
            rummyState.turnSubstate === "rummy-window" &&
            rummyState.rummyCall
        ) {
            const remainingMs = Math.max(
                0,
                rummyState.rummyCall.closesAt - Date.now(),
            );
            // Use the discarder as the bookkeeping player id so the timer
            // entry is uniquely associated with this discard. The grace
            // period inside the timer service still applies — fine for
            // a 5–10s window.
            turnTimerService.startTurn(
                gameId,
                rummyState.rummyCall.discardedById,
                remainingMs / 1000,
                () => {
                    try {
                        gameManager.dispatch(gameId, {
                            type: "_RUMMY_WINDOW_EXPIRED",
                            userId: "system",
                            payload: {},
                        });
                    } catch (err) {
                        console.error(
                            "Error dispatching rummy-window expiry:",
                            err,
                        );
                        return;
                    }
                    // Broadcast the new state and re-evaluate whether a
                    // normal per-turn timer should now start.
                    if (io) {
                        io.to(room.id).emit("game_event", {
                            event: "sync",
                            gameState: gameManager.getGameState(gameId),
                            timestamp: new Date().toISOString(),
                        });
                    }
                    const fresh = gameManager.getGame(gameId);
                    if (fresh) maybeStartTimer(gameId, room, fresh);
                },
            );
            return;
        }

        const turnTimeLimit = rummyState.settings?.turnTimeLimit;

        if (!turnTimeLimit || turnTimeLimit <= 0) return;
        if (!rummyTimerActive(rummyState)) {
            turnTimerService.cancelTurn(gameId);
            return;
        }

        const currentPlayerId =
            rummyState.playOrder[rummyState.currentTurnIndex];

        if (!isPlayerReady(gameId, currentPlayerId)) {
            turnTimerService.cancelTurn(gameId);
            deferTimerStart(gameId, room);
            return;
        }

        turnTimerService.startTurn(
            gameId,
            currentPlayerId,
            turnTimeLimit,
            () => {
                const freshState = gameManager.getGame(gameId);
                if (freshState && freshState.type === "rummy") {
                    handleRummyTimeout(
                        gameId,
                        room,
                        freshState as unknown as RummyState,
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
    const pending = pendingGameInits.get(gameId);
    if (pending) {
        clearTimeout(pending.fallbackTimer);
        pendingGameInits.delete(gameId);
    }
    readyPlayers.delete(gameId);
    deferredTimerRooms.delete(gameId);
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
    // Non-turn-advancing actions (e.g. recording a player's in-progress bid
    // intent) must not reset the turn timer, otherwise the countdown would
    // restart every time the player adjusts their staged bid.
    if (_action.type === "STAGE_BID") {
        return;
    }

    // Cancel any existing timer (action was received in time)
    cancelTimer(gameId);

    // Maybe start a new timer based on the new state
    maybeStartTimer(gameId, room, newState);
}

/**
 * Initialize timer for a new game.
 *
 * Historically this immediately started the per-turn timer for the seated
 * player. That created a cross-game leak: in dev (turnTimeLimit ≈ 5s) the
 * countdown would tick down — and even auto-act — before the clients had
 * finished navigating to the game route, mounting the React tree, and
 * hydrating from the initial state payload. Players would land on the table
 * with the timer mostly elapsed.
 *
 * The new contract: register a pending init keyed by gameId. Each player's
 * client emits `client_game_ready` once their tree is mounted; we only
 * actually start the timer once *all* expected players have acknowledged.
 * A safety fallback fires after a short delay so a slow client can't
 * indefinitely stall the game (8s production / 3s dev).
 */
const PENDING_INIT_FALLBACK_MS_PROD = 8000;
const PENDING_INIT_FALLBACK_MS_DEV = 3000;

interface PendingGameInit {
    room: Room;
    expected: Set<string>;
    acked: Set<string>;
    fallbackTimer: NodeJS.Timeout;
}

const pendingGameInits = new Map<string, PendingGameInit>();

// ---------------------------------------------------------------------------
// Per-player readiness gate
// ---------------------------------------------------------------------------
// `client_game_ready` was originally only used to delay the very first
// `initializeGameTimer` call. But `maybeStartTimer` runs many other times
// (after every action, on round transitions, on reconnect/resume). Without
// a per-player gate, the timer could still tick down for a player who
// hadn't yet hydrated — most visibly on slow initial loads (dev fallback
// 3s) and on browser refresh mid-game.
//
// We now track a per-game set of acknowledged player IDs. Whenever the
// timer would start for a specific seated player who is NOT in that set,
// we stash the room and bail out; their next `client_game_ready` ack will
// re-trigger the start with the latest state.
const readyPlayers = new Map<string, Set<string>>();
const deferredTimerRooms = new Map<string, Room>();

function markPlayerReady(gameId: string, userId: string): void {
    let set = readyPlayers.get(gameId);
    if (!set) {
        set = new Set();
        readyPlayers.set(gameId, set);
    }
    set.add(userId);
}

function isPlayerReady(gameId: string, userId: string): boolean {
    return readyPlayers.get(gameId)?.has(userId) ?? false;
}

/**
 * Forget a player's readiness ack. Called when they disconnect so a
 * subsequent reconnect must wait for the new client mount to re-ack
 * before the timer resumes.
 */
export function clearPlayerReady(gameId: string, userId: string): void {
    readyPlayers.get(gameId)?.delete(userId);
}

/**
 * Defer a turn-timer start until a specific player acks ready.
 * Idempotent — only the latest room reference is kept.
 */
function deferTimerStart(gameId: string, room: Room): void {
    deferredTimerRooms.set(gameId, room);
}

function consumeDeferredStart(gameId: string): Room | undefined {
    const room = deferredTimerRooms.get(gameId);
    if (room) deferredTimerRooms.delete(gameId);
    return room;
}

function fallbackMs(): number {
    return process.env.NODE_ENV === "development"
        ? PENDING_INIT_FALLBACK_MS_DEV
        : PENDING_INIT_FALLBACK_MS_PROD;
}

function startPendingTimer(gameId: string): void {
    const pending = pendingGameInits.get(gameId);
    if (!pending) return;
    clearTimeout(pending.fallbackTimer);
    pendingGameInits.delete(gameId);

    const state = gameManager.getGame(gameId);
    if (!state) return;
    maybeStartTimer(gameId, pending.room, state);
    // Broadcast the freshly-started timer's startedAt so the UI countdown
    // reflects the post-handshake start time rather than whatever stale
    // `turnStartedAt` the reducer set at round-deal time.
    if (io) {
        io.to(pending.room.id).emit("game_event", {
            event: "sync",
            gameState: gameManager.getGameState(gameId),
            timestamp: new Date().toISOString(),
        });
    }
}

export function initializeGameTimer(gameId: string, room: Room): void {
    // Clear any prior pending entry for this gameId (defensive — should
    // only happen on rapid restart).
    const prior = pendingGameInits.get(gameId);
    if (prior) clearTimeout(prior.fallbackTimer);

    const expected = new Set(
        room.users
            .filter((u) => u.isConnected && !room.spectators?.includes(u.id))
            .map((u) => u.id),
    );

    // Edge case: solo / no expected players (e.g. all spectators) — start
    // immediately so the game isn't stuck waiting for an ack that never
    // comes.
    if (expected.size === 0) {
        const state = gameManager.getGame(gameId);
        if (state) maybeStartTimer(gameId, room, state);
        return;
    }

    const fallbackTimer = setTimeout(() => {
        console.warn(
            `⏳ Game ${gameId} client-ready fallback fired (not all clients acked in time)`,
        );
        startPendingTimer(gameId);
    }, fallbackMs());

    pendingGameInits.set(gameId, {
        room,
        expected,
        acked: new Set(),
        fallbackTimer,
    });
}

/**
 * Called when a client emits `client_game_ready`. Once every expected
 * player has acknowledged, start the per-turn timer.
 */
export function acknowledgeGameReady(gameId: string, userId: string): void {
    // Mark the player ready first so that any timer the server tries to
    // start for them (now or in the future) is no longer deferred.
    markPlayerReady(gameId, userId);

    const pending = pendingGameInits.get(gameId);
    if (pending) {
        if (pending.expected.has(userId)) {
            pending.acked.add(userId);
            if (pending.acked.size >= pending.expected.size) {
                startPendingTimer(gameId);
                return;
            }
        }
        // Still waiting on other players for the initial start — no need
        // to re-trigger maybeStartTimer; startPendingTimer will run it.
        return;
    }

    // Game is past initial start. If a previous maybeStartTimer call was
    // deferred waiting on this player (e.g. mid-game refresh / reconnect,
    // or it was their turn when they joined), re-run it now.
    const deferredRoom = consumeDeferredStart(gameId);
    if (deferredRoom) {
        const state = gameManager.getGame(gameId);
        if (state) {
            maybeStartTimer(gameId, deferredRoom, state);
            // Broadcast the freshly-started timer so all clients update
            // their `turnTimer.startedAt` to reflect this player's ack.
            if (io) {
                io.to(deferredRoom.id).emit("game_event", {
                    event: "sync",
                    gameState: gameManager.getGameState(gameId),
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }
}

/**
 * Drop a player from the expected-ack set when they disconnect before
 * acknowledging. Prevents the safety fallback being the only path forward
 * when one client hard-fails to load.
 */
export function dropPendingAck(gameId: string, userId: string): void {
    const pending = pendingGameInits.get(gameId);
    if (!pending) return;
    pending.expected.delete(userId);
    pending.acked.delete(userId);
    if (
        pending.expected.size === 0 ||
        pending.acked.size >= pending.expected.size
    ) {
        startPendingTimer(gameId);
    }
}
