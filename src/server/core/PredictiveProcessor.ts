import { logger } from "./Logger";

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
          
          // @ts-expect-error - Dynamic import of ESM in TS Node context
          const { generate } = await import("../../services/aiEngine.mjs");
          
          const systemInstruction = `You are a Retro Gaming Expert and Data Scientist. 
            Analyze the following titles and provide metadata for EACH, PLUS recommend 2 similar games that the user might want to play next.
            Output as JSON.
            Required for each game: description, releaseYear, rating, genre, similar_recommendations (array of 2 titles).`;
          
          const result = await generate({ 
            prompt: `User history: ${title}. Platform: ${platform}. Synthesize metadata and predict next needs.`, 
            systemInstruction, 
            responseType: 'json', 
            temperature: 0.4 
          });

          if (result && result.success) {
              if (result.provider === 'heuristic') {
                  logger.warn(`Predictive: Heuristic fallback used for [${title}]. Skipping cache.`);
                  return;
              }
              
              const data = result.content;
              this.cache.set(`${platform}:${title}`, data);
              logger.success(`Predictive: Cached metadata for [${title}] via ${result.provider}`);
              
              // Pre-cache recommendations too!
              if (data && data.similar_recommendations) {
                  data.similar_recommendations.forEach((recTitle: string) => {
                      const cacheKey = `${platform}:${recTitle}`;
                      if (!this.cache.has(cacheKey)) {
                          logger.debug(`Predictive: Anticipated user interest in [${recTitle}]`);
                      }
                  });
              }
          } else {
              logger.warn(`Predictive: AI returned failure for [${title}]`, result);
          }
      } catch (e: any) {
          logger.error(`Predictive: Critical fault during pre-fetch for [${title}]`, e);
      }
  }

  public static getCached(title: string, platform: string) {
      return this.cache.get(`${platform}:${title}`);
  }
}
