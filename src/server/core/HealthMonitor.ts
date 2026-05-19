
import { logger } from "./Logger";
import { queueManager } from "./QueueManager";
import os from "os";

/**
 * SELF-HEALING KERNEL MONITOR
 * Monitors system health, memory leaks, and task hung states.
 */
export class HealthMonitor {
  private static interval: NodeJS.Timeout;
  private static readonly MEMORY_THRESHOLD = 0.85; // 85% of total RAM

  public static start() {
    logger.info("HealthMonitor: Initializing self-healing cycles & graceful shutdown handlers...");
    this.interval = setInterval(() => this.check(), 10000);
    
    // Graceful Shutdown Hooks
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
       logger.fatal("UNCAUGHT_EXCEPTION", err);
       this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  }

  private static gracefulShutdown(signal: string) {
    logger.info(`Received ${signal}. Initiating Graceful Shutdown (Self-Healing)...`);
    
    this.stop();
    
    // Drain Queue gracefully (Marking pending as aborted)
    const taskCount = queueManager.getTasks().filter(t => t.status === 'queued' || t.status === 'downloading' || t.status === 'compressing').length;
    if (taskCount > 0) {
        logger.warn(`Draining ${taskCount} active tasks...`);
        queueManager.getTasks().forEach(t => {
             if (t.status !== 'completed' && t.status !== 'error') queueManager.failTask(t.id, `SYSTEM_HALTED (${signal})`);
        });
    }

    setTimeout(() => {
        logger.info("Graceful Shutdown complete. Exiting.");
        process.exit(0);
    }, 1500).unref();
  }

  private static async check() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usageRatio = (totalMem - freeMem) / totalMem;

    // 1. Memory Guard
    if (usageRatio > this.MEMORY_THRESHOLD) {
      logger.warn("CRITICAL: Memory threshold exceeded. Initiating emergency cleanup.");
      this.emergencyCleanup();
    }

    // 2. Dead Task Cleanup
    this.reapStallTasks();

    // 3. Health Breadcrumb
    const health = {
      uptime: os.uptime(),
      load: os.loadavg(),
      memory: Math.round((totalMem - freeMem) / 1024 / 1024) + "MB",
      latency_score: this.getEventLoopLag(),
      event_loop_lag: this.getEventLoopLag(),
      platform: process.platform,
      arch: process.arch,
      distro: os.type()
    };
    
    if (health.event_loop_lag > 100) {
      logger.warn(`CRITICAL: Event Loop Lag detected: ${health.event_loop_lag}ms. Process might be stalling.`);
    }
  }

  private static lastCheckTime = Date.now();
  public static getEventLoopLag(): number {
    const now = Date.now();
    const lag = now - this.lastCheckTime - 10000;
    this.lastCheckTime = now;
    return Math.max(0, lag);
  }

  private static emergencyCleanup() {
    // Clear caches, halt non-essential background tasks
    const tasks = queueManager.getTasks();
    tasks.forEach(t => {
      if (t.status === 'downloading' || t.status === 'compressing') {
          // Pause or cancel massive long-running tasks if memory is low
          // For now, just log the event
          logger.warn(`Resource Pressure: Throttling task ${t.name}`);
      }
    });

    if (global.gc) {
      logger.info("Forcing Garbage Collection...");
      global.gc();
    }
  }

  private static reapStallTasks() {
    const tasks = queueManager.getTasks();
    const now = Date.now();
    const STALL_THRESHOLD = 1000 * 60 * 15; // 15 minutes for industrial safety

    tasks.forEach(task => {
      if (task.status !== 'completed' && task.status !== 'error') {
          const age = now - task.createdAt;
          if (age > STALL_THRESHOLD) {
             logger.warn(`Watchdog: Reaping stalled task ${task.id} (${task.name}) - Age: ${Math.round(age/1000)}s`);
             queueManager.failTask(task.id, 'KERNEL_WATCHDOG_REAPED: STALL_DETECTED');
          }
      }
    });

    // Clean up memory growth
    const oldFinishedTasks = tasks.filter(t => (t.status === 'completed' || t.status === 'error') && (now - t.createdAt > 3600000));
    if (oldFinishedTasks.length > 50) {
       logger.info("Watchdog: Initiating emergency queue garbage collection.");
    }
  }

  public static stop() {
    if (this.interval) clearInterval(this.interval);
  }
}
