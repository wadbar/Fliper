export async function invokeOllama({ prompt, system, temperature, model, host, onStream, timeout = 10000 }) {
    if (!host || host === 'undefined' || host.includes('undefined')) throw new Error('CONFIG_MISSING: Ollama host not defined');
    
    const body = {
        model: model || 'qwen2.5-coder:7b',
        prompt: system ? `${system}\n\nUser: ${prompt}` : prompt,
        stream: !!onStream,
        options: { temperature: temperature || 0.7 }
    };

    const res = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout)
    });

    if (!res.ok) throw new Error(`OLLAMA_FAIL_${res.status}`);
    
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
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.response) { 
                        full += json.response; 
                        onStream(json.response); 
                    }
                } catch (e) {
                    // Truncated JSON chunk, ignore for now
                }
            }
        }
        return full;
    }
    
    const data = await res.json();
    return data.response;
}
