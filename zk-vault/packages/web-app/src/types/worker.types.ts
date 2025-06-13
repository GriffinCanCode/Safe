/**
 * @fileoverview Worker Type Definitions
 * @responsibility Types for Web Workers and worker communication
 */

/**
 * Worker message types
 */
export type WorkerMessageType =
  | 'encrypt'
  | 'decrypt'
  | 'deriveKey'
  | 'search'
  | 'index'
  | 'compress'
  | 'decompress'
  | 'hash'
  | 'validate'
  | 'process'
  | 'init'
  | 'terminate'
  | 'ping'
  | 'pong';

/**
 * Base worker message
 */
export interface BaseWorkerMessage {
  id: string;
  type: WorkerMessageType;
  timestamp: number;
}

/**
 * Worker request message
 */
export interface WorkerRequestMessage extends BaseWorkerMessage {
  data: any;
  options?: WorkerRequestOptions;
}

/**
 * Worker response message
 */
export interface WorkerResponseMessage extends BaseWorkerMessage {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  metrics?: WorkerMetrics;
}

/**
 * Worker request options
 */
export interface WorkerRequestOptions {
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  transferable?: Transferable[];
  retries?: number;
  retryDelay?: number;
}

/**
 * Worker metrics
 */
export interface WorkerMetrics {
  duration: number;
  memoryUsed: number;
  cpuUsage: number;
  itemsProcessed?: number;
  bytesProcessed?: number;
}

/**
 * Worker status
 */
export interface WorkerStatus {
  id: string;
  type: WorkerType;
  state: 'idle' | 'busy' | 'error' | 'terminated';
  isHealthy: boolean;
  lastActivity: Date;
  pendingRequests: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * Worker types
 */
export type WorkerType = 'search' | 'encryption' | 'fileProcessing' | 'compression';

/**
 * Worker configuration
 */
export interface WorkerConfig {
  type: WorkerType;
  scriptUrl: string;
  maxInstances?: number;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
  terminateOnError?: boolean;
  transferable?: boolean;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  workers: WorkerConfig[];
  loadBalancing?: 'round-robin' | 'least-busy' | 'random';
  maxConcurrentRequests?: number;
  queueSize?: number;
  healthCheckInterval?: number;
  autoRestart?: boolean;
  gracefulShutdown?: boolean;
}

/**
 * Worker pool status
 */
export interface WorkerPoolStatus {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  errorWorkers: number;
  queuedRequests: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  throughput: number;
}

/**
 * Search worker data
 */
export interface SearchWorkerData {
  query?: string;
  items?: any[];
  filters?: any;
  config?: any;
  operation: 'search' | 'index' | 'update' | 'remove' | 'clear' | 'stats';
}

/**
 * Encryption worker data
 */
export interface EncryptionWorkerData {
  operation: 'encrypt' | 'decrypt' | 'deriveKey' | 'hash' | 'sign' | 'verify';
  data?: Uint8Array | string;
  key?: Uint8Array;
  algorithm?: string;
  options?: any;
}

/**
 * File processing worker data
 */
export interface FileProcessingWorkerData {
  operation: 'compress' | 'decompress' | 'chunk' | 'assemble' | 'validate' | 'transform';
  file?: File | Uint8Array;
  chunks?: any[];
  options?: any;
}

/**
 * Compression worker data
 */
export interface CompressionWorkerData {
  operation: 'compress' | 'decompress';
  data: Uint8Array;
  algorithm: 'gzip' | 'deflate' | 'brotli';
  level?: number;
}

/**
 * Worker task
 */
export interface WorkerTask {
  id: string;
  type: WorkerType;
  message: WorkerRequestMessage;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeout?: NodeJS.Timeout;
  retries: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high';
}

/**
 * Worker queue
 */
export interface WorkerQueue {
  tasks: WorkerTask[];
  maxSize: number;
  processing: boolean;
  paused: boolean;
}

/**
 * Worker load balancer
 */
export interface WorkerLoadBalancer {
  strategy: 'round-robin' | 'least-busy' | 'random' | 'weighted';
  selectWorker: (workers: WorkerStatus[], task: WorkerTask) => WorkerStatus | null;
  updateWeights?: (workers: WorkerStatus[]) => void;
}

/**
 * Worker health check
 */
export interface WorkerHealthCheck {
  interval: number;
  timeout: number;
  maxFailures: number;
  check: (worker: Worker) => Promise<boolean>;
  onHealthy?: (worker: Worker) => void;
  onUnhealthy?: (worker: Worker) => void;
  onFailure?: (worker: Worker, error: Error) => void;
}

/**
 * Worker event
 */
export interface WorkerEvent {
  type: 'created' | 'started' | 'stopped' | 'error' | 'message' | 'healthy' | 'unhealthy';
  worker: WorkerStatus;
  data?: any;
  error?: Error;
  timestamp: Date;
}

/**
 * Worker event listener
 */
export type WorkerEventListener = (event: WorkerEvent) => void;

/**
 * Worker manager interface
 */
export interface WorkerManager {
  createWorker: (config: WorkerConfig) => Promise<Worker>;
  terminateWorker: (workerId: string) => Promise<void>;
  sendMessage: <T>(workerId: string, message: WorkerRequestMessage) => Promise<T>;
  getWorkerStatus: (workerId: string) => WorkerStatus | null;
  getAllWorkers: () => WorkerStatus[];
  getHealthyWorkers: () => WorkerStatus[];
  addEventListener: (type: string, listener: WorkerEventListener) => void;
  removeEventListener: (type: string, listener: WorkerEventListener) => void;
  startHealthCheck: () => void;
  stopHealthCheck: () => void;
  restart: () => Promise<void>;
  shutdown: () => Promise<void>;
}

/**
 * Worker pool interface
 */
export interface WorkerPool {
  config: WorkerPoolConfig;
  status: WorkerPoolStatus;
  workers: Map<string, WorkerStatus>;
  queue: WorkerQueue;
  loadBalancer: WorkerLoadBalancer;

  initialize: () => Promise<void>;
  execute: <T>(type: WorkerType, data: any, options?: WorkerRequestOptions) => Promise<T>;
  addWorker: (config: WorkerConfig) => Promise<string>;
  removeWorker: (workerId: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  clear: () => void;
  shutdown: () => Promise<void>;

  on: (event: string, listener: WorkerEventListener) => void;
  off: (event: string, listener: WorkerEventListener) => void;
  emit: (event: string, data: any) => void;
}

/**
 * Worker proxy for Comlink
 */
export interface WorkerProxy {
  [key: string]: (...args: any[]) => Promise<any>;
}

/**
 * Worker transfer options
 */
export interface WorkerTransferOptions {
  transferable: Transferable[];
  clone?: boolean;
}

/**
 * Worker performance monitor
 */
export interface WorkerPerformanceMonitor {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryBefore: number;
  memoryAfter?: number;
  memoryDelta?: number;
  cpuBefore: number;
  cpuAfter?: number;
  cpuDelta?: number;
}

/**
 * Worker error
 */
export interface WorkerError extends Error {
  workerId: string;
  workerType: WorkerType;
  messageId: string;
  code: string;
  details?: any;
  recoverable: boolean;
}

/**
 * Worker timeout error
 */
export interface WorkerTimeoutError extends WorkerError {
  timeout: number;
  elapsed: number;
}

/**
 * Worker communication error
 */
export interface WorkerCommunicationError extends WorkerError {
  direction: 'request' | 'response';
  messageType: WorkerMessageType;
}

/**
 * Worker initialization error
 */
export interface WorkerInitializationError extends WorkerError {
  scriptUrl: string;
  reason: string;
}

/**
 * Worker termination error
 */
export interface WorkerTerminationError extends WorkerError {
  forced: boolean;
  reason: string;
}
