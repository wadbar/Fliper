import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { syncLaunchBoxData, ramDatabase } from "./src/core/bridge";
import fs from "fs";

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

// V10: ADVANCED TELEMETRY & GLOBAL ERROR INTERCEPTION
process.on('uncaughtException', (err: Error) => {
    logger.fatal(`[CRITICAL] Uncaught Exception: ${err.message}`, { stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
    logger.fatal(`[CRITICAL] Unhandled Rejection: ${reason}`);
    process.exit(1);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start Kernel Monitors
  logger.info("[SYS] Initializing FliperOS Kernel...");
  HealthMonitor.start();

  // --- SECURITY & MIDDLEWARE ---
  app.use(express.json({ limit: '5mb' }));
  app.use(kernelRateLimiter);
  
  // V10: Request Telemetry Pipe
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (res.statusCode >= 500) {
        logger.fatal(`[HTTP] ${req.method} ${req.path} - ${res.statusCode} (${ms}ms)`);
      } else if (res.statusCode >= 400) {
        logger.warn(`[HTTP] ${req.method} ${req.path} - ${res.statusCode} (${ms}ms)`);
      } else {
        logger.info(`[HTTP] ${req.method} ${req.path} - ${res.statusCode} (${ms}ms)`);
      }
    });
    next();
  });

  // --- ROUTES DEFINITION ---
  try {
    app.use("/api/system", SystemRouter);
    app.use("/api/games", GameRouter);
    app.use("/api/ai", AiRouter);
    app.use("/api/cloud", CloudRouter);
    app.use("/api/auth", AuthRouter);

    // LEGACY REDIRECTS (Graceful fallback)
    app.get("/api/health", (req: Request, res: Response) => res.redirect(301, "/api/system/health"));
    app.get("/api/metrics", (req: Request, res: Response) => res.redirect(301, "/api/system/metrics"));
  } catch (routeErr: any) {
    logger.error(`[ROUTER] Failed to bind core routes: ${routeErr.message}`);
  }

  // --- VITE MIDDLEWARE INTERCEPTION ---
  try {
    if (process.env.NODE_ENV !== "production") {
      logger.info("[VITE] Starting development server middleware...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      logger.info("[VITE] Serving static production build via Express...");
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => res.sendFile(path.join(distPath, 'index.html')));
    }
  } catch (viteErr: any) {
     logger.error(`[VITE] Middleware initialization failed: ${viteErr.message}`, { stack: viteErr.stack });
  }

  // GLOBAL ERROR HANDLER
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error(`[EXPRESS FAULT] ${err.message}`, { path: req.path, stack: err.stack });
      res.status(500).json({ status: "error", code: "INTERNAL_FAULT", detail: process.env.NODE_ENV === 'development' ? err.message : "Service Unavailable" });
  });

  // STARTUP
  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`[ACTIVE] FliperOS Unified Desktop active on port ${PORT}`, { 
       environment: process.env.NODE_ENV || 'development',
       pid: process.pid
    });
  });

  // --- GRACEFUL SHUTDOWN HANDLER (Backoff/Hard-close) ---
  const shutdown = (signal: string) => {
    logger.info(`[SHUTDOWN] Received ${signal}. Draining connections...`);
    HealthMonitor.stop();
    
    server.close((err) => {
      if (err) {
         logger.error(`[SHUTDOWN] Error during teardown: ${err.message}`);
         process.exit(1);
      }
      logger.info('[SHUTDOWN] HTTP Server closed cleanly. Terminating Process 0.');
      process.exit(0);
    });
    
    // Hard trap door after 10s backoff
    setTimeout(() => {
      logger.fatal('[SHUTDOWN] Graceful exit timed out (10s log). Force terminating node process.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch(err => {
    logger.fatal(`[CRITICAL] Server fails to boot: ${err.message}`);
    process.exit(1);
});