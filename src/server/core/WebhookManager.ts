
import crypto from "crypto";
import { logger } from "./Logger";

class CircuitBreaker {
  private failures = 0;
  private readonly threshold = 5;
  private lastFailureTime = 0;
  private readonly cooldown = 60000;

  public async execute(action: () => Promise<void>) {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailureTime > this.cooldown) {
        this.failures = 0;
      } else {
        return; // Circuit open
      }
    }

    try {
      await action();
      this.failures = 0;
    } catch (e) {
      this.failures++;
      this.lastFailureTime = Date.now();
    }
  }
}

export class WebhookManager {
  private static endpoints: string[] = [];
  private static breaker = new CircuitBreaker();

  public static addEndpoint(url: string) {
    if (!this.endpoints.includes(url)) {
      this.endpoints.push(url);
      logger.info(`Webhook Vector Registered: ${url}`);
    }
  }

  public static async notify(event: string, payload: any) {
    if (this.endpoints.length === 0) return;
    
    const body = JSON.stringify({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
      timestamp: Date.now(),
      kernel: 'v2.5.0-pro',
      event,
      data: payload
    });

    for (const url of this.endpoints) {
      this.breaker.execute(async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(3000)
        });
        if (!response.ok) throw new Error('WEBHOOK_FAILED');
      });
    }
  }
}
