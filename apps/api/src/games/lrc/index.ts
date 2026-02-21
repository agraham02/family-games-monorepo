// src/games/lrc/index.ts
// Left-Right-Center (LRC) game module

import {
    Room,
    User,
    LRCSettings,
    DEFAULT_LRC_SETTINGS,
    LRC_SETTINGS_DEFINITIONS,
    LRCDiceFace,
    LRC_DIE_FACES,
} from "@family-games/shared";
import { GameModule, GameState, GameAction } from "../../services/GameManager";
import { v4 as uuidv4 } from "uuid";
import { omitFields } from "../../utils/omitFields";
import {
    handlePlayerReconnect,
    handlePlayerDisconnect,
} from "../shared";

const LRC_NAME = "lrc";
const LRC_DISPLAY_NAME = "Left Right Center";
const LRC_MIN_PLAYERS = 3;
const LRC_MAX_PLAYERS = 8;

const LRC_METADATA = {
    type: LRC_NAME,
    displayName: LRC_DISPLAY_NAME,
    description:
        "Roll the dice and pass chips left, right, or to the center. Last player with chips wins the pot!",
    requiresTeams: false,
    minPlayers: LRC_MIN_PLAYERS,
    maxPlayers: LRC_MAX_PLAYERS,
    settingsDefinitions: LRC_SETTINGS_DEFINITIONS,
    defaultSettings: DEFAULT_LRC_SETTINGS,
};

export interface LRCState extends GameState {
    playOrder: string[];
    currentTurnIndex: number;
    chips: Record<string, number>;
    pot: number;
    phase: "playing" | "finished";
    lastRoll?: {
        playerId: string;
        dice: LRCDiceFace[];
    };
    gameWinner?: string;
    settings: LRCSettings;
    history: string[];
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

    // Each player starts with startingChips chips
    const chips: Record<string, number> = {};
    playOrder.forEach((id) => {
        chips[id] = settings.startingChips;
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
        pot: 0,
        phase: "playing",
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
    return omitFields(state, []);
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
    handlePlayerReconnect,
    handlePlayerDisconnect,
    metadata: LRC_METADATA,
};

// ============================================================================
// Dice Rolling
// ============================================================================

/**
 * Roll a single LRC die. Returns one of the 6 faces (3 dot, 1 L, 1 R, 1 C).
 */
function rollDie(): LRCDiceFace {
    const idx = Math.floor(Math.random() * LRC_DIE_FACES.length);
    return LRC_DIE_FACES[idx];
}

/**
 * Roll dice for a player based on their chip count (max 3 dice).
 */
function rollDice(chipCount: number): LRCDiceFace[] {
    const numDice = Math.min(chipCount, 3);
    const dice: LRCDiceFace[] = [];
    for (let i = 0; i < numDice; i++) {
        dice.push(rollDie());
    }
    return dice;
}

// ============================================================================
// Game Actions
// ============================================================================

function handleRollDice(state: LRCState, playerId: string): LRCState {
    if (state.phase !== "playing") {
        throw new Error("Game is not in progress.");
    }

    const currentPlayerId = state.playOrder[state.currentTurnIndex];
    if (currentPlayerId !== playerId) {
        throw new Error("Not your turn to roll.");
    }

    if (state.players[playerId]?.isConnected === false) {
        throw new Error("Player is disconnected and cannot roll.");
    }

    const playerChips = state.chips[playerId] ?? 0;
    const dice = rollDice(playerChips);

    // Apply dice results
    const newChips = { ...state.chips };
    let newPot = state.pot;

    const playerCount = state.playOrder.length;
    const playerIndex = state.playOrder.indexOf(playerId);

    for (const face of dice) {
        switch (face) {
            case "L": {
                // Pass chip to player on the left (previous in order, wrapping)
                const leftIdx = (playerIndex - 1 + playerCount) % playerCount;
                const leftId = state.playOrder[leftIdx];
                newChips[playerId] = (newChips[playerId] ?? 0) - 1;
                newChips[leftId] = (newChips[leftId] ?? 0) + 1;
                break;
            }
            case "R": {
                // Pass chip to player on the right (next in order, wrapping)
                const rightIdx = (playerIndex + 1) % playerCount;
                const rightId = state.playOrder[rightIdx];
                newChips[playerId] = (newChips[playerId] ?? 0) - 1;
                newChips[rightId] = (newChips[rightId] ?? 0) + 1;
                break;
            }
            case "C": {
                // Put chip in center pot
                newChips[playerId] = (newChips[playerId] ?? 0) - 1;
                newPot += 1;
                break;
            }
            case "dot":
                // Keep chip - no change
                break;
        }
    }

    const lastRoll = { playerId, dice };

    // Check win condition: only one player has chips
    const playersWithChips = state.playOrder.filter(
        (id) => (newChips[id] ?? 0) > 0
    );

    if (playersWithChips.length === 1) {
        const winner = playersWithChips[0];
        // Winner gets the pot
        newChips[winner] = (newChips[winner] ?? 0) + newPot;
        return {
            ...state,
            chips: newChips,
            pot: 0,
            lastRoll,
            gameWinner: winner,
            phase: "finished",
        };
    }

    // Advance to next player who has chips (skip 0-chip players)
    const nextTurnIndex = findNextActivePlayer(
        state.playOrder,
        state.currentTurnIndex,
        newChips
    );

    return {
        ...state,
        chips: newChips,
        pot: newPot,
        lastRoll,
        currentTurnIndex: nextTurnIndex,
    };
}

/**
 * Find the next player in the order who has chips (skipping 0-chip players).
 * Always advances at least one position.
 */
function findNextActivePlayer(
    playOrder: string[],
    currentIndex: number,
    chips: Record<string, number>
): number {
    const count = playOrder.length;
    let nextIdx = (currentIndex + 1) % count;

    // Safeguard: iterate at most full circle to avoid infinite loop
    for (let i = 0; i < count; i++) {
        if ((chips[playOrder[nextIdx]] ?? 0) > 0) {
            return nextIdx;
        }
        nextIdx = (nextIdx + 1) % count;
    }

    // Fallback (shouldn't reach here if win condition is checked first)
    return (currentIndex + 1) % count;
}

function logHistory(state: LRCState, action: GameAction): void {
    state.history.push(
        `Action: ${action.type}, Player: ${action.userId}, Payload: ${JSON.stringify(action.payload)}`
    );
}
