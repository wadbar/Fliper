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
import fs from "fs";
import path from "path";

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
        const dbPath = path.join(process.cwd(), 'database');
        await fs.promises.mkdir(dbPath, { recursive: true });
        const files = await fs.promises.readdir(dbPath);
        const stats = await Promise.all(
            files.map(async (file) => {
                const s = await fs.promises.stat(path.join(dbPath, file));
                return { name: file, size: s.size, createdAt: s.birthtime };
            })
        );
        res.json(stats);
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
        const { type, name } = req.body;
        const task = queueManager.addTask(sanitize(type), sanitize(name));
        res.json({ status: "ok", task });
    } catch (err: any) {
        res.status(429).json({ error: err.message });
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

