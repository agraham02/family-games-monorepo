// src/games/dominoes/index.ts

import {
    Room,
    User,
    DominoesSettings,
    DEFAULT_DOMINOES_SETTINGS,
    DOMINOES_SETTINGS_DEFINITIONS,
    Tile,
    DominoesPhase,
    DominoesTeam,
    DominoesGameMode,
} from "@family-games/shared";
import { GameModule, GameState, GameAction } from "../../services/GameManager";
import { v4 as uuidv4 } from "uuid";
import {
    buildDominoSet,
    dealTilesToPlayers,
    findPlayerWithHighestDouble,
    shuffleTiles,
} from "./helpers/tile";
import { omitFields } from "../../utils/omitFields";
import {
    BoardState,
    canPlaceTile,
    canPlayTile,
    hasLegalMove,
    initializeBoard,
    placeTileOnBoard,
} from "./helpers/board";
import { calculateRoundScores, checkWinCondition } from "./helpers/score";
import {
    handlePlayerReconnect,
    handlePlayerDisconnect,
    checkAllPlayersConnected,
} from "../shared";

// Export auto-action helpers for TurnTimerService
export { getAutoPlayTile, shouldTimerBeActive } from "./helpers/autoAction";

const DOMINOES_NAME = "dominoes";
const DOMINOES_DISPLAY_NAME = "Dominoes";
const DOMINOES_TOTAL_PLAYERS = 4;

/**
 * Get team requirements based on game settings.
 * Returns null for individual mode, team config for team mode.
 */
function getTeamRequirements(
    settings: DominoesSettings,
): { numTeams: number; playersPerTeam: number } | null {
    if (settings.gameMode === "team") {
        return { numTeams: 2, playersPerTeam: 2 };
    }
    return null;
}

const DOMINOES_METADATA = {
    type: DOMINOES_NAME,
    displayName: DOMINOES_DISPLAY_NAME,
    description:
        "Classic Caribbean-style dominoes. Be the first to play all your tiles or have the lowest pip count when blocked!",
    requiresTeams: false, // Dynamic - depends on gameMode setting
    minPlayers: DOMINOES_TOTAL_PLAYERS,
    maxPlayers: DOMINOES_TOTAL_PLAYERS,
    settingsDefinitions: DOMINOES_SETTINGS_DEFINITIONS,
    defaultSettings: DEFAULT_DOMINOES_SETTINGS,
    getTeamRequirements, // Dynamic team requirements based on settings
};

export interface DominoesState extends GameState {
    playOrder: string[];
    currentTurnIndex: number;
    startingPlayerIndex: number; // Player who started the current round

    hands: Record<string, Tile[]>;
    handsCounts?: Record<string, number>; // For public state
    boneyard: Tile[]; // Remaining tiles available to draw
    board: BoardState;

    phase: DominoesPhase;
    round: number;
    consecutivePasses: number; // Track consecutive passes to detect blocked game

    // Game mode (individual or team)
    gameMode: DominoesGameMode;

    // Team data (populated when gameMode === "team")
    teams?: Record<number, DominoesTeam>;
    teamScores?: Record<number, number>;

    // Individual scores (always populated)
    playerScores: Record<string, number>;

    // Round summary data
    roundPipCounts?: Record<string, number>; // Pip counts at end of round
    roundWinner?: string | null; // Player who won the current round
    winningTeam?: number | null; // Team that won (team mode only)
    roundPoints?: number; // Points scored this round
    isRoundTie?: boolean; // True if round ended in a tie (blocked game)

    gameWinner?: string; // Overall game winner (player ID)
    winningTeamId?: number; // Overall game winning team (team mode)
    history: string[]; // Action history for debugging
    settings: DominoesSettings;

    /** ISO timestamp when the current turn started (for turn timer) */
    turnStartedAt?: string;
}

function init(
    room: Room,
    customSettings?: Partial<DominoesSettings>,
): DominoesState {
    // Turn players into an object map for easier access
    const players: Record<string, User> = Object.fromEntries(
        room.users.map((user) => [user.id, user]),
    );

    const settings: DominoesSettings = {
        ...DEFAULT_DOMINOES_SETTINGS,
        ...customSettings,
    };

    const gameMode = settings.gameMode;

    // ========================================================================
    // TEAM MODE SETUP
    // ========================================================================
    let playOrder: string[];
    let teams: Record<number, DominoesTeam> | undefined;
    let teamScores: Record<number, number> | undefined;

    if (gameMode === "team") {
        // Validate teams are set up in the room
        if (!room.teams || room.teams.length !== 2) {
            throw new Error("Team mode requires 2 teams of 2 players each");
        }

        // Validate each team has exactly 2 players
        for (const team of room.teams) {
            if (team.length !== 2) {
                throw new Error("Each team must have exactly 2 players");
            }
        }

        // Validate all team players exist in room and are unique
        const allTeamPlayers = room.teams.flat();
        const uniquePlayers = new Set(allTeamPlayers);
        if (uniquePlayers.size !== 4) {
            throw new Error("Duplicate players detected in teams");
        }
        for (const playerId of allTeamPlayers) {
            if (!room.users.find((u) => u.id === playerId)) {
                throw new Error(`Player ${playerId} in team but not in room`);
            }
        }

        // Build teams object
        teams = {};
        teamScores = {};
        room.teams.forEach((teamPlayers, index) => {
            teams![index] = {
                players: teamPlayers,
                score: 0,
            };
            teamScores![index] = 0;
        });

        // Create alternating play order: Team0_P0, Team1_P0, Team0_P1, Team1_P1
        // This ensures partners sit across from each other and teams alternate
        playOrder = [];
        const playersPerTeam = 2;
        const numTeams = 2;
        for (let i = 0; i < playersPerTeam; i++) {
            for (let j = 0; j < numTeams; j++) {
                const playerId = room.teams[j][i];
                if (playerId) playOrder.push(playerId);
            }
        }
    } else {
        // Individual mode - use room order
        playOrder = room.users.map((user) => user.id);
    }

    // Generate and shuffle dominoes
    const dominoSet = buildDominoSet();
    const shuffledDominoes = shuffleTiles(dominoSet);

    // Deal tiles to players (with optional boneyard)
    const { hands, boneyard } = dealTilesToPlayers(
        shuffledDominoes,
        players,
        settings.drawFromBoneyard,
    );

    // Determine starting player (player with highest double)
    // If no player has a double, start with first player
    const startingPlayerId = findPlayerWithHighestDouble(hands);
    let startingPlayerIndex = startingPlayerId
        ? playOrder.indexOf(startingPlayerId)
        : 0;

    // Defensive check: if indexOf returned -1 (shouldn't happen), default to 0
    if (startingPlayerIndex < 0) {
        console.warn(
            `Starting player ${startingPlayerId} not found in playOrder, defaulting to index 0`,
        );
        startingPlayerIndex = 0;
    }

    // Initialize player scores
    const playerScores: Record<string, number> = {};
    playOrder.forEach((playerId) => {
        playerScores[playerId] = 0;
    });

    return {
        id: uuidv4(),
        roomId: room.id,
        type: DOMINOES_NAME,

        players,
        leaderId: room.leaderId ?? playOrder[0],
        playOrder,
        currentTurnIndex: startingPlayerIndex,
        startingPlayerIndex,

        hands,
        boneyard,
        board: initializeBoard(),

        phase: "playing",
        round: 1,
        consecutivePasses: 0,

        gameMode,
        teams,
        teamScores,
        playerScores,
        settings,
        history: [],

        // Initialize turn timer
        turnStartedAt: new Date().toISOString(),
    };
}

function reducer(state: DominoesState, action: GameAction): DominoesState {
    // Log action to history (immutably)
    const stateWithHistory: DominoesState = {
        ...state,
        history: [
            ...state.history,
            `Action: ${action.type}, Player: ${action.userId}, Payload: ${JSON.stringify(action.payload)}`,
        ],
    };

    switch (action.type) {
        case "PLACE_TILE":
            return handlePlaceTile(
                stateWithHistory,
                action.userId,
                action.payload.tile,
                action.payload.side,
            );
        case "PASS":
            return handlePass(stateWithHistory, action.userId);
        case "DRAW_TILE":
            return handleDrawTile(stateWithHistory, action.userId);
        case "CONTINUE_AFTER_ROUND_SUMMARY":
            return startNextRound(stateWithHistory);
        default:
            return stateWithHistory;
    }
}

function getState(state: DominoesState): Partial<DominoesState> & {
    boneyardCount?: number;
    turnTimer?: { startedAt: number; duration: number; serverTime: number };
} {
    const publicState = omitFields(state, [
        "hands",
        "boneyard", // Don't expose actual tiles in boneyard
    ]) as Partial<DominoesState> & {
        boneyardCount?: number;
        turnTimer?: { startedAt: number; duration: number; serverTime: number };
    };
    publicState.handsCounts = Object.fromEntries(
        state.playOrder.map((id) => [id, state.hands[id].length || 0]),
    );
    publicState.boneyardCount = state.boneyard.length;

    // Add turn timer info if active (same format as Spades for consistency)
    const turnTimeLimit = state.settings?.turnTimeLimit;
    if (
        turnTimeLimit &&
        turnTimeLimit > 0 &&
        state.turnStartedAt &&
        state.phase === "playing"
    ) {
        const startTime = new Date(state.turnStartedAt).getTime();
        publicState.turnTimer = {
            startedAt: startTime,
            duration: turnTimeLimit * 1000,
            serverTime: Date.now(),
        };
    }

    return publicState;
}

function getPlayerState(
    state: DominoesState,
    playerId: string,
): Partial<DominoesState> & { hand?: Tile[]; localOrdering?: string[] } {
    // Create a local ordering array starting from the current player's perspective
    const idx = state.playOrder.indexOf(playerId);
    const localOrdering = [
        ...state.playOrder.slice(idx),
        ...state.playOrder.slice(0, idx),
    ];

    return {
        hand: state.hands[playerId] || [],
        localOrdering,
    };
}

export const dominoesModule: GameModule = {
    init,
    reducer,
    getState,
    getPlayerState,
    checkMinimumPlayers,
    handlePlayerReconnect,
    handlePlayerDisconnect,
    metadata: DOMINOES_METADATA,
};

/**
 * Handle placing a tile on the board
 */
function handlePlaceTile(
    state: DominoesState,
    playerId: string,
    tile: Tile,
    side: "left" | "right",
): DominoesState {
    // Validate phase
    if (state.phase !== "playing") {
        console.warn(
            `[DOMINOES] Tiles can only be placed during the playing phase. Current: ${state.phase}`,
        );
        return state;
    }

    // Validate turn
    if (currentPlayerId(state) !== playerId) {
        console.warn(
            `[DOMINOES] Not ${playerId}'s turn. Current turn: ${currentPlayerId(state)}`,
        );
        return state;
    }

    // Check if player is connected
    if (state.players[playerId]?.isConnected === false) {
        console.warn(`[DOMINOES] Player ${playerId} is disconnected`);
        return state;
    }

    // Validate tile is in hand
    const playerHand = state.hands[playerId] || [];
    const tileIdx = playerHand.findIndex((t) => t.id === tile.id);
    if (tileIdx === -1) {
        console.warn(
            `[DOMINOES] Tile ${tile.id} not in player ${playerId}'s hand`,
        );
        return state;
    }

    // Validate the move is legal
    if (!canPlaceTile(tile, state.board, side)) {
        console.warn(
            `[DOMINOES] Tile ${tile.id} cannot be placed on ${side} side`,
        );
        return state;
    }

    // Remove tile from hand
    const newHand = [...playerHand];
    newHand.splice(tileIdx, 1);
    const newHands = { ...state.hands, [playerId]: newHand };

    // Place tile on board
    const newBoard = placeTileOnBoard(tile, state.board, side);

    // Reset consecutive passes since a tile was played
    const consecutivePasses = 0;

    // Check if player won the round (hand is empty)
    if (newHand.length === 0) {
        return endRound(
            {
                ...state,
                hands: newHands,
                board: newBoard,
                consecutivePasses,
            },
            playerId,
        );
    }

    // Move to next player
    const nextTurnIndex = (state.currentTurnIndex + 1) % state.playOrder.length;

    return {
        ...state,
        hands: newHands,
        board: newBoard,
        currentTurnIndex: nextTurnIndex,
        consecutivePasses,
        // Reset turn timer for next player
        turnStartedAt: new Date().toISOString(),
    };
}

/**
 * Handle drawing a tile from the boneyard.
 * Only allowed when drawFromBoneyard setting is enabled and player has no legal moves.
 */
function handleDrawTile(state: DominoesState, playerId: string): DominoesState {
    // Validate drawFromBoneyard is enabled
    if (!state.settings.drawFromBoneyard) {
        console.warn(`[DOMINOES] Drawing from boneyard is disabled`);
        return state;
    }

    // Validate phase
    if (state.phase !== "playing") {
        console.warn(
            `[DOMINOES] Can only draw during the playing phase. Current: ${state.phase}`,
        );
        return state;
    }

    // Validate turn
    if (currentPlayerId(state) !== playerId) {
        console.warn(`[DOMINOES] Not ${playerId}'s turn to draw`);
        return state;
    }

    // Check if player is connected
    if (state.players[playerId]?.isConnected === false) {
        console.warn(`[DOMINOES] Player ${playerId} is disconnected`);
        return state;
    }

    // Validate boneyard has tiles
    if (state.boneyard.length === 0) {
        console.warn(`[DOMINOES] Boneyard is empty, player must pass`);
        return state;
    }

    // Verify player actually cannot play (has no legal moves)
    const playerHand = state.hands[playerId] || [];
    if (hasLegalMove(playerHand, state.board)) {
        console.warn(
            `[DOMINOES] Player ${playerId} has legal moves and cannot draw`,
        );
        return state;
    }

    // Draw a tile from boneyard and add to player's hand
    const [drawnTile, ...remainingBoneyard] = state.boneyard;
    const newHand = [...playerHand, drawnTile];

    // Reset consecutive passes since player took an action
    // (Player's turn continues - they can draw again, play, or pass if boneyard empty)
    return {
        ...state,
        hands: {
            ...state.hands,
            [playerId]: newHand,
        },
        boneyard: remainingBoneyard,
        consecutivePasses: 0,
        // Keep turn timer running for same player
    };
}

/**
 * Handle a player passing their turn
 */
function handlePass(state: DominoesState, playerId: string): DominoesState {
    // Validate phase
    if (state.phase !== "playing") {
        console.warn(
            `[DOMINOES] Can only pass during the playing phase. Current: ${state.phase}`,
        );
        return state;
    }

    // Validate turn
    if (currentPlayerId(state) !== playerId) {
        console.warn(`[DOMINOES] Not ${playerId}'s turn to pass`);
        return state;
    }

    // Check if player is connected
    if (state.players[playerId]?.isConnected === false) {
        console.warn(`[DOMINOES] Player ${playerId} is disconnected`);
        return state;
    }

    // In boneyard mode, player must draw tiles until they can play or boneyard is empty
    if (state.settings.drawFromBoneyard && state.boneyard.length > 0) {
        console.warn(
            `[DOMINOES] Player ${playerId} must draw from boneyard before passing`,
        );
        return state;
    }

    // Verify player actually cannot play (has no legal moves)
    const playerHand = state.hands[playerId] || [];
    if (hasLegalMove(playerHand, state.board)) {
        console.warn(
            `[DOMINOES] Player ${playerId} has legal moves and cannot pass`,
        );
        return state;
    }

    // Increment consecutive passes
    const consecutivePasses = state.consecutivePasses + 1;

    // If all 4 players have passed consecutively, the game is blocked
    if (consecutivePasses >= 4) {
        return endRound(
            {
                ...state,
                consecutivePasses,
            },
            null, // No clear winner, will determine based on lowest pip count
        );
    }

    // Move to next player
    const nextTurnIndex = (state.currentTurnIndex + 1) % state.playOrder.length;

    return {
        ...state,
        currentTurnIndex: nextTurnIndex,
        consecutivePasses,
        // Reset turn timer for next player
        turnStartedAt: new Date().toISOString(),
    };
}

/**
 * End the current round and calculate scores
 */
function endRound(
    state: DominoesState,
    winnerId: string | null,
): DominoesState {
    const scoreResult = calculateRoundScores(
        state.hands,
        state.playerScores,
        state.teamScores ?? {},
        winnerId,
        state.gameMode,
        state.teams,
    );

    // Check if roundLimit has been reached
    const roundLimitReached =
        state.settings.roundLimit !== null &&
        state.round >= state.settings.roundLimit;

    // Check if anyone has reached the win target
    let gameWinner: string | undefined;
    let winningTeamId: number | undefined;

    if (state.gameMode === "team") {
        // In team mode, check team scores
        const winningTeam = checkWinCondition(
            scoreResult.teamScores,
            state.settings.winTarget,
        );
        if (winningTeam !== null) {
            winningTeamId = Number(winningTeam);
            // Set gameWinner to the first player on the winning team for display
            gameWinner = state.teams?.[winningTeamId]?.players[0];
        }

        // If round limit reached but no winner by score, determine winner by highest score
        if (roundLimitReached && winningTeamId === undefined) {
            const teamIds = Object.keys(scoreResult.teamScores).map(Number);
            const highestScore = Math.max(
                ...teamIds.map((id) => scoreResult.teamScores[id] ?? 0),
            );
            const winningTeamIds = teamIds.filter(
                (id) => scoreResult.teamScores[id] === highestScore,
            );
            // If tied, first team wins (could also be a tie scenario)
            if (winningTeamIds.length === 1) {
                winningTeamId = winningTeamIds[0];
                gameWinner = state.teams?.[winningTeamId]?.players[0];
            }
        }

        // Update team objects with new scores
        const updatedTeams: Record<number, DominoesTeam> = {};
        for (const [teamId, team] of Object.entries(state.teams ?? {})) {
            updatedTeams[Number(teamId)] = {
                ...team,
                score: scoreResult.teamScores[Number(teamId)] ?? team.score,
            };
        }

        const isGameOver = winningTeamId !== undefined || roundLimitReached;

        return {
            ...state,
            teams: updatedTeams,
            teamScores: scoreResult.teamScores,
            playerScores: scoreResult.playerScores,
            roundPipCounts: scoreResult.pipCounts,
            roundWinner: scoreResult.roundWinner,
            winningTeam: scoreResult.winningTeam,
            roundPoints: scoreResult.roundPoints,
            isRoundTie: scoreResult.isTie,
            gameWinner,
            winningTeamId,
            phase: isGameOver ? "finished" : "round-summary",
        };
    }

    // Individual mode
    const winner = checkWinCondition(
        scoreResult.playerScores,
        state.settings.winTarget,
    );
    if (winner !== null) {
        gameWinner = String(winner);
    }

    // If round limit reached but no winner by score, determine winner by highest score
    if (roundLimitReached && !gameWinner) {
        const playerIds = Object.keys(scoreResult.playerScores);
        const highestScore = Math.max(
            ...playerIds.map((id) => scoreResult.playerScores[id] ?? 0),
        );
        const winners = playerIds.filter(
            (id) => scoreResult.playerScores[id] === highestScore,
        );
        // If tied, first player wins (could also be a tie scenario)
        if (winners.length === 1) {
            gameWinner = winners[0];
        }
    }

    const isGameOver = gameWinner !== undefined || roundLimitReached;

    return {
        ...state,
        playerScores: scoreResult.playerScores,
        roundPipCounts: scoreResult.pipCounts,
        roundWinner: scoreResult.roundWinner,
        winningTeam: null,
        roundPoints: scoreResult.roundPoints,
        isRoundTie: scoreResult.isTie,
        gameWinner,
        phase: isGameOver ? "finished" : "round-summary",
    };
}

/**
 * Start the next round
 */
function startNextRound(state: DominoesState): DominoesState {
    if (state.phase !== "round-summary") {
        console.warn(
            `[DOMINOES] Can only start next round from round-summary phase. Current: ${state.phase}`,
        );
        return state;
    }

    // Generate new tiles
    const dominoSet = buildDominoSet();
    const shuffledDominoes = shuffleTiles(dominoSet);
    const { hands: newHands, boneyard } = dealTilesToPlayers(
        shuffledDominoes,
        state.players,
        state.settings.drawFromBoneyard,
    );

    // Determine new starting player (player with highest double)
    const startingPlayerId = findPlayerWithHighestDouble(newHands);
    let startingPlayerIndex = startingPlayerId
        ? state.playOrder.indexOf(startingPlayerId)
        : (state.startingPlayerIndex + 1) % state.playOrder.length;

    // Defensive check: if indexOf returned -1 (shouldn't happen), rotate from previous
    if (startingPlayerIndex < 0) {
        console.warn(
            `Starting player ${startingPlayerId} not found in playOrder, rotating from previous`,
        );
        startingPlayerIndex =
            (state.startingPlayerIndex + 1) % state.playOrder.length;
    }

    return {
        ...state,
        hands: newHands,
        boneyard,
        board: initializeBoard(),
        currentTurnIndex: startingPlayerIndex,
        startingPlayerIndex,
        phase: "playing",
        round: state.round + 1,
        consecutivePasses: 0,
        roundPipCounts: undefined,
        roundWinner: undefined,
        winningTeam: undefined,
        roundPoints: undefined,
        isRoundTie: undefined,
        // Reset turn timer for new round
        turnStartedAt: new Date().toISOString(),
    };
}

function currentPlayerId(state: DominoesState): string {
    return state.playOrder[state.currentTurnIndex];
}

/**
 * Check if the game has minimum players connected to continue.
 * For Dominoes, all 4 players must be connected to play.
 */
function checkMinimumPlayers(state: DominoesState): boolean {
    return checkAllPlayersConnected(state, DOMINOES_TOTAL_PLAYERS);
}
