import { GoogleGenerativeAI } from "@google/generative-ai";
 
export async function invokeGemini({ prompt, system, temperature, model, apiKey, responseType, onStream }) {
    if (!apiKey || apiKey.includes('your_')) throw new Error('AUTH_FATAL: Gemini key invalid');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const m = model || 'gemini-1.5-flash';
    
    // Diagnostic logging (masked)
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING';
    console.log(`[GEMINI_INVOKE] Model: ${m}, Key: ${maskedKey}, Len: ${apiKey?.length}`);

    const modelInstance = genAI.getGenerativeModel({ 
        model: m,
        systemInstruction: system || undefined
    });
 
    const generationConfig = {
        temperature: temperature || 0.7,
        maxOutputTokens: 8192,
        responseMimeType: responseType === 'json' ? "application/json" : "text/plain"
    };
 
    if (onStream) {
        const result = await modelInstance.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });
        
        let fullText = "";
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            if (onStream) onStream(chunkText);
        }
        return fullText;
    } else {
        const result = await modelInstance.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });
        return result.response.text();
    }
}
