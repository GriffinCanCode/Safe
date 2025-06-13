/**
 * @fileoverview Vault Integration Service
 * @responsibility Integrates worker services with vault operations
 * @principle Single Responsibility - Only vault-worker integration
 * @security Maintains zero-knowledge architecture
 */

import { vaultService } from './vault.service';
import { searchService } from './search.service';
import { workerManager } from './worker-manager.service';
import type { DecryptedVaultItem, VaultSearchFilters } from './vault.service';
import type { SearchResult, SearchConfig } from './search.service';

/**
 * Integration configuration
 */
interface IntegrationConfig {
  autoIndexing: boolean;
  searchWorker: boolean;
  encryptionWorker: boolean;
  fileProcessingWorker: boolean;
  backgroundSync: boolean;
}

class VaultIntegrationService {
  private static instance: VaultIntegrationService;
  private isInitialized = false;
  private config: IntegrationConfig = {
    autoIndexing: true,
    searchWorker: true,
    encryptionWorker: false, // Disabled by default for security
    fileProcessingWorker: true,
    backgroundSync: true,
  };

  private constructor() {}

  public static getInstance(): VaultIntegrationService {
    if (!VaultIntegrationService.instance) {
      VaultIntegrationService.instance = new VaultIntegrationService();
    }
    return VaultIntegrationService.instance;
  }

  /**
   * Initialize the integration service
   */
  async initialize(config?: Partial<IntegrationConfig>): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.config = { ...this.config, ...config };

    try {
      // Initialize workers based on configuration
      if (this.config.searchWorker) {
        await workerManager.initializeWorker('search');
        console.log('Search worker initialized');
      }

      if (this.config.encryptionWorker) {
        await workerManager.initializeWorker('encryption');
        console.log('Encryption worker initialized');
      }

      if (this.config.fileProcessingWorker) {
        await workerManager.initializeWorker('fileProcessing');
        console.log('File processing worker initialized');
      }

      // Set up vault operation hooks
      this.setupVaultHooks();

      // Build initial search index if auto-indexing is enabled
      if (this.config.autoIndexing && this.config.searchWorker) {
        await this.buildInitialSearchIndex();
      }

      this.isInitialized = true;
      console.log('Vault integration service initialized');
    } catch (error) {
      console.error('Failed to initialize vault integration service:', error);
      throw error;
    }
  }

  /**
   * Enhanced search that uses workers when available, falls back to vault service
   */
  async search(
    filters: VaultSearchFilters = {},
    config?: SearchConfig
  ): Promise<SearchResult> {
    try {
      // If search worker is available and index is built, use worker search
      if (this.config.searchWorker && searchService.isIndexAvailable()) {
        const criteria = this.convertFiltersToSearchCriteria(filters);
        return await searchService.search(criteria, config);
      }

      // Fallback to vault service search
      const result = await vaultService.searchItems(filters, { limit: config?.maxResults || 100 });
      return {
        items: result.items,
        matches: [],
        total: result.total,
        metrics: {
          duration: 0,
          itemsSearched: result.items.length,
          indexSize: 0,
        },
      };
    } catch (error) {
      console.error('Search failed:', error);
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
       const searchConfig = options?.limit ? { maxResults: options.limit } : undefined;
       const searchResult = await this.search({ query }, searchConfig);
       return searchResult.items;
    } catch (error) {
      console.error('Fuzzy search failed:', error);
      throw error;
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStatistics(): Promise<any> {
    try {
      if (this.config.searchWorker && searchService.isIndexAvailable()) {
        return await searchService.getSearchStats();
      }

      // Return basic stats from vault service
      const stats = await vaultService.getVaultStats();
      return {
        totalItems: stats.totalItems,
        itemsByType: stats.itemsByType,
        indexSize: 0,
        lastUpdated: new Date(),
        searchCount: 0,
        averageSearchTime: 0,
      };
    } catch (error) {
      console.error('Failed to get search statistics:', error);
      throw error;
    }
  }

  /**
   * Rebuild search index
   */
  async rebuildSearchIndex(): Promise<void> {
    if (this.config.searchWorker) {
      await searchService.rebuildIndex();
    }
  }

  /**
   * Check if worker-based search is available
   */
  isWorkerSearchAvailable(): boolean {
    return this.config.searchWorker && searchService.isIndexAvailable();
  }

  /**
   * Get worker health status
   */
  getWorkerStatus(): {
    search: boolean;
    encryption: boolean;
    fileProcessing: boolean;
  } {
    return {
      search: workerManager.isWorkerHealthy('search'),
      encryption: workerManager.isWorkerHealthy('encryption'),
      fileProcessing: workerManager.isWorkerHealthy('fileProcessing'),
    };
  }

  /**
   * Restart workers
   */
  async restartWorkers(): Promise<void> {
    const restartPromises: Promise<void>[] = [];

    if (this.config.searchWorker) {
      restartPromises.push(workerManager.restartWorker('search'));
    }

    if (this.config.encryptionWorker) {
      restartPromises.push(workerManager.restartWorker('encryption'));
    }

    if (this.config.fileProcessingWorker) {
      restartPromises.push(workerManager.restartWorker('fileProcessing'));
    }

    await Promise.all(restartPromises);

    // Rebuild search index after restart
    if (this.config.searchWorker && this.config.autoIndexing) {
      await this.buildInitialSearchIndex();
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
        await workerManager.initializeWorker('search');
        if (this.config.autoIndexing) {
          await this.buildInitialSearchIndex();
        }
      } else if (!newConfig.searchWorker && oldConfig.searchWorker) {
        workerManager.terminateWorker('search');
      }
    }

    if (newConfig.encryptionWorker !== undefined) {
      if (newConfig.encryptionWorker && !oldConfig.encryptionWorker) {
        await workerManager.initializeWorker('encryption');
      } else if (!newConfig.encryptionWorker && oldConfig.encryptionWorker) {
        workerManager.terminateWorker('encryption');
      }
    }

    if (newConfig.fileProcessingWorker !== undefined) {
      if (newConfig.fileProcessingWorker && !oldConfig.fileProcessingWorker) {
        await workerManager.initializeWorker('fileProcessing');
      } else if (!newConfig.fileProcessingWorker && oldConfig.fileProcessingWorker) {
        workerManager.terminateWorker('fileProcessing');
      }
    }
  }

  /**
   * Set up hooks into vault service operations
   */
  private setupVaultHooks(): void {
    // Note: In a real implementation, you might use a publish-subscribe pattern
    // or modify the vault service to emit events for these operations

    // Hook into vault operations for search index updates
    const originalCreateItem = vaultService.createItem.bind(vaultService);
    const originalUpdateItem = vaultService.updateItem.bind(vaultService);
    const originalDeleteItem = vaultService.deleteItem.bind(vaultService);

    // Override createItem to update search index
    vaultService.createItem = async (item: any) => {
      const result = await originalCreateItem(item);
      
      if (this.config.autoIndexing && this.config.searchWorker) {
        try {
          await searchService.updateItemInIndex(result);
        } catch (error) {
          console.warn('Failed to update search index after item creation:', error);
        }
      }
      
      return result;
    };

    // Override updateItem to update search index
    vaultService.updateItem = async (id: string, updates: any) => {
      const result = await originalUpdateItem(id, updates);
      
      if (this.config.autoIndexing && this.config.searchWorker) {
        try {
          await searchService.updateItemInIndex(result);
        } catch (error) {
          console.warn('Failed to update search index after item update:', error);
        }
      }
      
      return result;
    };

    // Override deleteItem to remove from search index
    vaultService.deleteItem = async (id: string) => {
      await originalDeleteItem(id);
      
      if (this.config.autoIndexing && this.config.searchWorker) {
        try {
          await searchService.removeItemFromIndex(id);
        } catch (error) {
          console.warn('Failed to remove item from search index after deletion:', error);
        }
      }
    };

    console.log('Vault operation hooks set up');
  }

  /**
   * Build initial search index
   */
  private async buildInitialSearchIndex(): Promise<void> {
    try {
      console.log('Building initial search index...');
      await searchService.buildIndex();
      console.log('Initial search index built successfully');
    } catch (error) {
      console.error('Failed to build initial search index:', error);
      // Don't throw error as this is a background operation
    }
  }

  /**
   * Convert vault search filters to search criteria
   */
  private convertFiltersToSearchCriteria(filters: VaultSearchFilters): any {
    return {
      query: filters.query,
      types: filters.type ? [filters.type] : undefined,
      folders: filters.folder ? [filters.folder] : undefined,
      tags: filters.tags,
      favoritesOnly: filters.favorite,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    workerManager.terminateAllWorkers();
    searchService.destroy();
    this.isInitialized = false;
  }
}

export const vaultIntegration = VaultIntegrationService.getInstance(); 