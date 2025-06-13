/**
 * @fileoverview Vault Integration Service
 * @responsibility Coordinates between vault operations and worker utilization
 * @principle Single Responsibility - Only integration and coordination
 * @security Ensures optimal performance while maintaining security
 */

import { vaultService, type DecryptedVaultItem } from './vault.service';
import { searchService } from './search.service';
import { workerManager } from './worker-manager.service';
import type { VaultSearchCriteria } from '@zk-vault/shared';

interface IntegrationConfig {
  searchWorker: boolean;
  encryptionWorker: boolean;
  fileProcessingWorker: boolean;
  autoIndexing: boolean;
  batchSize: number;
  workerThresholds: {
    encryption: number;
    fileProcessing: number;
    search: number;
  };
  fallbackStrategy: 'immediate' | 'retry' | 'queue';
  performanceMonitoring: boolean;
}

interface PerformanceMetrics {
  workerUtilization: Record<string, number>;
  averageResponseTimes: Record<string, number>;
  errorRates: Record<string, number>;
  throughput: Record<string, number>;
  memoryUsage: Record<string, number>;
}

class VaultIntegrationService {
  private config: IntegrationConfig = {
    searchWorker: true,
    encryptionWorker: true,
    fileProcessingWorker: true,
    autoIndexing: true,
    batchSize: 50,
    workerThresholds: {
      encryption: 1024, // 1KB
      fileProcessing: 1024 * 1024, // 1MB
      search: 10, // 10 items
    },
    fallbackStrategy: 'immediate',
    performanceMonitoring: true,
  };

  private performanceMetrics: PerformanceMetrics = {
    workerUtilization: {},
    averageResponseTimes: {},
    errorRates: {},
    throughput: {},
    memoryUsage: {},
  };

  private isInitialized = false;

  /**
   * Initialize the integration service with optimal worker configuration
   */
  async initialize(config?: Partial<IntegrationConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('Vault integration service already initialized');
      return;
    }

    this.config = { ...this.config, ...config };

    try {
      // Initialize workers based on configuration
      const workerPromises: Promise<void>[] = [];

      if (this.config.encryptionWorker) {
        workerPromises.push(this.initializeWorkerSafely('encryption'));
      }

      if (this.config.searchWorker) {
        workerPromises.push(this.initializeWorkerSafely('search'));
      }

      if (this.config.fileProcessingWorker) {
        workerPromises.push(this.initializeWorkerSafely('fileProcessing'));
      }

      // Wait for all workers to initialize
      await Promise.allSettled(workerPromises);

      // Set up auth state listener to build search index after authentication
      if (this.config.autoIndexing && this.config.searchWorker) {
        this.setupAuthStateListener();
      }

      // Start performance monitoring
      if (this.config.performanceMonitoring) {
        this.startPerformanceMonitoring();
      }

      this.isInitialized = true;
      console.log('Vault integration service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize vault integration service:', error);
      throw error;
    }
  }

  /**
   * Safely initialize a worker only if it's not already initialized
   */
  private async initializeWorkerSafely(
    type: 'encryption' | 'search' | 'fileProcessing'
  ): Promise<void> {
    try {
      // Check if worker is already healthy and initialized
      if (workerManager.isWorkerHealthy(type)) {
        console.log(`Worker ${type} already initialized and healthy, skipping...`);
        return;
      }

      await workerManager.initializeWorker(type);
      console.log(`Worker ${type} initialized successfully`);
    } catch (error) {
      console.warn(`Failed to initialize ${type} worker:`, error);
      // Update config to reflect failed initialization
      if (type === 'encryption') {
        this.config.encryptionWorker = false;
      } else if (type === 'search') {
        this.config.searchWorker = false;
      } else if (type === 'fileProcessing') {
        this.config.fileProcessingWorker = false;
      }
    }
  }

  /**
   * Enhanced search with automatic worker utilization
   */
  async search(
    criteria: VaultSearchCriteria,
    options?: {
      useWorker?: boolean;
      batchSize?: number;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<{ items: DecryptedVaultItem[]; metrics: any }> {
    const startTime = performance.now();
    const useWorker = options?.useWorker ?? this.shouldUseSearchWorker(criteria);
    const batchSize = options?.batchSize ?? this.config.batchSize;

    try {
      let items: DecryptedVaultItem[];
      let searchMetrics: any = {};

      if (useWorker && this.config.searchWorker && workerManager.isWorkerHealthy('search')) {
        try {
          // Use search worker for complex queries
          const result = await searchService.search(criteria, {
            maxResults: batchSize,
            includeMatches: true,
          });

          items = result.items;
          searchMetrics = result.metrics;
        } catch (error) {
          console.warn('Search worker failed, falling back to main thread:', error);
          // Fallback to main thread search
          const result = await vaultService.searchItems(criteria, { limit: batchSize });
          items = result.items;
        }
      } else {
        // Use main thread search
        const result = await vaultService.searchItems(criteria, { limit: batchSize });
        items = result.items;
      }

      const duration = performance.now() - startTime;
      this.updatePerformanceMetrics('search', duration, true);

      return {
        items,
        metrics: {
          duration,
          itemsFound: items.length,
          workerUsed: useWorker && this.config.searchWorker,
          ...searchMetrics,
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.updatePerformanceMetrics('search', duration, false);
      throw error;
    }
  }

  /**
   * Enhanced fuzzy search using worker
   */
  async fuzzySearch(
    query: string,
    options?: {
      threshold?: number;
      limit?: number;
      includeMatches?: boolean;
    }
  ): Promise<DecryptedVaultItem[]> {
    try {
      if (this.config.searchWorker && searchService.isIndexAvailable()) {
        const results = await searchService.fuzzySearch(query, options);

        // Convert results to DecryptedVaultItem format
        const items: DecryptedVaultItem[] = [];
        for (const result of results) {
          if (result.item && result.item.id) {
            const item = await vaultService.getItem(result.item.id);
            if (item) {
              items.push(item);
            }
          }
        }
        return items;
      }

      // Fallback to regular search
      const searchConfig = options?.limit ? { batchSize: options.limit } : undefined;
      const searchResult = await this.search({ query }, searchConfig);
      return searchResult.items;
    } catch (error) {
      console.error('Fuzzy search failed:', error);
      throw error;
    }
  }

  /**
   * Batch operations with intelligent worker distribution
   */
  async batchEncrypt(
    items: Array<{ id: string; data: string; context?: any }>
  ): Promise<Array<{ id: string; success: boolean; result?: any; error?: string }>> {
    const results: Array<{ id: string; success: boolean; result?: any; error?: string }> = [];
    const batchSize = this.config.batchSize;

    // Process in batches to avoid overwhelming workers
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Determine if we should use workers for this batch
      const totalDataSize = batch.reduce((sum, item) => sum + item.data.length, 0);
      const useWorker = totalDataSize > this.config.workerThresholds.encryption;

      if (
        useWorker &&
        this.config.encryptionWorker &&
        workerManager.isWorkerHealthy('encryption')
      ) {
        // Process batch with worker
        const batchPromises = batch.map(async item => {
          try {
            const result = await workerManager.sendMessage<{ data: any }>(
              'encryption',
              'encrypt',
              {
                plaintext: Array.from(new TextEncoder().encode(item.data)),
                context: item.context,
              },
              { priority: 'normal' }
            );

            return {
              id: item.id,
              success: true,
              result: result.data,
            };
          } catch (error) {
            return {
              id: item.id,
              success: false,
              error: error instanceof Error ? error.message : 'Encryption failed',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } else {
        // Process batch on main thread
        const batchPromises = batch.map(async item => {
          try {
            // Use vault service for main thread encryption
            const encryptedItem = await vaultService.createItem({
              type: 'note', // Default type for batch operations
              name: `Batch Item ${item.id}`,
              data: item.data,
            } as any);

            return {
              id: item.id,
              success: true,
              result: encryptedItem,
            };
          } catch (error) {
            return {
              id: item.id,
              success: false,
              error: error instanceof Error ? error.message : 'Encryption failed',
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    }

    return results;
  }

  /**
   * File processing with automatic worker selection
   */
  async processFile(
    file: File,
    operation: 'encrypt' | 'decrypt' | 'compress' | 'decompress',
    options?: {
      chunkSize?: number;
      priority?: 'low' | 'normal' | 'high';
      onProgress?: (progress: number) => void;
    }
  ): Promise<{ success: boolean; result?: any; error?: string; metrics?: any }> {
    const startTime = performance.now();
    const useWorker = file.size > this.config.workerThresholds.fileProcessing;

    try {
      if (
        useWorker &&
        this.config.fileProcessingWorker &&
        workerManager.isWorkerHealthy('fileProcessing')
      ) {
        // Use file processing worker
        const fileData = await this.readFileAsArrayBuffer(file);

        const result = await workerManager.sendMessage<{ data: any }>(
          'fileProcessing',
          operation,
          {
            fileData: Array.from(new Uint8Array(fileData)),
            filename: file.name,
            mimeType: file.type,
            options,
          },
          {
            priority: options?.priority || 'normal',
            timeout: file.size > 100 * 1024 * 1024 ? 300000 : 60000, // 5 min for large files
          }
        );

        const duration = performance.now() - startTime;
        this.updatePerformanceMetrics('fileProcessing', duration, true);

        return {
          success: true,
          result: result.data,
          metrics: {
            duration,
            fileSize: file.size,
            workerUsed: true,
          },
        };
      } else {
        // Use main thread processing
        // This would integrate with your existing file service
        const duration = performance.now() - startTime;
        this.updatePerformanceMetrics('fileProcessing', duration, true);

        return {
          success: true,
          result: null, // Placeholder for main thread result
          metrics: {
            duration,
            fileSize: file.size,
            workerUsed: false,
          },
        };
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.updatePerformanceMetrics('fileProcessing', duration, false);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'File processing failed',
      };
    }
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig: Partial<IntegrationConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Handle worker changes
    if (newConfig.searchWorker !== undefined) {
      if (newConfig.searchWorker && !oldConfig.searchWorker) {
        await this.initializeWorkerSafely('search');
        if (this.config.autoIndexing) {
          await this.buildInitialSearchIndex();
        }
      } else if (!newConfig.searchWorker && oldConfig.searchWorker) {
        workerManager.terminateWorker('search');
      }
    }

    if (newConfig.encryptionWorker !== undefined) {
      if (newConfig.encryptionWorker && !oldConfig.encryptionWorker) {
        await this.initializeWorkerSafely('encryption');
      } else if (!newConfig.encryptionWorker && oldConfig.encryptionWorker) {
        workerManager.terminateWorker('encryption');
      }
    }

    if (newConfig.fileProcessingWorker !== undefined) {
      if (newConfig.fileProcessingWorker && !oldConfig.fileProcessingWorker) {
        await this.initializeWorkerSafely('fileProcessing');
      } else if (!newConfig.fileProcessingWorker && oldConfig.fileProcessingWorker) {
        workerManager.terminateWorker('fileProcessing');
      }
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics & { config: IntegrationConfig } {
    return {
      ...this.performanceMetrics,
      config: this.config,
    };
  }

  /**
   * Get worker health status
   */
  getWorkerHealth(): Record<string, { healthy: boolean; stats: any }> {
    return {
      encryption: {
        healthy: workerManager.isWorkerHealthy('encryption'),
        stats: workerManager.getWorkerStats('encryption'),
      },
      search: {
        healthy: workerManager.isWorkerHealthy('search'),
        stats: workerManager.getWorkerStats('search'),
      },
      fileProcessing: {
        healthy: workerManager.isWorkerHealthy('fileProcessing'),
        stats: workerManager.getWorkerStats('fileProcessing'),
      },
    };
  }

  /**
   * Optimize worker usage based on current performance
   */
  async optimizeWorkerUsage(): Promise<void> {
    const workerStats = workerManager.getAllWorkerStats();

    // Analyze performance and adjust thresholds
    Object.entries(workerStats).forEach(([workerType, stats]) => {
      if (stats && stats.errorRate > 0.1) {
        // High error rate, increase threshold to use worker less
        const currentThreshold =
          this.config.workerThresholds[workerType as keyof typeof this.config.workerThresholds];
        this.config.workerThresholds[workerType as keyof typeof this.config.workerThresholds] =
          currentThreshold * 1.5;
        console.warn(`Increased threshold for ${workerType} worker due to high error rate`);
      } else if (stats && stats.errorRate < 0.01 && stats.averageResponseTime < 100) {
        // Low error rate and fast response, decrease threshold to use worker more
        const currentThreshold =
          this.config.workerThresholds[workerType as keyof typeof this.config.workerThresholds];
        this.config.workerThresholds[workerType as keyof typeof this.config.workerThresholds] =
          Math.max(
            currentThreshold * 0.8,
            100 // Minimum threshold
          );
      }
    });
  }

  /**
   * Check if the integration service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown integration service
   */
  async shutdown(): Promise<void> {
    workerManager.terminateAllWorkers();
    this.isInitialized = false;
  }

  // Private helper methods

  private shouldUseSearchWorker(criteria: VaultSearchCriteria): boolean {
    if (!this.config.searchWorker || !workerManager.isWorkerHealthy('search')) {
      return false;
    }

    // Use worker for complex queries
    const hasComplexQuery = criteria.query && criteria.query.length > 3;
    const hasMultipleFilters = Object.keys(criteria).length > 1;
    const hasDateRange = !!criteria.dateRange;

    return hasComplexQuery || hasMultipleFilters || hasDateRange;
  }

  private async buildInitialSearchIndex(): Promise<void> {
    try {
      // Check if user is authenticated before trying to build search index
      const { authService } = await import('./auth.service');
      const currentUser = authService.getCurrentUser();

      if (!currentUser) {
        console.log('User not authenticated, skipping initial search index build');
        return;
      }

      // Use the search service's method to build index
      await searchService.buildIndexIfNeeded();
      console.log('Search index built successfully');
    } catch (error) {
      console.error('Failed to build initial search index:', error);
    }
  }

  /**
   * Build search index after user authentication
   */
  async buildSearchIndexAfterAuth(): Promise<void> {
    if (this.config.autoIndexing && this.config.searchWorker) {
      await this.buildInitialSearchIndex();
    }
  }

  private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private updatePerformanceMetrics(operation: string, duration: number, success: boolean): void {
    if (!this.config.performanceMonitoring) return;

    // Update average response time
    const currentAvg = this.performanceMetrics.averageResponseTimes[operation] || 0;
    this.performanceMetrics.averageResponseTimes[operation] = (currentAvg + duration) / 2;

    // Update error rate
    const currentErrorRate = this.performanceMetrics.errorRates[operation] || 0;
    this.performanceMetrics.errorRates[operation] = success
      ? currentErrorRate * 0.95 // Decay error rate on success
      : Math.min(currentErrorRate + 0.1, 1); // Increase on failure

    // Update throughput (operations per second)
    const currentThroughput = this.performanceMetrics.throughput[operation] || 0;
    const newThroughput = 1000 / duration; // ops per second
    this.performanceMetrics.throughput[operation] = (currentThroughput + newThroughput) / 2;
  }

  private startPerformanceMonitoring(): void {
    // Monitor worker utilization every 30 seconds
    setInterval(() => {
      const workerStats = workerManager.getAllWorkerStats();

      Object.entries(workerStats).forEach(([workerType, stats]) => {
        if (stats) {
          this.performanceMetrics.workerUtilization[workerType] =
            stats.totalRequests > 0 ? stats.successfulRequests / stats.totalRequests : 0;
        }
      });

      // Auto-optimize if performance monitoring is enabled
      this.optimizeWorkerUsage().catch(error => {
        console.warn('Failed to optimize worker usage:', error);
      });
    }, 30000);
  }

  /**
   * Set up auth state listener to build search index after authentication
   */
  private setupAuthStateListener(): void {
    // Import auth service dynamically to avoid circular dependencies
    import('./auth.service')
      .then(({ authService }) => {
        authService.addAuthStateListener(async user => {
          if (user) {
            // User authenticated - build search index
            console.log('User authenticated, building search index...');
            await this.buildSearchIndexAfterAuth();
          }
        });
      })
      .catch(error => {
        console.warn('Failed to set up auth state listener:', error);
      });
  }
}

export const vaultIntegration = new VaultIntegrationService();
