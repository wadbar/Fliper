import { GameMetadata, KernelIntent } from './ai/types';

/**
 * SOVEREIGN AI BRIDGE: FLIPEROS KERNEL
 * Routes all neural requests to the server-side fortified engine.
 */

export async function enrichGameData(title: string, platform: string): Promise<GameMetadata | null> {
    try {
        const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/ai/enrich`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, platform })
        });
        if (!res.ok) throw new Error('BRIDGE_FAULT');
        return await res.json();
    } catch (e) {
        console.warn("AI_BRIDGE: Falling back to silent mode", e);
        return null;
    }
}

export async function processKernelIntent(prompt: string): Promise<KernelIntent> {
    try {
        const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/ai/intent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        if (!res.ok) throw new Error('BRIDGE_FAULT');
        return await res.json();
    } catch (e) {
        return {
            categoria: 'system',
            termo_busca: prompt,
            acao: 'error',
            resumo_ia: 'Neural Link Offline: Kernel operating in localized fallback mode.'
        };
    }
}
