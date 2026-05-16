
import { AIProvider, GameMetadata, KernelIntent } from './types';
import { GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';

class CircuitBreaker {
    private failures = 0;
    private threshold = 3;
    private lastFailureTime = 0;
    private cooldown = 60000;

    async execute<T>(action: () => Promise<T>): Promise<T | null> {
        if (this.failures >= this.threshold && Date.now() - this.lastFailureTime < this.cooldown) {
            return null;
        }
        try {
            const res = await action();
            this.failures = 0;
            return res;
        } catch (e: any) {
            // Quietly catch and track failures to trigger fallback
            this.failures++;
            this.lastFailureTime = Date.now();
            return null;
        }
    }
}

export class AIOrchestrator {
    private primary: AIProvider;
    private secondary: AIProvider;
    private breaker = new CircuitBreaker();
    private cache = new Map<string, { data: any, timestamp: number }>();
    private readonly CACHE_TTL_MS = 1000 * 60 * 15; // 15 mins

    constructor() {
        this.primary = new GeminiProvider();
        this.secondary = new OllamaProvider();
    }

    async enrichGameData(title: string, platform: string): Promise<GameMetadata | null> {
        const key = `enrich:${title}:${platform}`;
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            return cached.data;
        }

        let result = await this.breaker.execute(() => this.primary.enrichGameData(title, platform));
        
        if (!result) {
            result = await this.secondary.enrichGameData(title, platform).catch(() => null);
        }

        if (result) this.cache.set(key, { data: result, timestamp: Date.now() });
        return result;
    }

    async processKernelIntent(prompt: string, context: any): Promise<KernelIntent> {
        let result = await this.breaker.execute(() => this.primary.processKernelIntent(prompt, context));

        if (!result) {
            result = await this.secondary.processKernelIntent(prompt, context).catch(() => ({
                categoria: 'system',
                termo_busca: prompt,
                acao: 'error' as const,
                resumo_ia: 'Circuit Breaker Active: System processing in offline mode.'
            }));
        }

        return result;
    }
}

export const aiOrchestrator = new AIOrchestrator();
