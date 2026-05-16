import { logger } from "../core/Logger";
import { queueManager } from "../core/QueueManager";

export class Metrics {
    private static startTime = Date.now();

    public static getSystemMetrics() {
        const tasks = queueManager.getTasks();
        return {
            uptime: Date.now() - this.startTime,
            memoryUsage: process.memoryUsage(),
            activeTasks: tasks.length,
            queuedBuilds: tasks.filter(t => t.status === 'queued').length,
            completedBuilds: tasks.filter(t => t.status === 'completed').length
        };
    }
}
