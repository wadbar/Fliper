export const CONFIG = {
    version: "3.1.0-MODULAR",
    cache: {
        maxSize: 500,
        ttl: 3600000 
    },
    inference: {
        memoryLimit: 15,  
        breakerThreshold: 3, 
        breakerResetTime: 60000, 
    },
    pricing: {
        ollama: { input: 0, output: 0 },
        gemini: { input: 0.000000075, output: 0.0000003 },
        nvidia: { input: 0.00000015, output: 0.00000015 },
        heuristic: { input: 0, output: 0 }
    },
    timeouts: {
        ollama: 10000,
        gemini: 30000,
        nvidia: 35000
    }
};
