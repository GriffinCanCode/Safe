/**
 * @fileoverview Search Service
 * @responsibility Manages search operations using web workers for performance
 * @principle Single Responsibility - Only search-related operations
 * @security Zero-knowledge search with client-side operations only
 */

import type {
  VaultItem,
  VaultSearchCriteria,
  CryptoOperationResult,
} from '@zk-vault/shared';
import { vaultService } from './vault.service';
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
  errorCode?: string;
  metrics?: {
    duration: number;
    itemsSearched: number;
    indexSize: number;
    memoryUsed: number;
    cpuUsage: number;
  };
}

/**
 * Search configuration options
 */
export interface SearchConfig {
  fuzzyThreshold?: number;
  includeScore?: boolean;
  includeMatches?: boolean;
  maxResults?: number;
  minMatchCharLength?: number;
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
  };
}

/**
 * Search statistics
 */
export interface SearchStats {
  totalItems: number;
  itemsByType: Record<string, number>;
  indexSize: number;
  lastUpdated: Date;
  searchCount: number;
  averageSearchTime: number;
}

class SearchService {
  private static instance: SearchService;
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private isIndexed = false;
  private lastIndexUpdate = 0;
  private readonly INDEX_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeWorker();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Initialize the search worker
   */
  private initializeWorker(): void {
    try {
      // Create worker from the search worker file
      this.worker = new Worker(
        new URL('../workers/search.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
        const { id, success, data, error, errorCode } = event.data;
        const pending = this.pendingRequests.get(id);

        if (pending) {
          this.pendingRequests.delete(id);

          if (success) {
            pending.resolve(data);
          } else {
            const errorMessage = error || 'Unknown worker error';
            const workerError = new Error(errorMessage);
            (workerError as any).code = errorCode;
            pending.reject(workerError);
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('Search worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker error'));
        });
        this.pendingRequests.clear();
      };

    } catch (error) {
      console.error('Failed to initialize search worker:', error);
    }
  }

  /**
   * Send message to worker and wait for response
   */
  private async sendWorkerMessage<T>(type: string, data: any): Promise<T> {
    if (!this.worker) {
      throw new Error('Search worker not initialized');
    }

    const id = `msg_${++this.messageId}`;
    const message: SearchWorkerMessage = { id, type, data };

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage(message);

      // Set timeout for worker requests
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Worker request timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Build or rebuild the search index with current vault items
   */
  async buildIndex(config?: SearchConfig): Promise<void> {
    try {
      // Get all vault items
      const searchResult = await vaultService.searchItems({}, { limit: 10000 });
      const items = searchResult.items;

      // Convert to VaultItem format for the worker
      const vaultItems: VaultItem[] = items.map(item => this.convertToVaultItem(item));

      // Send to worker for indexing
      const result = await this.sendWorkerMessage<{ indexedCount: number }>('indexItems', {
        items: vaultItems,
        config,
      });

      this.isIndexed = true;
      this.lastIndexUpdate = Date.now();

      console.log(`Search index built with ${result.indexedCount} items`);
    } catch (error) {
      console.error('Failed to build search index:', error);
      throw new Error(`Failed to build search index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search vault items using the worker
   */
  async search(
    criteria: VaultSearchCriteria,
    config?: SearchConfig
  ): Promise<SearchResult> {
    try {
      // Ensure index is up to date
      await this.ensureIndexUpToDate();

      // Perform search using worker
      const result = await this.sendWorkerMessage<{
        results: any[];
        matches: any[];
      }>('search', {
        criteria,
        config,
      });

      // Convert results back to DecryptedVaultItem format
      const items: DecryptedVaultItem[] = result.results.map(item => 
        this.convertFromSearchableItem(item)
      ).filter(Boolean) as DecryptedVaultItem[];

      return {
        items,
        matches: result.matches,
        total: items.length,
        metrics: {
          duration: 0,
          itemsSearched: result.results.length,
          indexSize: 0,
        },
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform fuzzy search with advanced options
   */
  async fuzzySearch(
    query: string,
    options?: {
      threshold?: number;
      limit?: number;
      includeMatches?: boolean;
    }
  ): Promise<any[]> {
    try {
      await this.ensureIndexUpToDate();

      const result = await this.sendWorkerMessage<{ results: any[] }>('fuzzySearch', {
        query,
        options,
      });

      return result.results;
    } catch (error) {
      console.error('Fuzzy search failed:', error);
      throw new Error(`Fuzzy search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update index when an item is added/updated
   */
  async updateItemInIndex(item: DecryptedVaultItem): Promise<void> {
    if (!this.isIndexed) {
      return; // Index not built yet
    }

    try {
      const vaultItem = this.convertToVaultItem(item);
      await this.sendWorkerMessage('updateIndex', { item: vaultItem });
    } catch (error) {
      console.error('Failed to update item in index:', error);
      // Don't throw error as this is a background operation
    }
  }

  /**
   * Remove item from index when deleted
   */
  async removeItemFromIndex(itemId: string): Promise<void> {
    if (!this.isIndexed) {
      return; // Index not built yet
    }

    try {
      await this.sendWorkerMessage('removeFromIndex', { itemId });
    } catch (error) {
      console.error('Failed to remove item from index:', error);
      // Don't throw error as this is a background operation
    }
  }

  /**
   * Clear the search index
   */
  async clearIndex(): Promise<void> {
    try {
      await this.sendWorkerMessage('clearIndex', {});
      this.isIndexed = false;
      this.lastIndexUpdate = 0;
    } catch (error) {
      console.error('Failed to clear search index:', error);
      throw new Error(`Failed to clear search index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<SearchStats> {
    try {
      const stats = await this.sendWorkerMessage<SearchStats>('getSearchStats', {});
      return stats;
    } catch (error) {
      console.error('Failed to get search stats:', error);
      throw new Error(`Failed to get search stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rebuild the entire search index
   */
  async rebuildIndex(config?: SearchConfig): Promise<void> {
    try {
      // Get all vault items
      const searchResult = await vaultService.searchItems({}, { limit: 10000 });
      const items = searchResult.items;

      // Convert to VaultItem format
      const vaultItems: VaultItem[] = items.map(item => this.convertToVaultItem(item));

      // Rebuild index
      const result = await this.sendWorkerMessage<{ rebuiltCount: number }>('rebuildIndex', {
        items: vaultItems,
        config,
      });

      this.isIndexed = true;
      this.lastIndexUpdate = Date.now();

      console.log(`Search index rebuilt with ${result.rebuiltCount} items`);
    } catch (error) {
      console.error('Failed to rebuild search index:', error);
      throw new Error(`Failed to rebuild search index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if search index is available
   */
  isIndexAvailable(): boolean {
    return this.isIndexed;
  }

  /**
   * Ensure search index is up to date
   */
  private async ensureIndexUpToDate(): Promise<void> {
    const now = Date.now();
    const timeSinceUpdate = now - this.lastIndexUpdate;

    if (!this.isIndexed || timeSinceUpdate > this.INDEX_REFRESH_INTERVAL) {
      await this.buildIndex();
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
      type: item.type as VaultItem['type'],
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
   * Extract decrypted data based on item type
   */
  private extractDecryptedData(item: DecryptedVaultItem): any {
    switch (item.type) {
      case 'password':
        return {
          title: item.name,
          username: item.username,
          password: item.password,
          url: item.website,
          notes: item.notes,
          totp: item.totpSecret,
          customFields: item.customFields,
        };
      case 'note':
        return {
          title: item.name,
          content: item.content,
        };
      case 'card':
        return {
          cardholderName: item.cardholderName,
          number: item.number,
          expiryMonth: item.expiryMonth,
          expiryYear: item.expiryYear,
          securityCode: item.cvv,
        };
      case 'identity':
        return {
          name: {
            first: item.firstName,
            last: item.lastName,
          },
          emails: [item.email],
          phones: item.phone ? [{ number: item.phone, type: 'mobile' }] : [],
          addresses: item.address ? [{ street1: item.address, city: '', state: '', postalCode: '', country: '' }] : [],
        };
      default:
        return {};
    }
  }

  /**
   * Convert searchable item back to DecryptedVaultItem
   */
  private convertFromSearchableItem(searchableItem: any): DecryptedVaultItem | null {
    try {
      // This is a simplified conversion
      // In a real implementation, you'd fetch the full item from vault service
      return {
        id: searchableItem.id,
        type: searchableItem.type,
        name: searchableItem.title,
        tags: searchableItem.tags,
        folder: searchableItem.metadata.folder,
        favorite: searchableItem.metadata.favorite,
        createdAt: new Date(searchableItem.metadata.created),
        updatedAt: new Date(searchableItem.metadata.modified),
        lastAccessed: searchableItem.metadata.lastAccessed ? new Date(searchableItem.metadata.lastAccessed) : undefined,
        version: 1,
      } as DecryptedVaultItem;
    } catch (error) {
      console.error('Failed to convert searchable item:', error);
      return null;
    }
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    this.isIndexed = false;
  }
}

export const searchService = SearchService.getInstance();
