import { logger } from "../../../server/core/Logger";
import { quarantineNode } from "../core/telemetry.mjs";
 
export async function invokeGemini({ prompt, system, temperature, model, apiKey, responseType, onStream }) {
    if (!apiKey || apiKey.includes('your_')) throw new Error('AUTH_FATAL: Gemini key invalid');
    
    const m = model || 'gemini-flash-latest';
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    
    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        system_instruction: system ? { parts: [{ text: system }] } : undefined,
        generation_config: {
            temperature: temperature || 0.7,
            max_output_tokens: 8192,
            response_mime_type: responseType === 'json' ? "application/json" : "text/plain"
        }
    };

    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            let retryAfterMs = 0;
            
            try {
                const errData = JSON.parse(errText);
                const retryInfo = errData.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
                if (retryInfo?.retryDelay) {
                    const secs = parseInt(retryInfo.retryDelay.replace('s', ''));
                    if (!isNaN(secs)) retryAfterMs = (secs * 1000) + 1000; // +1s buffer
                }
            } catch (e) { /* silent parse fail */ }

            if (response.status === 429) {
                const isDailyQuota = /GenerateRequestsPerDay/i.test(errText);
                const quarantineMs = isDailyQuota ? 3600000 : (retryAfterMs || 60000);
                
                // Signal early quarantine
                quarantineNode('gemini', quarantineMs);

                if (!isDailyQuota && attempt < maxRetries) {
                    const delay = retryAfterMs || Math.pow(2, attempt + 2) * 1000;
                    logger.warn(`[GEMINI] Quota Exceeded (429). Retrying in ${delay}ms...`, { attempt: attempt + 1 });
                    await new Promise(r => setTimeout(r, delay));
                    attempt++;
                    continue;
                }
                
                // If daily quota or exhausted retries, throw immediately
                throw new Error(`[Google API Error] 429 Too Many Requests: ${errText} QUARANTINE_MS:${quarantineMs}`);
            }
        }

        const data = await response.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error(`[Google API Error] Unexpected response structure: ${JSON.stringify(data)}`);
        }

        return data.candidates[0].content.parts[0].text;
    }
}
