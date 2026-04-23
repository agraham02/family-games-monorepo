import {
    GameData,
    PlayerData,
    SpadesData,
    SpadesPlayerData,
    PlayingCard,
    DominoesData,
    DominoesPlayerData,
    Tile,
    RummyData,
    RummyPlayerData,
    RummyMeldView,
} from "@shared/types";
import { orientDominoTileForEnd } from "@shared/utils";

/**
 * Client-side optimistic reducers that mirror server logic
 * These apply predicted state changes immediately without waiting for server confirmation
 */

type OptimisticUpdateResult = {
    gameData?: Partial<GameData>;
    playerData?: Partial<PlayerData>;
};

// =====================
// SPADES REDUCERS
// =====================

/**
 * Optimistically handle PLAY_CARD action for Spades
 */
function optimisticSpadesPlayCard(
    gameData: SpadesData,
    playerData: SpadesPlayerData,
    action: { type: string; payload: { card: PlayingCard }; userId: string },
): OptimisticUpdateResult | null {
    const { card } = action.payload;
    const { userId } = action;

    // Validate it's the player's turn
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    if (currentPlayerId !== userId) {
        return null;
    }

    // Validate card is in hand
    const cardIndex = playerData.hand.findIndex(
        (c) => c.rank === card.rank && c.suit === card.suit,
    );
    if (cardIndex === -1) {
        return null;
    }

    // Remove card from hand
    const newHand = [...playerData.hand];
    newHand.splice(cardIndex, 1);

    // Add card to current trick
    const newTrick = gameData.currentTrick
        ? { ...gameData.currentTrick }
        : { plays: [] };

    newTrick.plays = [
        ...newTrick.plays,
        {
            playerId: userId,
            card,
        },
    ];

    // Update turn index (wrap around if needed)
    const newTurnIndex =
        (gameData.currentTurnIndex + 1) % gameData.playOrder.length;

    // Update hands count
    const newHandsCounts = { ...gameData.handsCounts };
    const previousCount = newHandsCounts[userId] ?? playerData.hand.length;
    newHandsCounts[userId] = previousCount - 1;

    // Update spadesBroken if a spade was played
    const newSpadesBroken = gameData.spadesBroken || card.suit === "Spades";

    return {
        gameData: {
            currentTrick: newTrick,
            currentTurnIndex: newTurnIndex,
            handsCounts: newHandsCounts,
            spadesBroken: newSpadesBroken,
        } as Partial<SpadesData>,
        playerData: {
            hand: newHand,
        },
    };
}

/**
 * Optimistically handle PLACE_BID action for Spades
 */
function optimisticSpadesPlaceBid(
    gameData: SpadesData,
    playerData: SpadesPlayerData,
    action: {
        type: string;
        payload: { bid: { amount: number; type: string; isBlind: boolean } };
        userId: string;
    },
): OptimisticUpdateResult | null {
    const { bid } = action.payload;
    const { userId } = action;

    // Validate it's the player's turn
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    if (currentPlayerId !== userId) {
        return null;
    }

    // Validate blind bid eligibility
    if (bid.type === "blind" || bid.type === "blind-nil") {
        const playerTeam = Object.entries(gameData.teams).find(([_, team]) =>
            team.players.includes(userId),
        );
        if (!playerTeam) return null;

        const teamId = Number(playerTeam[0]);
        const isEligible = gameData.teamEligibleForBlind?.[teamId];

        if (!isEligible) {
            console.warn("Blind bid attempted but team not eligible");
            return null; // Don't apply optimistic update
        }

        // Validate settings
        if (bid.type === "blind-nil" && !gameData.settings.blindNilEnabled) {
            return null;
        }
        if (bid.type === "blind" && !gameData.settings.blindBidEnabled) {
            return null;
        }
    }

    // Update bids
    const newBids = { ...gameData.bids };
    newBids[userId] = bid;

    // Update turn index
    const newTurnIndex =
        (gameData.currentTurnIndex + 1) % gameData.playOrder.length;

    // Check if bidding is complete
    const allBidsPlaced = gameData.playOrder.every(
        (playerId) => newBids[playerId] !== undefined || playerId === userId,
    );

    return {
        gameData: {
            bids: newBids,
            currentTurnIndex: newTurnIndex,
            // If all bids are placed, transition to playing phase
            ...(allBidsPlaced && { phase: "playing" as const }),
        } as Partial<SpadesData>,
    };
}

// =====================
// DOMINOES REDUCERS
// =====================

/**
 * Optimistically handle PLACE_TILE action for Dominoes
 */
function optimisticDominoesPlaceTile(
    gameData: DominoesData,
    playerData: DominoesPlayerData,
    action: {
        type: string;
        payload: { tile: Tile; side: "left" | "right" };
        userId: string;
    },
): OptimisticUpdateResult | null {
    const { tile, side } = action.payload;
    const { userId } = action;

    // Validate it's the player's turn
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    if (currentPlayerId !== userId) {
        return null;
    }

    // Validate tile is in hand
    const tileIndex = playerData.hand.findIndex((t) => t.id === tile.id);
    if (tileIndex === -1) {
        return null;
    }

    // Remove tile from hand
    const newHand = [...playerData.hand];
    newHand.splice(tileIndex, 1);

    // Update board
    const newBoard = { ...gameData.board };
    const newBoardTiles = [...newBoard.tiles];

    // First tile
    if (newBoardTiles.length === 0) {
        newBoardTiles.push(tile);
        newBoard.tiles = newBoardTiles;
        newBoard.leftEnd = { value: tile.left, tileId: tile.id };
        newBoard.rightEnd = { value: tile.right, tileId: tile.id };
    } else {
        const targetEnd =
            side === "left" ? newBoard.leftEnd : newBoard.rightEnd;
        if (!targetEnd) {
            return null;
        }

        const { orientedTile, newEndValue } = orientDominoTileForEnd(
            tile,
            targetEnd.value,
        );

        // Place on specified side
        if (side === "left") {
            newBoardTiles.unshift(orientedTile);
            newBoard.tiles = newBoardTiles;
            newBoard.leftEnd = {
                value: newEndValue,
                tileId: tile.id,
            };
        } else {
            newBoardTiles.push(orientedTile);
            newBoard.tiles = newBoardTiles;
            newBoard.rightEnd = {
                value: newEndValue,
                tileId: tile.id,
            };
        }
    }

    // Update turn index
    const newTurnIndex =
        (gameData.currentTurnIndex + 1) % gameData.playOrder.length;

    // Update hands count
    const newHandsCounts = { ...gameData.handsCounts };
    newHandsCounts[userId] = newHand.length;

    // Reset consecutive passes
    return {
        gameData: {
            board: newBoard,
            currentTurnIndex: newTurnIndex,
            handsCounts: newHandsCounts,
            consecutivePasses: 0,
        } as Partial<DominoesData>,
        playerData: {
            hand: newHand,
        },
    };
}

/**
 * Optimistically handle PASS action for Dominoes
 */
function optimisticDominoesPass(
    gameData: DominoesData,
    playerData: DominoesPlayerData,
    action: { type: string; payload: Record<string, never>; userId: string },
): OptimisticUpdateResult | null {
    const { userId } = action;

    // Validate it's the player's turn
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    if (currentPlayerId !== userId) {
        return null;
    }

    // Update turn index
    const newTurnIndex =
        (gameData.currentTurnIndex + 1) % gameData.playOrder.length;

    // Increment consecutive passes
    const newConsecutivePasses = gameData.consecutivePasses + 1;

    return {
        gameData: {
            currentTurnIndex: newTurnIndex,
            consecutivePasses: newConsecutivePasses,
        } as Partial<DominoesData>,
    };
}

// =====================
// RUMMY REDUCERS
// =====================

type RummyCardLite = { suit: string; rank: string };

function cardKey(c: { suit: string; rank: string }): string {
    return `${c.suit}|${c.rank}`;
}

function findCardIndex(hand: PlayingCard[], target: RummyCardLite): number {
    const key = cardKey(target);
    return hand.findIndex((c) => cardKey(c) === key);
}

/**
 * Optimistic LAY_MELD: remove cards from hand, append a placeholder meld,
 * decrement handCounts. Does NOT advance turn (substate stays may-meld).
 */
function optimisticRummyLayMeld(
    gameData: RummyData,
    playerData: RummyPlayerData,
    action: {
        type: string;
        payload: { cards: RummyCardLite[]; playerId?: string };
        userId: string;
    },
): OptimisticUpdateResult | null {
    const { userId } = action;
    const cards = action.payload.cards;
    if (!Array.isArray(cards) || cards.length < 3) return null;

    // Verify it's the player's turn and substate allows melding
    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    if (currentPlayerId !== userId) return null;
    if (gameData.turnSubstate !== "may-meld") return null;

    // Remove each card from hand (one occurrence per requested card).
    const newHand = [...playerData.hand];
    const removedDisplay: PlayingCard[] = [];
    for (const target of cards) {
        const idx = findCardIndex(newHand, target);
        if (idx === -1) return null; // card not in hand → bail
        removedDisplay.push(newHand[idx]);
        newHand.splice(idx, 1);
    }

    // Pick a meld kind heuristically (server is authoritative; this is just
    // for the placeholder render until sync arrives).
    const allSameRank = removedDisplay.every(
        (c) => c.rank === removedDisplay[0].rank,
    );
    const kind: "set" | "run" = allSameRank ? "set" : "run";

    const placeholderMeld: RummyMeldView = {
        id: `optimistic-${Date.now()}`,
        kind,
        cards: removedDisplay,
        ownerId: userId,
        round: gameData.round,
    };

    const newHandCounts = { ...gameData.handCounts };
    newHandCounts[userId] =
        (newHandCounts[userId] ?? newHand.length + cards.length) - cards.length;

    return {
        gameData: {
            melds: [...gameData.melds, placeholderMeld],
            handCounts: newHandCounts,
        } as Partial<RummyData>,
        playerData: { hand: newHand },
    };
}

/**
 * Optimistic LAY_OFF: append card to target meld and remove from hand.
 */
function optimisticRummyLayOff(
    gameData: RummyData,
    playerData: RummyPlayerData,
    action: {
        type: string;
        payload: { meldId: string; card: RummyCardLite; playerId?: string };
        userId: string;
    },
): OptimisticUpdateResult | null {
    const { userId } = action;
    const { meldId, card } = action.payload;

    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    if (currentPlayerId !== userId) return null;
    if (gameData.turnSubstate !== "may-meld") return null;

    const meldIndex = gameData.melds.findIndex((m) => m.id === meldId);
    if (meldIndex === -1) return null;

    const handIdx = findCardIndex(playerData.hand, card);
    if (handIdx === -1) return null;

    const newHand = [...playerData.hand];
    const removed = newHand.splice(handIdx, 1)[0];

    const newMelds = [...gameData.melds];
    newMelds[meldIndex] = {
        ...newMelds[meldIndex],
        cards: [...newMelds[meldIndex].cards, removed],
    };

    const newHandCounts = { ...gameData.handCounts };
    newHandCounts[userId] = (newHandCounts[userId] ?? newHand.length + 1) - 1;

    return {
        gameData: {
            melds: newMelds,
            handCounts: newHandCounts,
        } as Partial<RummyData>,
        playerData: { hand: newHand },
    };
}

/**
 * Optimistic DISCARD: remove card from hand, push to discard pile, advance
 * turn index. Does NOT speculate the rummy-call window (server-authoritative).
 */
function optimisticRummyDiscard(
    gameData: RummyData,
    playerData: RummyPlayerData,
    action: {
        type: string;
        payload: { card: RummyCardLite; playerId?: string };
        userId: string;
    },
): OptimisticUpdateResult | null {
    const { userId } = action;
    const { card } = action.payload;

    const currentPlayerId = gameData.playOrder[gameData.currentTurnIndex];
    if (currentPlayerId !== userId) return null;
    if (gameData.turnSubstate !== "may-meld") return null;

    const handIdx = findCardIndex(playerData.hand, card);
    if (handIdx === -1) return null;

    const newHand = [...playerData.hand];
    const removed = newHand.splice(handIdx, 1)[0];

    const newDiscard = {
        cards: [...gameData.discard.cards, removed],
    };

    const newHandCounts = { ...gameData.handCounts };
    newHandCounts[userId] = (newHandCounts[userId] ?? newHand.length + 1) - 1;

    const newTurnIndex =
        (gameData.currentTurnIndex + 1) % gameData.playOrder.length;

    return {
        gameData: {
            discard: newDiscard,
            handCounts: newHandCounts,
            currentTurnIndex: newTurnIndex,
            turnSubstate: "awaiting-draw",
        } as Partial<RummyData>,
        playerData: { hand: newHand },
    };
}

// =====================
// MAIN REDUCER ROUTER
// =====================
/**
 * Main optimistic reducer that routes to game-specific reducers
 */
export function optimisticGameReducer(
    gameData: GameData,
    playerData: PlayerData,
    action: { type: string; payload: unknown; userId: string },
): OptimisticUpdateResult | null {
    if (gameData.type === "spades") {
        const spadesData = gameData as SpadesData;
        const spadesPlayerData = playerData as SpadesPlayerData;

        switch (action.type) {
            case "PLAY_CARD":
                return optimisticSpadesPlayCard(
                    spadesData,
                    spadesPlayerData,
                    action as {
                        type: string;
                        payload: { card: PlayingCard };
                        userId: string;
                    },
                );
            case "PLACE_BID":
                return optimisticSpadesPlaceBid(
                    spadesData,
                    spadesPlayerData,
                    action as {
                        type: string;
                        payload: {
                            bid: {
                                amount: number;
                                type: string;
                                isBlind: boolean;
                            };
                        };
                        userId: string;
                    },
                );
            default:
                // No optimistic update for this action
                return null;
        }
    } else if (gameData.type === "dominoes") {
        const dominoesData = gameData as DominoesData;
        const dominoesPlayerData = playerData as DominoesPlayerData;

        switch (action.type) {
            case "PLACE_TILE":
                return optimisticDominoesPlaceTile(
                    dominoesData,
                    dominoesPlayerData,
                    action as {
                        type: string;
                        payload: { tile: Tile; side: "left" | "right" };
                        userId: string;
                    },
                );
            case "PASS":
                return optimisticDominoesPass(
                    dominoesData,
                    dominoesPlayerData,
                    action as {
                        type: string;
                        payload: Record<string, never>;
                        userId: string;
                    },
                );
            default:
                // No optimistic update for this action
                return null;
        }
    } else if (gameData.type === "rummy") {
        const rummyData = gameData as RummyData;
        const rummyPlayerData = playerData as RummyPlayerData;

        switch (action.type) {
            case "LAY_MELD":
                return optimisticRummyLayMeld(
                    rummyData,
                    rummyPlayerData,
                    action as {
                        type: string;
                        payload: { cards: RummyCardLite[]; playerId?: string };
                        userId: string;
                    },
                );
            case "LAY_OFF":
                return optimisticRummyLayOff(
                    rummyData,
                    rummyPlayerData,
                    action as {
                        type: string;
                        payload: {
                            meldId: string;
                            card: RummyCardLite;
                            playerId?: string;
                        };
                        userId: string;
                    },
                );
            case "DISCARD":
                return optimisticRummyDiscard(
                    rummyData,
                    rummyPlayerData,
                    action as {
                        type: string;
                        payload: {
                            card: RummyCardLite;
                            playerId?: string;
                        };
                        userId: string;
                    },
                );
            // DRAW_STOCK / TAKE_DISCARD / CALL_RUMMY / CHOOSE_DEAL_SIZE /
            // NEXT_ROUND are all server-authoritative (require info the client
            // doesn't have or are race-arbitrated).
            default:
                return null;
        }
    }

    return null;
}
