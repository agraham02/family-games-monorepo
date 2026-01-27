// src/components/games/registry.ts
// Game component registry for dynamic game type rendering

import { ComponentType } from "react";
import Dominoes from "./dominoes";
import Spades from "./spades";
import LRC from "./lrc";
import { GameData, PlayerData } from "@shared/types";
import {
    generateSpadesMockData,
    generateDominoesMockData,
    generateLRCMockData,
    SpadesMockOptions,
    DominoesMockOptions,
    LRCMockOptions,
} from "./mockData";

/**
 * Base props interface that all game components must implement
 */
export interface GameComponentProps<
    TGameData extends GameData = GameData,
    TPlayerData extends PlayerData = PlayerData,
> {
    gameData: TGameData;
    playerData: TPlayerData | null;
    /** Optional flag for debug mode - skips context dependencies */
    debugMode?: boolean;
    /** Function to dispatch optimistic game actions - undefined for spectators */
    dispatchOptimisticAction?: (
        actionType: string,
        actionPayload: unknown,
    ) => void;
    /** Whether the viewer is a spectator (read-only mode) */
    isSpectator?: boolean;
    /** Room code for navigation (6-character code) */
    roomCode?: string;
}

/**
 * Mock data generator function type
 */
type MockDataGenerator<TOptions = Record<string, unknown>> = (
    options?: TOptions,
) => {
    gameData: GameData;
    playerData: PlayerData;
};

/**
 * Registry entry for a game component
 * Uses a generic component type that accepts GameComponentProps with any valid
 * game data and player data types. The registry stores heterogeneous game
 * components that get rendered dynamically based on game type.
 */
interface GameRegistryEntry {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: ComponentType<GameComponentProps<any, any>>;
    displayName: string;
    /** Generate mock data for debugging */
    generateMockData?: MockDataGenerator<Record<string, unknown>>;
    /** Default options for mock data generation */
    defaultMockOptions?: Record<string, unknown>;
}

/**
 * Registry mapping game types to their components.
 * Add new games here as they are implemented.
 */
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
    dominoes: {
        component: Dominoes,
        displayName: "Dominoes",
        generateMockData:
            generateDominoesMockData as MockDataGenerator<DominoesMockOptions>,
        defaultMockOptions: {
            playerCount: 4,
            phase: "playing",
            round: 1,
            boardTileCount: 5,
        },
    },
    spades: {
        component: Spades,
        displayName: "Spades",
        generateMockData:
            generateSpadesMockData as MockDataGenerator<SpadesMockOptions>,
        defaultMockOptions: {
            playerCount: 4,
            phase: "playing",
            round: 1,
            includeCurrentTrick: true,
        },
    },
    lrc: {
        component: LRC,
        displayName: "Left Right Center",
        generateMockData:
            generateLRCMockData as MockDataGenerator<LRCMockOptions>,
        defaultMockOptions: {
            playerCount: 5,
            phase: "waiting-for-roll",
            centerPot: 5,
            startingChips: 3,
            chipValue: 0.25,
            wildMode: false,
        },
    },
};

/**
 * Get the game component for a given game type.
 * Returns null if the game type is not registered.
 */
export function getGameComponent(
    gameType: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ComponentType<GameComponentProps<any, any>> | null {
    return GAME_REGISTRY[gameType]?.component ?? null;
}

/**
 * Check if a game type is registered.
 */
export function isGameTypeSupported(gameType: string): boolean {
    return gameType in GAME_REGISTRY;
}

/**
 * Get all registered game types.
 */
export function getRegisteredGameTypes(): string[] {
    return Object.keys(GAME_REGISTRY);
}

/**
 * Get mock data generator for a game type.
 */
export function getMockDataGenerator(
    gameType: string,
): MockDataGenerator | null {
    return GAME_REGISTRY[gameType]?.generateMockData ?? null;
}

/**
 * Get display name for a game type.
 */
export function getGameDisplayName(gameType: string): string {
    return GAME_REGISTRY[gameType]?.displayName ?? gameType;
}

/**
 * Get default mock options for a game type.
 */
export function getDefaultMockOptions(
    gameType: string,
): Record<string, unknown> {
    return GAME_REGISTRY[gameType]?.defaultMockOptions ?? {};
}
