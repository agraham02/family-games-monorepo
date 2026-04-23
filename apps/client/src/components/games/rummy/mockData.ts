// Rummy mock data generators for /debug/game-ui
// Mirrors the shape of generateSpadesMockData in components/games/mockData.ts.

import {
    RummyData,
    RummyPlayerData,
    RummyClientSettings,
    RummyMeldView,
    RummyDiscardView,
    PlayingCard,
    DEFAULT_RUMMY_SETTINGS,
    Suit,
    Rank,
} from "@shared/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_NAMES = ["You", "Alice", "Bob", "Charlie", "Diana", "Eve"];
const SUITS: Array<PlayingCard["suit"]> = [
    "Hearts",
    "Diamonds",
    "Clubs",
    "Spades",
];
const RANKS = [
    "A",
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
];

function pid(i: number): string {
    return `player-${i}`;
}

function generateRummyPlayers(
    count: number,
): Record<string, { id: string; name: string; isConnected: boolean }> {
    const players: Record<
        string,
        { id: string; name: string; isConnected: boolean }
    > = {};
    for (let i = 0; i < count; i++) {
        const id = pid(i);
        players[id] = {
            id,
            name: MOCK_NAMES[i] || `Player ${i + 1}`,
            isConnected: true,
        };
    }
    return players;
}

function buildDeck(): PlayingCard[] {
    const deck: PlayingCard[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RummyMockOptions {
    playerCount?: number;
    phase?: RummyData["phase"];
    turnSubstate?: RummyData["turnSubstate"];
    round?: number;
    currentTurnIndex?: number;
    discardPileSize?: number;
    meldsPerPlayer?: number;
    handSize?: number;
    includeRummyCall?: boolean;
    settings?: Partial<RummyClientSettings>;
}

export function generateRummyMockData(options: RummyMockOptions = {}): {
    gameData: RummyData;
    playerData: RummyPlayerData;
    playerDataMap: Record<string, RummyPlayerData>;
} {
    const {
        playerCount = 3,
        phase = "playing",
        turnSubstate = "awaiting-draw",
        round = 1,
        currentTurnIndex = 0,
        discardPileSize = 4,
        meldsPerPlayer = 1,
        handSize = 9,
        includeRummyCall = false,
        settings = {},
    } = options;

    const finalSettings: RummyClientSettings = {
        winTarget: DEFAULT_RUMMY_SETTINGS.winTarget,
        roundLimit: DEFAULT_RUMMY_SETTINGS.roundLimit,
        turnTimeLimit: DEFAULT_RUMMY_SETTINGS.turnTimeLimit,
        goingOutBonus: DEFAULT_RUMMY_SETTINGS.goingOutBonus,
        rummyCallWindowMs: DEFAULT_RUMMY_SETTINGS.rummyCallWindowMs,
        dealSizeMin: DEFAULT_RUMMY_SETTINGS.dealSizeMin,
        dealSizeMax: DEFAULT_RUMMY_SETTINGS.dealSizeMax,
        ...settings,
    };

    const players = generateRummyPlayers(playerCount);
    const playOrder = Array.from({ length: playerCount }, (_, i) => pid(i));
    const localPlayerId = pid(0);

    // Deal hands from a fresh shuffled deck.
    const deck = shuffle(buildDeck());
    let cursor = 0;
    const hands: Record<string, PlayingCard[]> = {};
    playOrder.forEach((id) => {
        hands[id] = deck.slice(cursor, cursor + handSize);
        cursor += handSize;
    });

    // Build melds — alternate between sets and runs by player.
    const melds: RummyMeldView[] = [];
    let meldCounter = 0;
    playOrder.forEach((ownerId, ownerIdx) => {
        for (let m = 0; m < meldsPerPlayer; m++) {
            const id = `m${++meldCounter}`;
            const isSet = (ownerIdx + m) % 2 === 0;
            if (isSet) {
                // 7s of three suits
                const rank = RANKS[(ownerIdx + m + 5) % RANKS.length];
                melds.push({
                    id,
                    kind: "set",
                    cards: [
                        { rank, suit: "Hearts" },
                        { rank, suit: "Clubs" },
                        { rank, suit: "Diamonds" },
                    ],
                    ownerId,
                    round,
                });
            } else {
                // Run of 4 in a single suit
                const startIdx = (ownerIdx + m + 2) % (RANKS.length - 4);
                const suit = SUITS[(ownerIdx + m) % SUITS.length];
                melds.push({
                    id,
                    kind: "run",
                    cards: [
                        { rank: RANKS[startIdx], suit },
                        { rank: RANKS[startIdx + 1], suit },
                        { rank: RANKS[startIdx + 2], suit },
                        { rank: RANKS[startIdx + 3], suit },
                    ],
                    ownerId,
                    round,
                });
            }
        }
    });

    // Discard pile: pull from the deck (top = last index).
    const discardCards = deck.slice(cursor, cursor + discardPileSize);
    cursor += discardPileSize;
    const discard: RummyDiscardView = { cards: discardCards };

    const stockCount = Math.max(0, deck.length - cursor);

    const handCounts: Record<string, number> = {};
    playOrder.forEach((id) => {
        handCounts[id] = hands[id].length;
    });

    const scores: Record<string, number> = {};
    playOrder.forEach((id, idx) => {
        // Round 1 → fresh game, everyone at 0. Later rounds get varied totals
        // so the UI for multi-round scoreboards can be exercised.
        scores[id] = round <= 1 ? 0 : idx === 0 ? 145 : 80 + idx * 35;
    });

    const gameData: RummyData = {
        id: "mock-rummy-game",
        roomId: "mock-room",
        type: "rummy",
        players,
        leaderId: localPlayerId,
        playOrder,
        dealerIndex: 0,
        currentTurnIndex,
        phase,
        turnSubstate,
        round,
        handCounts,
        stockCount,
        discard,
        melds,
        scores,
        settings: finalSettings,
    };

    if (includeRummyCall && discardCards.length > 0) {
        const top = discardCards[discardCards.length - 1];
        gameData.rummyCall = {
            card: top,
            discardedById:
                playOrder[(currentTurnIndex + playerCount - 1) % playerCount],
            openedAt: Date.now(),
            closesAt: Date.now() + finalSettings.rummyCallWindowMs,
            eligibleMeldIds: melds.length > 0 ? [melds[0].id] : [],
        };
    }

    const playerDataMap: Record<string, RummyPlayerData> = {};
    playOrder.forEach((id) => {
        playerDataMap[id] = {
            localOrdering: playOrder,
            hand: hands[id],
        };
    });

    return {
        gameData,
        playerData: playerDataMap[localPlayerId],
        playerDataMap,
    };
}

// Re-export the enums so debug pages can construct manual mock data without
// importing from @shared/types directly.
export { Suit, Rank };
