import {
    GameData,
    PlayerData,
    SpadesData,
    SpadesPlayerData,
    PlayingCard,
    DominoesData,
    DominoesPlayerData,
    Tile,
} from "@shared/types";

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
    action: { type: string; payload: { card: PlayingCard }; userId: string }
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
        (c) => c.rank === card.rank && c.suit === card.suit
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
    }
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
            team.players.includes(userId)
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
        (playerId) => newBids[playerId] !== undefined || playerId === userId
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
    }
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
        // Place on specified side
        if (side === "left") {
            newBoardTiles.unshift(tile);
            newBoard.tiles = newBoardTiles;
            newBoard.leftEnd = {
                value:
                    tile.left === newBoard.leftEnd?.value
                        ? tile.right
                        : tile.left,
                tileId: tile.id,
            };
        } else {
            newBoardTiles.push(tile);
            newBoard.tiles = newBoardTiles;
            newBoard.rightEnd = {
                value:
                    tile.right === newBoard.rightEnd?.value
                        ? tile.left
                        : tile.right,
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
    action: { type: string; payload: Record<string, never>; userId: string }
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
// MAIN REDUCER ROUTER
// =====================

/**
 * Main optimistic reducer that routes to game-specific reducers
 */
export function optimisticGameReducer(
    gameData: GameData,
    playerData: PlayerData,
    action: { type: string; payload: unknown; userId: string }
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
                    }
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
                    }
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
                    }
                );
            case "PASS":
                return optimisticDominoesPass(
                    dominoesData,
                    dominoesPlayerData,
                    action as {
                        type: string;
                        payload: Record<string, never>;
                        userId: string;
                    }
                );
            default:
                // No optimistic update for this action
                return null;
        }
    }

    return null;
}
