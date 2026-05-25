import { EventEmitter } from 'events';
import { logger } from './Logger';

// ---------------------------------------------------------------------------
// 1. TYPING E ESTRUTURAS DE DADOS (STRICT MODE)
// ---------------------------------------------------------------------------
export interface DaemonTask<T = unknown> {
    id: string;
    payload: T;
    priority?: number;
    abortController?: AbortController;
    retryCount?: number;
}

export interface DaemonStats {
    activeWorkers: number;
    tasksCompleted: number;
    tasksFailed: number;
    tasksQueued: number;
}

export type TaskHandler<T = unknown, R = unknown> = (task: DaemonTask<T>, signal: AbortSignal) => Promise<R>;

// ---------------------------------------------------------------------------
// 2. MOTOR DE FILA AGNÓSTICO COM CIRCUIT BREAKER E BACKOFF
// ---------------------------------------------------------------------------
export class AgnosticQueueDaemon<T = unknown, R = unknown> extends EventEmitter {
    private queue: DaemonTask<T>[] = [];
    private activeCount: number = 0;
    private maxConcurrent: number;
    private maxRetries: number;
    private circuitBreakerTripped: boolean = false;
    private readonly stats: DaemonStats = { activeWorkers: 0, tasksCompleted: 0, tasksFailed: 0, tasksQueued: 0 };
    private processor: TaskHandler<T, R>;

    constructor(processor: TaskHandler<T, R>, maxConcurrent: number = 5, maxRetries: number = 3) {
        super();
        this.processor = processor;
        this.maxConcurrent = maxConcurrent;
        this.maxRetries = maxRetries;
    }

    public enqueue(task: Omit<DaemonTask<T>, 'abortController' | 'retryCount'>): string {
        const fullTask: DaemonTask<T> = {
            ...task,
            retryCount: 0,
            abortController: new AbortController(),
        };
        
        this.queue.push(fullTask);
        // Ordena por prioridade (Maior roda primeiro)
        this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        this.stats.tasksQueued = this.queue.length;
        
        logger.debug(`[DAEMON] Task [${task.id}] enfileirada. Posição: ${this.queue.length}`);
        
        this.pump();
        return task.id;
    }

    // Controle não-bloqueante via setImmediate para preservar o Event Loop
    private pump(): void {
        if (this.circuitBreakerTripped || this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const task = this.queue.shift();
        if (!task) return;

        this.activeCount++;
        this.stats.activeWorkers = this.activeCount;
        this.stats.tasksQueued = this.queue.length;

        setImmediate(() => this.execute(task));
        
        // Tenta puxar a próxima tarefa se ainda houver capacidade
        if (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
            this.pump();
        }
    }

    private async execute(task: DaemonTask<T>): Promise<void> {
        try {
            logger.info(`[DAEMON] Processando Task [${task.id}]...`);
            
            // Timeout de segurança padrão injetável
            const timeout = setTimeout(() => task.abortController?.abort(), 30000);
            
            const result = await this.processor(task, task.abortController!.signal);
            
            clearTimeout(timeout);
            
            this.stats.tasksCompleted++;
            logger.success(`[DAEMON] Task [${task.id}] finalizada com sucesso.`);
            this.emit('task_success', { id: task.id, result });
            
        } catch (error: any) {
            if (task.abortController?.signal.aborted) {
                logger.warn(`[DAEMON] Task [${task.id}] abortada por timeout/interrupção externa.`);
            } else if ((task.retryCount || 0) < this.maxRetries) {
                task.retryCount = (task.retryCount || 0) + 1;
                const backoffMs = Math.pow(2, task.retryCount) * 1000; // Exponential Backoff
                
                logger.warn(`[DAEMON] Task [${task.id}] falhou. Tentativa ${task.retryCount}/${this.maxRetries}. Retentando em ${backoffMs}ms...`);
                
                setTimeout(() => {
                    this.queue.unshift(task); // Coloca direto no topo para priorizar finalização
                    this.pump();
                }, backoffMs);
                
                this.activeCount--;
                this.stats.activeWorkers = this.activeCount;
                return;
            } else {
                this.stats.tasksFailed++;
                logger.error(`[DAEMON] Task [${task.id}] esgotou as tentativas. Falha final.`, error);
                this.emit('task_failure', { id: task.id, error });
            }
        } finally {
            this.activeCount--;
            this.stats.activeWorkers = this.activeCount;
            this.pump(); // Chama a próxima do pipeline
        }
    }

    public halt(): void {
        this.circuitBreakerTripped = true;
        logger.warn('[DAEMON] Circuit Breaker ativado. Nenhuma nova tarefa será puxada da fila.');
    }

    public resume(): void {
        this.circuitBreakerTripped = false;
        logger.info('[DAEMON] Circuit Breaker desarmado. Retomando processamento.');
        this.pump();
    }

    public getTelemetry(): DaemonStats {
        return { ...this.stats };
    }
}

// ---------------------------------------------------------------------------
// 3. INSTÂNCIA ESPECIALIZADA PARA INFERÊNCIA LLM (MANTENDO A COMPATIBILIDADE)
// ---------------------------------------------------------------------------
export interface InferencePayload {
    prompt: string;
    context?: Record<string, unknown>;
}

// Handler agnóstico (Simulação substituível por qualquer SDK de LLM via DI)
const inferenceProcessor: TaskHandler<InferencePayload, unknown> = async (task, signal) => {
    return new Promise((resolve, reject) => {
        const abortHandler = () => reject(new Error('AbortError'));
        signal.addEventListener('abort', abortHandler);
        
        const delay = Math.random() * 2000 + 1000;
        setTimeout(() => {
            signal.removeEventListener('abort', abortHandler);
            if (signal.aborted) return reject(new Error('AbortError'));
            if (Math.random() < 0.05) return reject(new Error('Simulated network variance'));
            
            resolve({ generated: `Synthetic output for prompt: ${task.payload.prompt.substring(0, 20)}...` });
        }, delay);
    });
};

export const AIDaemon = new AgnosticQueueDaemon<InferencePayload, unknown>(inferenceProcessor, 3, 3);
