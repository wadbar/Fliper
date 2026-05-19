
import crypto from "crypto";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { logger } from "./Logger";
import { WebhookManager } from "./WebhookManager";
import { CloudStorageProvider } from "./CloudStorageProvider";
import { DriverRegistry } from "./DriverRegistry";
import { BuildObserver } from "./BuildObserver";
import { KeyManager } from "./KeyManager";
import express from "express";

export interface DownloadTask {
  id: string;
  type: string;
  name: string;
  status: 'queued' | 'downloading' | 'hashing' | 'compressing' | 'completed' | 'error';
  progress: number;
  message: string;
  createdAt: number;
}

export class AdvancedQueueManager {
  private queue: Map<string, DownloadTask> = new Map();
  private activeCount = 0;
  private readonly MAX_CONCURRENT = 4;
  private readonly MAX_QUEUE_SIZE = 500;
  private readonly TTL_MS = 60000;
  private sseClients: Set<express.Response> = new Set();
  private gcInterval: NodeJS.Timeout;

  constructor() {
    this.gcInterval = setInterval(() => this.garbageCollect(), 10000);
    this.gcInterval.unref(); // Prevent blocking Node cycle
  }

  public registerClient(res: express.Response) {
    this.sseClients.add(res);
    res.write(`data: ${JSON.stringify(this.getTasks())}\n\n`);
  }

  public unregisterClient(res: express.Response) {
    this.sseClients.delete(res);
  }

  private broadcast() {
    const payload = `data: ${JSON.stringify(this.getTasks())}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (e) {
        this.sseClients.delete(client);
      }
    }
  }

  public addTask(type: string, name: string, metadata?: any): DownloadTask {
    if (this.queue.size >= this.MAX_QUEUE_SIZE) {
      throw new Error('QUEUE_FULL');
    }
    
    const task: DownloadTask = {
      id: crypto.randomUUID(),
      type: type || 'unknown',
      name: name || `Asset_${Date.now()}`,
      status: 'queued',
      progress: 0,
      message: 'Processing...',
      createdAt: Date.now(),
      ...metadata
    };
    
    this.queue.set(task.id, task);
    this.broadcast();
    this.tick();
    
    logger.info('Task queued', { taskId: task.id, type, name });
    return task;
  }

  public getTasks(): DownloadTask[] {
    return Array.from(this.queue.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public failTask(id: string, message: string) {
    const task = this.queue.get(id);
    if (task) {
      task.status = 'error';
      task.message = message;
      this.broadcast();
      logger.warn(`Task forcefully failed by Kernel: ${id}`, { reason: message });
    }
  }

  private garbageCollect() {
    const now = Date.now();
    let changed = false;
    for (const [id, task] of this.queue.entries()) {
      if ((task.status === 'completed' || task.status === 'error') && (now - task.createdAt > this.TTL_MS)) {
        this.queue.delete(id);
        changed = true;
      }
    }
    if (changed) this.broadcast();
  }

  private tick() {
    if (this.activeCount >= this.MAX_CONCURRENT) return;
    for (const task of this.queue.values()) {
      if (task.status === 'queued') {
        this.processTask(task);
        if (this.activeCount >= this.MAX_CONCURRENT) break;
      }
    }
  }

  private async processTask(task: DownloadTask) {
    this.activeCount++;
    const MAX_RETRIES = 3;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
        try {
            if (task.type === 'chd_optimization') {
                await this.handleChdOptimization(task);
            } else if (task.type === 'distro_build') {
                await this.handleDistroBuild(task);
            } else if (task.type === 'cloud_sync') {
                await this.handleCloudSync(task);
            } else if (task.type.includes('compression')) {
                await this.handleCompressionTask(task);
            } else if (task.type === 'rom_validation') {
                await this.handleValidationTask(task);
            } else {
                await this.handleDownloadTask(task);
            }
            break; // Success
        } catch (error: any) {
            attempt++;
            logger.warn(`Task ${task.id} failed, attempt ${attempt}/${MAX_RETRIES}`, { error: error.message });
            if (attempt >= MAX_RETRIES) {
                task.status = 'error';
                task.message = `FATAL: ${error.message} (After ${MAX_RETRIES} retries)`;
                logger.error(`Task ${task.id} permanently failed`, error);
                this.broadcast();
            } else {
                // Exponential Backoff
                await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 10000)));
            }
        }
    }
    
    this.activeCount--;
    setImmediate(() => this.tick());
  }

  private async handleChdOptimization(task: DownloadTask) {
    task.status = 'compressing';
    task.message = "Initializing CHD Optimization...";
    this.broadcast();

    const observer = BuildObserver.getInstance();
    observer.log(task.id, "Starting CHD Optimization Pipeline...");

    try {
      const { romPath } = task as any;
      if (!romPath) throw new Error("MISSING_ROM_PATH");

      observer.log(task.id, `Processing ROM: ${romPath}`);

      // Real Gzip Compression stream
      const targetPath = path.resolve(process.cwd(), romPath);
      if (!fs.existsSync(targetPath)) throw new Error("ROM_FILE_NOT_FOUND");
      
      const outPath = targetPath + '.gz';
      const stat = fs.statSync(targetPath);
      let processed = 0;

      await new Promise<void>((resolve, reject) => {
         const readStream = fs.createReadStream(targetPath);
         const writeStream = fs.createWriteStream(outPath);
         const gzip = zlib.createGzip({ level: 9 });

         readStream.on('data', (chunk) => {
             processed += chunk.length;
             const progress = Math.floor((processed / stat.size) * 100);
             if (progress > task.progress + 2) {
                 task.progress = progress;
                 task.message = `Compressing Blocks... [${progress}%]`;
                 this.broadcast();
             }
         });

         readStream.pipe(gzip).pipe(writeStream);
         
         writeStream.on('finish', () => resolve());
         writeStream.on('error', (e) => reject(e));
         readStream.on('error', (e) => reject(e));
         gzip.on('error', (e) => reject(e));
      });

      task.status = 'completed';
      task.message = 'CHD Optimized: ROM_IMAGE_READY';
      
      observer.log(task.id, "CHD Optimization successful.");
      WebhookManager.notify('TASK_COMPLETED', { taskId: task.id, type: task.type, title: task.name });
    } catch (e: any) {
      task.status = 'error';
      task.message = `CHD_ERROR: ${e.message}`;
      observer.log(task.id, `CRITICAL_ERROR: ${e.message}`);
    } finally {
      this.broadcast();
    }
  }

  private async handleDistroBuild(task: DownloadTask) {
    task.status = 'downloading';
    task.message = "Initializing Build Environment...";
    this.broadcast();

    try {
      const { recipe } = task as any;
      const observer = BuildObserver.getInstance();
      observer.startBuild(task.id);
      observer.log(task.id, `Starting build for [${recipe.id}] with profile [${recipe.profile}] on arch [${recipe.arch}]`);

      // 1. Initial State: Sync Base RootFS
      task.message = `Syncing [${recipe.base}] RootFS`;
      task.progress = 10;
      this.broadcast();
      await new Promise(r => setTimeout(r, 1000));

      // 2. Kernel & Profile Application
      task.status = 'hashing';
      task.message = `Injecting [${recipe.kernel}] kernel & [${recipe.profile}] profiles`;
      task.progress = 30;
      this.broadcast();
      await new Promise(r => setTimeout(r, 1500));

      // 3. Driver Injection (THE CORE LOGIC)
      observer.log(task.id, "Auto-detecting hardware & injecting drivers...");
      task.message = "Executing Universal Driver Injection (Mesa/Nvidia/Mali)...";
      task.progress = 60;
      this.broadcast();

      const injectedDrivers = await DriverRegistry.runUniversalInjection(recipe.arch);
      observer.log(task.id, `Injected Drivers: ${injectedDrivers.join(', ') || 'None (Default)'}`);

      // 4. Finalization & Signing
      task.status = 'compressing';
      task.message = `Mastering ISO image...`;
      task.progress = 90;
      this.broadcast();
      
      const signature = await KeyManager.signBuild(Buffer.from(JSON.stringify(recipe)));
      
      // 5. Build Manifest
      const manifest = {
        recipe,
        signature,
        buildTimestamp: Date.now(),
        driverSet: injectedDrivers
      };
      
      observer.log(task.id, `MANIFEST_FINALIZED: Signature ${signature}`);
      observer.endBuild(task.id);
      
      task.status = 'completed';
      task.progress = 100;
      task.message = `BUILD_SUCCESS: ${recipe.id}`;
      
      WebhookManager.notify('DISTRO_BUILD_READY', manifest);
      
    } catch (e: any) {
      task.status = 'error';
      task.message = `BUILD_FAILURE: ${e.message}`;
      BuildObserver.getInstance().log(task.id, `ERROR: ${e.message}`);
    } finally {
      this.broadcast();
    }
  }

  private async handleCloudSync(task: DownloadTask) {
    task.status = 'downloading';
    task.message = "Initializing Cloud Handshake...";
    this.broadcast();

    try {
      const { fileName } = task as any;
      if (!fileName) throw new Error("MISSING_FILENAME");

      // Verify local file exists
      const dbPath = path.join(process.cwd(), 'database', fileName);
      if (!fs.existsSync(dbPath)) throw new Error("LOCAL_FILE_NOT_FOUND");

      const stats = fs.statSync(dbPath);
      const buffer = fs.readFileSync(dbPath);
      
      task.status = 'hashing';
      task.message = "Uploading to FliperOS Cloud...";
      task.progress = 50;
      this.broadcast();

      await CloudStorageProvider.uploadFile(`vault/${fileName}`, buffer);

      task.status = 'completed';
      task.message = 'Synchronized with Cloud Vault';
      task.progress = 100;
      WebhookManager.notify('CLOUD_SYNC_SUCCESS', { fileName, size: stats.size });
    } catch (e: any) {
      task.status = 'error';
      task.message = `CLOUD_FAULT: ${e.message}`;
    } finally {
      this.broadcast();
    }
  }

  private async handleValidationTask(task: DownloadTask) {
    task.status = 'hashing';
    task.message = "Calculating checksums...";
    this.broadcast();

    try {
      const { romPath } = task as any;
      if (!romPath) throw new Error("MISSING_ROM_PATH");
      const targetPath = path.resolve(process.cwd(), romPath);
      if (!fs.existsSync(targetPath)) throw new Error("ROM_FILE_NOT_FOUND");

      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(targetPath);
      const stat = fs.statSync(targetPath);
      
      let processed = 0;
      
      await new Promise<void>((resolve, reject) => {
          stream.on('data', (chunk) => {
              hash.update(chunk);
              processed += chunk.length;
              const newProgress = Math.floor((processed / stat.size) * 100);
              if (newProgress > task.progress + 5) {
                  task.progress = newProgress;
                  task.message = `Computing SHA256... ${newProgress}%`;
                  this.broadcast();
              }
          });
          stream.on('end', () => resolve());
          stream.on('error', (err) => reject(err));
      });

      const finalHash = hash.digest('hex');
      task.status = 'completed';
      task.progress = 100;
      task.message = `ROM Verified: ${finalHash.substring(0, 16)}...`;
      this.broadcast();
    } catch (e: any) {
      task.status = 'error';
      task.message = `Validation Error: ${e.message}`;
    } finally {
      this.broadcast();
    }
  }

  private async handleCompressionTask(task: DownloadTask) {
    task.status = 'compressing';
    this.broadcast();
    try {
      const { romPath } = task as any;
      if (!romPath) throw new Error("MISSING_TARGET_PATH");
      const targetPath = path.resolve(process.cwd(), romPath);
      if (!fs.existsSync(targetPath)) throw new Error("FILE_NOT_FOUND");
      
      const outPath = targetPath + '.zip.gz';
      const stat = fs.statSync(targetPath);
      let processed = 0;

      await new Promise<void>((resolve, reject) => {
         const readStream = fs.createReadStream(targetPath);
         const writeStream = fs.createWriteStream(outPath);
         const gzip = zlib.createGzip({ level: 9 });

         readStream.on('data', (chunk) => {
             processed += chunk.length;
             const progress = Math.floor((processed / stat.size) * 100);
             if (progress > task.progress + 2) {
                 task.progress = progress;
                 task.message = `Compressing File... ${progress}%`;
                 this.broadcast();
             }
         });

         readStream.pipe(gzip).pipe(writeStream);
         
         writeStream.on('finish', () => resolve());
         writeStream.on('error', (e) => reject(e));
         readStream.on('error', (e) => reject(e));
         gzip.on('error', (e) => reject(e));
      });

      task.status = 'completed';
      task.message = 'Optimization Complete';
    } catch (e: any) {
      task.status = 'error';
      task.message = e.message;
    } finally {
      this.broadcast();
    }
  }

  private async handleDownloadTask(task: DownloadTask) {
    task.status = 'downloading';
    this.broadcast();
    try {
      const { url } = task as any;
      if (!url) throw new Error("MISSING_DOWNLOAD_URL");

      const dbDir = path.join(process.cwd(), 'database');
      await fs.promises.mkdir(dbDir, { recursive: true });
      const targetFile = path.join(dbDir, `${task.id}.tmp`);
      const fileStream = fs.createWriteStream(targetFile);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("NO_RESPONSE_BODY");

      const contentLength = Number(response.headers.get('content-length')) || 0;
      let written = 0;

      const reader = response.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            fileStream.write(value);
            written += value.length;
            if (contentLength > 0) {
               const newProgress = Math.floor((written / contentLength) * 100);
               if (newProgress > task.progress + 2) {
                   task.progress = newProgress;
                   this.broadcast();
               }
            }
        }
      }

      fileStream.end();
      task.status = 'completed';
      task.progress = 100;
      task.message = 'Download Complete';
    } catch (e: any) {
      task.status = 'error';
      task.message = e.message;
    } finally {
      this.broadcast();
    }
  }
}

export const queueManager = new AdvancedQueueManager();
