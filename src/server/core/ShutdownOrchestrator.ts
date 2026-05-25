import { EventEmitter } from 'events';
import { logger } from './Logger';

export type ShutdownTask = () => Promise<void>;

class GracefulShutdownOrchestrator extends EventEmitter {
    private tasks: Map<string, ShutdownTask> = new Map();
    private shuttingDown: boolean = false;
    private shutdownTimeoutMs: number;

    constructor(timeoutMs: number = 30000) {
        super();
        this.shutdownTimeoutMs = timeoutMs;
        this.registerProcessSignals();
    }

    private registerProcessSignals(): void {
        process.on('SIGTERM', () => this.initiateShutdown('SIGTERM'));
        process.on('SIGINT', () => this.initiateShutdown('SIGINT'));
        process.on('uncaughtException', (error: Error) => {
            logger.fatal('Uncaught Exception detected. Initiating emergency teardown.', error);
            this.initiateShutdown('uncaughtException', 1);
        });
        process.on('unhandledRejection', (reason: any) => {
            logger.fatal('Unhandled Promise Rejection detected. Initiating emergency teardown.', new Error(String(reason)));
            this.initiateShutdown('unhandledRejection', 1);
        });
    }

    public registerTask(name: string, task: ShutdownTask): void {
        if (this.shuttingDown) {
            logger.warn(`Cannot register task [${name}] - shutdown already in progress.`);
            return;
        }
        this.tasks.set(name, task);
        logger.info(`Shutdown task [${name}] registered. Total tasks: ${this.tasks.size}`);
    }

    private async initiateShutdown(signal: string, exitCode: number = 0): Promise<void> {
        if (this.shuttingDown) {
            logger.warn(`Shutdown already in progress. Ignoring duplicate signal: ${signal}`);
            return;
        }

        this.shuttingDown = true;
        logger.info(`Received ${signal}. Initiating graceful shutdown sequence...`);

        const timeout = setTimeout(() => {
            logger.error(`Shutdown timeout of ${this.shutdownTimeoutMs}ms exceeded. Forcing process exit.`);
            process.exit(1);
        }, this.shutdownTimeoutMs);

        try {
            for (const [name, task] of this.tasks.entries()) {
                logger.info(`Executing shutdown task: [${name}]`);
                try {
                    await task();
                    logger.success(`Task [${name}] completed successfully.`);
                } catch (error) {
                    logger.error(`Task [${name}] failed during shutdown.`, error);
                }
            }
            clearTimeout(timeout);
            logger.info('Graceful shutdown completed successfully. Exiting matrix.');
            process.exit(exitCode);
        } catch (error) {
            logger.fatal('Critical failure during shutdown sequence.', error);
            clearTimeout(timeout);
            process.exit(1);
        }
    }
}

export const ShutdownOrchestrator = new GracefulShutdownOrchestrator();
