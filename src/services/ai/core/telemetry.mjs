/**
 * AI ENGINE TELEMETRY & STATS
 */

export const circuitBreakers = {
    ollama: { status: 'CLOSED', failures: 0, lastFailure: 0, errorCode: null, lastSuccess: 0, avgLatency: 500, priority: 'HIGH', quarantinedUntil: 0, lastSelected: 0 },
    gemini: { status: 'CLOSED', failures: 0, lastFailure: 0, errorCode: null, lastSuccess: 0, avgLatency: 1500, priority: 'HIGH', quarantinedUntil: 0, lastSelected: 0 },
    nvidia: { status: 'CLOSED', failures: 0, lastFailure: 0, errorCode: null, lastSuccess: 0, avgLatency: 2000, priority: 'HIGH', quarantinedUntil: 0, lastSelected: 0 }
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
    engineStats.lastUpdated = Date.now();
}

export function quarantineNode(id, ms = 60000) {
    const b = circuitBreakers[id];
    if (b) {
        b.quarantinedUntil = Date.now() + ms;
        engineStats.lastUpdated = Date.now();
    }
}

export function recordNodeFailure(id, errorMsg) {
    const b = circuitBreakers[id];
    if (!b) return;

    // Penalize 429s more heavily to keep circuit OPEN longer
    if (errorMsg.includes('429')) {
        b.failures += 3;
        b.status = 'OPEN'; // Force open immediately
        // Parse quarantine duration if available (format: QUARANTINE_MS:X)
        const match = errorMsg.match(/QUARANTINE_MS:(\d+)/);
        const ms = match ? parseInt(match[1]) : 60000;
        quarantineNode(id, ms);
    } else {
        b.failures++;
    }
    
    b.lastFailure = Date.now();
    b.errorCode = (errorMsg.split(':')[0] || 'UNKNOWN').substring(0, 50);
    
    // Adaptive Penalty Scaling
    const penalty = errorMsg.includes('429') ? 0.35 : 0.2;
    engineStats.reliabilityMap[id] = Math.max(0, (engineStats.reliabilityMap[id] || 0.5) - penalty);
    engineStats.lastUpdated = Date.now();
    
    // Circuit Breaker State Transition
    if (b.failures >= 3 && b.status !== 'OPEN') {
        b.status = 'OPEN';
    }
}
