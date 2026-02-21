// packages/shared/src/types/games/index.ts
// Barrel export for all game types

// Base types
export * from "./base";

// Game-specific types
export * from "./spades";
export * from "./dominoes";
export * from "./lrc";

// ============================================================================
// Union Types for Multi-Game Support
// ============================================================================

import { SpadesData, SpadesPlayerData } from "./spades";
import { DominoesData, DominoesPlayerData } from "./dominoes";
import { LRCData, LRCPlayerData } from "./lrc";

/**
 * Union type for all game data types (public state).
 * Use this when handling game state generically.
 */
export type GameData = SpadesData | DominoesData | LRCData;

/**
 * Union type for all player data types (private state).
 * Use this when handling player-specific state generically.
 */
export type PlayerData = SpadesPlayerData | DominoesPlayerData | LRCPlayerData;
