import { EventEmitter } from "events";
import { logger } from "./Logger";

/**
 * BUILD OBSERVER (Telemetry Pipeline)
 * Provides real-time streaming of raw build logs to the frontend via EventEmitter.
 */
export class BuildObserver extends EventEmitter {
    private static instance: BuildObserver;
    private buildStats: Record<string, { start: number, end?: number }> = {};
    
    private constructor() {
        super();
    }

    public static getInstance(): BuildObserver {
        if (!this.instance) this.instance = new BuildObserver();
        return this.instance;
    }

    public log(taskId: string, message: string) {
        logger.info(`[BUILD_LOG:${taskId}] ${message}`);
        this.emit('log', { taskId, message, timestamp: Date.now() });
    }

    public startBuild(taskId: string) {
        this.buildStats[taskId] = { start: Date.now() };
    }

    public endBuild(taskId: string) {
        if (this.buildStats[taskId]) {
            this.buildStats[taskId].end = Date.now();
            this.log(taskId, `BUILD_COMPLETED (Latency: ${this.buildStats[taskId].end! - this.buildStats[taskId].start}ms)`);
        }
    }
}
