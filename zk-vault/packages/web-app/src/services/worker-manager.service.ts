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
}

class WorkerManagerService {
  private static instance: WorkerManagerService;
  private workers = new Map<WorkerType, WorkerInstance>();
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000; // 1 second
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private healthCheckTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHealthMonitoring();
  }

  public static getInstance(): WorkerManagerService {
    if (!WorkerManagerService.instance) {
      WorkerManagerService.instance = new WorkerManagerService();
    }
    return WorkerManagerService.instance;
  }

  /**
   * Initialize a worker of the specified type
   */
  async initializeWorker(type: WorkerType, config?: WorkerConfig): Promise<void> {
    try {
      // Terminate existing worker if any
      if (this.workers.has(type)) {
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
      };

      // Set up message handling
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(type, event.data);
        workerInstance.lastActivity = Date.now();
      };

      worker.onerror = (error) => {
        console.error(`Worker ${type} error:`, error);
        workerInstance.isHealthy = false;
        this.handleWorkerError(type, new Error(`Worker error: ${error.message || 'Unknown'}`));
      };

      worker.onmessageerror = (error) => {
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
      throw new Error(`Failed to initialize worker ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send message to a worker and wait for response
   */
  async sendMessage<T>(
    workerType: WorkerType,
    messageType: string,
    data: any,
    config?: WorkerConfig
  ): Promise<T> {
    const workerInstance = this.workers.get(workerType);
    if (!workerInstance) {
      throw new Error(`Worker ${workerType} not initialized`);
    }

    if (!workerInstance.isHealthy) {
      throw new Error(`Worker ${workerType} is not healthy`);
    }

    const timeout = config?.timeout || this.DEFAULT_TIMEOUT;
    const maxRetries = config?.maxRetries || this.DEFAULT_MAX_RETRIES;
    const retryDelay = config?.retryDelay || this.DEFAULT_RETRY_DELAY;

    const id = `${workerType}_${++workerInstance.messageId}`;
    const message: WorkerMessage = { id, type: messageType, data };

    return new Promise<T>((resolve, reject) => {
      const pendingRequest: PendingRequest = {
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
      };

      workerInstance.pendingRequests.set(id, pendingRequest);

      // Send initial message
      this.sendMessageToWorker(workerInstance, message);

      // Set timeout
      const timeoutId = setTimeout(() => {
        const pending = workerInstance.pendingRequests.get(id);
        if (pending) {
          workerInstance.pendingRequests.delete(id);
          
          if (pending.retries < maxRetries) {
            // Retry the message
            pending.retries++;
            setTimeout(() => {
              workerInstance.pendingRequests.set(id, pending);
              this.sendMessageToWorker(workerInstance, message);
            }, retryDelay);
          } else {
            reject(new Error(`Worker ${workerType} request timeout after ${maxRetries} retries`));
          }
        }
      }, timeout);

      // Store timeout ID for cleanup
      pendingRequest.timeoutId = timeoutId;
    });
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
  getWorkerStats(type: WorkerType): {
    isHealthy: boolean;
    pendingRequests: number;
    lastActivity: Date;
    uptime: number;
  } | null {
    const workerInstance = this.workers.get(type);
    if (!workerInstance) {
      return null;
    }

    return {
      isHealthy: workerInstance.isHealthy,
      pendingRequests: workerInstance.pendingRequests.size,
      lastActivity: new Date(workerInstance.lastActivity),
      uptime: Date.now() - workerInstance.lastActivity,
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
    const workerPaths = {
      search: '../workers/search.worker.ts',
      encryption: '../workers/encryption.worker.ts',
      fileProcessing: '../workers/file-processing.worker.ts',
    };

    return new URL(workerPaths[type], import.meta.url).href;
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
      if ((pending as any).timeoutId) {
        clearTimeout((pending as any).timeoutId);
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