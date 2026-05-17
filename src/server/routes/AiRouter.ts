import { Router } from "express";

const router = Router();

router.get("/stats", (req, res) => {
    try {
        // @ts-ignore
        import("../../services/aiEngine.mjs").then(m => {
            res.json(m.getEngineStats());
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/intent", async (req, res) => {
    try {
        const { prompt } = req.body;
        // @ts-ignore
        const { generate } = await import("../../services/aiEngine.mjs");
        
        const systemInstruction = `You are the FliperOS Neural Kernel, a sophisticated retro gaming assistant.
        Analyze the user prompt and extract intent in JSON format.
        
        Categories: system, search, hardware, custom, roms, emulators, covers, apps.
        Actions: launch, install, optimize, info, shell, download, list.
        
        If the user wants to find or download something:
        1. Identify the 'acao': 
           - "download" for direct requests ("download metal slug").
           - "search" for discovery requests ("find fighting games for neo geo").
        2. Populate 'resultados' if the query implies multiple possibilities:
           - For genre searches (fighting games, RPGs), suggest 3-5 top games as distinct objects in the array.
           - Include 'nome', 'categoria' (usually 'roms'), 'plataforma', and 'descricao'.
        
        Example for "fighting games for neo geo":
        - resumo_ia: "Accessing Neo Geo archives... Found several legendary fighting titles."
        - resultados: [ { "nome": "Metal Slug", "categoria": "roms", "plataforma": "Neo Geo", "descricao": "Run and gun action." }, ... ]
        
        Output MUST be valid JSON matching this schema: 
        { 
          "categoria": string, 
          "acao": string, 
          "termo_busca": string, 
          "resumo_ia": string,
          "resultados": [
            { "nome": string, "categoria": string, "plataforma": string, "descricao": string }
          ],
          "contexto": {
            "plataforma": string (optional),
            "genero": string (optional)
          } 
        }`;
        
        const result = await generate({ 
            prompt, 
            systemInstruction, 
            responseType: 'json', 
            temperature: 0.2 
        });

        if (result.success) {
            res.json(result.content);
        } else {
            res.status(500).json({ error: "NEURAL_PIPELINE_COLLAPSE" });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/enrich", async (req, res) => {
    try {
        const { title, platform } = req.body;
        // @ts-ignore
        const { generate } = await import("../../services/aiEngine.mjs");
        
        const systemInstruction = `You are a Retro Gaming Expert and Emulation Specialist. 
        Provide detailed metadata for the game "${title}" on platform "${platform}" in JSON format.
        Focus on accuracy and historical significance.
        
        Required fields in JSON:
        {
          "description": "A compelling 2-3 sentence description of the game's plot and impact.",
          "year": "The exact release year (integer as string).",
          "genre": "Main gaming category (e.g., Action, RPG, Platformer).",
          "developer": "The primary studio/developer name.",
          "suggested_core": "The best Libretro core name or standalone emulator for this specific game (e.g., snes9x, genesis_plus_gx, duckstation, beetle_psx_hw, mame, fbneo, mupen64plus_next)."
        }
        
        Important: Output MUST be ONLY valid JSON. No conversational filler.`;
        
        const result = await generate({ 
            prompt: `Synthesize comprehensive metadata for: ${title} (${platform})`, 
            systemInstruction, 
            responseType: 'json', 
            temperature: 0.3 
        });

        if (result.success) {
            res.json(result.content);
        } else {
            res.status(500).json({ error: "ENRICHMENT_FAULT" });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/generate", async (req, res) => {
    try {
        const { prompt, systemInstruction, responseType, temperature } = req.body;
        // @ts-ignore
        const { generate } = await import("../../services/aiEngine.mjs");
        
        const result = await generate({ 
            prompt, 
            systemInstruction, 
            responseType, 
            temperature 
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/image", async (req, res) => {
    try {
        const { prompt, width, height } = req.body;
        // @ts-ignore
        const { generateImage } = await import("../../services/aiEngine.mjs");
        
        const result = await generateImage({ 
            prompt, 
            width, 
            height 
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/priority", async (req, res) => {
    try {
        const { provider, priority } = req.body;
        // @ts-ignore
        const { setPriority } = await import("../../services/aiEngine.mjs");
        
        const success = setPriority(provider, priority);
        if (success) {
            res.json({ status: "ok" });
        } else {
            res.status(400).json({ error: "INVALID_PROVIDER" });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export { router as AiRouter };
