// Mock data generators for game debugging
// These generate realistic game states for testing UI components

import {
    SpadesData,
    SpadesPlayerData,
    PlayingCard,
    DominoesData,
    DominoesPlayerData,
    Tile,
    LRCData,
    LRCPlayerData,
    LRCPlayer,
    LRCPhase,
    DieRoll,
    DieFace,
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

function generateDeck(): PlayingCard[] {
    const deck: PlayingCard[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
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
}

export function generateSpadesMockData(options: SpadesMockOptions = {}): {
    gameData: SpadesData;
    playerData: SpadesPlayerData;
} {
    const {
        playerCount = 4,
        phase = "playing",
        round = 1,
        currentTurnIndex = 0,
        includeCurrentTrick = false,
    } = options;

    const deck = shuffle(generateDeck());
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
        settings: {
            allowNil: true,
            bagsPenalty: 100,
            winTarget: 500,
            blindNilEnabled: false,
            blindBidEnabled: false,
            jokersEnabled: false,
            deuceOfSpadesHigh: false,
        },
        history: [],
        hands: hands.map((h) => h.map((c) => `${c.rank}${c.suit}`)),
        handsCounts,
        roundTrickCounts,
        roundTeamScores: { 0: 50, 1: 30 },
        roundScoreBreakdown: {},
        teamEligibleForBlind: { 0: false, 1: false },
    };

    const playerData: SpadesPlayerData = {
        localOrdering: playOrder,
        hand: hands[0] || [],
    };

    return { gameData, playerData };
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
}

export function generateDominoesMockData(options: DominoesMockOptions = {}): {
    gameData: DominoesData;
    playerData: DominoesPlayerData;
} {
    const {
        playerCount = 4,
        phase = "playing",
        round = 1,
        currentTurnIndex = 0,
        boardTileCount = 0,
    } = options;

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
        gameMode: "individual",
        playerScores,
        settings: {
            winTarget: 100,
            roundLimit: null,
            gameMode: "individual",
            drawFromBoneyard: false,
            turnTimeLimit: null,
        },
    };

    const playerData: DominoesPlayerData = {
        hand: hands[0] || [],
        localOrdering: playOrder,
    };

    return { gameData, playerData };
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
    startingChips?: number;
    chipValue?: number;
    wildMode?: boolean;
    lastChipChallenge?: boolean;
    showRollResult?: boolean;
}

/**
 * Generate mock LRC game data for debugging.
 */
export function generateLRCMockData(options: LRCMockOptions = {}): {
    gameData: LRCData;
    playerData: LRCPlayerData;
} {
    const {
        playerCount = 4,
        phase = "waiting-for-roll",
        centerPot = 5,
        currentPlayerIndex = 0,
        startingChips = 3,
        chipValue = 0.25,
        wildMode = false,
        lastChipChallenge = false,
        showRollResult = false,
    } = options;

    const localPlayerId = generatePlayerId(0);

    // Generate LRC players
    const lrcPlayers: LRCPlayer[] = [];
    for (let i = 0; i < playerCount; i++) {
        const id = generatePlayerId(i);
        // Distribute chips somewhat randomly (some to center)
        const chips =
            i === 0
                ? startingChips
                : Math.max(0, startingChips - Math.floor(Math.random() * 2));
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
        if (wildMode) {
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
        settings: {
            winTarget: 100,
            roundLimit: null,
            turnTimeLimit: 30,
            startingChips,
            chipValue,
            wildMode,
            lastChipChallenge,
        },
    };

    const playerData: LRCPlayerData = {
        localOrdering: lrcPlayers.map((p) => p.id),
        odusId: localPlayerId,
        isMyTurn: currentPlayerIndex === 0,
        myChips: lrcPlayers[0].chips,
        netWinningsCents: 0,
    };

    return { gameData, playerData };
}
