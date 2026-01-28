// src/games/dominoes/helpers/tile.ts

import { Tile } from "@family-games/shared";
import { v4 as uuidv4 } from "uuid";
import { GamePlayers } from "../../../services/GameManager";
import { shuffle } from "../../shared";

/**
 * Generate a standard double-six domino set (28 tiles)
 * Tiles range from [0,0] to [6,6]
 * Each tile has a unique UUID to prevent ID collisions across games
 */
export function buildDominoSet(): Tile[] {
    const tiles: Tile[] = [];

    for (let left = 0; left <= 6; left++) {
        for (let right = left; right <= 6; right++) {
            tiles.push({
                left,
                right,
                id: uuidv4(),
            });
        }
    }

    return tiles;
}

/**
 * Shuffle tiles using shared Fisher-Yates implementation.
 */
export function shuffleTiles(
    tiles: Tile[],
    rng: () => number = Math.random,
): Tile[] {
    return shuffle(tiles, rng);
}

/**
 * Result of dealing tiles to players
 */
export interface DealResult {
    hands: Record<string, Tile[]>;
    boneyard: Tile[];
}

/**
 * Deal tiles to players.
 * Standard mode (drawFromBoneyard=false): Each player gets 7 tiles, no boneyard.
 * Boneyard mode (drawFromBoneyard=true): Each player gets 5 tiles, 8 remain in boneyard.
 */
export function dealTilesToPlayers(
    tiles: Tile[],
    players: GamePlayers,
    drawFromBoneyard: boolean = false,
): DealResult {
    const playerIds = Object.keys(players);
    if (playerIds.length !== 4) {
        throw new Error("Dominoes needs 4 players");
    }

    const tilesPerPlayer = drawFromBoneyard ? 5 : 7;
    const totalTilesToDeal = tilesPerPlayer * 4;

    const hands: Record<string, Tile[]> = playerIds.reduce(
        (acc, id) => {
            acc[id] = [];
            return acc;
        },
        {} as Record<string, Tile[]>,
    );

    if (tiles.length < totalTilesToDeal) {
        throw new Error(
            `Not enough tiles to deal ${tilesPerPlayer} to 4 players`,
        );
    }

    // Deal tiles to each player
    for (let i = 0; i < totalTilesToDeal; i++) {
        const playerId = playerIds[i % 4];
        hands[playerId].push(tiles[i]);
    }

    // Remaining tiles go to boneyard
    const boneyard = tiles.slice(totalTilesToDeal);

    // Sort each hand by left value, then right value
    for (const playerId of playerIds) {
        hands[playerId] = sortHand(hands[playerId]);
    }

    return { hands, boneyard };
}

/**
 * Sort tiles in a hand for consistent ordering
 */
function sortHand(hand: Tile[]): Tile[] {
    return hand.slice().sort((a, b) => {
        if (a.left !== b.left) {
            return a.left - b.left;
        }
        return a.right - b.right;
    });
}

/**
 * Check if a tile is a double (both sides have same value)
 */
export function isDouble(tile: Tile): boolean {
    return tile.left === tile.right;
}

/**
 * Get the highest double in a hand, or null if none
 */
export function getHighestDouble(hand: Tile[]): Tile | null {
    const doubles = hand.filter(isDouble);
    if (doubles.length === 0) return null;
    return doubles.reduce((highest, tile) =>
        tile.left > highest.left ? tile : highest,
    );
}

/**
 * Find the player with the highest double in their hand
 * Returns the playerId or null if no player has a double
 */
export function findPlayerWithHighestDouble(
    hands: Record<string, Tile[]>,
): string | null {
    let highestDouble: Tile | null = null;
    let playerWithHighest: string | null = null;

    for (const [playerId, hand] of Object.entries(hands)) {
        const playerHighest = getHighestDouble(hand);
        if (playerHighest) {
            if (!highestDouble || playerHighest.left > highestDouble.left) {
                highestDouble = playerHighest;
                playerWithHighest = playerId;
            }
        }
    }

    return playerWithHighest;
}
