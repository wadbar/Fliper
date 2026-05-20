import { Router } from "express";
import { syncLaunchBoxData, ramDatabase } from "../../core/bridge";
import { SecurityProvider } from "../core/SecurityProvider";
import { sanitize } from "../utils/Sanitizer";
import { logger } from "../core/Logger";
import { WebhookManager } from "../core/WebhookManager";
import { queueManager } from "../core/QueueManager";
import { exec } from "child_process";
import { PredictiveProcessor } from "../core/PredictiveProcessor";

const router = Router();

router.post("/scan", async (req, res) => {
    try {
        const lbPath = SecurityProvider.sanitizePath(req.body.lbPath);
        if (!lbPath) return res.status(400).json({ error: "Missing lbPath" });
        
        await syncLaunchBoxData(lbPath);
        res.json({ status: "ok", message: "LaunchBox data synchronized" });
    } catch (error: any) {
        logger.error('API /api/scan error', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

router.post("/launch", (req, res) => {
    try {
        const { path: romPath, platform, mode, core, title } = req.body;
        
        const sRomPath = SecurityProvider.sanitizePath(romPath);
        const sPlatform = sanitize(platform);
        const sTitle = sanitize(title);
        const safeCore = core ? sanitize(core).replace(/[^a-zA-Z0-9_]/g, '') : 'mame';
        
        if (!sRomPath) return res.status(400).json({ error: "VALIDATION_FAILED", detail: "Missing ROM path" });
        
        const safeMode = mode === 'ULTRA' ? 'bgfx' : 'gdi';
        
        logger.info('Spawn sequence initiated', { romPath: sRomPath, platform: sPlatform, mode: safeMode, core: safeCore });
        WebhookManager.notify('game_launch', { title: sTitle, platform: sPlatform, core: safeCore, mode: safeMode });
        
        let binary = 'mame';
        const c = safeCore.toLowerCase().replace(/_+/g, '_');
        
        const emulatorMap: Record<string, string> = {
            'duckstation': 'duckstation-qt',
            'pcsx2': 'pcsx2-qt',
            'rpcs3': 'rpcs3',
            'dolphin': 'dolphin-emu',
            'ryujinx': 'ryujinx',
            'sudachi': 'sudachi',
            'citra': 'citra-qt',
            'ppsspp': 'PPSSPPSDL',
            'redream': 'redream'
        };

        if (emulatorMap[c]) binary = emulatorMap[c];
        else if (c.includes('libretro')) {
            binary = `retroarch -L /usr/lib/libretro/${c}_libretro.so --fullscreen`;
        } else binary = c;

        const niceCmd = mode === 'LITE' ? 'nice -n 19 ' : '';
        
        let raFlags = '';
        if (process.env.RETRO_USERNAME && process.env.RETRO_API_KEY && binary.includes('retroarch')) {
            raFlags = ` --cheevos-user ${process.env.RETRO_USERNAME} --cheevos-pass ${process.env.RETRO_API_KEY} --cheevos-enable`;
        }

        const command = process.platform === 'win32' 
            ? `echo "Executing ${binary}${raFlags} via WSL on ${sRomPath}"` 
            : `${niceCmd}${binary}${raFlags} -video ${safeMode} "${sRomPath}"`;

        exec(command, { timeout: 0, maxBuffer: 1024 * 1024 }, (error, stdout) => {
            if (error) {
                logger.error('Failed execution', error);
                return res.status(500).json({ error: 'Process execution error' });
            }
            res.json({ status: "ok", detail: stdout.trim().split('\n')[0] });
        });
    } catch (error: any) {
        logger.error('/api/launch fatal error', error);
        res.status(500).json({ error: 'Launch Controller Failure' });
    }
});

router.get("/", (req, res) => {
    if (ramDatabase.length > 0) {
        const titles = ramDatabase.slice(0, 10).map(g => g.title);
        PredictiveProcessor.analyzeUserQueue(titles, "universal");
    }
    res.json(ramDatabase);
});

router.post("/validate", (req, res) => {
    const { title, path: romPath } = req.body;
    if (!title) return res.status(400).json({ error: "Missing ROM title" });
    
    try {
        const sTitle = sanitize(title);
        const sPath = SecurityProvider.sanitizePath(romPath);
        const task = queueManager.addTask('rom_validation', sTitle, { romPath: sPath });
        res.json({ status: "ok", task });
    } catch (e: any) {
        res.status(403).json({ error: e.message || "SECURITY_LIMIT_EXCEEDED" });
    }
});

router.post("/optimize", (req, res) => {
    try {
        const { title, path: romPath } = req.body;
        if (!title || !romPath) return res.status(400).json({ error: "Missing required fields" });
        
        const sTitle = sanitize(title);
        const sPath = SecurityProvider.sanitizePath(romPath);
        
        const task = queueManager.addTask('chd_optimization', sTitle, { romPath: sPath });
        res.json({ status: "ok", task });
    } catch (e: any) {
        res.status(403).json({ error: e.message || "SECURITY_LIMIT_EXCEEDED" });
    }
});

export { router as GameRouter };
