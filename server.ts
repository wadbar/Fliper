import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { syncLaunchBoxData, ramDatabase } from "./src/core/bridge";
import fs from "fs";
import { exec } from "child_process";

// CORE IMPORTS (MODULAR)
import { logger } from "./src/server/core/Logger";
import { WebhookManager } from "./src/server/core/WebhookManager";
import { queueManager } from "./src/server/core/QueueManager";
import { HealthMonitor } from "./src/server/core/HealthMonitor";
import { SecurityProvider, Role } from "./src/server/core/SecurityProvider";
import { KernelProxy } from "./src/server/core/KernelProxy";
import { PredictiveProcessor } from "./src/server/core/PredictiveProcessor";
import { CloudStorageProvider } from "./src/server/core/CloudStorageProvider";
import { DistroFactory, DistroRecipe } from "./src/server/core/DistroFactory";
import { SystemIntegritySuite } from "./src/server/core/SystemIntegritySuite";
import { Metrics } from "./src/server/monitoring/Metrics";
import { BuildObserver } from "./src/server/core/BuildObserver";
import { kernelRateLimiter } from "./src/server/middleware/RateLimiter";
import { sanitize } from "./src/server/utils/Sanitizer";

// --- GRACEFUL SHUTDOWN HANDLER ---
function setupShutdown(server: any) {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Starting Graceful Shutdown...`);
    HealthMonitor.stop();
    server.close(() => {
      logger.info('HTTP Server closed. Process terminated.');
      process.exit(0);
    });
    
    // Force close after 10s
    setTimeout(() => {
      logger.fatal('Could not close connections in time, forcefully shutting down.');
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start Kernel Monitors
  HealthMonitor.start();

  // --- SECURITY & MIDDLEWARE ---
  app.use(express.json({ limit: '1mb' }));
  app.use(kernelRateLimiter);
  
  app.use((req, res, next) => {
    logger.info('Incoming request', { method: req.method, path: req.path, ip: req.ip });
    res.on('finish', () => {
       if (res.statusCode >= 400) {
         logger.warn('Request failed', { method: req.method, path: req.path, status: res.statusCode });
       }
    });
    next();
  });

  // --- HEALTH & TELEMETRY ---
  app.get("/api/health", (req, res) => {
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

  app.get("/api/metrics", (req, res) => {
    res.json(Metrics.getSystemMetrics());
  });

  // --- KERNEL API ROUTES ---

  app.post("/api/scan", async (req, res) => {
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

  app.post("/api/launch", (req, res) => {
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
      
      // Standalone Emulators Mapping
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
      const command = process.platform === 'win32' 
        ? `echo "Executing ${binary} via WSL on ${sRomPath}"` 
        : `${niceCmd}${binary} -video ${safeMode} "${sRomPath}"`;

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

  app.get("/api/games", (req, res) => {
    // Background Predicitve Analysis
    if (ramDatabase.length > 0) {
      const titles = ramDatabase.slice(0, 10).map(g => g.title);
      PredictiveProcessor.analyzeUserQueue(titles, "universal");
    }
    res.json(ramDatabase);
  });

  app.get("/api/download/status", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    queueManager.registerClient(res);
    req.on('close', () => queueManager.unregisterClient(res));
  });

  app.post("/api/download", (req, res) => {
    try {
      const { type, name } = req.body;
      const task = queueManager.addTask(sanitize(type), sanitize(name));
      res.json({ status: "ok", task });
    } catch (err: any) {
      res.status(429).json({ error: err.message });
    }
  });

  app.get("/api/tasks", (req, res) => {
    res.json(queueManager.getTasks());
  });

  app.post("/api/validate", (req, res) => {
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

  app.post("/api/games/optimize", (req, res) => {
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

  app.post("/api/auth", (req, res) => {
    // Development simplified auth for testing
    const { username, password } = req.body;
    if (username === "admin" && password === "admin") {
       res.json({ token: SecurityProvider.generateToken("admin_user", Role.ADMIN) });
    } else if (username === "kernel" && password === "kernel") {
       res.json({ token: SecurityProvider.generateToken("kernel_system", Role.KERNEL_SPACE) });
    } else {
       res.json({ token: SecurityProvider.generateToken("guest", Role.USER) });
    }
  });

  app.post("/api/kernel/exec", async (req, res) => {
    try {
      const { command } = req.body;
      if (!command) return res.status(400).json({ error: "Missing command" });
      
      const output = await KernelProxy.execute(command);
      res.json({ output });
    } catch (e: any) {
      res.status(403).json({ error: e.message });
    }
  });

  app.post("/api/system/webhooks", (req, res) => {
    const { url } = req.body;
    if (url && url.startsWith('http')) {
      WebhookManager.addEndpoint(url);
      logger.info('Webhook registered', { url });
      return res.json({ status: "ok" });
    }
    res.status(400).json({ error: "Invalid URL" });
  });

  app.get("/api/system/files", async (req, res) => {
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

  app.delete("/api/system/files/:name", async (req, res) => {
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

  // --- CLOUD STORAGE API ---
  app.get("/api/cloud/files", async (req, res) => {
    try {
      const { prefix } = req.query;
      const files = await CloudStorageProvider.listFiles(prefix as string);
      res.json(files);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/cloud/sync", async (req, res) => {
    try {
      const { fileName } = req.body;
      if (!fileName) return res.status(400).json({ error: "Missing filename" });
      
      const task = queueManager.addTask('cloud_sync', fileName, { fileName });
      res.json({ status: "ok", task });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/system/audit", async (req, res) => {
    try {
      const results = await SystemIntegritySuite.runSuite();
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/distro/build", async (req, res) => {
    try {
      const recipe: DistroRecipe = req.body;
      const task = await DistroFactory.initiateBuild(recipe);
      res.json({ status: "ok", task });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/system/build/log/stream", (req, res) => {
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

  app.get("/api/cloud/link/:name", async (req, res) => {
    try {
      const key = `vault/${req.params.name}`;
      const url = await CloudStorageProvider.getDownloadUrl(key);
      if (!url) throw new Error("LINK_GEN_FAILED");
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/intent", async (req, res) => {
    try {
      const { prompt } = req.body;
      const { processKernelIntent } = await import("./src/core/ai.ts");
      const result = await processKernelIntent(prompt);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/enrich", async (req, res) => {
    try {
      const { title, platform } = req.body;
      const { enrichGameData } = await import("./src/core/ai.ts");
      const result = await enrichGameData(title, platform);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // STARTUP
  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`FliperOS Unified Desktop active on port ${PORT}`, { 
       environment: process.env.NODE_ENV,
       pid: process.pid
    });
  });

  setupShutdown(server);
}

startServer();
