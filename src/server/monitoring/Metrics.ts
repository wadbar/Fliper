import { logger } from "../core/Logger";
import { queueManager } from "../core/QueueManager";
import os from "os";

export class Metrics {
    private static startTime = Date.now();

    public static getSystemMetrics() {
        const tasks = queueManager.getTasks();
        const cpus = os.cpus();
        
        let totalIdle = 0;
        let totalTick = 0;
        const cores = cpus.map(core => {
            const idle = core.times.idle;
            const tick = Object.values(core.times).reduce((acc, tv) => acc + tv, 0);
            totalIdle += idle;
            totalTick += tick;
            return {
                model: core.model,
                speed: core.speed,
                idle,
                tick
            };
        });

        const overallUsage = 100 - ~~(100 * totalIdle / totalTick);

        return {
            uptime: Date.now() - this.startTime,
            memoryUsage: process.memoryUsage(),
            osFreeMem: os.freemem(),
            osTotalMem: os.totalmem(),
            loadAvg: os.loadavg(),
            overallCpuUsage: overallUsage,
            cores,
            activeTasks: tasks.length,
            queuedBuilds: tasks.filter(t => t.status === 'queued').length,
            completedBuilds: tasks.filter(t => t.status === 'completed').length
        };
    }
}

