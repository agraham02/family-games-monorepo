// src/hooks/useGameSettingsSchema.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchGameSettingsSchema } from "@/services/gameSettings";
import type {
    GameSettingsSchema,
    SettingDefinition,
    BaseGameSettings,
} from "@/types/lobby";

interface UseGameSettingsSchemaResult {
    definitions: SettingDefinition[];
    defaults: BaseGameSettings | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

// LocalStorage key prefix for settings schemas
// Increment version when schema structure changes to bust cache
const SCHEMA_CACHE_VERSION = 2;
const STORAGE_KEY_PREFIX = `gameSettingsSchema_v${SCHEMA_CACHE_VERSION}_`;

/**
 * Get cached schema from localStorage
 */
function getCachedSchema(gameType: string): GameSettingsSchema | null {
    if (typeof window === "undefined") return null;
    try {
        const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}${gameType}`);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn("Failed to parse cached schema:", e);
    }
    return null;
}

/**
 * Save schema to localStorage
 */
function setCachedSchema(gameType: string, schema: GameSettingsSchema): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(
            `${STORAGE_KEY_PREFIX}${gameType}`,
            JSON.stringify(schema)
        );
    } catch (e) {
        console.warn("Failed to cache schema:", e);
    }
}

/**
 * Hook to fetch and cache game settings schema for a given game type.
 * Caches results in localStorage for persistence across sessions.
 */
export function useGameSettingsSchema(
    gameType: string | null
): UseGameSettingsSchemaResult {
    const [definitions, setDefinitions] = useState<SettingDefinition[]>([]);
    const [defaults, setDefaults] = useState<BaseGameSettings | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fetchedTypeRef = useRef<string | null>(null);

    const fetchSchema = useCallback(async function fetchSchema(type: string) {
        // Check localStorage cache first
        const cached = getCachedSchema(type);
        if (cached) {
            setDefinitions(cached.definitions);
            setDefaults(cached.defaults);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const schema = await fetchGameSettingsSchema(type);
            setCachedSchema(type, schema);
            setDefinitions(schema.definitions);
            setDefaults(schema.defaults);
        } catch (err) {
            console.error(`Failed to fetch settings schema for ${type}:`, err);
            setError(
                err instanceof Error ? err.message : "Failed to load settings"
            );
            setDefinitions([]);
            setDefaults(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!gameType) {
            setDefinitions([]);
            setDefaults(null);
            setError(null);
            fetchedTypeRef.current = null;
            return;
        }

        // Only fetch if game type changed
        if (fetchedTypeRef.current !== gameType) {
            fetchedTypeRef.current = gameType;
            fetchSchema(gameType);
        }
    }, [gameType, fetchSchema]);

    const refetch = useCallback(() => {
        if (gameType) {
            // Clear localStorage cache for this type and refetch
            if (typeof window !== "undefined") {
                localStorage.removeItem(`${STORAGE_KEY_PREFIX}${gameType}`);
            }
            fetchSchema(gameType);
        }
    }, [gameType, fetchSchema]);

    return {
        definitions,
        defaults,
        isLoading,
        error,
        refetch,
    };
}
