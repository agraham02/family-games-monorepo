// apps/api/src/games/lrc/index.ts
// Left Right Center (LRC) game module

import {
    Room,
    User,
    LRCSettings,
    DEFAULT_LRC_SETTINGS,
    LRC_SETTINGS_DEFINITIONS,
    LRCState,
    LRCPlayer,
    LRCData,
    LRCPlayerData,
    LRCClientSettings,
    LRC_MIN_PLAYERS,
    LRC_MAX_PLAYERS,
    LRC_AUTO_CONFIRM_DELAY,
    TurnTimerInfo,
} from "@family-games/shared";
import { GameModule, GameAction } from "../../services/GameManager";
import { v4 as uuidv4 } from "uuid";
import {
    rollDice,
    shufflePlayers,
    findNextPlayerIndex,
    getDiceCount,
    isTripleWild,
    isAllDots,
} from "./helpers/dice";
import {
    calculateChipMovements,
    applyChipMovements,
    checkWinCondition,
    findPlayerWithMostChips,
    countWildDice,
    getValidWildTargets,
} from "./helpers/chips";

// Export auto-action helpers for TurnTimerService
export { getAutoAction, shouldTimerBeActive } from "./helpers/autoAction";

const LRC_NAME = "lrc";
const LRC_DISPLAY_NAME = "Left Right Center";

const LRC_METADATA = {
    type: LRC_NAME,
    displayName: LRC_DISPLAY_NAME,
    description:
        "Roll the dice, pass chips left, right, or to the center. Last player with chips wins!",
    requiresTeams: false,
    minPlayers: LRC_MIN_PLAYERS,
    maxPlayers: LRC_MAX_PLAYERS,
    settingsDefinitions: LRC_SETTINGS_DEFINITIONS,
    defaultSettings: DEFAULT_LRC_SETTINGS,
};

/**
 * Initialize a new LRC game.
 */
function init(room: Room, customSettings?: Partial<LRCSettings>): LRCState {
    const players: Record<string, User> = Object.fromEntries(
        room.users.map((user) => [user.id, user]),
    );

    const settings: LRCSettings = {
        ...DEFAULT_LRC_SETTINGS,
        ...customSettings,
    };

    // Shuffle players for random turn order
    const shuffledUsers = shufflePlayers(room.users);

    // Create LRC players with initial chips
    const lrcPlayers: LRCPlayer[] = shuffledUsers.map((user, index) => ({
        id: user.id,
        name: user.name,
        chips: settings.startingChips,
        totalWinnings: 0,
        isConnected: true,
        seatIndex: index,
    }));

    const initialState: LRCState = {
        id: uuidv4(),
        roomId: room.id,
        type: LRC_NAME,
        settings,
        players,
        leaderId: room.leaderId,
        history: [`Game initialized with ${lrcPlayers.length} players`],

        lrcPlayers,
        currentPlayerIndex: 0,
        centerPot: 0,
        phase: "waiting-for-roll",

        currentRoll: null,
        chipMovements: null,
        pendingWildTargets: [],
        wildTargets: [],

        winnerId: null,
        lastChipChallengeActive: false,
        lastChipChallengeRoll: null,
        lastChipChallengeSuccess: null,

        roundNumber: 1,
        roundWinners: [],

        turnStartedAt: new Date().toISOString(),
    };

    return initialState;
}

/**
 * LRC game reducer - handles all game actions.
 */
function reducer(state: LRCState, action: GameAction): LRCState {
    const { type, payload, userId } = action;

    // Create a deep copy to avoid mutation
    const newState: LRCState = JSON.parse(JSON.stringify(state));

    switch (type) {
        case "ROLL_DICE": {
            const currentPlayer =
                newState.lrcPlayers[newState.currentPlayerIndex];

            // Validate it's the current player's turn
            if (userId !== currentPlayer.id) {
                newState.history.push(
                    `[ERROR] ${userId} tried to roll but it's ${currentPlayer.id}'s turn`,
                );
                return state; // Return original state on error
            }

            // Validate phase
            if (newState.phase !== "waiting-for-roll") {
                newState.history.push(
                    `[ERROR] Cannot roll in phase: ${newState.phase}`,
                );
                return state;
            }

            // Validate player has chips
            if (currentPlayer.chips === 0) {
                newState.history.push(
                    `[ERROR] ${currentPlayer.name} has no chips to roll`,
                );
                return state;
            }

            // Roll dice
            const diceCount = getDiceCount(currentPlayer.chips);
            const roll = rollDice(diceCount, newState.settings.wildMode);

            newState.currentRoll = roll;
            newState.history.push(
                `${currentPlayer.name} rolled ${diceCount} dice: ${roll.map((d) => d.face).join(", ")}`,
            );

            // Check for triple wild instant win
            if (newState.settings.wildMode && isTripleWild(roll)) {
                newState.history.push(
                    `${currentPlayer.name} rolled TRIPLE WILD - INSTANT WIN!`,
                );
                newState.phase = "round-over";
                newState.winnerId = currentPlayer.id;

                // Award all chips including center pot
                const totalChips =
                    newState.lrcPlayers.reduce((sum, p) => sum + p.chips, 0) +
                    newState.centerPot;
                newState.lrcPlayers = newState.lrcPlayers.map((p) => ({
                    ...p,
                    chips: p.id === currentPlayer.id ? totalChips : 0,
                }));
                newState.centerPot = 0;

                return newState;
            }

            // Check if there are WILD dice that need target selection
            const wildCount = countWildDice(roll);
            if (wildCount > 0 && newState.settings.wildMode) {
                // Find indices of WILD dice
                const wildIndices = roll
                    .map((die, idx) => (die.face === "WILD" ? idx : -1))
                    .filter((idx) => idx >= 0);

                // Auto-select richest player for all wild targets
                const autoTarget = findPlayerWithMostChips(
                    newState.lrcPlayers,
                    currentPlayer.id,
                );

                if (autoTarget) {
                    // Auto-assign targets to richest player
                    newState.wildTargets = wildIndices.map(() => autoTarget);
                    newState.pendingWildTargets = [];

                    // Calculate movements with auto-selected targets
                    const movements = calculateChipMovements(
                        newState.lrcPlayers,
                        newState.currentPlayerIndex,
                        roll,
                        newState.wildTargets,
                    );
                    newState.chipMovements = movements;
                } else {
                    // No valid targets (everyone else has 0 chips)
                    newState.wildTargets = [];
                    newState.pendingWildTargets = [];
                    const movements = calculateChipMovements(
                        newState.lrcPlayers,
                        newState.currentPlayerIndex,
                        roll,
                        [],
                    );
                    newState.chipMovements = movements;
                }
            } else {
                // Calculate movements for non-wild dice
                const movements = calculateChipMovements(
                    newState.lrcPlayers,
                    newState.currentPlayerIndex,
                    roll,
                    [],
                );
                newState.chipMovements = movements;
            }

            // Transition to showing-results phase with auto-confirm timer
            newState.phase = "showing-results";
            const autoConfirmDelay =
                newState.settings.turnTimeLimit ?? LRC_AUTO_CONFIRM_DELAY;
            newState.autoConfirmAt = new Date(
                Date.now() + autoConfirmDelay * 1000,
            ).toISOString();

            return newState;
        }

        case "CONFIRM_RESULTS": {
            // Anyone can confirm (or auto-confirm after timeout)
            if (newState.phase !== "showing-results") {
                newState.history.push(
                    `[ERROR] No results to confirm in phase: ${newState.phase}`,
                );
                return state;
            }

            // Apply chip movements
            if (newState.chipMovements) {
                const result = applyChipMovements(
                    newState.lrcPlayers,
                    newState.chipMovements,
                );
                newState.lrcPlayers = result.players;
                newState.centerPot += result.centerPotDelta;
            }

            // Clear roll/movement state
            newState.currentRoll = null;
            newState.chipMovements = null;
            newState.wildTargets = [];
            newState.pendingWildTargets = [];
            newState.autoConfirmAt = undefined;

            // Check win condition
            const winner = checkWinCondition(newState.lrcPlayers);

            if (winner) {
                // Check for Last Chip Challenge
                if (
                    newState.settings.lastChipChallenge &&
                    !newState.lastChipChallengeActive
                ) {
                    newState.history.push(
                        `${winner.name} is the last player with chips - LAST CHIP CHALLENGE!`,
                    );
                    newState.phase = "last-chip-challenge";
                    newState.lastChipChallengeActive = true;
                    newState.currentPlayerIndex = newState.lrcPlayers.findIndex(
                        (p) => p.id === winner.id,
                    );
                    newState.turnStartedAt = new Date().toISOString();
                    return newState;
                }

                // Winner determined
                newState.history.push(
                    `${winner.name} wins with ${winner.chips} chips!`,
                );
                newState.phase = "round-over";
                newState.winnerId = winner.id;

                // Award center pot to winner
                const winnerIdx = newState.lrcPlayers.findIndex(
                    (p) => p.id === winner.id,
                );
                if (winnerIdx >= 0) {
                    newState.lrcPlayers[winnerIdx].chips += newState.centerPot;
                    newState.lrcPlayers[winnerIdx].totalWinnings +=
                        newState.centerPot;
                    newState.centerPot = 0;
                }

                return newState;
            }

            // Find next player with chips
            const nextIndex = findNextPlayerIndex(
                newState.lrcPlayers,
                newState.currentPlayerIndex,
            );
            newState.currentPlayerIndex = nextIndex;
            newState.phase = "waiting-for-roll";
            newState.turnStartedAt = new Date().toISOString();

            newState.history.push(
                `Turn passes to ${newState.lrcPlayers[nextIndex].name}`,
            );

            return newState;
        }

        case "CHOOSE_WILD_TARGET": {
            // Handle manual wild target selection (if we add UI for it later)
            if (newState.phase !== "wild-target-selection") {
                return state;
            }

            const { targetPlayerId } = payload as { targetPlayerId: string };
            const validTargets = getValidWildTargets(
                newState.lrcPlayers,
                newState.lrcPlayers[newState.currentPlayerIndex].id,
            );

            if (!validTargets.includes(targetPlayerId)) {
                newState.history.push(
                    `[ERROR] Invalid wild target: ${targetPlayerId}`,
                );
                return state;
            }

            newState.wildTargets.push(targetPlayerId);
            newState.pendingWildTargets.shift();

            if (newState.pendingWildTargets.length === 0) {
                // All targets selected, recalculate movements and transition
                const movements = calculateChipMovements(
                    newState.lrcPlayers,
                    newState.currentPlayerIndex,
                    newState.currentRoll!,
                    newState.wildTargets,
                );
                newState.chipMovements = movements;
                newState.phase = "showing-results";
                newState.autoConfirmAt = new Date(
                    Date.now() +
                        (newState.settings.turnTimeLimit ??
                            LRC_AUTO_CONFIRM_DELAY) *
                            1000,
                ).toISOString();
            }

            return newState;
        }

        case "LAST_CHIP_CHALLENGE_ROLL": {
            if (newState.phase !== "last-chip-challenge") {
                return state;
            }

            const challenger = newState.lrcPlayers[newState.currentPlayerIndex];
            if (userId !== challenger.id) {
                return state;
            }

            // Roll dice for challenge
            const diceCount = getDiceCount(challenger.chips);
            const roll = rollDice(diceCount, false); // No wild mode for challenge

            newState.lastChipChallengeRoll = roll;

            if (isAllDots(roll)) {
                // Challenge succeeded - player wins!
                newState.history.push(
                    `${challenger.name} rolled ALL DOTS in Last Chip Challenge - VICTORY!`,
                );
                newState.lastChipChallengeSuccess = true;
                newState.phase = "round-over";
                newState.winnerId = challenger.id;

                // Award center pot
                challenger.chips += newState.centerPot;
                challenger.totalWinnings += newState.centerPot;
                newState.centerPot = 0;
            } else {
                // Challenge failed - apply chip movements and continue
                newState.history.push(
                    `${challenger.name} failed Last Chip Challenge: ${roll.map((d) => d.face).join(", ")}`,
                );
                newState.lastChipChallengeSuccess = false;
                newState.lastChipChallengeActive = false;

                // Calculate and apply movements from challenge roll
                const movements = calculateChipMovements(
                    newState.lrcPlayers,
                    newState.currentPlayerIndex,
                    roll,
                    [],
                );

                const result = applyChipMovements(
                    newState.lrcPlayers,
                    movements,
                );
                newState.lrcPlayers = result.players;
                newState.centerPot += result.centerPotDelta;

                // Clear challenge state
                newState.lastChipChallengeRoll = null;

                // Check if there's now a different winner
                const winner = checkWinCondition(newState.lrcPlayers);
                if (winner) {
                    newState.history.push(
                        `${winner.name} wins after failed challenge!`,
                    );
                    newState.phase = "round-over";
                    newState.winnerId = winner.id;

                    const winnerIdx = newState.lrcPlayers.findIndex(
                        (p) => p.id === winner.id,
                    );
                    if (winnerIdx >= 0) {
                        newState.lrcPlayers[winnerIdx].chips +=
                            newState.centerPot;
                        newState.centerPot = 0;
                    }
                } else {
                    // Continue game
                    const nextIndex = findNextPlayerIndex(
                        newState.lrcPlayers,
                        newState.currentPlayerIndex,
                    );
                    newState.currentPlayerIndex = nextIndex;
                    newState.phase = "waiting-for-roll";
                    newState.turnStartedAt = new Date().toISOString();
                }
            }

            return newState;
        }

        case "PLAY_AGAIN": {
            if (newState.phase !== "round-over") {
                return state;
            }

            // Only leader can start new round
            if (userId !== newState.leaderId) {
                newState.history.push(
                    `[ERROR] Only the leader can start a new round`,
                );
                return state;
            }

            // Record round winner
            if (newState.winnerId) {
                newState.roundWinners.push(newState.winnerId);
            }

            // Reset for new round
            const shuffledPlayers = shufflePlayers(newState.lrcPlayers);
            newState.lrcPlayers = shuffledPlayers.map((p, idx) => ({
                ...p,
                chips: newState.settings.startingChips,
                seatIndex: idx,
            }));

            newState.currentPlayerIndex = 0;
            newState.centerPot = 0;
            newState.phase = "waiting-for-roll";
            newState.currentRoll = null;
            newState.chipMovements = null;
            newState.pendingWildTargets = [];
            newState.wildTargets = [];
            newState.winnerId = null;
            newState.lastChipChallengeActive = false;
            newState.lastChipChallengeRoll = null;
            newState.lastChipChallengeSuccess = null;
            newState.roundNumber++;
            newState.turnStartedAt = new Date().toISOString();

            newState.history.push(`Round ${newState.roundNumber} started`);

            return newState;
        }

        default:
            newState.history.push(`[WARN] Unknown action type: ${type}`);
            return state;
    }
}

/**
 * Get public game state for broadcasting to all clients.
 * LRC has no hidden information, so this is essentially the full state.
 */
function getState(state: LRCState): LRCData {
    const now = Date.now();

    // Build turn timer info
    let turnTimer: TurnTimerInfo | undefined;
    if (state.turnStartedAt && state.settings.turnTimeLimit) {
        turnTimer = {
            startedAt: new Date(state.turnStartedAt).getTime(),
            duration: state.settings.turnTimeLimit * 1000,
            serverTime: now,
        };
    }

    // Build auto-confirm timer info
    let autoConfirmTimer: TurnTimerInfo | undefined;
    if (state.autoConfirmAt) {
        const autoConfirmDelay =
            state.settings.turnTimeLimit ?? LRC_AUTO_CONFIRM_DELAY;
        autoConfirmTimer = {
            startedAt:
                new Date(state.autoConfirmAt).getTime() -
                autoConfirmDelay * 1000,
            duration: autoConfirmDelay * 1000,
            serverTime: now,
        };
    }

    const clientSettings: LRCClientSettings = {
        winTarget: state.settings.winTarget,
        roundLimit: state.settings.roundLimit,
        turnTimeLimit: state.settings.turnTimeLimit,
        startingChips: state.settings.startingChips,
        chipValue: state.settings.chipValue,
        wildMode: state.settings.wildMode,
        lastChipChallenge: state.settings.lastChipChallenge,
    };

    return {
        id: state.id,
        roomId: state.roomId,
        type: "lrc",
        players: state.players,
        leaderId: state.leaderId,

        // Play order fields for base compatibility
        playOrder: state.lrcPlayers.map((p) => p.id),
        currentTurnIndex: state.currentPlayerIndex,

        lrcPlayers: state.lrcPlayers,
        currentPlayerIndex: state.currentPlayerIndex,
        centerPot: state.centerPot,
        phase: state.phase,
        currentRoll: state.currentRoll,
        chipMovements: state.chipMovements,
        pendingWildTargets: state.pendingWildTargets,
        wildTargets: state.wildTargets,
        winnerId: state.winnerId,
        lastChipChallengeActive: state.lastChipChallengeActive,
        lastChipChallengeRoll: state.lastChipChallengeRoll,
        lastChipChallengeSuccess: state.lastChipChallengeSuccess,
        roundNumber: state.roundNumber,
        roundWinners: state.roundWinners,
        turnTimer,
        autoConfirmTimer,
        settings: clientSettings,
    };
}

/**
 * Get player-specific state.
 * LRC has no hidden information, but we add convenience fields.
 */
function getPlayerState(state: LRCState, odusId: string): LRCPlayerData {
    const playerData = state.lrcPlayers.find((p) => p.id === odusId);
    const currentPlayer = state.lrcPlayers[state.currentPlayerIndex];
    const isMyTurn = currentPlayer?.id === odusId;

    const myChips = playerData?.chips ?? 0;
    const netChips = myChips - state.settings.startingChips;
    const netWinningsCents = Math.round(
        netChips * state.settings.chipValue * 100,
    );

    return {
        odusId,
        isMyTurn,
        myChips,
        netWinningsCents,
        localOrdering: state.lrcPlayers.map((p) => p.id),
    };
}

/**
 * Check if enough players are connected to continue the game.
 */
function checkMinimumPlayersConnected(state: LRCState): boolean {
    const connectedPlayers = state.lrcPlayers.filter((p) => p.isConnected);
    return connectedPlayers.length >= LRC_MIN_PLAYERS;
}

/**
 * Handle player reconnection.
 */
function handleReconnect(state: LRCState, odusId: string): LRCState {
    const playerIdx = state.lrcPlayers.findIndex((p) => p.id === odusId);
    if (playerIdx >= 0) {
        const newState = { ...state, lrcPlayers: [...state.lrcPlayers] };
        newState.lrcPlayers[playerIdx] = {
            ...newState.lrcPlayers[playerIdx],
            isConnected: true,
        };
        newState.history = [
            ...newState.history,
            `${newState.lrcPlayers[playerIdx].name} reconnected`,
        ];
        return newState;
    }
    return state;
}

/**
 * Handle player disconnection.
 */
function handleDisconnect(state: LRCState, odusId: string): LRCState {
    const playerIdx = state.lrcPlayers.findIndex((p) => p.id === odusId);
    if (playerIdx >= 0) {
        const newState = { ...state, lrcPlayers: [...state.lrcPlayers] };
        newState.lrcPlayers[playerIdx] = {
            ...newState.lrcPlayers[playerIdx],
            isConnected: false,
        };
        newState.history = [
            ...newState.history,
            `${newState.lrcPlayers[playerIdx].name} disconnected`,
        ];
        return newState;
    }
    return state;
}

export const lrcModule: GameModule = {
    metadata: LRC_METADATA,
    init,
    reducer,
    getState,
    getPlayerState,
    checkMinimumPlayers: checkMinimumPlayersConnected,
    handlePlayerReconnect: handleReconnect,
    handlePlayerDisconnect: handleDisconnect,
};
