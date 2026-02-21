// Mock data generators for game debugging
// These generate realistic game states for testing UI components

import {
    SpadesData,
    SpadesPlayerData,
    PlayingCard,
    SpadesClientSettings,
    DominoesData,
    DominoesPlayerData,
    Tile,
    LRCData,
    LRCPlayerData,
    LRCPlayer,
    LRCPhase,
    DieRoll,
    DieFace,
    DEFAULT_SPADES_SETTINGS,
    DEFAULT_DOMINOES_SETTINGS,
    DEFAULT_LRC_SETTINGS,
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
// Dominoes Mock Data
// ─────────────────────────────────────────────────────────────────────────────

function generateDominoSet(): Tile[] {
    const tiles: Tile[] = [];
    let id = 0;
    for (let left = 0; left <= 6; left++) {
        for (let right = left; right <= 6; right++) {
            tiles.push({ left, right, id: `tile-${id++}` });
        }
    }
    return tiles;
}

function dealTiles(tiles: Tile[], playerCount: number): Tile[][] {
    const tilesPerPlayer = playerCount <= 2 ? 7 : playerCount <= 4 ? 7 : 5;
    const hands: Tile[][] = Array.from({ length: playerCount }, () => []);

    for (let i = 0; i < tilesPerPlayer * playerCount && i < tiles.length; i++) {
        hands[i % playerCount].push(tiles[i]);
    }

    return hands;
}

export interface DominoesMockOptions {
    playerCount?: number;
    phase?: DominoesData["phase"];
    round?: number;
    currentTurnIndex?: number;
    boardTileCount?: number;
    settings?: Partial<typeof DEFAULT_DOMINOES_SETTINGS>;
}

export function generateDominoesMockData(options: DominoesMockOptions = {}): {
    gameData: DominoesData;
    playerData: DominoesPlayerData;
    playerDataMap: Record<string, DominoesPlayerData>;
} {
    const {
        playerCount = 4,
        phase = "playing",
        round = 1,
        currentTurnIndex = 0,
        boardTileCount = 0,
        settings = {},
    } = options;

    const finalSettings = {
        ...DEFAULT_DOMINOES_SETTINGS,
        ...settings,
    };

    const allTiles = shuffle(generateDominoSet());
    const hands = dealTiles(allTiles, playerCount);
    const playOrder = Array.from({ length: playerCount }, (_, i) =>
        generatePlayerId(i),
    );
    const players = generatePlayers(playerCount);
    const localPlayerId = generatePlayerId(0);

    // Generate hands counts
    const handsCounts: Record<string, number> = {};
    playOrder.forEach((playerId, idx) => {
        handsCounts[playerId] = hands[idx]?.length || 0;
    });

    // Generate player scores
    const playerScores: Record<string, number> = {};
    playOrder.forEach((playerId) => {
        playerScores[playerId] = Math.floor(Math.random() * 50);
    });

    // Generate board state
    const boardTiles = allTiles.slice(
        playerCount * 7,
        playerCount * 7 + boardTileCount,
    );
    const board: DominoesData["board"] = {
        tiles: boardTiles,
        leftEnd:
            boardTiles.length > 0
                ? { value: boardTiles[0].left, tileId: boardTiles[0].id }
                : null,
        rightEnd:
            boardTiles.length > 0
                ? {
                      value: boardTiles[boardTiles.length - 1].right,
                      tileId: boardTiles[boardTiles.length - 1].id,
                  }
                : null,
    };

    const gameData: DominoesData = {
        id: "mock-game-id",
        roomId: "mock-room",
        type: "dominoes",
        players,
        leaderId: localPlayerId,
        playOrder,
        currentTurnIndex,
        startingPlayerIndex: 0,
        handsCounts,
        boneyardCount: 0,
        board,
        phase,
        round,
        consecutivePasses: 0,
        gameMode: finalSettings.gameMode,
        playerScores,
        settings: finalSettings,
    };

    const playerDataMap: Record<string, DominoesPlayerData> = {};
    playOrder.forEach((playerId, idx) => {
        playerDataMap[playerId] = {
            hand: hands[idx] || [],
            localOrdering: playOrder,
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
