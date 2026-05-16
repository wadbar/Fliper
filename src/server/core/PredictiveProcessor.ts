import { logger } from "./Logger";
import { enrichGameData } from "../../core/ai";

/**
 * PREDICTIVE KERNEL PROCESSOR
 * Pre-fetches metadata for high-probability cache hits.
 */
export class PredictiveProcessor {
  private static cache = new Map<string, any>();

  public static async analyzeUserQueue(recentTitles: string[], platform: string) {
    logger.info("Predictive: Analyzing user activity for pre-fetch opportunities...");
    
    for (const title of recentTitles) {
      if (!this.cache.has(title)) {
        // Run AI enrichment in low-priority background
        this.runBackgroundPrefetch(title, platform);
      }
    }
  }

  private static async runBackgroundPrefetch(title: string, platform: string) {
      try {
          logger.debug(`Predictive: Pre-fetching metadata for [${title}]`);
          const data = await enrichGameData(title, platform);
          if (data) {
              this.cache.set(`${platform}:${title}`, data);
          }
      } catch (e) {
          // Fail silently in background
      }
  }

  public static getCached(title: string, platform: string) {
      return this.cache.get(`${platform}:${title}`);
  }
}
