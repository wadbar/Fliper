import { logger } from "../core/Logger";

export interface RetroAchievement {
    id: string;
    title: string;
    description: string;
    points: number;
    badgeName: string;
    dateEarned?: string;
    difficulty?: string;
}

export class RetroAchievementsService {
    private static API_BASE = "https://retroachievements.org/API";
    
    private static get credentials() {
        return {
            user: process.env.RETRO_USERNAME,
            key: process.env.RETRO_API_KEY
        };
    }

    public static isEnabled(): boolean {
        return !!(this.credentials.user && this.credentials.key);
    }

    public static async getGameIdByTitle(title: string): Promise<number | null> {
        if (!this.isEnabled()) return null;
        try {
            const { user, key } = this.credentials;
            const url = `${this.API_BASE}/API_GetGameID.php?z=${user}&y=${key}&t=${encodeURIComponent(title)}`;
            const res = await fetch(url);
            const data = await res.json();
            return typeof data === 'number' ? data : (data.GameID || null);
        } catch (e) {
            logger.error(`[RA] Failed to fetch GameID for ${title}:`, e);
            return null;
        }
    }

    public static async getGameAchievements(gameId: number, targetUser?: string): Promise<RetroAchievement[]> {
        if (!this.isEnabled()) return [];
        try {
            const { user, key } = this.credentials;
            const checkUser = targetUser || user;
            const url = `${this.API_BASE}/API_GetGameInfoAndUserProgress.php?z=${user}&y=${key}&g=${gameId}&u=${checkUser}`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (!data.Achievements) return [];

            return Object.values(data.Achievements).map((ach: any) => ({
                id: ach.ID.toString(),
                title: ach.Title,
                description: ach.Description,
                points: parseInt(ach.Points),
                badgeName: ach.BadgeName,
                dateEarned: ach.DateEarned,
                difficulty: parseInt(ach.Points) > 50 ? 'legendary' : parseInt(ach.Points) > 25 ? 'hard' : 'medium'
            }));
        } catch (e) {
            logger.error(`[RA] Failed to fetch achievements for ID ${gameId}:`, e);
            return [];
        }
    }

    public static async getUserSummary(targetUser?: string) {
        if (!this.isEnabled()) return null;
        try {
            const { user, key } = this.credentials;
            const checkUser = targetUser || user;
            const url = `${this.API_BASE}/API_GetUserSummary.php?z=${user}&y=${key}&u=${checkUser}`;
            const res = await fetch(url);
            return await res.json();
        } catch (e) {
            logger.error(`[RA] User summary fetch failed:`, e);
            return null;
        }
    }
}
