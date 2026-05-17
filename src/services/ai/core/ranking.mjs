import { circuitBreakers, engineStats } from "./telemetry.mjs";

export function calculateHealthScore(id, config) {
    const b = circuitBreakers[id];
    if (b.status === 'OPEN' || b.priority === 'OFF') return 0;

    const reliability = engineStats.reliabilityMap[id] || 0.5;
    const latencyScore = 1 / (1 + (b.avgLatency / 1000));
    
    // Quarantine impact
    const quarantineBuffer = (b.quarantinedUntil && b.quarantinedUntil > Date.now()) ? 0 : 1;
    
    const price = config.pricing[id] || { input: 0.001, output: 0.001 };
    const costScore = Math.min(1, 0.0000001 / ( (price.input + price.output) / 2 || 0.00000001 ));

    // Multi-factor adaptive scoring
    let score = (reliability * 0.45) + (latencyScore * 0.35) + (costScore * 0.2);
    
    // Hysteresis / Anti-Flapping: Penalize nodes that haven't proved stability yet
    const timeSinceLastSelection = Date.now() - (b.lastSelected || 0);
    if (timeSinceLastSelection < 5000) {
        score *= 0.95; // Slight penalty to discourage immediate re-selection if another is close
    }
    
    score *= quarantineBuffer;
    
    if (b.priority === 'HIBERNATED') {
        score *= 0.1;
    }
    
    return score;
}

export function selectOptimalNode(candidates, config) {
    const scored = candidates
        .map(id => ({ id, score: calculateHealthScore(id, config) }))
        .filter(n => n.score > 0);

    if (scored.length === 0) return null;
    
    // Total Health-based selection
    const total = scored.reduce((sum, n) => sum + n.score, 0);
    let roll = Math.random() * total;
    
    for (const opt of scored) {
        roll -= opt.score;
        if (roll <= 0) return opt.id;
    }
    return scored[0].id;
}
