/**
 * @fileoverview Search Service
 * @responsibility Manages search operations using web workers for performance
 * @principle Single Responsibility - Only search-related operations
 * @security Zero-knowledge search with client-side operations only
 */

import type { VaultItem, VaultSearchCriteria, CryptoOperationResult } from '@zk-vault/shared';
import { vaultService } from './vault.service';
import { workerManager } from './worker-manager.service';
import type { DecryptedVaultItem } from './vault.service';

/**
 * Search worker message interface
 */
interface SearchWorkerMessage {
  id: string;
  type: string;
  data: any;
}

/**
 * Search worker response interface
 */
interface SearchWorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  metrics?: {
    duration: number;
    itemsSearched: number;
    indexSize: number;
  };
}

/**
 * Search configuration
 */
export interface SearchConfig {
  maxResults?: number;
  includeMatches?: boolean;
  fuzzyThreshold?: number;
  useWorker?: boolean;
  batchSize?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Search result with metadata
 */
export interface SearchResult {
  items: DecryptedVaultItem[];
  matches: any[];
  total: number;
  metrics: {
    duration: number;
    itemsSearched: number;
    indexSize: number;
    workerUsed: boolean;
    fallbackUsed: boolean;
  };
}

/**
 * Fuzzy search result
 */
export interface FuzzySearchResult {
  item: DecryptedVaultItem;
  score: number;
  matches: any[];
}

/**
 * Search performance metrics
 */
interface SearchMetrics {
  totalSearches: number;
  workerSearches: number;
  fallbackSearches: number;
  averageDuration: number;
  indexSize: number;
  lastIndexUpdate: number;
}

class SearchService {
  private static instance: SearchService;
  private isIndexed = false;
  private lastIndexUpdate = 0;
  private readonly INDEX_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly WORKER_THRESHOLD = 100; // Use worker for searches with more than 100 items
  private readonly BATCH_SIZE = 50; // Default batch size for operations
  private metrics: SearchMetrics = {
    totalSearches: 0,
    workerSearches: 0,
    fallbackSearches: 0,
    averageDuration: 0,
    indexSize: 0,
    lastIndexUpdate: 0,
  };

  private constructor() {
    this.initializeService();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Initialize the search service
   */
  private async initializeService(): Promise<void> {
    try {
      // Don't build initial index during initialization - defer until user is authenticated
      // This prevents authentication errors during app startup
      console.log('Search service initialized (index building deferred until authentication)');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to initialize search service:', error);
    }
  }

  /**
   * Check if search index is available
   */
  isIndexAvailable(): boolean {
    return this.isIndexed && workerManager.isWorkerHealthy('search');
  }

  /**
   * Get search performance metrics
   */
  getMetrics(): SearchMetrics {
    return { ...this.metrics };
  }

  /**
   * Build or rebuild the search index with current vault items
   */
  async buildIndex(config?: SearchConfig): Promise<void> {
    const startTime = performance.now();

    try {
      // Get all vault items
      const searchResult = await vaultService.searchItems({}, { limit: 10000 });
      const items = searchResult.items;

      if (items.length === 0) {
        this.isIndexed = true;
        this.lastIndexUpdate = Date.now();
        return;
      }

      // Determine if we should use worker
      const useWorker = config?.useWorker ?? this.shouldUseWorkerForIndexing(items.length);

      if (useWorker && workerManager.isWorkerHealthy('search')) {
        try {
          // Convert to VaultItem format for the worker
          const vaultItems: VaultItem[] = items.map(item => this.convertToVaultItem(item));

          // Send to worker for indexing in batches
          const batchSize = config?.batchSize || this.BATCH_SIZE;
          let indexedCount = 0;

          for (let i = 0; i < vaultItems.length; i += batchSize) {
            const batch = vaultItems.slice(i, i + batchSize);

            const result = await workerManager.sendMessage<{ indexedCount: number }>(
              'search',
              'indexItems',
              {
                items: batch,
                config: {
                  ...config,
                  isFirstBatch: i === 0,
                  isLastBatch: i + batchSize >= vaultItems.length,
                },
              },
              {
                priority: config?.priority || 'normal',
                timeout: 30000,
              }
            );

            indexedCount += result.indexedCount || batch.length;
          }

          this.isIndexed = true;
          this.lastIndexUpdate = Date.now();
          this.metrics.indexSize = indexedCount;
          this.metrics.lastIndexUpdate = this.lastIndexUpdate;

          // eslint-disable-next-line no-console
          console.log(`Search index built with ${indexedCount} items using worker`);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker indexing failed, falling back to main thread:', error);
          await this.buildIndexMainThread(items);
        }
      } else {
        // Build index on main thread
        await this.buildIndexMainThread(items);
      }

      const duration = performance.now() - startTime;
      this.updateMetrics('indexing', duration, true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to build search index:', error);
      throw new Error(
        `Failed to build search index: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search vault items using the worker or main thread
   */
  async search(criteria: VaultSearchCriteria, config?: SearchConfig): Promise<SearchResult> {
    const startTime = performance.now();
    this.metrics.totalSearches += 1;

    try {
      // Ensure index is up to date
      await this.ensureIndexUpToDate();

      // Determine if we should use worker
      const useWorker = config?.useWorker ?? this.shouldUseWorkerForSearch(criteria);
      let workerUsed = false;
      let fallbackUsed = false;

      let items: DecryptedVaultItem[] = [];
      let matches: any[] = [];

      if (useWorker && this.isIndexAvailable()) {
        try {
          // Perform search using worker
          const result = await workerManager.sendMessage<{
            results: any[];
            matches: any[];
          }>(
            'search',
            'search',
            {
              criteria,
              config: {
                maxResults: config?.maxResults || 50,
                includeMatches: config?.includeMatches || false,
                fuzzyThreshold: config?.fuzzyThreshold || 0.6,
              },
            },
            {
              priority: config?.priority || 'normal',
              timeout: 15000,
            }
          );

          // Convert results back to DecryptedVaultItem format
          items = result.results
            .map(item => this.convertFromSearchableItem(item))
            .filter(Boolean) as DecryptedVaultItem[];

          matches = result.matches || [];
          workerUsed = true;
          this.metrics.workerSearches += 1;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker search failed, falling back to main thread:', error);
          const fallbackResult = await this.searchMainThread(criteria, config);
          items = fallbackResult.items;
          matches = fallbackResult.matches;
          fallbackUsed = true;
          this.metrics.fallbackSearches += 1;
        }
      } else {
        // Use main thread search
        const fallbackResult = await this.searchMainThread(criteria, config);
        items = fallbackResult.items;
        matches = fallbackResult.matches;
        this.metrics.fallbackSearches += 1;
      }

      const duration = performance.now() - startTime;
      this.updateMetrics('search', duration, true);

      return {
        items,
        matches,
        total: items.length,
        metrics: {
          duration,
          itemsSearched: items.length,
          indexSize: this.metrics.indexSize,
          workerUsed,
          fallbackUsed,
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.updateMetrics('search', duration, false);
      // eslint-disable-next-line no-console
      console.error('Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform fuzzy search with intelligent worker usage
   */
  async fuzzySearch(
    query: string,
    options?: {
      threshold?: number;
      limit?: number;
      includeMatches?: boolean;
      useWorker?: boolean;
    }
  ): Promise<FuzzySearchResult[]> {
    const startTime = performance.now();

    try {
      const useWorker = options?.useWorker ?? this.shouldUseWorkerForFuzzySearch(query);

      if (useWorker && this.isIndexAvailable()) {
        try {
          const result = await workerManager.sendMessage<{
            results: Array<{
              item: any;
              score: number;
              matches: any[];
            }>;
          }>(
            'search',
            'fuzzySearch',
            {
              query,
              options: {
                threshold: options?.threshold || 0.6,
                limit: options?.limit || 20,
                includeMatches: options?.includeMatches || false,
              },
            },
            { priority: 'normal' }
          );

          const fuzzyResults: FuzzySearchResult[] = result.results
            .map(r => ({
              item: this.convertFromSearchableItem(r.item),
              score: r.score,
              matches: r.matches,
            }))
            .filter(r => r.item) as FuzzySearchResult[];

          return fuzzyResults;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker fuzzy search failed, falling back to main thread:', error);
          return this.fuzzySearchMainThread(query, options);
        }
      } else {
        return this.fuzzySearchMainThread(query, options);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Fuzzy search failed:', error);
      throw new Error(
        `Fuzzy search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Index new items efficiently
   */
  async indexItems(items: DecryptedVaultItem[], config?: SearchConfig): Promise<void> {
    try {
      if (items.length === 0) return;

      const useWorker = config?.useWorker ?? this.shouldUseWorkerForIndexing(items.length);

      if (useWorker && workerManager.isWorkerHealthy('search')) {
        try {
          const vaultItems = items.map(item => this.convertToVaultItem(item));

          await workerManager.sendMessage(
            'search',
            'indexItems',
            {
              items: vaultItems,
              config: {
                ...config,
                incremental: true,
              },
            },
            { priority: config?.priority || 'low' }
          );

          this.metrics.indexSize += items.length;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker indexing failed:', error);
          // For incremental indexing, we can skip the fallback
        }
      }
      // For main thread indexing, we would need to implement a local search index
      // This is a simplified implementation that relies on the worker
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to index items:', error);
    }
  }

  /**
   * Remove items from index
   */
  async removeFromIndex(itemIds: string[]): Promise<void> {
    try {
      if (itemIds.length === 0) return;

      if (workerManager.isWorkerHealthy('search')) {
        try {
          await workerManager.sendMessage(
            'search',
            'removeItems',
            {
              itemIds,
            },
            { priority: 'low' }
          );

          this.metrics.indexSize = Math.max(0, this.metrics.indexSize - itemIds.length);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Failed to remove items from worker index:', error);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove items from index:', error);
    }
  }

  /**
   * Rebuild the entire search index
   */
  async rebuildIndex(config?: SearchConfig): Promise<void> {
    try {
      // Clear existing index first
      if (workerManager.isWorkerHealthy('search')) {
        try {
          await workerManager.sendMessage('search', 'clearIndex', {}, { priority: 'high' });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Failed to clear worker index:', error);
        }
      }

      this.isIndexed = false;
      this.metrics.indexSize = 0;

      // Rebuild index
      await this.buildIndex(config);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to rebuild search index:', error);
      throw new Error(
        `Failed to rebuild search index: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Batch search multiple queries efficiently
   */
  async batchSearch(
    queries: Array<{ criteria: VaultSearchCriteria; config?: SearchConfig }>,
    options?: { batchSize?: number; priority?: 'low' | 'normal' | 'high' }
  ): Promise<Array<{ query: VaultSearchCriteria; result?: SearchResult; error?: string }>> {
    const batchSize = options?.batchSize || 5;
    const results: Array<{ query: VaultSearchCriteria; result?: SearchResult; error?: string }> =
      [];

    // Process queries in batches to avoid overwhelming the worker
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);

      const batchPromises = batch.map(async ({ criteria, config }) => {
        try {
          const result = await this.search(criteria, {
            ...config,
            priority: options?.priority || config?.priority || 'normal',
          });
          return { query: criteria, result };
        } catch (error) {
          return {
            query: criteria,
            error: error instanceof Error ? error.message : 'Search failed',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Build search index (can be called after authentication)
   */
  async buildIndexIfNeeded(): Promise<void> {
    try {
      if (this.shouldRebuildIndex()) {
        await this.buildIndex();
      }
    } catch (error) {
      console.warn('Failed to build search index:', error);
    }
  }

  // Private helper methods

  private shouldUseWorkerForIndexing(itemCount: number): boolean {
    return itemCount > this.WORKER_THRESHOLD && workerManager.isWorkerHealthy('search');
  }

  private shouldUseWorkerForSearch(criteria: VaultSearchCriteria): boolean {
    // Use worker for complex searches or when index is large
    const hasComplexCriteria = !!(
      criteria.query ||
      criteria.tags?.length ||
      criteria.types?.length ||
      criteria.folders?.length ||
      criteria.dateRange
    );

    return (
      (hasComplexCriteria || this.metrics.indexSize > this.WORKER_THRESHOLD) &&
      workerManager.isWorkerHealthy('search')
    );
  }

  private shouldUseWorkerForFuzzySearch(query: string): boolean {
    // Use worker for fuzzy search when query is complex or index is large
    return (
      (query.length > 3 || this.metrics.indexSize > this.WORKER_THRESHOLD) &&
      workerManager.isWorkerHealthy('search')
    );
  }

  private shouldRebuildIndex(): boolean {
    const now = Date.now();
    return !this.isIndexed || now - this.lastIndexUpdate > this.INDEX_UPDATE_INTERVAL;
  }

  private async ensureIndexUpToDate(): Promise<void> {
    if (this.shouldRebuildIndex()) {
      await this.buildIndex();
    }
  }

  private async buildIndexMainThread(items: DecryptedVaultItem[]): Promise<void> {
    // Simplified main thread indexing - in a real implementation,
    // this would build a local search index
    this.isIndexed = true;
    this.lastIndexUpdate = Date.now();
    this.metrics.indexSize = items.length;
    this.metrics.lastIndexUpdate = this.lastIndexUpdate;

    // eslint-disable-next-line no-console
    console.log(`Search index built with ${items.length} items on main thread`);
  }

  private async searchMainThread(
    criteria: VaultSearchCriteria,
    config?: SearchConfig
  ): Promise<{ items: DecryptedVaultItem[]; matches: any[] }> {
    // Fallback to vault service search
    const filters: any = {};

    if (criteria.query) {
      filters.query = criteria.query;
    }

    if (criteria.types?.[0] && criteria.types[0] !== 'file') {
      filters.type = criteria.types[0] as 'password' | 'note' | 'card' | 'identity';
    }

    if (criteria.folders?.[0]) {
      filters.folder = criteria.folders[0];
    }

    if (criteria.tags) {
      filters.tags = criteria.tags;
    }

    if (criteria.favoritesOnly !== undefined) {
      filters.favorite = criteria.favoritesOnly;
    }

    const result = await vaultService.searchItems(filters, { limit: config?.maxResults || 50 });

    return {
      items: result.items,
      matches: [],
    };
  }

  private async fuzzySearchMainThread(
    query: string,
    options?: {
      threshold?: number;
      limit?: number;
      includeMatches?: boolean;
    }
  ): Promise<FuzzySearchResult[]> {
    // Simple fuzzy search implementation on main thread
    const searchResult = await vaultService.searchItems({ query }, { limit: options?.limit || 20 });

    return searchResult.items
      .map(item => ({
        item,
        score: this.calculateSimpleFuzzyScore(query, item.name),
        matches: [],
      }))
      .filter(result => result.score >= (options?.threshold || 0.6));
  }

  private calculateSimpleFuzzyScore(query: string, text: string): number {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    if (textLower.includes(queryLower)) {
      return 1.0;
    }

    // Simple character matching score
    let matches = 0;
    for (const char of queryLower) {
      if (textLower.includes(char)) {
        matches += 1;
      }
    }

    return matches / queryLower.length;
  }

  private updateMetrics(operation: string, duration: number, success: boolean): void {
    if (operation === 'search' && success) {
      const totalDuration =
        this.metrics.averageDuration * (this.metrics.totalSearches - 1) + duration;
      this.metrics.averageDuration = totalDuration / this.metrics.totalSearches;
    }
  }

  /**
   * Convert DecryptedVaultItem to VaultItem format for worker
   */
  private convertToVaultItem(item: DecryptedVaultItem): VaultItem {
    // Create a mock VaultItem structure
    // In a real implementation, this would properly convert between formats
    return {
      id: item.id,
      type: item.type as any,
      encrypted: {
        data: '',
        iv: '',
        algorithm: 'AES-256-GCM',
        version: 1,
      },
      metadata: {
        title: item.name,
        tags: item.tags,
        lastAccessed: item.lastAccessed,
        accessCount: 0,
        hasNotes: 'notes' in item && !!item.notes,
        attachmentCount: 0,
      },
      created: item.createdAt,
      modified: item.updatedAt,
      folder: item.folder,
      favorite: item.favorite,
      version: item.version,
      // Add decrypted data for search worker
      decrypted: this.extractDecryptedData(item),
    } as any;
  }

  /**
   * Extract searchable data from DecryptedVaultItem
   */
  private extractDecryptedData(item: DecryptedVaultItem): any {
    const baseData = {
      name: item.name,
      tags: item.tags,
      notes: 'notes' in item ? item.notes : '',
    };

    switch (item.type) {
      case 'password':
        const passwordItem = item as any;
        return {
          ...baseData,
          username: passwordItem.username || '',
          website: passwordItem.website || '',
          email: passwordItem.email || '',
        };

      case 'note':
        const noteItem = item as any;
        return {
          ...baseData,
          content: noteItem.content || '',
        };

      case 'card':
        const cardItem = item as any;
        return {
          ...baseData,
          cardholderName: cardItem.cardholderName || '',
          brand: cardItem.brand || '',
        };

      case 'identity':
        const identityItem = item as any;
        return {
          ...baseData,
          firstName: identityItem.firstName || '',
          lastName: identityItem.lastName || '',
          email: identityItem.email || '',
        };

      default:
        return baseData;
    }
  }

  /**
   * Convert searchable item back to DecryptedVaultItem format
   */
  private convertFromSearchableItem(searchableItem: any): DecryptedVaultItem | null {
    if (!searchableItem || !searchableItem.id) {
      return null;
    }

    // This is a simplified conversion - in a real implementation,
    // we would need to properly reconstruct the DecryptedVaultItem
    const baseItem = {
      id: searchableItem.id,
      type: searchableItem.type,
      name: searchableItem.metadata?.title || searchableItem.decrypted?.name || '',
      tags: searchableItem.metadata?.tags || [],
      folder: searchableItem.folder,
      favorite: searchableItem.favorite || false,
      createdAt: new Date(searchableItem.created),
      updatedAt: new Date(searchableItem.modified),
      lastAccessed: searchableItem.metadata?.lastAccessed
        ? new Date(searchableItem.metadata.lastAccessed)
        : undefined,
      version: searchableItem.version || 1,
    };

    // Add type-specific data
    switch (searchableItem.type) {
      case 'password':
        return {
          ...baseItem,
          type: 'password',
          username: searchableItem.decrypted?.username || '',
          password: '', // Don't include actual password in search results
          website: searchableItem.decrypted?.website || '',
          email: searchableItem.decrypted?.email || '',
          notes: searchableItem.decrypted?.notes || '',
          metadata: {
            strength: 0,
            compromised: false,
            lastChanged: new Date(),
          },
        } as any;

      case 'note':
        return {
          ...baseItem,
          type: 'note',
          content: searchableItem.decrypted?.content || '',
        } as any;

      case 'card':
        return {
          ...baseItem,
          type: 'card',
          cardholderName: searchableItem.decrypted?.cardholderName || '',
          brand: searchableItem.decrypted?.brand || '',
          number: '', // Don't include actual card number
          expiryMonth: 1,
          expiryYear: new Date().getFullYear(),
          cvv: '', // Don't include actual CVV
        } as any;

      case 'identity':
        return {
          ...baseItem,
          type: 'identity',
          firstName: searchableItem.decrypted?.firstName || '',
          lastName: searchableItem.decrypted?.lastName || '',
          email: searchableItem.decrypted?.email || '',
          phone: '',
          address: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
          },
        } as any;

      default:
        return baseItem as any;
    }
  }
}

export const searchService = SearchService.getInstance();
