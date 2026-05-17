/**
 * AI ENGINE TELEMETRY & STATS
 */

export const circuitBreakers = {
    ollama: { status: 'CLOSED', failures: 0, lastFailure: 0, errorCode: null, lastSuccess: 0, avgLatency: 500, priority: 'HIGH' },
    gemini: { status: 'CLOSED', failures: 0, lastFailure: 0, errorCode: null, lastSuccess: 0, avgLatency: 1500, priority: 'HIGH' },
    nvidia: { status: 'CLOSED', failures: 0, lastFailure: 0, errorCode: null, lastSuccess: 0, avgLatency: 2000, priority: 'HIGH' }
};

export const engineStats = {
    totalCalls: 0,
    successByProvider: { ollama: 0, gemini: 0, nvidia: 0, heuristic: 0 },
    failuresByProvider: { ollama: 0, gemini: 0, nvidia: 0 },
    reliabilityMap: { ollama: 1, gemini: 1, nvidia: 1 }, 
    totalCostUSD: 0,
    avgLatency: 0,
    totalTokensEst: 0,
    errorTypes: {},
    lastError: null
};

export function trackError(provider, msg) {
    if (engineStats.failuresByProvider[provider] !== undefined) {
        engineStats.failuresByProvider[provider]++;
    }
    const type = (msg || 'UNKNOWN').split(':')[0].substring(0, 24).trim();
    engineStats.errorTypes[type] = (engineStats.errorTypes[type] || 0) + 1;
    engineStats.lastError = msg;
}

export function recordNodeSuccess(id, latency, tokens = 0, pricePerToken = 0) {
    const b = circuitBreakers[id];
    b.status = 'CLOSED';
    b.failures = 0;
    b.lastFailure = 0;
    b.errorCode = null;
    b.lastSuccess = Date.now();
    b.avgLatency = (b.avgLatency * 0.8) + (latency * 0.2);
    
    engineStats.reliabilityMap[id] = Math.min(1, engineStats.reliabilityMap[id] + 0.05);
    engineStats.successByProvider[id]++;
    engineStats.avgLatency = (engineStats.avgLatency * 0.9) + (latency * 0.1);
    engineStats.totalTokensEst += tokens;
    engineStats.totalCostUSD += (tokens * pricePerToken);
}

export function recordNodeFailure(id, errorMsg) {
    const b = circuitBreakers[id];
    b.failures++;
    b.lastFailure = Date.now();
    b.errorCode = (errorMsg.split(':')[0] || 'UNKNOWN').substring(0, 50);
    engineStats.reliabilityMap[id] = Math.max(0, (engineStats.reliabilityMap[id] || 0.5) - 0.15);
}
