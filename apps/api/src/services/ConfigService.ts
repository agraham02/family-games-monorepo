// apps/api/src/services/ConfigService.ts
// Service for fetching and caching configuration from Supabase

import { getSupabaseClient, isSupabaseConfigured } from "../config/supabase";
import { GameTypeMetadata } from "@family-games/shared";
import { gameManager } from "./GameManager";

// ============================================================================
// Types
// ============================================================================

/**
 * Database row type for games table
 */
interface GameRow {
    id: string;
    display_name: string;
    description: string | null;
    min_players: number;
    max_players: number;
    requires_teams: boolean;
    num_teams: number | null;
    players_per_team: number | null;
    enabled: boolean;
    coming_soon: boolean;
    sort_order: number;
}

/**
 * Cached data with expiration
 */
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

// ============================================================================
// Configuration
// ============================================================================

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// ============================================================================
// Cache Storage
// ============================================================================

let gamesCache: CacheEntry<GameTypeMetadata[]> | null = null;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetch all games from Supabase (including coming soon).
 * Returns games ordered by sort_order.
 */
async function fetchGamesFromDatabase(): Promise<GameTypeMetadata[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from("games")
        .select("*")
        .order("sort_order", { ascending: true });

    if (error) {
        console.error(
            "[ConfigService] Error fetching games from Supabase:",
            error
        );
        throw error;
    }

    return (data as GameRow[]).map((row) => ({
        type: row.id,
        displayName: row.display_name,
        description: row.description ?? undefined,
        minPlayers: row.min_players,
        maxPlayers: row.max_players,
        requiresTeams: row.requires_teams,
        numTeams: row.num_teams ?? undefined,
        playersPerTeam: row.players_per_team ?? undefined,
        enabled: row.enabled,
        comingSoon: row.coming_soon,
    }));
}

/**
 * Get all games with caching.
 * Falls back to code-defined games if Supabase is not configured.
 */
export async function getGames(): Promise<GameTypeMetadata[]> {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
        console.log(
            "[ConfigService] Supabase not configured, falling back to code-defined games"
        );
        return getCodeDefinedGames();
    }

    // Check cache
    if (gamesCache && Date.now() < gamesCache.expiresAt) {
        return gamesCache.data;
    }

    try {
        const games = await fetchGamesFromDatabase();

        // Update cache
        gamesCache = {
            data: games,
            expiresAt: Date.now() + CACHE_TTL_MS,
        };

        return games;
    } catch (error) {
        console.error(
            "[ConfigService] Failed to fetch games, falling back to code-defined games:",
            error
        );
        return getCodeDefinedGames();
    }
}

/**
 * Get only enabled games (playable games, not coming soon).
 */
export async function getEnabledGames(): Promise<GameTypeMetadata[]> {
    const games = await getGames();
    return games.filter((game) => game.enabled && !game.comingSoon);
}

/**
 * Get only coming soon games.
 */
export async function getComingSoonGames(): Promise<GameTypeMetadata[]> {
    const games = await getGames();
    return games.filter((game) => game.comingSoon);
}

/**
 * Force refresh the games cache.
 * Call this after admin updates to get immediate changes.
 */
export function refreshGamesCache(): void {
    gamesCache = null;
    console.log("[ConfigService] Games cache cleared");
}

/**
 * Fallback: Get games from registered GameManager modules.
 * Used when Supabase is not configured or unavailable.
 */
function getCodeDefinedGames(): GameTypeMetadata[] {
    return Array.from(gameManager.getAllModules().entries()).map(
        ([type, module]) => ({
            type,
            displayName: module.metadata?.displayName ?? type,
            description: module.metadata?.description,
            minPlayers: module.metadata?.minPlayers ?? 2,
            maxPlayers: module.metadata?.maxPlayers ?? 4,
            requiresTeams: module.metadata?.requiresTeams ?? false,
            numTeams: module.metadata?.numTeams,
            playersPerTeam: module.metadata?.playersPerTeam,
            enabled: true,
            comingSoon: false,
        })
    );
}

// ============================================================================
// Export Singleton Pattern
// ============================================================================

export const configService = {
    getGames,
    getEnabledGames,
    getComingSoonGames,
    refreshGamesCache,
};
