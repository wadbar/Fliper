export async function invokeNvidia({ prompt, system, temperature, model, apiKey, baseUrl, onStream, timeout = 35000 }) {
    if (!apiKey || apiKey.includes('your_')) throw new Error('AUTH_FATAL: NVIDIA key invalid');
    
    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify({
            model: model || 'meta/llama-3.1-70b-instruct',
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []), 
                { role: 'user', content: prompt }
            ],
            temperature: temperature || 0.7,
            stream: !!onStream
        }),
        signal: AbortSignal.timeout(timeout)
    });

    if (!res.ok) throw new Error(`NVIDIA_FAIL_${res.status}`);

    if (onStream) {
        const reader = res.body.getReader();
        let full = "";
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const d = line.replace('data: ', '').trim();
                    if (d === '[DONE]') continue;
                    try {
                        const json = JSON.parse(d);
                        const text = json.choices?.[0]?.delta?.content || '';
                        full += text; 
                        if (onStream) onStream(text);
                    } catch (e) {}
                }
            }
        }
        return full;
    }
    
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}
