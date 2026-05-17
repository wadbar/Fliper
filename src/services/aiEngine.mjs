/**
 * SOVEREIGN AI ENGINE (v3.1.0-MODULAR)
 * Orchestrator Facade
 */

import { CONFIG } from "./ai/config.mjs";
import { healJson } from "./ai/core/healer.mjs";
import { 
    circuitBreakers, 
    engineStats, 
    trackError, 
    recordNodeSuccess, 
    recordNodeFailure 
} from "./ai/core/telemetry.mjs";
import { selectOptimalNode } from "./ai/core/ranking.mjs";

import { invokeOllama } from "./ai/providers/ollama.mjs";
import { invokeGemini } from "./ai/providers/gemini.mjs";
import { invokeNvidia } from "./ai/providers/nvidia.mjs";

const responseCache = new Map();
const neuralMemory = [];

/**
 * PRIVACY SHIELD: DATA SANITIZATION
 */
function maskSensitiveData(str) {
    if (!str || typeof str !== 'string') return str;
    return str
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[MASKED_USER]')
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[MASKED_DATA]');
}

const logger = {
    _log: (tag, color, msg, metadata = null) => {
        const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const metaStr = metadata ? ` \x1b[90m| ${JSON.stringify(metadata)}\x1b[0m` : '';
        console.log(`${color}[AI-MASTER:${tag}]\x1b[0m [${ts}] ${msg}${metaStr}`);
    },
    info: (msg, meta) => logger._log('INFO', '\x1b[34m', msg, meta),
    success: (msg, meta) => logger._log('OK', '\x1b[32m', msg, meta),
    warn: (msg, meta) => logger._log('WARN', '\x1b[33m', msg, meta),
    error: (msg, meta) => logger._log('FAIL', '\x1b[31m', msg, meta)
};

function isRetriable(errorMsg) {
    if (!errorMsg) return false;
    const msg = errorMsg.toLowerCase();
    const codes = ['429', 'timeout', 'deadline', '502', '503', '504', 'abort'];
    if (codes.some(p => msg.includes(p))) return true;
    if (msg.includes('fetch failed') || msg.includes('econn')) return true;
    return false;
}

function shouldSkipNode(id) {
    const breaker = circuitBreakers[id];
    if (breaker.status === 'OPEN') {
        const cooldown = Date.now() - breaker.lastFailure;
        const resetInterval = CONFIG.inference.breakerResetTime * Math.pow(2, Math.min(5, breaker.failures - CONFIG.inference.breakerThreshold));
        if (cooldown > resetInterval) {
            breaker.status = 'HALF-OPEN';
            return false;
        }
        return true;
    }
    return false;
}

function sanitizeResponse(content, type) {
    if (type !== 'json') return content || "";
    if (typeof content !== 'string' || !content.trim()) return content || {};
    
    try {
        const clean = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (err) {
        const healed = healJson(content);
        if (healed) return healed;
        throw new Error(`INTEGRITY_FAIL: JSON payload corrupted beyond repair. Content length: ${content.length}`, { cause: err });
    }
}

export async function generate({ prompt, systemInstruction = '', responseType = 'text', temperature = 0.7, onStream = null }) {
    const startTime = Date.now();
    engineStats.totalCalls++;

    const augmentedPrompt = prompt + (neuralMemory.length > 0 ? 
        "\n\nContext Recalled:\n" + neuralMemory.slice(-3).map(m => `U: ${m.q}\nAI: ${m.a}`).join('\n') : "");
    
    const cacheKey = onStream ? null : `v3.1|${prompt.length}|${systemInstruction.length}|${responseType}`;
    if (cacheKey && responseCache.has(cacheKey)) {
        const entry = responseCache.get(cacheKey);
        if (Date.now() - entry.storedAt < CONFIG.cache.ttl) return entry.data;
    }

    const nodes = [
        { id: 'ollama', fn: invokeOllama, config: { host: process.env.OLLAMA_HOST, model: process.env.OLLAMA_MODEL } },
        { id: 'gemini', fn: invokeGemini, config: { apiKey: process.env.GEMINI_API_KEY?.trim(), model: process.env.GEMINI_MODEL } },
        { id: 'nvidia', fn: invokeNvidia, config: { apiKey: process.env.NVIDIA_API_KEY?.trim(), model: process.env.NVIDIA_MODEL, baseUrl: process.env.NVIDIA_BASE_URL } }
    ].filter(n => {
        if (n.id === 'ollama') return !!n.config.host && !n.config.host.includes('undefined');
        return !!n.config.apiKey && !n.config.apiKey.includes('your_');
    });

    const isHeavy = prompt.length > 1500 || responseType === 'json';
    if (isHeavy) nodes.sort((a,b) => (a.id === 'ollama' ? 1 : b.id === 'ollama' ? -1 : 0));

    const results = { success: false, provider: null, content: null, timestamp: new Date().toISOString() };
    
    // Primary Sequence
    for (const node of nodes.slice(0, 2)) {
        if (shouldSkipNode(node.id)) continue;
        try {
            const raw = await node.fn({ 
                prompt: maskSensitiveData(augmentedPrompt), 
                system: systemInstruction, 
                temperature, 
                responseType,
                onStream, 
                ...node.config 
            });
            results.content = sanitizeResponse(raw, responseType);
            results.provider = node.id;
            results.success = true;
            
            const tokens = Math.ceil((raw?.length || 0) / 4);
            recordNodeSuccess(node.id, Date.now() - startTime, tokens, CONFIG.pricing[node.id]?.output || 0);
            return finalize(results, startTime, cacheKey);
        } catch (err) {
            recordNodeFailure(node.id, err.message);
            trackError(node.id, err.message);
            logger.warn(`RELAY: Node ${node.id.toUpperCase()} failed.`, { error: err.message });
            if (!isRetriable(err.message)) break; // stop on non-retriable auth errors
        }
    }

    // Tertiary Optimized Fallback
    const tertiaryId = selectOptimalNode(nodes.map(n => n.id), CONFIG);
    const tNode = nodes.find(n => n.id === tertiaryId);
    if (tNode && !shouldSkipNode(tNode.id)) {
        try {
            const raw = await tNode.fn({ 
                prompt: maskSensitiveData(augmentedPrompt), 
                system: systemInstruction, 
                temperature, 
                responseType,
                onStream, 
                ...tNode.config 
            });
            results.content = sanitizeResponse(raw, responseType);
            results.provider = tNode.id;
            results.success = true;
            recordNodeSuccess(tNode.id, Date.now() - startTime);
            return finalize(results, startTime, cacheKey);
        } catch (err) {
            recordNodeFailure(tNode.id, err.message);
        }
    }

    // Survival Fallback
    results.success = true;
    results.provider = 'heuristic';
    results.content = responseType === 'json' ? 
        { error: "NEURAL_STORM", status: "OFFLINE" } :
        "SISTEMA EM MODO DE EMERGÊNCIA: Malha neural indisponível.";
    
    return finalize(results, startTime);
}

function finalize(results, start, cacheKey) {
    results.latency = Date.now() - start;
    if (results.success && results.content && typeof results.content === 'string' && results.content.length < 300) {
        neuralMemory.push({ q: results.content.substring(0, 50), a: results.content });
        if (neuralMemory.length > CONFIG.inference.memoryLimit) neuralMemory.shift();
    }
    if (cacheKey && results.success && results.provider !== 'heuristic') {
        responseCache.set(cacheKey, { storedAt: Date.now(), data: results });
    }
    return results;
}

export async function generateImage(params) {
    // Basic wrapper
    const start = Date.now();
    try {
        const seed = params.seed || Math.floor(Math.random() * 999999);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(params.prompt)}?width=${params.width || 600}&height=${params.height || 800}&seed=${seed}&nologo=true&model=flux`;
        return { success: true, url, latency: Date.now() - start };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export function getEngineStats() {
    return { ...engineStats, breakers: circuitBreakers, version: CONFIG.version };
}

export function setPriority(provider, priority) {
    if (circuitBreakers[provider]) {
        circuitBreakers[provider].priority = priority;
        return true;
    }
    return false;
}
