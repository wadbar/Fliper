import { circuitBreakers, engineStats } from "./telemetry.mjs";

export function calculateHealthScore(id, config) {
    const b = circuitBreakers[id];
    if (b.status === 'OPEN' || b.priority === 'OFF') return 0;

    const reliability = engineStats.reliabilityMap[id] || 0.5;
    const latencyScore = 1 / (1 + (b.avgLatency / 1000));
    
    const price = config.pricing[id] || { input: 0.001, output: 0.001 };
    const costScore = Math.min(1, 0.0000001 / ( (price.input + price.output) / 2 || 0.00000001 ));

    // Stability(40%) + Latency(40%) + Cost(20%)
    let score = (reliability * 0.4) + (latencyScore * 0.4) + (costScore * 0.2);
    
    if (b.priority === 'HIBERNATED') {
        score *= 0.1;
    }
    
    return score;
}

export function selectOptimalNode(candidates, config) {
    const scored = candidates
        .map(id => ({ id, score: calculateHealthScore(id, config) }))
        .filter(n => n.score > 0);

    if (scored.length === 0) return candidates[0];
    
    // Total Health-based selection
    const total = scored.reduce((sum, n) => sum + n.score, 0);
    let roll = Math.random() * total;
    
    for (const opt of scored) {
        roll -= opt.score;
        if (roll <= 0) return opt.id;
    }
    return scored[0].id;
}
