import { Router } from "express";

const router = Router();

router.get("/stats", (req, res) => {
    try {
        
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
        
        // V9 CACHE LAYER: Check Firestore first
        const gameId = `${title}_${platform}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const { adminDb } = await import("../lib/firebase-admin");
        
        const cachedDoc = await adminDb.collection('games').doc(gameId).get();
        if (cachedDoc.exists) {
            console.log(`[AI_CACHE] Hit for ${title} (${platform})`);
            return res.json(cachedDoc.data());
        }

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
            // Background Save to Firestore (don't block response)
            adminDb.collection('games').doc(gameId).set({
                id: gameId,
                title,
                platform,
                ...result.content,
                year: result.content.year || null, // Ensure string/int compatibility if needed
                syncedAt: new Date().toISOString()
            }).catch(err => console.error("[AI_CACHE] Save Error", err));

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

router.post("/wipe", async (req, res) => {
    try {
        
        const { wipeStats } = await import("../../services/aiEngine.mjs");
        wipeStats();
        res.json({ status: "ok" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/refine-prompt", async (req, res) => {
    try {
        const { rawPrompt, category } = req.body;
        
        // Defensive validation
        if (!rawPrompt || typeof rawPrompt !== 'string') {
            return res.status(400).json({ error: "INVALID_PROMPT_INPUT" });
        }

        
        const { generate } = await import("../../services/aiEngine.mjs");
        
        const systemInstruction = `You are an expert assistant for prompt refinement. 
        Refine the user's input into a high-quality, effective prompt optimized for the specified category: ${category}.
        
        Guidelines:
        - Image Generation: Focus on style, lighting, composition, and descriptive details.
        - Data Analysis: Focus on objectives, variables, constraints, and step-by-step logic.
        - Code Generation: Focus on language, libraries, functionality, and edge cases.
        
        Output MUST be in JSON format:
        {
          "refinedPrompt": "The expanded and optimized version of the prompt.",
          "reasoning": "Briefly explain 2-3 key improvements made to the original idea.",
          "tips": ["Tip 1", "Tip 2"]
        }`;
        
        const result = await generate({ 
            prompt: `Raw Input: ${rawPrompt}`, 
            systemInstruction, 
            responseType: 'json', 
            temperature: 0.7 
        });

        if (result.success && result.content) {
            res.json(result.content);
        } else {
            console.error(`[AI_ROUTE_FAULT] Refinement failed for category: ${category}`);
            res.status(500).json({ error: "PROCESSING_FAULT", details: result.content || "Unknown error" });
        }
    } catch (e: any) {
        console.error(`[AI_ROUTE_EXCEPTION]`, e);
        res.status(500).json({ error: "INTERNAL_FAULT", message: e.message });
    }
});

router.get("/telemetry", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = async () => {
        try {
            
            const { getEngineStats } = await import("../../services/aiEngine.mjs");
            const stats = getEngineStats();
            res.write(`data: ${JSON.stringify(stats)}\n\n`);
        } catch (e) {
            // Silent fail on background tick
        }
    };

    // Initial push
    sendUpdate();

    const interval = setInterval(sendUpdate, 3000); // 3 second resolution for UI

    req.on('close', () => {
        clearInterval(interval);
    });
});

// V9: Achievements Generator
router.post("/achievements/generate", async (req, res) => {
    try {
        const { title, platform, gameId } = req.body;
        const { adminDb } = await import("../lib/firebase-admin");

        // Check global cache first
        const cacheRef = adminDb.collection('games').doc(gameId).collection('meta').doc('achievements');
        const cached = await cacheRef.get();
        if (cached.exists) return res.json(cached.data());

        const { generate } = await import("../../services/aiEngine.mjs");
        
        const prompt = `Generate exactly 5 creative, non-spoiler achievements for the retro game "${title}" (${platform}). 
        Include: id (slug), title, description, and difficulty (easy, medium, hard, legendary).
        Return purely as a JSON object with a 'list' array.`;

        const result = await generate({
            prompt,
            systemInstruction: "You are a game design expert specialized in retro gaming achievements.",
            responseType: 'json'
        });

        if (result.success) {
            const achievements = { list: result.content.list || result.content, generatedAt: new Date().toISOString() };
            await cacheRef.set(achievements).catch(err => console.error("[AI_ACHIEVEMENTS] Save Error", err));
            res.json(achievements);
        } else {
            res.status(500).json({ error: "GEN_FAIL" });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export { router as AiRouter };
