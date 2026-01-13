// src/services/gameSettings.ts
import type { GameSettingsSchema } from "@shared/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Fetch the settings schema (definitions and defaults) for a game type.
 */
export async function fetchGameSettingsSchema(
    gameType: string
): Promise<GameSettingsSchema> {
    const response = await fetch(
        `${API_BASE_URL}/api/games/${gameType}/settings`
    );

    if (!response.ok) {
        throw new Error(
            `Failed to fetch settings for ${gameType}: ${response.statusText}`
        );
    }

    return response.json();
}
