import { GoogleGenAI } from "@google/genai";
import { logger } from "../../../server/core/Logger";
import { quarantineNode } from "../core/telemetry.mjs";
 
/**
 * V9 NEURAL CONNECTOR: GEMINI SDK
 * Direct integration with @google/genai for native tool support and advanced reasoning.
 */
export async function invokeGemini({ prompt, system, temperature, model, apiKey, responseType, onStream }) {
    if (!apiKey || apiKey.includes('your_')) throw new Error('AUTH_FATAL: Gemini key invalid');
    
    const m = model || 'gemini-flash-latest';
    
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    try {
        const generationConfig = {
            temperature: temperature || 0.7,
            maxOutputTokens: 8192,
            responseMimeType: responseType === 'json' ? "application/json" : "text/plain"
        };

        const response = await ai.models.generateContent({
            model: m,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: system || undefined,
                ...generationConfig
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error(`[Neural Fault] Empty response from Gemini Node`);
        }

        return text;
    } catch (err) {
        const errText = err.message || JSON.stringify(err);
        
        if (errText.includes('429') || errText.includes('quota') || errText.includes('limit')) {
            const isDailyQuota = /Daily/i.test(errText) || /QuotaExceeded/i.test(errText);
            const quarantineMs = isDailyQuota ? 3600000 : 60000;
            
            quarantineNode('gemini', quarantineMs);
            logger.warn(`[AI-NODE] Gemini Quarantined due to Rate Limit`, { ms: quarantineMs });
            throw new Error(`GEMINI_NODE_QUARANTINED: ${quarantineMs}ms`);
        }
        
        logger.error(`[AI-NODE] Gemini Fault`, { error: errText });
        throw err;
    }
}
