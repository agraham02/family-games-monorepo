// src/games/lrc/index.ts
// Left Right Center (LRC) game module

import {
    Room,
    User,
    LRCSettings,
    DEFAULT_LRC_SETTINGS,
    LRC_SETTINGS_DEFINITIONS,
    LRCDiceFace,
    LRCPhase,
    LRCRoll,
    LRC_MIN_PLAYERS,
    LRC_MAX_PLAYERS,
} from "@family-games/shared";
import { GameModule, GameState, GameAction } from "../../services/GameManager";
import { v4 as uuidv4 } from "uuid";
import {
    handlePlayerReconnect,
    handlePlayerDisconnect,
    checkAllPlayersConnected,
} from "../shared";

const LRC_NAME = "lrc";
const LRC_DISPLAY_NAME = "Left Right Center";

const LRC_METADATA = {
    type: LRC_NAME,
    displayName: LRC_DISPLAY_NAME,
    description:
        "A fun dice game where you pass chips left, right, or to the center. Last player with chips wins the pot!",
    requiresTeams: false,
    minPlayers: LRC_MIN_PLAYERS,
    maxPlayers: LRC_MAX_PLAYERS,
    settingsDefinitions: LRC_SETTINGS_DEFINITIONS,
    defaultSettings: DEFAULT_LRC_SETTINGS,
};

/**
 * The faces of an LRC die and their probabilities.
 * Standard LRC die: L, R, C, *, *, * (3 dots / keeps out of 6 faces)
 */
const LRC_DIE_FACES: LRCDiceFace[] = ["L", "R", "C", "*", "*", "*"];

export interface LRCState extends GameState {
    playOrder: string[];
    currentTurnIndex: number;

    chips: Record<string, number>;
    centerPot: number;

    phase: LRCPhase;
    round: number;

    lastRoll?: LRCRoll;
    winnerId?: string;

    history: string[];
    settings: LRCSettings;
}

function init(room: Room, customSettings?: Partial<LRCSettings>): LRCState {
    const players: Record<string, User> = Object.fromEntries(
        room.users.map((user) => [user.id, user])
    );

    const playOrder = room.users.map((user) => user.id);

    const settings: LRCSettings = {
        ...DEFAULT_LRC_SETTINGS,
        ...customSettings,
    };

    // Give each player their starting chips
    const chips: Record<string, number> = {};
    playOrder.forEach((playerId) => {
        chips[playerId] = settings.startingChips;
    });

    return {
        id: uuidv4(),
        roomId: room.id,
        type: LRC_NAME,

        players,
        leaderId: room.leaderId ?? playOrder[0],
        playOrder,
        currentTurnIndex: 0,

        chips,
        centerPot: 0,

        phase: "rolling",
        round: 1,

        settings,
        history: [],
    };
}

function reducer(state: LRCState, action: GameAction): LRCState {
    logHistory(state, action);

    switch (action.type) {
        case "ROLL_DICE":
            return handleRollDice(state, action.userId);
        default:
            return state;
    }
}

function getState(state: LRCState): Partial<LRCState> {
    // LRC has no hidden state - everything is public
    return { ...state };
}

function getPlayerState(
    state: LRCState,
    playerId: string
): Partial<LRCState> & { localOrdering?: string[] } {
    const idx = state.playOrder.indexOf(playerId);
    const localOrdering = [
        ...state.playOrder.slice(idx),
        ...state.playOrder.slice(0, idx),
    ];

    return { localOrdering };
}

export const lrcModule: GameModule = {
    init,
    reducer,
    getState,
    getPlayerState,
    checkMinimumPlayers,
    handlePlayerReconnect,
    handlePlayerDisconnect,
    metadata: LRC_METADATA,
};

/**
 * Roll a single LRC die.
 */
function rollDie(): LRCDiceFace {
    return LRC_DIE_FACES[Math.floor(Math.random() * LRC_DIE_FACES.length)];
}

/**
 * Handle a player rolling the dice on their turn.
 */
function handleRollDice(state: LRCState, playerId: string): LRCState {
    // Validate phase
    if (state.phase !== "rolling") {
        throw new Error("Dice can only be rolled during the rolling phase.");
    }

    // Validate turn
    const currentPlayer = state.playOrder[state.currentTurnIndex];
    if (currentPlayer !== playerId) {
        throw new Error("Not your turn to roll.");
    }

    // Check if player is connected
    if (state.players[playerId]?.isConnected === false) {
        throw new Error("Player is disconnected and cannot roll.");
    }

    const playerChips = state.chips[playerId] ?? 0;

    // Number of dice to roll: min(chips, 3)
    const numDice = Math.min(playerChips, 3);

    // Roll the dice
    const dice: LRCDiceFace[] = [];
    for (let i = 0; i < numDice; i++) {
        dice.push(rollDie());
    }

    // Tally results
    let lefts = 0;
    let rights = 0;
    let centers = 0;
    let dots = 0;
    for (const face of dice) {
        if (face === "L") lefts++;
        else if (face === "R") rights++;
        else if (face === "C") centers++;
        else dots++;
    }

    // Apply chip movements
    const newChips = { ...state.chips };
    let newCenterPot = state.centerPot;

    // Remove chips from the roller
    newChips[playerId] = (newChips[playerId] ?? 0) - lefts - rights - centers;

    // Pass chips to the left (previous player in order)
    if (lefts > 0) {
        const leftIdx =
            (state.playOrder.indexOf(playerId) - 1 + state.playOrder.length) %
            state.playOrder.length;
        const leftPlayerId = state.playOrder[leftIdx];
        newChips[leftPlayerId] = (newChips[leftPlayerId] ?? 0) + lefts;
    }

    // Pass chips to the right (next player in order)
    if (rights > 0) {
        const rightIdx =
            (state.playOrder.indexOf(playerId) + 1) % state.playOrder.length;
        const rightPlayerId = state.playOrder[rightIdx];
        newChips[rightPlayerId] = (newChips[rightPlayerId] ?? 0) + rights;
    }

    // Add chips to center
    newCenterPot += centers;

    const lastRoll: LRCRoll = {
        playerId,
        dice,
        lefts,
        rights,
        centers,
        dots,
    };

    // Check win condition: only 1 player has chips
    const playersWithChips = state.playOrder.filter(
        (pid) => (newChips[pid] ?? 0) > 0
    );

    if (playersWithChips.length === 1) {
        const winnerId = playersWithChips[0];
        // Winner gets the center pot too (traditional rule)
        newChips[winnerId] = (newChips[winnerId] ?? 0) + newCenterPot;
        newCenterPot = 0;

        return {
            ...state,
            chips: newChips,
            centerPot: newCenterPot,
            lastRoll,
            phase: "finished",
            winnerId,
        };
    }

    // Advance to next turn, skipping players with 0 chips
    const nextTurnIndex = findNextTurnIndex(
        state.playOrder,
        state.currentTurnIndex,
        newChips
    );

    return {
        ...state,
        chips: newChips,
        centerPot: newCenterPot,
        currentTurnIndex: nextTurnIndex,
        round: state.round + 1,
        lastRoll,
    };
}

/**
 * Find the index of the next player who still has chips (or all players if none).
 * In LRC, players with 0 chips skip their turn unless all players have 0 chips (which shouldn't happen).
 */
function findNextTurnIndex(
    playOrder: string[],
    currentIndex: number,
    chips: Record<string, number>
): number {
    const numPlayers = playOrder.length;
    for (let i = 1; i <= numPlayers; i++) {
        const nextIdx = (currentIndex + i) % numPlayers;
        const nextPlayerId = playOrder[nextIdx];
        if ((chips[nextPlayerId] ?? 0) > 0) {
            return nextIdx;
        }
    }
    // Fallback: return next index (shouldn't happen if win condition is checked first)
    return (currentIndex + 1) % numPlayers;
}

function logHistory(state: LRCState, action: GameAction): void {
    state.history.push(
        `Action: ${action.type}, Player: ${action.userId}, Payload: ${JSON.stringify(action.payload)}`
    );
}

/**
 * Check if the game has minimum players connected to continue.
 */
function checkMinimumPlayers(state: LRCState): boolean {
    return checkAllPlayersConnected(state, LRC_MIN_PLAYERS);
}
