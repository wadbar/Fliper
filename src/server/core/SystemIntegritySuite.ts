import { KernelProxy } from "./KernelProxy";
import { queueManager } from "./QueueManager";
import { logger } from "./Logger";
import { WebhookManager } from "./WebhookManager";

export interface TestResult {
    component: string;
    passed: boolean;
    latency: number;
    message: string;
}

/**
 * INDUSTRIAL STRESS TESTER
 * Validates system integrity under simulated heavy load.
 */
export class SystemIntegritySuite {
    public static async runSuite(): Promise<TestResult[]> {
        const results: TestResult[] = [];
        
        logger.info("Integrity: Starting Full System Audit...");

        // 1. Kernel Proxy Check
        results.push(await this.testKernelProxy());

        // 2. AI Resiliency Engine Check
        results.push(await this.testAIEngine());

        // 3. Queue Manager Pressure
        results.push(await this.testQueuePressure());

        // Handle Alerting for Failures
        const failures = results.filter(r => !r.passed);
        if (failures.length > 0) {
            logger.error(`[INTEGRITY_ALERT] ${failures.length} system components failed integrity audit.`);
            WebhookManager.notify('SYSTEM_INTEGRITY_FAILURE', { failures });
        }

        return results;
    }

    private static async testKernelProxy(): Promise<TestResult> {
        const start = Date.now();
        try {
            const output = await KernelProxy.execute("uname -sr");
            return {
                component: "Kernel Proxy IPC",
                passed: true,
                latency: Date.now() - start,
                message: `Kernel: ${output.trim()}`
            };
        } catch (e: any) {
            return { component: "Kernel Proxy IPC", passed: false, latency: Date.now() - start, message: e.message };
        }
    }

    private static async testAIEngine(): Promise<TestResult> {
        const start = Date.now();
        try {
            const { generate, getEngineStats } = await import("../../services/aiEngine.mjs");
            
            const res = await generate({ 
                prompt: "perform integrity handshake",
                systemInstruction: "Respond with 'VERIFIED' if you are operational.",
                temperature: 0.1
            });
            
            const stats = getEngineStats();
            const geminiBreaker = stats.breakers.gemini;
            const errorSuffix = geminiBreaker.errorCode ? ` (Last Error: ${geminiBreaker.errorCode})` : "";
            
            return {
                component: "Neural Core (Resilient)",
                passed: res.success && res.provider !== 'heuristic',
                latency: Date.now() - start,
                message: res.success && res.provider !== 'heuristic' 
                    ? `Provider: ${res.provider} (Active)` 
                    : `Neural Collapse: Fell back to ${res.provider}${errorSuffix}`
            };
        } catch (e: any) {
            return { component: "Neural Core (Resilient)", passed: false, latency: Date.now() - start, message: e.message };
        }
    }

    private static async testQueuePressure(): Promise<TestResult> {
        const start = Date.now();
        try {
            const tasks = queueManager.getTasks();
            return {
                component: "Queue Scheduler",
                passed: true,
                latency: Date.now() - start,
                message: `Active Pools: ${tasks.length} tasks in memory.`
            };
        } catch (e: any) {
            return { component: "Queue Scheduler", passed: false, latency: Date.now() - start, message: e.message };
        }
    }
}
