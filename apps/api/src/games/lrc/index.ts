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
import { produce } from "immer";
import { shuffle } from "../shared";
import {
    rollDice,
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

    // Shuffle players for random turn order using shared shuffle
    const shuffledUsers = shuffle(room.users);

    // Create LRC players with initial chips
    const lrcPlayers: LRCPlayer[] = shuffledUsers.map((user, index) => ({
        id: user.id,
        name: user.name,
        chips: settings.startingChips,
        netChipsThisRound: 0,
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
 * LRC game reducer - handles all game actions using Immer for immutable updates.
 *
 * State Machine:
 * - waiting-for-roll: Current player must roll dice
 *   → ROLL_DICE → showing-results (or round-over for triple wild)
 *
 * - showing-results: Display roll results and chip movements
 *   → CONFIRM_RESULTS → waiting-for-roll (next player) | last-chip-challenge | round-over
 *
 * - wild-target-selection: (Currently unused - auto-selects richest player)
 *   → CHOOSE_WILD_TARGET → showing-results
 *
 * - last-chip-challenge: Winner must roll all dots to win
 *   → LAST_CHIP_CHALLENGE_ROLL → round-over (success) | waiting-for-roll (failure)
 *
 * - round-over: Display winner, option to play again
 *   → PLAY_AGAIN → waiting-for-roll (new round)
 *
 * @param state - Current LRC game state
 * @param action - Game action to process
 * @returns Updated game state
 */
function reducer(state: LRCState, action: GameAction): LRCState {
    const { type, payload, userId } = action;

    return produce(state, (draft) => {
        switch (type) {
            case "ROLL_DICE": {
                const currentPlayer =
                    draft.lrcPlayers[draft.currentPlayerIndex];

                // Validate it's the current player's turn
                if (userId !== currentPlayer.id) {
                    draft.history.push(
                        `[ERROR] ${userId} tried to roll but it's ${currentPlayer.id}'s turn`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                // Validate phase
                if (draft.phase !== "waiting-for-roll") {
                    draft.history.push(
                        `[ERROR] Cannot roll in phase: ${draft.phase}`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                // Validate player has chips
                if (currentPlayer.chips === 0) {
                    draft.history.push(
                        `[ERROR] ${currentPlayer.name} has no chips to roll`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                // Roll dice
                const diceCount = getDiceCount(currentPlayer.chips);
                const roll = rollDice(diceCount, draft.settings.wildMode);

                draft.currentRoll = roll;
                draft.history.push(
                    `${currentPlayer.name} rolled ${diceCount} dice: ${roll.map((d) => d.face).join(", ")}`,
                );

                // Check for triple wild instant win
                if (draft.settings.wildMode && isTripleWild(roll)) {
                    draft.history.push(
                        `${currentPlayer.name} rolled TRIPLE WILD - INSTANT WIN!`,
                    );
                    draft.phase = "round-over";
                    draft.winnerId = currentPlayer.id;

                    // Award all chips including center pot
                    const totalChips =
                        draft.lrcPlayers.reduce((sum, p) => sum + p.chips, 0) +
                        draft.centerPot;

                    for (const player of draft.lrcPlayers) {
                        if (player.id === currentPlayer.id) {
                            player.netChipsThisRound +=
                                totalChips - player.chips;
                            player.chips = totalChips;
                        } else {
                            player.netChipsThisRound -= player.chips;
                            player.chips = 0;
                        }
                    }
                    draft.centerPot = 0;
                    return;
                }

                // Check if there are WILD dice that need target selection
                const wildCount = countWildDice(roll);
                if (wildCount > 0 && draft.settings.wildMode) {
                    // Find indices of WILD dice
                    const wildIndices = roll
                        .map((die, idx) => (die.face === "WILD" ? idx : -1))
                        .filter((idx) => idx >= 0);

                    // Auto-select richest player for all wild targets
                    const autoTarget = findPlayerWithMostChips(
                        draft.lrcPlayers,
                        currentPlayer.id,
                    );

                    if (autoTarget) {
                        // Find the target player's name for logging
                        const targetPlayer = draft.lrcPlayers.find(
                            (p) => p.id === autoTarget,
                        );
                        const targetName = targetPlayer?.name ?? autoTarget;

                        // Auto-assign targets to richest player
                        draft.wildTargets = wildIndices.map(() => autoTarget);
                        draft.pendingWildTargets = [];
                        draft.history.push(
                            `WILD dice auto-targeted ${targetName} (${wildCount} chip${wildCount > 1 ? "s" : ""})`,
                        );

                        // Calculate movements with auto-selected targets
                        const movements = calculateChipMovements(
                            draft.lrcPlayers,
                            draft.currentPlayerIndex,
                            roll,
                            draft.wildTargets,
                        );
                        draft.chipMovements = movements;
                    } else {
                        // No valid targets (everyone else has 0 chips)
                        draft.wildTargets = [];
                        draft.pendingWildTargets = [];
                        draft.history.push(
                            `WILD dice had no valid targets (all other players have 0 chips)`,
                        );
                        const movements = calculateChipMovements(
                            draft.lrcPlayers,
                            draft.currentPlayerIndex,
                            roll,
                            [],
                        );
                        draft.chipMovements = movements;
                    }
                } else {
                    // Calculate movements for non-wild dice
                    const movements = calculateChipMovements(
                        draft.lrcPlayers,
                        draft.currentPlayerIndex,
                        roll,
                        [],
                    );
                    draft.chipMovements = movements;
                }

                // Transition to showing-results phase with auto-confirm timer
                draft.phase = "showing-results";
                const autoConfirmDelay =
                    draft.settings.turnTimeLimit ?? LRC_AUTO_CONFIRM_DELAY;
                draft.autoConfirmAt = new Date(
                    Date.now() + autoConfirmDelay * 1000,
                ).toISOString();
                return;
            }

            case "CONFIRM_RESULTS": {
                // Anyone can confirm (or auto-confirm after timeout)
                if (draft.phase !== "showing-results") {
                    draft.history.push(
                        `[ERROR] No results to confirm in phase: ${draft.phase}`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                // Apply chip movements and update netChipsThisRound
                if (draft.chipMovements) {
                    const result = applyChipMovements(
                        draft.lrcPlayers,
                        draft.chipMovements,
                    );

                    // Update netChipsThisRound for all affected players
                    for (let i = 0; i < draft.lrcPlayers.length; i++) {
                        const oldChips = draft.lrcPlayers[i].chips;
                        const newChips = result.players[i].chips;
                        draft.lrcPlayers[i].chips = newChips;
                        draft.lrcPlayers[i].netChipsThisRound +=
                            newChips - oldChips;
                    }
                    draft.centerPot += result.centerPotDelta;
                }

                // Clear roll/movement state
                draft.currentRoll = null;
                draft.chipMovements = null;
                draft.wildTargets = [];
                draft.pendingWildTargets = [];
                draft.autoConfirmAt = undefined;

                // Check win condition
                const winner = checkWinCondition(draft.lrcPlayers);

                if (winner) {
                    // Check for Last Chip Challenge
                    if (
                        draft.settings.lastChipChallenge &&
                        !draft.lastChipChallengeActive
                    ) {
                        draft.history.push(
                            `${winner.name} is the last player with chips - LAST CHIP CHALLENGE!`,
                        );
                        draft.phase = "last-chip-challenge";
                        draft.lastChipChallengeActive = true;
                        draft.currentPlayerIndex = draft.lrcPlayers.findIndex(
                            (p) => p.id === winner.id,
                        );
                        draft.turnStartedAt = new Date().toISOString();
                        return;
                    }

                    // Winner determined
                    draft.history.push(
                        `${winner.name} wins with ${winner.chips} chips!`,
                    );
                    draft.phase = "round-over";
                    draft.winnerId = winner.id;

                    // Award center pot to winner and update net chips
                    const winnerIdx = draft.lrcPlayers.findIndex(
                        (p) => p.id === winner.id,
                    );
                    if (winnerIdx >= 0) {
                        draft.lrcPlayers[winnerIdx].chips += draft.centerPot;
                        draft.lrcPlayers[winnerIdx].netChipsThisRound +=
                            draft.centerPot;
                        draft.centerPot = 0;
                    }
                    return;
                }

                // Find next player with chips
                const nextIndex = findNextPlayerIndex(
                    draft.lrcPlayers,
                    draft.currentPlayerIndex,
                );

                // Defensive check - should never happen if game logic is correct
                if (nextIndex < 0 || nextIndex >= draft.lrcPlayers.length) {
                    draft.history.push(
                        `[ERROR] Could not find next player with chips`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                draft.currentPlayerIndex = nextIndex;
                draft.phase = "waiting-for-roll";
                draft.turnStartedAt = new Date().toISOString();

                draft.history.push(
                    `Turn passes to ${draft.lrcPlayers[nextIndex].name}`,
                );
                return;
            }

            case "CHOOSE_WILD_TARGET": {
                // Handle manual wild target selection (if we add UI for it later)
                if (draft.phase !== "wild-target-selection") {
                    draft.history.push(
                        `[ERROR] Cannot choose wild target in phase: ${draft.phase}`,
                    );
                    return; // Exit producer without changes
                }

                // Validate payload
                if (!payload || typeof payload !== "object") {
                    draft.history.push(
                        `[ERROR] Invalid payload for CHOOSE_WILD_TARGET`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                const { targetPlayerId } = payload as {
                    targetPlayerId: string;
                };

                // Validate targetPlayerId exists and is a string
                if (!targetPlayerId || typeof targetPlayerId !== "string") {
                    draft.history.push(
                        `[ERROR] Missing or invalid targetPlayerId`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                const validTargets = getValidWildTargets(
                    draft.lrcPlayers,
                    draft.lrcPlayers[draft.currentPlayerIndex].id,
                );

                if (!validTargets.includes(targetPlayerId)) {
                    draft.history.push(
                        `[ERROR] Invalid wild target: ${targetPlayerId}`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                draft.wildTargets.push(targetPlayerId);
                draft.pendingWildTargets.shift();

                if (draft.pendingWildTargets.length === 0) {
                    // All targets selected, recalculate movements and transition
                    const movements = calculateChipMovements(
                        draft.lrcPlayers,
                        draft.currentPlayerIndex,
                        draft.currentRoll!,
                        draft.wildTargets,
                    );
                    draft.chipMovements = movements;
                    draft.phase = "showing-results";
                    draft.autoConfirmAt = new Date(
                        Date.now() +
                            (draft.settings.turnTimeLimit ??
                                LRC_AUTO_CONFIRM_DELAY) *
                                1000,
                    ).toISOString();
                }
                return;
            }

            case "LAST_CHIP_CHALLENGE_ROLL": {
                if (draft.phase !== "last-chip-challenge") {
                    draft.history.push(
                        `[ERROR] Cannot do challenge roll in phase: ${draft.phase}`,
                    );
                    return; // Exit producer without changes
                }

                const challenger = draft.lrcPlayers[draft.currentPlayerIndex];
                if (userId !== challenger.id) {
                    draft.history.push(
                        `[ERROR] ${userId} tried to roll challenge but it's ${challenger.id}'s turn`,
                    );
                    return; // Exit producer without changes
                }

                // Roll dice for challenge
                const challengeDiceCount = getDiceCount(challenger.chips);
                const challengeRoll = rollDice(challengeDiceCount, false); // No wild mode for challenge

                draft.lastChipChallengeRoll = challengeRoll;

                if (isAllDots(challengeRoll)) {
                    // Challenge succeeded - player wins!
                    draft.history.push(
                        `${challenger.name} rolled ALL DOTS in Last Chip Challenge - VICTORY!`,
                    );
                    draft.lastChipChallengeSuccess = true;
                    draft.phase = "round-over";
                    draft.winnerId = challenger.id;

                    // Award center pot and update net chips
                    challenger.chips += draft.centerPot;
                    challenger.netChipsThisRound += draft.centerPot;
                    draft.centerPot = 0;
                } else {
                    // Challenge failed - apply chip movements and continue
                    draft.history.push(
                        `${challenger.name} failed Last Chip Challenge: ${challengeRoll.map((d) => d.face).join(", ")}`,
                    );
                    draft.lastChipChallengeSuccess = false;
                    draft.lastChipChallengeActive = false;

                    // Calculate and apply movements from challenge roll
                    const challengeMovements = calculateChipMovements(
                        draft.lrcPlayers,
                        draft.currentPlayerIndex,
                        challengeRoll,
                        [],
                    );

                    const challengeResult = applyChipMovements(
                        draft.lrcPlayers,
                        challengeMovements,
                    );

                    // Update chips and net tracking for all players
                    for (let i = 0; i < draft.lrcPlayers.length; i++) {
                        const oldChips = draft.lrcPlayers[i].chips;
                        const newChips = challengeResult.players[i].chips;
                        draft.lrcPlayers[i].chips = newChips;
                        draft.lrcPlayers[i].netChipsThisRound +=
                            newChips - oldChips;
                    }
                    draft.centerPot += challengeResult.centerPotDelta;

                    // Clear challenge state
                    draft.lastChipChallengeRoll = null;

                    // Check if there's now a different winner
                    const challengeWinner = checkWinCondition(draft.lrcPlayers);
                    if (challengeWinner) {
                        draft.history.push(
                            `${challengeWinner.name} wins after failed challenge!`,
                        );
                        draft.phase = "round-over";
                        draft.winnerId = challengeWinner.id;

                        const challengeWinnerIdx = draft.lrcPlayers.findIndex(
                            (p) => p.id === challengeWinner.id,
                        );
                        if (challengeWinnerIdx >= 0) {
                            draft.lrcPlayers[challengeWinnerIdx].chips +=
                                draft.centerPot;
                            draft.lrcPlayers[
                                challengeWinnerIdx
                            ].netChipsThisRound += draft.centerPot;
                            draft.centerPot = 0;
                        }
                    } else {
                        // Continue game
                        const nextChallengeIndex = findNextPlayerIndex(
                            draft.lrcPlayers,
                            draft.currentPlayerIndex,
                        );
                        draft.currentPlayerIndex = nextChallengeIndex;
                        draft.phase = "waiting-for-roll";
                        draft.turnStartedAt = new Date().toISOString();
                    }
                }
                return;
            }

            case "PLAY_AGAIN": {
                if (draft.phase !== "round-over") {
                    draft.history.push(
                        `[ERROR] Cannot play again in phase: ${draft.phase}`,
                    );
                    return; // Exit producer without changes
                }

                // Only leader can start new round
                if (userId !== draft.leaderId) {
                    draft.history.push(
                        `[ERROR] Only the leader can start a new round`,
                    );
                    return; // Exit producer without changes (keeps history entry)
                }

                // Record round winner
                if (draft.winnerId) {
                    draft.roundWinners.push(draft.winnerId);
                }

                // Reset for new round - shuffle and reset all player state
                const shuffledPlayers = shuffle([...draft.lrcPlayers]);
                draft.lrcPlayers = shuffledPlayers.map((p, idx) => ({
                    ...p,
                    chips: draft.settings.startingChips,
                    netChipsThisRound: 0, // Reset net tracking for new round
                    seatIndex: idx,
                }));

                draft.currentPlayerIndex = 0;
                draft.centerPot = 0;
                draft.phase = "waiting-for-roll";
                draft.currentRoll = null;
                draft.chipMovements = null;
                draft.pendingWildTargets = [];
                draft.wildTargets = [];
                draft.winnerId = null;
                draft.lastChipChallengeActive = false;
                draft.lastChipChallengeRoll = null;
                draft.lastChipChallengeSuccess = null;
                draft.roundNumber++;
                draft.turnStartedAt = new Date().toISOString();

                draft.history.push(`Round ${draft.roundNumber} started`);
                return;
            }

            default:
                draft.history.push(`[WARN] Unknown action type: ${type}`);
                return; // Exit producer without changes (keeps history entry)
        }
    });
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
    // Use tracked net chips (more accurate than recalculating)
    const netChips = playerData?.netChipsThisRound ?? 0;
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
 * Uses state.players for connection status (single source of truth).
 */
function checkMinimumPlayersConnected(state: LRCState): boolean {
    const connectedPlayers = state.lrcPlayers.filter(
        (p) => state.players[p.id]?.isConnected !== false,
    );
    return connectedPlayers.length >= LRC_MIN_PLAYERS;
}

/**
 * Handle player reconnection.
 * Connection status is managed in state.players by GameManager.
 */
function handleReconnect(state: LRCState, odusId: string): LRCState {
    const player = state.lrcPlayers.find((p) => p.id === odusId);
    if (player) {
        return produce(state, (draft) => {
            draft.history.push(`${player.name} reconnected`);
        });
    }
    return state;
}

/**
 * Handle player disconnection.
 * If the disconnected player is the current player, auto-skip their turn.
 * Connection status is managed in state.players by GameManager.
 */
function handleDisconnect(state: LRCState, odusId: string): LRCState {
    const player = state.lrcPlayers.find((p) => p.id === odusId);
    if (!player) {
        return state;
    }

    return produce(state, (draft) => {
        draft.history.push(`${player.name} disconnected`);

        const currentPlayer = draft.lrcPlayers[draft.currentPlayerIndex];

        // If the disconnected player is the current player and it's their turn to act
        if (currentPlayer?.id === odusId) {
            // Handle based on current phase
            switch (draft.phase) {
                case "waiting-for-roll": {
                    // Auto-roll for disconnected player
                    const diceCount = getDiceCount(currentPlayer.chips);
                    if (diceCount > 0) {
                        const roll = rollDice(
                            diceCount,
                            draft.settings.wildMode,
                        );
                        draft.currentRoll = roll;
                        draft.history.push(
                            `${player.name} (disconnected) auto-rolled: ${roll.map((d) => d.face).join(", ")}`,
                        );

                        // Calculate movements (auto-target for wild)
                        const wildCount = countWildDice(roll);
                        if (wildCount > 0 && draft.settings.wildMode) {
                            const autoTarget = findPlayerWithMostChips(
                                draft.lrcPlayers,
                                currentPlayer.id,
                            );
                            draft.wildTargets = autoTarget
                                ? roll
                                      .filter((d) => d.face === "WILD")
                                      .map(() => autoTarget)
                                : [];
                        }

                        draft.chipMovements = calculateChipMovements(
                            draft.lrcPlayers,
                            draft.currentPlayerIndex,
                            roll,
                            draft.wildTargets,
                        );
                        draft.phase = "showing-results";
                        draft.autoConfirmAt = new Date(
                            Date.now() + LRC_AUTO_CONFIRM_DELAY * 1000,
                        ).toISOString();
                    }
                    break;
                }

                case "last-chip-challenge": {
                    // Auto-roll the challenge
                    const challengeDiceCount = getDiceCount(
                        currentPlayer.chips,
                    );
                    const challengeRoll = rollDice(challengeDiceCount, false);
                    draft.lastChipChallengeRoll = challengeRoll;
                    draft.history.push(
                        `${player.name} (disconnected) auto-rolled challenge: ${challengeRoll.map((d) => d.face).join(", ")}`,
                    );

                    // Challenge always fails when auto-rolled (no dots likely)
                    if (isAllDots(challengeRoll)) {
                        draft.lastChipChallengeSuccess = true;
                        draft.phase = "round-over";
                        draft.winnerId = currentPlayer.id;
                        currentPlayer.chips += draft.centerPot;
                        currentPlayer.netChipsThisRound += draft.centerPot;
                        draft.centerPot = 0;
                    } else {
                        draft.lastChipChallengeSuccess = false;
                        draft.lastChipChallengeActive = false;

                        const challengeMovements = calculateChipMovements(
                            draft.lrcPlayers,
                            draft.currentPlayerIndex,
                            challengeRoll,
                            [],
                        );
                        const challengeResult = applyChipMovements(
                            draft.lrcPlayers,
                            challengeMovements,
                        );

                        for (let i = 0; i < draft.lrcPlayers.length; i++) {
                            const oldChips = draft.lrcPlayers[i].chips;
                            const newChips = challengeResult.players[i].chips;
                            draft.lrcPlayers[i].chips = newChips;
                            draft.lrcPlayers[i].netChipsThisRound +=
                                newChips - oldChips;
                        }
                        draft.centerPot += challengeResult.centerPotDelta;
                        draft.lastChipChallengeRoll = null;

                        const winner = checkWinCondition(draft.lrcPlayers);
                        if (winner) {
                            draft.phase = "round-over";
                            draft.winnerId = winner.id;
                            const winnerIdx = draft.lrcPlayers.findIndex(
                                (p) => p.id === winner.id,
                            );
                            if (winnerIdx >= 0) {
                                draft.lrcPlayers[winnerIdx].chips +=
                                    draft.centerPot;
                                draft.lrcPlayers[winnerIdx].netChipsThisRound +=
                                    draft.centerPot;
                                draft.centerPot = 0;
                            }
                        } else {
                            const nextIdx = findNextPlayerIndex(
                                draft.lrcPlayers,
                                draft.currentPlayerIndex,
                            );
                            draft.currentPlayerIndex = nextIdx;
                            draft.phase = "waiting-for-roll";
                            draft.turnStartedAt = new Date().toISOString();
                        }
                    }
                    break;
                }

                // For other phases, the auto-confirm timer will handle it
                default:
                    break;
            }
        }
    });
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
