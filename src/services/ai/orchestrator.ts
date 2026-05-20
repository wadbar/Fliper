/**
 * V9 NEURAL ORCHESTRATOR
 * Client-side interface for AI-driven metadata enrichment and synthesis.
 */

export interface EnrichmentMetadata {
  description?: string;
  year?: string;
  genre?: string;
  developer?: string;
  suggested_core?: string;
}

class AiOrchestrator {
  private cache: Map<string, EnrichmentMetadata> = new Map();

  /**
   * Enriches game metadata using the Gemini Neural Pipeline.
   * Checks local cache before hitting the API.
   */
  async enrichGame(title: string, platform: string): Promise<EnrichmentMetadata | null> {
    const cacheKey = `${title}_${platform}`.toLowerCase();
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch('/api/ai/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, platform })
      });

      if (!response.ok) {
        throw new Error(`ENRICHMENT_PIPELINE_ERROR: ${response.status}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error("[NeuralOrchestrator] Failed to enrich metadata:", error);
      return null;
    }
  }

  /**
   * Resets the local session cache.
   */
  clearCache() {
    this.cache.clear();
  }
}

export const aiOrchestrator = new AiOrchestrator();
