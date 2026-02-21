// src/games/lrc/index.ts
// Left Right Center (LRC) game module

import {
    Room,
    User,
    LRCSettings,
    DEFAULT_LRC_SETTINGS,
    LRC_SETTINGS_DEFINITIONS,
    LRCDieFace,
} from "@family-games/shared";
import { GameModule, GameState, GameAction } from "../../services/GameManager";
import { v4 as uuidv4 } from "uuid";
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
        "Roll dice and pass chips left, right, or to the center. Last player with chips wins the pot!",
    requiresTeams: false,
    minPlayers: LRC_MIN_PLAYERS,
    maxPlayers: LRC_MAX_PLAYERS,
    settingsDefinitions: LRC_SETTINGS_DEFINITIONS,
    defaultSettings: DEFAULT_LRC_SETTINGS,
};

// LRC die faces: 3 neutral faces (*) and L, R, C
const LRC_DIE_FACES: LRCDieFace[] = ["*", "*", "*", "L", "R", "C"];

export interface LRCState extends GameState {
    playOrder: string[];
    currentTurnIndex: number;

    chips: Record<string, number>;
    pot: number;

    phase: "playing" | "finished";
    round: number;

    lastRoll?: {
        playerId: string;
        dice: LRCDieFace[];
    };

    gameWinner?: string;
    history: string[];
    settings: LRCSettings;
}

function rollDie(): LRCDieFace {
    return LRC_DIE_FACES[Math.floor(Math.random() * LRC_DIE_FACES.length)];
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

    // Each player starts with the configured number of chips
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
        round: 1,

        settings,
        history: [],
    };
}

function reducer(state: LRCState, action: GameAction): LRCState {
    state.history.push(
        `Action: ${action.type}, Player: ${action.userId}`
    );

    switch (action.type) {
        case "ROLL_DICE":
            return handleRollDice(state, action.userId);
        default:
            return state;
    }
}

function handleRollDice(state: LRCState, playerId: string): LRCState {
    if (state.phase !== "playing") {
        throw new Error("Cannot roll dice - game is not in playing phase.");
    }

    const currentPlayer = state.playOrder[state.currentTurnIndex];
    if (currentPlayer !== playerId) {
        throw new Error("Not your turn to roll.");
    }

    const playerChips = state.chips[playerId] ?? 0;

    // Roll dice: up to 3 dice, but only as many as the player has chips
    const numDice = Math.min(playerChips, 3);
    const dice: LRCDieFace[] = [];
    for (let i = 0; i < numDice; i++) {
        dice.push(rollDie());
    }

    // Process dice results
    let newChips = { ...state.chips };
    let newPot = state.pot;
    const playerCount = state.playOrder.length;
    const playerIndex = state.playOrder.indexOf(playerId);

    for (const face of dice) {
        if (face === "L") {
            // Pass a chip to the player on the left
            const leftIndex = (playerIndex - 1 + playerCount) % playerCount;
            const leftPlayerId = state.playOrder[leftIndex];
            newChips[playerId] = (newChips[playerId] ?? 0) - 1;
            newChips[leftPlayerId] = (newChips[leftPlayerId] ?? 0) + 1;
        } else if (face === "R") {
            // Pass a chip to the player on the right
            const rightIndex = (playerIndex + 1) % playerCount;
            const rightPlayerId = state.playOrder[rightIndex];
            newChips[playerId] = (newChips[playerId] ?? 0) - 1;
            newChips[rightPlayerId] = (newChips[rightPlayerId] ?? 0) + 1;
        } else if (face === "C") {
            // Put a chip in the center pot
            newChips[playerId] = (newChips[playerId] ?? 0) - 1;
            newPot += 1;
        }
        // * means keep the chip (no change)
    }

    // Check win condition: only one player has chips
    const playersWithChips = state.playOrder.filter(
        (id) => (newChips[id] ?? 0) > 0
    );

    if (playersWithChips.length === 1) {
        return {
            ...state,
            chips: newChips,
            pot: newPot,
            lastRoll: { playerId, dice },
            phase: "finished",
            gameWinner: playersWithChips[0],
        };
    }

    // Advance to next player (skip players with 0 chips but keep them in game)
    let nextTurnIndex = (state.currentTurnIndex + 1) % playerCount;

    return {
        ...state,
        chips: newChips,
        pot: newPot,
        lastRoll: { playerId, dice },
        currentTurnIndex: nextTurnIndex,
        round: state.round + 1,
    };
}

function getState(state: LRCState): Partial<LRCState> {
    // All state in LRC is public - no hidden information
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

function checkMinimumPlayers(state: LRCState): boolean {
    const connectedPlayers = Object.values(state.players).filter(
        (player) => player.isConnected !== false
    );
    return connectedPlayers.length >= LRC_MIN_PLAYERS;
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
