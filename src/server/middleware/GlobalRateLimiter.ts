import { Request, Response, NextFunction } from 'express';
import { logger } from '../core/Logger';
import { EventEmitter } from 'events';

interface RateLimitTracker {
    count: number;
    resetTime: number;
}

export class RateLimiterEngine extends EventEmitter {
    private store: Map<string, RateLimitTracker> = new Map();
    private readonly windowMs: number;
    private readonly maxRequests: number;

    constructor(windowMs: number = 60000, maxRequests: number = 100) {
        super();
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;

        // Garbage Collector for stale IPs
        setInterval(() => this.cleanup(), Math.max(windowMs, 60000)).unref();
    }

    private cleanup(): void {
        const now = Date.now();
        let purged = 0;
        for (const [ip, tracker] of this.store.entries()) {
            if (now > tracker.resetTime) {
                this.store.delete(ip);
                purged++;
            }
        }
        if (purged > 0) {
            logger.debug(`RateLimiter GC: Purged ${purged} stale entries.`);
        }
    }

    public middleware() {
        return (req: Request, res: Response, next: NextFunction): void => {
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const now = Date.now();

            let tracker = this.store.get(ip);

            if (!tracker || now > tracker.resetTime) {
                tracker = { count: 0, resetTime: now + this.windowMs };
                this.store.set(ip, tracker);
            }

            tracker.count++;

            res.setHeader('X-RateLimit-Limit', this.maxRequests);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - tracker.count));
            res.setHeader('X-RateLimit-Reset', Math.ceil(tracker.resetTime / 1000));

            if (tracker.count > this.maxRequests) {
                logger.warn(`Rate limit exceeded for IP: ${ip}`);
                this.emit('limit_exceeded', { ip, path: req.path });
                res.status(429).json({
                    error: 'ERR_RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests. Please slow down.',
                    retryAfter: Math.ceil((tracker.resetTime - now) / 1000)
                });
                return;
            }

            next();
        };
    }
}

export const GlobalRateLimiter = new RateLimiterEngine(15 * 60 * 1000, 300); // 15 minutes, 300 requests
