import { Router } from "express";
import { RetroAchievementsService } from "../lib/RetroAchievements";
import { logger } from "../core/Logger";

const router = Router();

router.get("/status", (req, res) => {
    res.json({
        enabled: RetroAchievementsService.isEnabled(),
        username: process.env.RETRO_USERNAME || null,
        configured: !!process.env.RETRO_API_KEY
    });
});

router.get("/game/:title", async (req, res) => {
    try {
        const title = req.params.title;
        const gameId = await RetroAchievementsService.getGameIdByTitle(title);
        
        if (!gameId) {
            return res.status(404).json({ error: "GAME_NOT_FOUND_ON_RA" });
        }

        const achievements = await RetroAchievementsService.getGameAchievements(gameId);
        res.json({
            raGameId: gameId,
            achievements
        });
    } catch (e: any) {
        logger.error(`[RetroRouter] Error fetching RA data: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

router.get("/user/:username?", async (req, res) => {
    try {
        const username = req.params.username;
        const summary = await RetroAchievementsService.getUserSummary(username);
        res.json(summary);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export { router as RetroRouter };
