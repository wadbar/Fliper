import { Router } from "express";
import { logger } from "../core/Logger";
import { HealthMonitor } from "../core/HealthMonitor";
import { Metrics } from "../monitoring/Metrics";
import { queueManager } from "../core/QueueManager";
import { WebhookManager } from "../core/WebhookManager";
import { SystemIntegritySuite } from "../core/SystemIntegritySuite";
import { DistroFactory, DistroRecipe } from "../core/DistroFactory";
import { BuildObserver } from "../core/BuildObserver";
import { KernelProxy } from "../core/KernelProxy";
import { RomValidator } from "../core/RomValidator";
import { CloudStorageProvider } from "../core/CloudStorageProvider";
import fs from "fs";
import path from "path";
import multer from "multer";
import zlib from "zlib";
import { promisify } from "util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const upload = multer({ dest: path.join(process.cwd(), 'database', 'temp_imports') });
const router = Router();

router.get("/health", (req, res) => {
    res.json({ 
        status: "HEALTHY", 
        uptime: process.uptime(),
        timestamp: Date.now(),
        node: process.version,
        memory: process.memoryUsage(),
        active_tasks: queueManager.getTasks().length,
        kernel: "6.8.zen1-pro",
        event_loop_lag: HealthMonitor.getEventLoopLag()
    });
});

router.get("/metrics", (req, res) => {
    res.json(Metrics.getSystemMetrics());
});

router.post("/webhooks", (req, res) => {
    const { url } = req.body;
    if (url && url.startsWith('http')) {
        WebhookManager.addEndpoint(url);
        logger.info('Webhook registered', { url });
        return res.json({ status: "ok" });
    }
    res.status(400).json({ error: "Invalid URL" });
});

router.get("/files", async (req, res) => {
    try {
        const queryPath = req.query.path as string;
        const dbPath = path.join(process.cwd(), 'database');
        const targetDir = queryPath ? path.join(dbPath, queryPath) : dbPath;
        
        if (!targetDir.startsWith(dbPath)) throw new Error("ACCESS_DENIED");
        
        await fs.promises.mkdir(targetDir, { recursive: true });
        const files = await fs.promises.readdir(targetDir);
        const stats = await Promise.all(
            files.map(async (file) => {
                const fullPath = path.join(targetDir, file);
                const s = await fs.promises.stat(fullPath);
                
                let previewUrl = undefined;
                if (file.endsWith('.state')) {
                   const previewFile = file.replace('.state', '.jpg');
                   if (fs.existsSync(path.join(targetDir, previewFile))) {
                      previewUrl = `/api/system/files/preview?path=${encodeURIComponent(path.join(queryPath || '', previewFile))}`;
                   }
                }

                return { 
                    name: file, 
                    size: s.size, 
                    mtime: s.mtime, 
                    createdAt: s.birthtime,
                    previewUrl
                };
            })
        );
        res.json({ files: stats });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete("/files", async (req, res) => {
    try {
        const queryPath = req.query.path as string;
        if (!queryPath) throw new Error("MISSING_PATH");
        
        const dbPath = path.join(process.cwd(), 'database');
        const target = path.join(dbPath, queryPath);
        
        if (!target.startsWith(dbPath)) throw new Error("ACCESS_DENIED");
        
        if (fs.existsSync(target)) {
            const stat = await fs.promises.stat(target);
            if (stat.isDirectory()) {
                await fs.promises.rm(target, { recursive: true });
            } else {
                await fs.promises.unlink(target);
                // Also try deleting preview if it exists
                if (target.endsWith('.state')) {
                   const preview = target.replace('.state', '.jpg');
                   if (fs.existsSync(preview)) await fs.promises.unlink(preview);
                }
            }
        }
        res.json({ status: "ok" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get("/files/preview", async (req, res) => {
    try {
        const relPath = req.query.path as string;
        if (!relPath) throw new Error("MISSING_PATH");
        
        const dbPath = path.join(process.cwd(), 'database');
        const target = path.join(dbPath, relPath);
        
        if (!target.startsWith(dbPath)) throw new Error("ACCESS_DENIED");
        if (!fs.existsSync(target)) return res.status(404).send("Not Found");
        
        res.sendFile(target);
    } catch (e: any) {
        res.status(500).send(e.message);
    }
});

router.post("/files/save", async (req, res) => {
    try {
        const { gameId, type, previewUrl } = req.body;
        if (!gameId) throw new Error("MISSING_GAME_ID");
        
        const saveDir = path.join(process.cwd(), 'database', 'states', gameId);
        await fs.promises.mkdir(saveDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${timestamp}.state`;
        const filePath = path.join(saveDir, fileName);
        
        const stateBinary = Buffer.from("V9_STATE_BINARY_MOCK_WITH_HEADERS_DATA_ARRAY");
        const compressed = await gzip(stateBinary);
        await fs.promises.writeFile(filePath, compressed);
        
        if (previewUrl) {
           const previewPath = filePath.replace('.state', '.jpg');
           const base64Data = previewUrl.replace(/^data:image\/jpeg;base64,/, "");
           await fs.promises.writeFile(previewPath, base64Data, 'base64');
        }
        
        res.json({ status: "ok", file: fileName });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/files/restore", async (req, res) => {
    try {
        const { gameId, stateId } = req.body;
        if (!gameId || !stateId) throw new Error("MISSING_PARAMS");
        
        logger.info(`Kernel: Restoring state ${stateId} for game ${gameId}`);
        res.json({ status: "ok" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/setup/bootstrap", async (req, res) => {
    try {
        const { mode } = req.body;
        logger.info(`Industrial Setup: Bootstrapping system in ${mode} mode`);
        
        // 1. Create directory structure
        const dirs = ['emulators', 'roms', 'bios', 'libraries', 'config'];
        for (const dir of dirs) {
           await fs.promises.mkdir(path.join(process.cwd(), 'database', dir), { recursive: true });
        }
        
        // 2. Queue emulator downloads in background
        const emulators = ['RetroArch', 'Dolphin', 'PCSX2', 'PPSSPP', 'DuckStation', 'Citra'];
        for (const emu of emulators) {
           queueManager.addTask('download', `setup_${emu}`, { url: `https://fliperos.io/dl/${emu}`, target: `emulators/${emu}` });
        }
        
        // 3. Trigger automatic library indexing
        queueManager.addTask('system', 'index_libraries', { auto_import: true });
        
        res.json({ 
            status: "ok", 
            message: "Setup orchestrated. Check QueueManager for progress.",
            tasks: emulators.length + 1
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get("/config/sync", (req, res) => {
    res.json({ enabled: queueManager.getSyncEnabled() });
});

router.post("/config/sync", (req, res) => {
    const { enabled } = req.body;
    queueManager.setSyncEnabled(!!enabled);
    res.json({ status: "ok", enabled: queueManager.getSyncEnabled() });
});

router.post("/states/audit", async (req, res) => {
    try {
        const { gameId, stateId } = req.body;
        const relPath = `states/${gameId}/${stateId}`;
        const filePath = path.join(process.cwd(), 'database', relPath);
        
        if (!fs.existsSync(filePath)) throw new Error("STATE_NOT_FOUND");
        
        const compressed = await fs.promises.readFile(filePath);
        let isValidHeader = true;
        try {
            const decompressed = await gunzip(compressed);
            isValidHeader = decompressed.toString().startsWith("V9_STATE");
        } catch (e) {
            isValidHeader = false;
        }

        const localHash = await RomValidator.calculateHash(filePath);
        
        // Mock cloud validation - actually listing files to check existence
        const cloudFiles = await CloudStorageProvider.listFiles(`vault/${relPath}`);
        const existsOnCloud = cloudFiles.length > 0;
        
        res.json({
            ok: true,
            status: existsOnCloud ? "MATCH" : "ORPHAN",
            hash: localHash,
            cloud_synced: existsOnCloud,
            header_valid: isValidHeader
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete("/files/:name", async (req, res) => {
    try {
        const dbPath = path.join(process.cwd(), 'database');
        const target = path.join(dbPath, req.params.name);
        if (!target.startsWith(dbPath)) throw new Error("ACCESS_DENIED");
        await fs.promises.unlink(target);
        res.json({ status: "ok" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/audit", async (req, res) => {
    try {
        const results = await SystemIntegritySuite.runSuite();
        res.json(results);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/distro/build", async (req, res) => {
    try {
        const recipe: DistroRecipe = req.body;
        const task = await DistroFactory.initiateBuild(recipe);
        res.json({ status: "ok", task });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get("/build/log/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    const observer = BuildObserver.getInstance();
    const handler = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    observer.on('log', handler);
    req.on('close', () => observer.off('log', handler));
});

router.post("/kernel/exec", async (req, res) => {
    try {
        const { command } = req.body;
        if (!command) return res.status(400).json({ error: "Missing command" });
        
        const output = await KernelProxy.execute(command);
        res.json({ output });
    } catch (e: any) {
        res.status(403).json({ error: e.message });
    }
});

router.get("/download/status", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    queueManager.registerClient(res);
    req.on('close', () => queueManager.unregisterClient(res));
});

router.post("/download", (req, res) => {
    try {
        const { type, name, url } = req.body;
        const sanitize = (val: any) => String(val).replace(/[^a-zA-Z0-9.\-_]/g, '');
        const task = queueManager.addTask(sanitize(type), sanitize(name), url ? { url } : undefined);
        res.json({ status: "ok", task });
    } catch (err: any) {
        res.status(429).json({ error: err.message });
    }
});

router.post("/import", upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error("File not found in payload");
        
        const fileType = req.body.type || 'import_rom';
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        
        const dbPath = path.join(process.cwd(), 'database');
        await fs.promises.mkdir(dbPath, { recursive: true });
        
        const finalPath = path.join(dbPath, safeName);
        await fs.promises.rename(req.file.path, finalPath);
        
        logger.info(`Asset imported manually: ${safeName}`);
        
        // Register in the system queue as an indexing task instead of download
        queueManager.addTask('rom_validation', safeName, { romPath: `database/${safeName}` });
        
        res.json({ status: "ok", file: safeName, path: finalPath });
    } catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post("/config/emulators", async (req, res) => {
    try {
        const config = req.body;
        const configPath = path.join(process.cwd(), 'database', 'emulators_config.json');
        await fs.promises.mkdir(path.join(process.cwd(), 'database'), { recursive: true });
        await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
        
        logger.info("Kernel received new emulator configurations");
        res.json({ status: "ok", config });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/cache", async (req, res) => {
    try {
        const { source } = req.body;
        if (!source) throw new Error("SOURCE_PATH_REQUIRED");
        const success = await KernelProxy.cacheToRamDisk(source);
        res.json({ status: success ? "ok" : "fail" });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/mame-optimize", async (req, res) => {
    try {
        logger.info("Injecting ULTRA performance MAME shaders (RTX 5060 Targeted)");
        // Optimized HLSL settings for RTX 5060 (simulating sub-pixel response and high-performance mask)
        await KernelProxy.execute("mame -video bgfx -hlsl_enable 1 -bgfx_mode ultra -bgfx_backend vulkan");
        res.json({ 
            status: "ok", 
            mode: "ULTRA_BGFX",
            gpu_optimization: "RTX_5060_HLSL",
            backend: "VULKAN_READY"
        });
    } catch(err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/tasks", (req, res) => {
    res.json(queueManager.getTasks());
});

router.get("/logs/stream", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    const handler = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    logger.on('log', handler);
    req.on('close', () => logger.off('log', handler));
});

export { router as SystemRouter };

