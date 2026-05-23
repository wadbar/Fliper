export type SystemMetrics = {
  cpu: number;
  memory: number;
  timestamp: number;
};

type Subscriber = (metrics: SystemMetrics) => void;

class MonitoringService {
  private static instance: MonitoringService;
  
  private metricsHistory: SystemMetrics[] = [];
  private subscribers: Set<Subscriber> = new Set();
  
  private cpuThresholdStart: number | null = null;
  private ramThresholdStart: number | null = null;
  private readonly THRESHOLD = 85;
  private readonly TIME_LIMIT = 5 * 60 * 1000; // 5 minutes
  
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private startMonitoring() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      // Simulate real-time metrics
      const metrics: SystemMetrics = {
        cpu: 15 + Math.random() * 80, // Occasional high spikes
        memory: 40 + Math.random() * 55, // Occasional high RAM
        timestamp: Date.now()
      };

      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 500) {
        this.metricsHistory.shift();
      }

      this.checkThresholds(metrics);
      this.subscribers.forEach(sub => sub(metrics));
    }, 2000);
  }

  public pushManualMetrics(cpu: number, ram: number) {
      const metrics: SystemMetrics = {
        cpu,
        memory: ram,
        timestamp: Date.now()
      };
      this.checkThresholds(metrics);
  }

  private checkThresholds(metrics: SystemMetrics) {
    const now = metrics.timestamp;

    if (metrics.cpu > this.THRESHOLD) {
      if (!this.cpuThresholdStart) this.cpuThresholdStart = now;
      else if (now - this.cpuThresholdStart >= this.TIME_LIMIT) {
        this.triggerNotification('CPU Usage Critical Alert (Exceeds 85% for 5 mins)');
        this.cpuThresholdStart = null; 
      }
    } else {
      this.cpuThresholdStart = null;
    }

    if (metrics.memory > this.THRESHOLD) {
      if (!this.ramThresholdStart) this.ramThresholdStart = now;
      else if (now - this.ramThresholdStart >= this.TIME_LIMIT) {
        this.triggerNotification('RAM Usage Critical Alert (Exceeds 85% for 5 mins)');
        this.ramThresholdStart = null;
      }
    } else {
      this.ramThresholdStart = null;
    }
  }

  private triggerNotification(message: string) {
    console.warn('[MonitoringService]', message);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monitoring-alert', { detail: { message }}));
    }
  }
}

export const monitoringService = MonitoringService.getInstance();
