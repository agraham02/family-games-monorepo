// src/routes/gameRoutes.ts
import express from "express";
import { gameManager } from "../services/GameManager";
import { configService } from "../services/ConfigService";

const router = express.Router();

router.get("/games", async (req, res) => {
    try {
        // Get games from database (with caching), includes enabled and coming soon games
        const games = await configService.getGames();
        res.json({ games });
    } catch (error) {
        console.error("[gameRoutes] Error fetching games:", error);
        // Fallback to code-defined games
        const games = Array.from(gameManager.getAllModules().entries()).map(
            ([type, module]) => {
                return module.metadata
                    ? { ...module.metadata, enabled: true, comingSoon: false }
                    : {
                          type,
                          displayName: type,
                          requiresTeams: false,
                          enabled: true,
                          comingSoon: false,
                      };
            }
        );
        res.json({ games });
    }
});

/**
 * GET /games/:type/settings
 * Returns the settings schema (definitions) and default values for a game type.
 * Used by clients to dynamically generate settings forms.
 */
router.get("/games/:type/settings", (req, res) => {
    const { type } = req.params;

    const settingsData = gameManager.getSettingsForGame(type);

    if (!settingsData) {
        return res.status(404).json({
            error: `Game type '${type}' not found`,
        });
    }

    res.json(settingsData);
});

export default router;
