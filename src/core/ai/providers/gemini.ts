
import { GoogleGenAI, Type } from '@google/genai';
import { AIProvider, GameMetadata, KernelIntent } from '../types';

export class GeminiProvider implements AIProvider {
    private client: GoogleGenAI | null = null;

    private getClient(): GoogleGenAI {
        if (!this.client) {
            const apiKey = process.env.GEMINI_API_KEY || '';
            if (!apiKey) console.warn('GEMINI_API_KEY is not set in environment.');
            this.client = new GoogleGenAI({ apiKey });
        }
        return this.client;
    }

    getName() { return 'Gemini Pro'; }

    async enrichGameData(title: string, platform: string): Promise<GameMetadata | null> {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");
        const ai = this.getClient();

        const prompt = `Estou criando um frontend para um emulador. Você é um especialista em jogos retrô (LaunchBox/MAME).
Analise o jogo "${title}" para a plataforma "${platform}".
Retorne as informações técnicas do jogo para enriquecer o banco de dados.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        year: { type: Type.STRING },
                        developer: { type: Type.STRING },
                        genre: { type: Type.STRING },
                        description: { type: Type.STRING },
                        suggested_core: { type: Type.STRING }
                    },
                    required: ["year", "developer", "genre", "description", "suggested_core"]
                }
            }
        });

        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    }

    async processKernelIntent(prompt: string, context: any): Promise<KernelIntent> {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");
        const ai = this.getClient();

        const fullPrompt = `Você é o Kernel AI do FliperOS Linux Distribution.
Sua tarefa é interpretar a intenção do usuário e transformar em comandos estruturados para o Kernel.

CONSTRUTOR DE COMANDOS:
- Se for algo informativo ou status: acao="sys_report"
- Se for sobre baixar conteúdo: acao="download"
- Se for configuração do sistema: acao="settings"
- Se for lançamento de jogos: acao="launch"

Contexto do Sistema: ${JSON.stringify(context)}
Entrada do Usuário: "${prompt}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        categoria: { type: Type.STRING },
                        termo_busca: { type: Type.STRING },
                        formato_desejado: { type: Type.STRING },
                        acao: { type: Type.STRING },
                        resumo_ia: { type: Type.STRING }
                    },
                    required: ["categoria", "termo_busca", "acao", "resumo_ia"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No data returned");
        return JSON.parse(text);
    }
}
