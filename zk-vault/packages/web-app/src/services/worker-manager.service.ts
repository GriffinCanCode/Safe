/**
 * @fileoverview Worker Manager Service
 * @responsibility Manages all web workers and provides unified interface
 * @principle Single Responsibility - Only worker lifecycle management
 * @security Ensures secure communication with workers
 */

import type { CryptoOperationResult } from '@zk-vault/shared';

/**
 * Worker types supported by the manager
 */
export type WorkerType = 'search' | 'encryption' | 'fileProcessing';

/**
 * Worker message interface
 */
interface WorkerMessage {
  id: string;
  type: string;
  data: any;
}

/**
 * Worker response interface
 */
interface WorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  metrics?: {
    duration: number;
    memoryUsed: number;
    cpuUsage: number;
  };
}

/**
 * Worker configuration
 */
interface WorkerConfig {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Pending request tracking
 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retries: number;
  timeoutId?: NodeJS.Timeout;
  priority: 'low' | 'normal' | 'high';
}

/**
 * Worker instance tracking
 */
interface WorkerInstance {
  worker: Worker;
  messageId: number;
  pendingRequests: Map<string, PendingRequest>;
  isHealthy: boolean;
  lastActivity: number;
  busyCount: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

/**
 * Worker performance metrics
 */
interface WorkerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

class WorkerManagerService {
  private static instance: WorkerManagerService;
  private workers = new Map<WorkerType, WorkerInstance>();
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000; // 1 second
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly MAX_BUSY_COUNT = 10; // Max concurrent operations per worker
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private requestQueue = new Map<WorkerType, PendingRequest[]>();

  private constructor() {
    this.startHealthMonitoring();
    this.initializeRequestQueues();
  }

  public static getInstance(): WorkerManagerService {
    if (!WorkerManagerService.instance) {
      WorkerManagerService.instance = new WorkerManagerService();
    }
    return WorkerManagerService.instance;
  }

  /**
   * Initialize request queues for each worker type
   */
  private initializeRequestQueues(): void {
    this.requestQueue.set('search', []);
    this.requestQueue.set('encryption', []);
    this.requestQueue.set('fileProcessing', []);
  }

  /**
   * Auto-initialize worker based on operation type and data size
   */
  private async autoInitializeWorker(type: WorkerType, dataSize?: number): Promise<void> {
    // Check if worker is already healthy
    if (this.isWorkerHealthy(type)) {
      return;
    }

    // Initialize worker based on operation requirements
    const shouldInitialize = this.shouldInitializeWorker(type, dataSize);
    if (shouldInitialize) {
      await this.initializeWorker(type);
    }
  }

  /**
   * Determine if worker should be initialized based on operation
   */
  private shouldInitializeWorker(type: WorkerType, dataSize?: number): boolean {
    switch (type) {
      case 'encryption':
        // Initialize for large data or multiple operations
        return (dataSize && dataSize > 1024 * 1024) || true; // Always use for encryption
      case 'fileProcessing':
        // Initialize for files larger than 1MB
        return (dataSize && dataSize > 1024 * 1024) || false;
      case 'search':
        // Initialize for search operations
        return true;
      default:
        return false;
    }
  }

  /**
   * Initialize a worker of the specified type
   */
  async initializeWorker(type: WorkerType, config?: WorkerConfig): Promise<void> {
    try {
      // Check if worker is already healthy and initialized
      const existingWorker = this.workers.get(type);
      if (existingWorker && existingWorker.isHealthy) {
        console.log(`Worker ${type} already initialized and healthy, skipping initialization`);
        return;
      }

      // Terminate existing worker only if it's unhealthy
      if (existingWorker) {
        console.log(`Terminating unhealthy worker ${type} before re-initialization`);
        this.terminateWorker(type);
      }

      const workerUrl = this.getWorkerUrl(type);
      const worker = new Worker(workerUrl, { type: 'module' });

      const workerInstance: WorkerInstance = {
        worker,
        messageId: 0,
        pendingRequests: new Map(),
        isHealthy: true,
        lastActivity: Date.now(),
        busyCount: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      };

      // Set up message handling
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(type, event.data);
        workerInstance.lastActivity = Date.now();
      };

      worker.onerror = error => {
        console.error(`Worker ${type} error:`, error);
        workerInstance.isHealthy = false;
        this.handleWorkerError(type, new Error(`Worker error: ${error.message || 'Unknown'}`));
      };

      worker.onmessageerror = error => {
        console.error(`Worker ${type} message error:`, error);
        workerInstance.isHealthy = false;
        this.handleWorkerError(type, new Error('Worker message error'));
      };

      this.workers.set(type, workerInstance);

      // Perform health check
      await this.performHealthCheck(type);

      console.log(`Worker ${type} initialized successfully`);
    } catch (error) {
      console.error(`Failed to initialize worker ${type}:`, error);
      throw new Error(
        `Failed to initialize worker ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send message to a worker with intelligent routing and load balancing
   */
  async sendMessage<T>(
    workerType: WorkerType,
    messageType: string,
    data: any,
    config?: WorkerConfig
  ): Promise<T> {
    // Auto-initialize worker if needed
    const dataSize = this.estimateDataSize(data);
    await this.autoInitializeWorker(workerType, dataSize);

    const workerInstance = this.workers.get(workerType);
    if (!workerInstance) {
      throw new Error(`Worker ${workerType} not available and auto-initialization failed`);
    }

    if (!workerInstance.isHealthy) {
      throw new Error(`Worker ${workerType} is not healthy`);
    }

    // Check if worker is too busy
    if (workerInstance.busyCount >= this.MAX_BUSY_COUNT) {
      // Queue the request
      return this.queueRequest<T>(workerType, messageType, data, config);
    }

    const timeout = config?.timeout || this.DEFAULT_TIMEOUT;
    const maxRetries = config?.maxRetries || this.DEFAULT_MAX_RETRIES;
    const retryDelay = config?.retryDelay || this.DEFAULT_RETRY_DELAY;
    const priority = config?.priority || 'normal';

    const id = `${workerType}_${++workerInstance.messageId}`;
    const message: WorkerMessage = { id, type: messageType, data };

    return new Promise<T>((resolve, reject) => {
      const startTime = Date.now();
      const pendingRequest: PendingRequest = {
        resolve: (value: T) => {
          // Update metrics
          const duration = Date.now() - startTime;
          this.updateWorkerMetrics(workerType, duration, true);
          resolve(value);
        },
        reject: (error: Error) => {
          // Update metrics
          const duration = Date.now() - startTime;
          this.updateWorkerMetrics(workerType, duration, false);
          reject(error);
        },
        timestamp: startTime,
        retries: 0,
        priority,
      };

      workerInstance.pendingRequests.set(id, pendingRequest);
      workerInstance.busyCount++;

      // Send initial message
      this.sendMessageToWorker(workerInstance, message);

      // Set timeout
      const timeoutId = setTimeout(() => {
        const pending = workerInstance.pendingRequests.get(id);
        if (pending) {
          workerInstance.pendingRequests.delete(id);
          workerInstance.busyCount = Math.max(0, workerInstance.busyCount - 1);

          if (pending.retries < maxRetries) {
            // Retry the message
            pending.retries++;
            setTimeout(() => {
              workerInstance.pendingRequests.set(id, pending);
              workerInstance.busyCount++;
              this.sendMessageToWorker(workerInstance, message);
            }, retryDelay);
          } else {
            pending.reject(
              new Error(`Worker ${workerType} request timeout after ${maxRetries} retries`)
            );
          }
        }
      }, timeout);

      // Store timeout ID for cleanup
      pendingRequest.timeoutId = timeoutId;
    });
  }

  /**
   * Queue request when worker is busy
   */
  private async queueRequest<T>(
    workerType: WorkerType,
    messageType: string,
    data: any,
    config?: WorkerConfig
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const priority = config?.priority || 'normal';
      const queuedRequest: PendingRequest = {
        resolve: async (value: any) => {
          try {
            const result = await this.sendMessage<T>(workerType, messageType, data, config);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        reject,
        timestamp: Date.now(),
        retries: 0,
        priority,
      };

      const queue = this.requestQueue.get(workerType) || [];

      // Insert based on priority
      if (priority === 'high') {
        queue.unshift(queuedRequest);
      } else {
        queue.push(queuedRequest);
      }

      this.requestQueue.set(workerType, queue);
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(workerType: WorkerType): void {
    const workerInstance = this.workers.get(workerType);
    const queue = this.requestQueue.get(workerType);

    if (!workerInstance || !queue || queue.length === 0) {
      return;
    }

    if (workerInstance.busyCount < this.MAX_BUSY_COUNT) {
      const queuedRequest = queue.shift();
      if (queuedRequest) {
        queuedRequest.resolve(undefined);
      }
    }
  }

  /**
   * Estimate data size for auto-initialization decisions
   */
  private estimateDataSize(data: any): number {
    try {
      if (data instanceof ArrayBuffer) {
        return data.byteLength;
      }
      if (data instanceof Uint8Array) {
        return data.length;
      }
      if (typeof data === 'string') {
        return data.length * 2; // Rough estimate for UTF-16
      }
      if (typeof data === 'object') {
        return JSON.stringify(data).length * 2;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Update worker performance metrics
   */
  private updateWorkerMetrics(workerType: WorkerType, duration: number, success: boolean): void {
    const workerInstance = this.workers.get(workerType);
    if (!workerInstance) return;

    workerInstance.totalRequests++;
    if (success) {
      workerInstance.successfulRequests++;
    } else {
      workerInstance.failedRequests++;
    }

    // Update average response time
    const totalTime =
      workerInstance.averageResponseTime * (workerInstance.totalRequests - 1) + duration;
    workerInstance.averageResponseTime = totalTime / workerInstance.totalRequests;

    workerInstance.busyCount = Math.max(0, workerInstance.busyCount - 1);

    // Process queue if worker is available
    this.processQueue(workerType);
  }

  /**
   * Check if a worker is available and healthy
   */
  isWorkerHealthy(type: WorkerType): boolean {
    const workerInstance = this.workers.get(type);
    return workerInstance?.isHealthy ?? false;
  }

  /**
   * Get worker statistics
   */
  getWorkerStats(type: WorkerType): WorkerMetrics | null {
    const workerInstance = this.workers.get(type);
    if (!workerInstance) {
      return null;
    }

    const uptime = Date.now() - (workerInstance.lastActivity - workerInstance.averageResponseTime);
    const errorRate =
      workerInstance.totalRequests > 0
        ? workerInstance.failedRequests / workerInstance.totalRequests
        : 0;
    const throughput = uptime > 0 ? (workerInstance.successfulRequests / uptime) * 1000 : 0;

    return {
      totalRequests: workerInstance.totalRequests,
      successfulRequests: workerInstance.successfulRequests,
      failedRequests: workerInstance.failedRequests,
      averageResponseTime: workerInstance.averageResponseTime,
      throughput,
      errorRate,
      uptime,
    };
  }

  /**
   * Get all worker statistics
   */
  getAllWorkerStats(): Record<WorkerType, WorkerMetrics | null> {
    return {
      search: this.getWorkerStats('search'),
      encryption: this.getWorkerStats('encryption'),
      fileProcessing: this.getWorkerStats('fileProcessing'),
    };
  }

  /**
   * Restart a worker
   */
  async restartWorker(type: WorkerType, config?: WorkerConfig): Promise<void> {
    console.log(`Restarting worker ${type}`);
    this.terminateWorker(type);
    await this.initializeWorker(type, config);
  }

  /**
   * Terminate a specific worker
   */
  terminateWorker(type: WorkerType): void {
    const workerInstance = this.workers.get(type);
    if (workerInstance) {
      // Reject all pending requests
      workerInstance.pendingRequests.forEach(({ reject, timeoutId }) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(new Error(`Worker ${type} terminated`));
      });
      workerInstance.pendingRequests.clear();

      // Clear queue
      this.requestQueue.set(type, []);

      // Terminate worker
      workerInstance.worker.terminate();
      this.workers.delete(type);

      console.log(`Worker ${type} terminated`);
    }
  }

  /**
   * Terminate all workers
   */
  terminateAllWorkers(): void {
    for (const type of this.workers.keys()) {
      this.terminateWorker(type);
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Get worker URL based on type
   */
  private getWorkerUrl(type: WorkerType): string {
    const baseUrl = import.meta.env.DEV ? '/src/workers' : '/workers';
    switch (type) {
      case 'search':
        return `${baseUrl}/search.worker.ts`;
      case 'encryption':
        return `${baseUrl}/encryption.worker.ts`;
      case 'fileProcessing':
        return `${baseUrl}/file-processing.worker.ts`;
      default:
        throw new Error(`Unknown worker type: ${type}`);
    }
  }

  /**
   * Handle worker message response
   */
  private handleWorkerMessage(workerType: WorkerType, response: WorkerResponse): void {
    const workerInstance = this.workers.get(workerType);
    if (!workerInstance) {
      return;
    }

    const { id, success, data, error, errorCode } = response;
    const pending = workerInstance.pendingRequests.get(id);

    if (pending) {
      workerInstance.pendingRequests.delete(id);

      // Clear timeout
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }

      if (success) {
        pending.resolve(data);
      } else {
        const errorMessage = error || 'Unknown worker error';
        const workerError = new Error(errorMessage);
        (workerError as any).code = errorCode;
        pending.reject(workerError);
      }
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerType: WorkerType, error: Error): void {
    const workerInstance = this.workers.get(workerType);
    if (!workerInstance) {
      return;
    }

    // Reject all pending requests
    workerInstance.pendingRequests.forEach(({ reject, timeoutId }) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      reject(error);
    });
    workerInstance.pendingRequests.clear();

    console.error(`Worker ${workerType} encountered an error:`, error);
  }

  /**
   * Send message to worker with error handling
   */
  private sendMessageToWorker(workerInstance: WorkerInstance, message: WorkerMessage): void {
    try {
      workerInstance.worker.postMessage(message);
    } catch (error) {
      console.error('Failed to send message to worker:', error);
      workerInstance.isHealthy = false;

      const pending = workerInstance.pendingRequests.get(message.id);
      if (pending) {
        workerInstance.pendingRequests.delete(message.id);
        pending.reject(new Error('Failed to send message to worker'));
      }
    }
  }

  /**
   * Perform health check on a worker
   */
  private async performHealthCheck(type: WorkerType): Promise<void> {
    try {
      // Send a simple ping message
      await this.sendMessage(type, 'ping', {}, { timeout: 5000, maxRetries: 1 });
    } catch (error) {
      console.warn(`Health check failed for worker ${type}:`, error);
      const workerInstance = this.workers.get(type);
      if (workerInstance) {
        workerInstance.isHealthy = false;
      }
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      for (const [type, workerInstance] of this.workers.entries()) {
        const timeSinceActivity = Date.now() - workerInstance.lastActivity;

        // If worker has been inactive for too long, mark as potentially unhealthy
        if (timeSinceActivity > this.HEALTH_CHECK_INTERVAL * 2) {
          console.warn(`Worker ${type} has been inactive for ${timeSinceActivity}ms`);
          this.performHealthCheck(type).catch(() => {
            // Health check failed, worker might be stuck
            console.error(`Worker ${type} failed health check, considering restart`);
          });
        }
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }
}

export const workerManager = WorkerManagerService.getInstance();
