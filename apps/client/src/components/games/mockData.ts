// Mock data generators for game debugging
// These generate realistic game states for testing UI components

import {
    SpadesData,
    SpadesPlayerData,
    PlayingCard,
    SpadesClientSettings,
    LRCData,
    LRCPlayerData,
    LRCPlayer,
    LRCPhase,
    DieRoll,
    DieFace,
    DEFAULT_SPADES_SETTINGS,
    DEFAULT_LRC_SETTINGS,
    DominoesData,
    DominoesPlayerData,
    Tile,
    DominoesClientSettings,
    DEFAULT_DOMINOES_SETTINGS,
} from "@shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Utilities
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PLAYER_NAMES = [
    "You",
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
];

function generatePlayerId(index: number): string {
    return `player-${index}`;
}

function generatePlayers(
    count: number,
): Record<string, { id: string; name: string; isConnected: boolean }> {
    const players: Record<
        string,
        { id: string; name: string; isConnected: boolean }
    > = {};
    for (let i = 0; i < count; i++) {
        const id = generatePlayerId(i);
        players[id] = {
            id,
            name: MOCK_PLAYER_NAMES[i] || `Player ${i + 1}`,
            isConnected: true,
        };
    }
    return players;
}

function shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spades Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const SUITS: PlayingCard["suit"][] = ["Spades", "Hearts", "Diamonds", "Clubs"];
const RANKS = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
];

function generateDeck(jokersEnabled: boolean = false): PlayingCard[] {
    const deck: PlayingCard[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            // If jokers are enabled, we typically remove the 2 of Clubs and 2 of Diamonds
            if (
                jokersEnabled &&
                rank === "2" &&
                (suit === "Clubs" || suit === "Diamonds")
            ) {
                continue;
            }
            deck.push({ suit, rank });
        }
    }
    if (jokersEnabled) {
        deck.push({ suit: "Spades", rank: "LJ" });
        deck.push({ suit: "Spades", rank: "BJ" });
    }
    return deck;
}

function dealCards(deck: PlayingCard[], playerCount: number): PlayingCard[][] {
    const hands: PlayingCard[][] = Array.from(
        { length: playerCount },
        () => [],
    );
    const cardsPerPlayer = Math.floor(deck.length / playerCount);
    let cardIndex = 0;

    for (let round = 0; round < cardsPerPlayer; round++) {
        for (let player = 0; player < playerCount; player++) {
            if (cardIndex < deck.length) {
                hands[player].push(deck[cardIndex]);
                cardIndex++;
            }
        }
    }

    return hands;
}

export interface SpadesMockOptions {
    playerCount?: number;
    phase?: SpadesData["phase"];
    round?: number;
    currentTurnIndex?: number;
    includeCurrentTrick?: boolean;
    settings?: Partial<typeof DEFAULT_SPADES_SETTINGS>;
}

export function generateSpadesMockData(options: SpadesMockOptions = {}): {
    gameData: SpadesData;
    playerData: SpadesPlayerData;
    playerDataMap: Record<string, SpadesPlayerData>;
} {
    const {
        playerCount = 4,
        phase = "playing",
        round = 1,
        currentTurnIndex = 0,
        includeCurrentTrick = false,
        settings = {},
    } = options;

    const finalSettings: SpadesClientSettings = {
        ...DEFAULT_SPADES_SETTINGS,
        ...settings,
        turnTimeLimit:
            (settings.turnTimeLimit ??
                DEFAULT_SPADES_SETTINGS.turnTimeLimit) === null
                ? undefined
                : (settings.turnTimeLimit ??
                      DEFAULT_SPADES_SETTINGS.turnTimeLimit)!,
    };

    const deck = shuffle(generateDeck(finalSettings.jokersEnabled));
    const hands = dealCards(deck, playerCount);
    const playOrder = Array.from({ length: playerCount }, (_, i) =>
        generatePlayerId(i),
    );
    const players = generatePlayers(playerCount);
    const localPlayerId = generatePlayerId(0);

    // Create teams (for 4 players: 0&2 vs 1&3)
    const teams: SpadesData["teams"] = {};
    if (playerCount === 4) {
        teams["0"] = {
            players: [playOrder[0], playOrder[2]],
            score: Math.floor(Math.random() * 200),
            accumulatedBags: Math.floor(Math.random() * 8),
        };
        teams["1"] = {
            players: [playOrder[1], playOrder[3]],
            score: Math.floor(Math.random() * 200),
            accumulatedBags: Math.floor(Math.random() * 8),
        };
    } else if (playerCount === 2) {
        teams["0"] = {
            players: [playOrder[0]],
            score: Math.floor(Math.random() * 200),
            accumulatedBags: Math.floor(Math.random() * 8),
        };
        teams["1"] = {
            players: [playOrder[1]],
            score: Math.floor(Math.random() * 200),
            accumulatedBags: Math.floor(Math.random() * 8),
        };
    }

    // Generate random bids
    const bids: Record<
        string,
        { amount: number; type: string; isBlind: boolean }
    > = {};
    playOrder.forEach((playerId) => {
        bids[playerId] = {
            amount: Math.floor(Math.random() * 5) + 1,
            type: "normal",
            isBlind: false,
        };
    });

    // Generate hands counts
    const handsCounts: Record<string, number> = {};
    playOrder.forEach((playerId, idx) => {
        handsCounts[playerId] = hands[idx]?.length || 0;
    });

    // Generate trick counts
    const roundTrickCounts: Record<string, number> = {};
    playOrder.forEach((playerId) => {
        roundTrickCounts[playerId] = Math.floor(Math.random() * 4);
    });

    // Optional current trick
    let currentTrick: SpadesData["currentTrick"] = null;
    if (includeCurrentTrick && phase === "playing") {
        const tricksPlayed = Math.floor(Math.random() * 3) + 1;
        currentTrick = {
            plays: playOrder.slice(0, tricksPlayed).map((playerId) => ({
                playerId,
                card: hands[playOrder.indexOf(playerId)]?.[0] || {
                    suit: "Spades",
                    rank: "A",
                },
            })),
        };
    }

    const gameData: SpadesData = {
        id: "mock-game-id",
        roomId: "mock-room",
        type: "spades",
        players,
        leaderId: localPlayerId,
        teams,
        playOrder,
        dealerIndex: 0,
        currentTurnIndex,
        bids,
        spadesBroken: false,
        currentTrick,
        completedTricks: [],
        phase,
        round,
        settings: finalSettings,
        history: [],
        hands: hands.map((h) => h.map((c) => `${c.rank}${c.suit}`)),
        handsCounts,
        roundTrickCounts,
        roundTeamScores: { 0: 50, 1: 30 },
        roundScoreBreakdown: {},
        teamEligibleForBlind: { 0: false, 1: false },
    };

    const playerDataMap: Record<string, SpadesPlayerData> = {};
    playOrder.forEach((playerId, idx) => {
        playerDataMap[playerId] = {
            localOrdering: playOrder,
            hand: hands[idx] || [],
        };
    });

    const playerData = playerDataMap[localPlayerId];

    return { gameData, playerData, playerDataMap };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Types
// ─────────────────────────────────────────────────────────────────────────────

export type MockDataGenerator<TGameData, TPlayerData> = (
    options?: Record<string, unknown>,
) => {
    gameData: TGameData;
    playerData: TPlayerData;
};

// ─────────────────────────────────────────────────────────────────────────────
// LRC Mock Data
// ─────────────────────────────────────────────────────────────────────────────

export interface LRCMockOptions {
    playerCount?: number;
    phase?: LRCPhase;
    centerPot?: number;
    currentPlayerIndex?: number;
    showRollResult?: boolean;
    settings?: Partial<typeof DEFAULT_LRC_SETTINGS>;
}

/**
 * Generate mock LRC game data for debugging.
 */
export function generateLRCMockData(options: LRCMockOptions = {}): {
    gameData: LRCData;
    playerData: LRCPlayerData;
    playerDataMap: Record<string, LRCPlayerData>;
} {
    const {
        playerCount = 4,
        phase = "waiting-for-roll",
        centerPot = 5,
        currentPlayerIndex = 0,
        showRollResult = false,
        settings = {},
    } = options;

    const finalSettings = {
        ...DEFAULT_LRC_SETTINGS,
        ...settings,
    };

    const localPlayerId = generatePlayerId(0);

    // Generate LRC players
    const lrcPlayers: LRCPlayer[] = [];
    for (let i = 0; i < playerCount; i++) {
        const id = generatePlayerId(i);
        // Distribute chips somewhat randomly (some to center)
        const chips =
            i === 0
                ? finalSettings.startingChips
                : Math.max(
                      0,
                      finalSettings.startingChips -
                          Math.floor(Math.random() * 2),
                  );
        lrcPlayers.push({
            id,
            name: MOCK_PLAYER_NAMES[i] || `Player ${i + 1}`,
            chips,
            netChipsThisRound: 0,
            seatIndex: i,
        });
    }

    // Generate roll result if needed
    let currentRoll: DieRoll[] | null = null;
    if (showRollResult || phase === "showing-results") {
        const faces: DieFace[] = ["L", "C", "R", "DOT", "DOT", "DOT"];
        if (finalSettings.wildMode) {
            faces[0] = "WILD";
        }
        const diceCount = Math.min(3, lrcPlayers[currentPlayerIndex].chips);
        currentRoll = [];
        for (let i = 0; i < diceCount; i++) {
            const rawValue = Math.floor(Math.random() * 6) + 1;
            const faceIndex = rawValue - 1;
            currentRoll.push({
                face: faces[faceIndex] || "DOT",
                rawValue,
            });
        }
    }

    // Generate standard players map for base type compatibility
    // Connection status is tracked in players, not in LRCPlayer
    const players: Record<
        string,
        { id: string; name: string; isConnected: boolean }
    > = {};
    lrcPlayers.forEach((p) => {
        players[p.id] = { id: p.id, name: p.name, isConnected: true };
    });

    const gameData: LRCData = {
        id: "mock-lrc-game",
        roomId: "mock-room",
        type: "lrc",
        players,
        leaderId: localPlayerId,
        playOrder: lrcPlayers.map((p) => p.id),
        currentTurnIndex: currentPlayerIndex,
        lrcPlayers,
        currentPlayerIndex,
        centerPot,
        phase,
        currentRoll,
        chipMovements: null,
        pendingWildTargets: [],
        wildTargets: [],
        winnerId: null,
        lastChipChallengeActive: false,
        lastChipChallengeRoll: null,
        lastChipChallengeSuccess: null,
        roundNumber: 1,
        roundWinners: [],
        settings: finalSettings,
    };

    const playerDataMap: Record<string, LRCPlayerData> = {};
    lrcPlayers.forEach((p, idx) => {
        playerDataMap[p.id] = {
            localOrdering: lrcPlayers.map((p) => p.id),
            odusId: p.id,
            isMyTurn: currentPlayerIndex === idx,
            myChips: p.chips,
            netWinningsCents: 0,
        };
    });

    const playerData = playerDataMap[localPlayerId];

    return { gameData, playerData, playerDataMap };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dominoes Mock Data
// ─────────────────────────────────────────────────────────────────────────────

function generateDoubleSixSet(): Tile[] {
    const tiles: Tile[] = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            tiles.push({ left: i, right: j, id: `${i}-${j}` });
        }
    }
    return tiles;
}

export interface DominoesMockOptions {
    playerCount?: number; // 2-4, default 4
    phase?: "playing" | "round-summary" | "finished";
    round?: number;
    tilesOnBoard?: number; // How many tiles already placed
    settings?: Partial<DominoesClientSettings>;
}

export function generateDominoesMockData(options: DominoesMockOptions = {}): {
    gameData: DominoesData;
    playerData: DominoesPlayerData;
    playerDataMap: Record<string, DominoesPlayerData>;
} {
    const playerCount = Math.min(4, Math.max(2, options.playerCount ?? 4));
    const phase = options.phase ?? "playing";
    const round = options.round ?? 1;
    const tilesOnBoard = options.tilesOnBoard ?? 3;

    const playOrder = Array.from({ length: playerCount }, (_, i) =>
        generatePlayerId(i),
    );
    const players = generatePlayers(playerCount);
    const localPlayerId = playOrder[0];

    const allTiles = shuffle(generateDoubleSixSet());

    // Deal 7 tiles per player
    const tilesPerPlayer = 7;
    const hands: Record<string, Tile[]> = {};
    let dealt = 0;
    for (const pid of playOrder) {
        hands[pid] = allTiles.slice(dealt, dealt + tilesPerPlayer);
        dealt += tilesPerPlayer;
    }
    const boneyard = allTiles.slice(dealt);

    // Build a small board from the boneyard so players keep full hands.
    // Create a valid chain where each tile connects to the previous one.
    const boardTiles: Tile[] = [];
    let leftEnd = null;
    let rightEnd = null;
    const placed = Math.min(tilesOnBoard, boneyard.length);

    if (placed > 0) {
        // Place the first tile
        const first = boneyard[0];
        boardTiles.push(first);
        leftEnd = { value: first.left, tileId: first.id };
        rightEnd = { value: first.right, tileId: first.id };

        // Try to chain subsequent tiles by finding one that connects
        const remaining = boneyard.slice(1);
        for (let count = 1; count < placed && remaining.length > 0; count++) {
            const idx = remaining.findIndex(
                (t) =>
                    t.left === rightEnd!.value || t.right === rightEnd!.value,
            );
            if (idx === -1) break;
            const tile = remaining.splice(idx, 1)[0];
            // Orient: if tile.right matches, swap conceptually
            const connectValue: number =
                tile.left === rightEnd!.value ? tile.right : tile.left;
            boardTiles.push(tile);
            rightEnd = { value: connectValue, tileId: tile.id };
        }
    }

    const handsCounts: Record<string, number> = {};
    for (const pid of playOrder) {
        handsCounts[pid] = hands[pid].length;
    }

    const playerScores: Record<string, number> = {};
    for (const pid of playOrder) {
        playerScores[pid] = Math.floor(Math.random() * 30);
    }

    const finalSettings: DominoesClientSettings = {
        ...DEFAULT_DOMINOES_SETTINGS,
        ...(options.settings ?? {}),
    };

    const gameData: DominoesData = {
        type: "dominoes",
        id: "debug-game",
        roomId: "debug-room",
        players,
        leaderId: localPlayerId,
        playOrder,
        currentTurnIndex: 0,
        startingPlayerIndex: 0,
        handsCounts,
        boneyardCount: boneyard.length,
        board: {
            tiles: boardTiles,
            leftEnd,
            rightEnd,
        },
        phase,
        round,
        consecutivePasses: 0,
        gameMode: finalSettings.gameMode,
        playerScores,
        settings: finalSettings,
    };

    const playerDataMap: Record<string, DominoesPlayerData> = {};
    for (const pid of playOrder) {
        playerDataMap[pid] = {
            hand: hands[pid],
            localOrdering: playOrder,
        };
    }

    const playerData = playerDataMap[localPlayerId];

    return { gameData, playerData, playerDataMap };
}
