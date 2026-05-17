
import fs from 'fs';
import path from 'path';
import { WebhookManager } from "./WebhookManager";
import { EventEmitter } from "events";

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL'
}

class TelemetryLogger extends EventEmitter {
    private logDir: string;
    private logFile: string;

    constructor() {
        super();
        this.logDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(this.logDir, `system-${new Date().toISOString().split('T')[0]}.log`);
        
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private formatContext(meta?: any): string {
        if (!meta) return '';
        try {
             return JSON.stringify(meta);
        } catch(e) {
             return '[Circular/Invalid Meta]';
        }
    }

    private write(level: LogLevel, msg: string, meta?: any) {
        const timestamp = new Date().toISOString();
        const mem = process.memoryUsage();
        const memMetric = `[Mem: ${Math.round(mem.rss / 1024 / 1024)}MB]`;
        
        const payload = {
            level,
            timestamp,
            message: msg,
            memoryRs_MB: Math.round(mem.rss / 1024 / 1024),
            ...meta
        };

        const stdoutMsg = `[${timestamp}] ${level} ${memMetric} - ${msg} ${this.formatContext(meta)}`;
        
        // Write to stdout
        if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
            console.error(stdoutMsg);
        } else if (level === LogLevel.WARN) {
            console.warn(stdoutMsg);
        } else {
            console.log(stdoutMsg);
        }

        // Write to File Stream synchronously for absolute persistence
        try {
            fs.appendFileSync(this.logFile, JSON.stringify(payload) + '\n');
        } catch (e) {
            console.error("CRITICAL: Failed to write to log file.");
        }

        // Telemetry Integration
        this.emit('log', payload);
        if (level !== LogLevel.DEBUG) {
            WebhookManager.notify('log', payload);
        }
    }

    public debug(msg: string, meta?: any) { this.write(LogLevel.DEBUG, msg, meta); }
    public info(msg: string, meta?: any) { this.write(LogLevel.INFO, msg, meta); }
    public success(msg: string, meta?: any) { this.write(LogLevel.INFO, `[SUCCESS] ${msg}`, { ...meta, success: true }); }
    public warn(msg: string, meta?: any) { 
        this.write(LogLevel.WARN, msg, meta instanceof Error ? { message: meta.message, stack: meta.stack } : meta); 
    }
    public error(msg: string, err?: any) { 
        this.write(LogLevel.ERROR, msg, err instanceof Error ? { message: err.message, stack: err.stack } : err); 
    }
    public fatal(msg: string, err?: any) {
        this.write(LogLevel.FATAL, msg, err);
        process.exit(1);
    }
}

export const logger = new TelemetryLogger();
