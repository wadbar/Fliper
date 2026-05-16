
import { AIProvider, GameMetadata, KernelIntent } from '../types';

export class OllamaProvider implements AIProvider {
    private endpoint = 'http://localhost:11434/api/generate';

    getName() { return 'Ollama (Local)'; }

    async enrichGameData(title: string, platform: string): Promise<GameMetadata | null> {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt: `Return exact JSON for game "${title}" on "${platform}" with year, developer, genre, description, suggested_core.`,
                stream: false,
                format: 'json'
            }),
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) throw new Error('Ollama Error');
        const data = await response.json();
        return JSON.parse(data.response);
    }

    async processKernelIntent(prompt: string, context: any): Promise<KernelIntent> {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                prompt: `Classify intent into categories [roms, covers, emulators, system] and actions [download, launch, settings, sys_report]. Input: "${prompt}"`,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) throw new Error('Ollama Error');
        const data = await response.json();
        return JSON.parse(data.response);
    }
}
