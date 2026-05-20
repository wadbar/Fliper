/**
 * V10 NEURAL ORCHESTRATOR
 * Industrial-grade client-side interface for AI-driven metadata enrichment and synthesis.
 * Implements exponential backoff resilience and memory-safe caching.
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
    private pendingRequests: Map<string, Promise<EnrichmentMetadata | null>> = new Map();

    /**
     * Enriches game metadata using the robust API Pipeline.
     * Incorporates exponential backoff and request deduplication (mutex locks).
     */
    public async enrichGame(title: string, platform: string, maxRetries = 3): Promise<EnrichmentMetadata | null> {
        const cacheKey = `${title}_${platform}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        if (this.pendingRequests.has(cacheKey)) {
             return this.pendingRequests.get(cacheKey)!;
        }

        const requestPromise = this.executeWithBackoff(title, platform, cacheKey, maxRetries);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } catch (error) {
            console.error(`[NeuralOrchestrator] Fatal enrichment failure for ${cacheKey}:`, error);
            return null;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    private async executeWithBackoff(title: string, platform: string, cacheKey: string, maxRetries: number): Promise<EnrichmentMetadata | null> {
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const response = await fetch('/api/ai/enrich', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, platform })
                });

                if (!response.ok) {
                    throw new Error(`ENRICH_HTTP_FAULT: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                
                // Validate data shape before caching
                if (data && typeof data === 'object') {
                   this.cache.set(cacheKey, data);
                   return data;
                }
                throw new Error("MALFORMED_PAYLOAD");
                
            } catch (error: any) {
                attempt++;
                console.warn(`[NeuralOrchestrator] Enrichment fault (Attempt ${attempt}/${maxRetries}) for ${title}:`, error.message);
                
                if (attempt >= maxRetries) {
                    console.error(`[NeuralOrchestrator] Exhausted retries for ${title}. Abandoning enrichment.`);
                    return null;
                }
                
                // Exponential backoff: 1s, 2s, 4s...
                const delayMs = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        return null;
    }

    /**
     * Analyzes ROM filenames to suggest clean titles and metadata.
     */
    public async tagRom(filename: string): Promise<{ title: string; region: string; version: string; isHack: boolean; suggestedFix: string } | null> {
        try {
            const response = await fetch('/api/ai/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });

            if (!response.ok) throw new Error("TAG_FAULT");
            return await response.json();
        } catch (e) {
            console.error("[NeuralOrchestrator] Tagging failed:", e);
            return null;
        }
    }

    /**
     * Resets the local session cache safely.
     */
    public clearCache(): void {
        this.cache.clear();
        this.pendingRequests.clear();
    }
}

export const aiOrchestrator = new AiOrchestrator();
