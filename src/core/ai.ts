import { aiOrchestrator } from './ai/orchestrator';
import { GameMetadata, KernelIntent } from './ai/types';

/**
 * ELITE AI CORE: FLIPEROS KERNEL BRIDGE
 * This module coordinates neural processing across multiple providers (Gemini / Ollama).
 */

export function getSystemKnowledgeBase() {
    return {
        timestamp: new Date().toISOString(),
        kernel: "FliperOS 2.6.0-PRO (Zen-Hybrid)",
        features: ["Predictive Pre-fetch", "Circuit Breaker v2", "Secure Kernel Proxy", "Vulkan 1.4Ready"],
        architecture: "Distributed Orchestration",
        health_status: "OPTIMIZED"
    };
}

export async function enrichGameData(title: string, platform: string): Promise<GameMetadata | null> {
    return aiOrchestrator.enrichGameData(title, platform);
}

export async function processKernelIntent(promptUsuario: string): Promise<KernelIntent> {
    const kb = getSystemKnowledgeBase();
    return aiOrchestrator.processKernelIntent(promptUsuario, kb);
}
