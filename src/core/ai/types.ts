
export enum AIProviderType {
    GEMINI = 'gemini',
    OLLAMA = 'ollama',
    MOCK = 'mock'
}

export interface GameMetadata {
    year: string;
    developer: string;
    genre: string;
    description: string;
    suggested_core: string;
}

export interface KernelIntent {
    categoria: string;
    termo_busca: string;
    formato_desejado?: string;
    acao: 'download' | 'launch' | 'settings' | 'sys_report' | 'error';
    resumo_ia: string;
}

export interface AIProvider {
    getName(): string;
    enrichGameData(title: string, platform: string): Promise<GameMetadata | null>;
    processKernelIntent(prompt: string, context: any): Promise<KernelIntent>;
}
