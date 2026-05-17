import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { syncLaunchBoxData, ramDatabase } from "./src/core/bridge";
import fs from "fs";
import { exec } from "child_process";

// CORE IMPORTS (MODULAR)
import { logger } from "./src/server/core/Logger";
import { HealthMonitor } from "./src/server/core/HealthMonitor";
import { kernelRateLimiter } from "./src/server/middleware/RateLimiter";

// ROUTE IMPORTS
import { SystemRouter } from "./src/server/routes/SystemRouter";
import { GameRouter } from "./src/server/routes/GameRouter";
import { AiRouter } from "./src/server/routes/AiRouter";
import { CloudRouter } from "./src/server/routes/CloudRouter";
import { AuthRouter } from "./src/server/routes/AuthRouter";

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

// --- ROUTES ---
  app.use("/api/system", SystemRouter);
  app.use("/api/games", GameRouter);
  app.use("/api/ai", AiRouter);
  app.use("/api/cloud", CloudRouter);
  app.use("/api/auth", AuthRouter);

  // LEGACY COMPATIBILITY (OPTIONAL)
  app.get("/api/health", (req, res) => res.redirect("/api/system/health"));
  app.get("/api/metrics", (req, res) => res.redirect("/api/system/metrics"));

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
