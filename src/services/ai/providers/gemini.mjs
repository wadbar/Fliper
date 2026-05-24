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

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
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
            attempt++;
            const errText = err.message || JSON.stringify(err);
            const isRateLimit = errText.includes('429') || errText.includes('quota') || errText.includes('limit') || errText.includes('resource_exhausted');
            
            if (isRateLimit && attempt < maxAttempts) {
                // EXTREME V10 BACKOFF: (2^attempt+2 * 1000ms)
                const backoffMs = Math.pow(2, attempt + 2) * 1000;
                logger.warn(`[AI-NODE] Gemini 429/QUOTA detected. Industrial Backoff active. Retrying ${attempt}/${maxAttempts} in ${backoffMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                continue;
            }

            if (isRateLimit) {
                const isDailyQuota = /Daily/i.test(errText) || /QuotaExceeded/i.test(errText);
                const quarantineMs = isDailyQuota ? 3600000 : 60000;
                
                // Formatted for telemetry.mjs +3 PENALTY trigger
                const failureMsg = `429:RATE_LIMIT_EXHAUSTED:QUARANTINE_MS:${quarantineMs}`;
                throw new Error(failureMsg);
            }
            
            logger.error(`[AI-NODE] Gemini Fault (Attempt ${attempt})`, { error: errText });
            throw new Error(`NODE_FAULT:${errText}`);
        }
    }

}
