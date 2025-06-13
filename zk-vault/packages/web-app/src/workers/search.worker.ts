/**
 * @fileoverview Search Worker
 * @responsibility Handles encrypted search operations on vault items
 * @principle Single Responsibility - Only search and indexing operations
 * @security Zero-knowledge search with client-side decryption only
 */

import Fuse from 'fuse.js';
import type {
  VaultItem,
  VaultSearchCriteria,
  PasswordEntry,
  NoteEntry,
  CardEntry,
  IdentityEntry,
  FileEntry,
  EncryptedData,
  DecryptionContext,
  CryptoOperationResult,
} from '@zk-vault/shared';

/**
 * Worker message types for search operations
 */
interface SearchWorkerMessage {
  id: string;
  type:
    | 'indexItems'
    | 'search'
    | 'searchEncrypted'
    | 'updateIndex'
    | 'removeFromIndex'
    | 'clearIndex'
    | 'fuzzySearch'
    | 'getSearchStats'
    | 'rebuildIndex'
    | 'ping';
  data: any;
}

interface SearchWorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string | undefined;
  errorCode?: string | undefined;
  metrics?: {
    duration: number;
    itemsSearched: number;
    indexSize: number;
    memoryUsed: number;
    cpuUsage: number;
  };
}

/**
 * Search index configuration
 */
interface SearchIndexConfig {
  fuzzyThreshold: number;
  includeScore: boolean;
  includeMatches: boolean;
  maxResults: number;
  minMatchCharLength: number;
  keys: string[];
}

/**
 * Searchable item structure (decrypted for indexing)
 */
interface SearchableItem {
  id: string;
  type: VaultItem['type'];
  title: string;
  content: string;
  tags: string[];
  url?: string;
  username?: string;
  metadata: {
    created: Date;
    modified: Date;
    lastAccessed?: Date;
    folder?: string;
    favorite?: boolean;
  };
  // Combined searchable text for full-text search
  searchText: string;
}

/**
 * Search statistics
 */
interface SearchStats {
  totalItems: number;
  itemsByType: Record<string, number>;
  indexSize: number;
  lastUpdated: Date;
  searchCount: number;
  averageSearchTime: number;
}

/**
 * Global search index using Fuse.js
 */
let searchIndex: Fuse<SearchableItem> | null = null;

/**
 * Search configuration
 */
const defaultSearchConfig: SearchIndexConfig = {
  fuzzyThreshold: 0.3,
  includeScore: true,
  includeMatches: true,
  maxResults: 100,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 0.8 },
    { name: 'content', weight: 0.6 },
    { name: 'tags', weight: 0.7 },
    { name: 'url', weight: 0.5 },
    { name: 'username', weight: 0.4 },
    { name: 'searchText', weight: 0.3 },
  ] as any[],
};

/**
 * Search statistics tracking
 */
let searchStats: SearchStats = {
  totalItems: 0,
  itemsByType: {},
  indexSize: 0,
  lastUpdated: new Date(),
  searchCount: 0,
  averageSearchTime: 0,
};

/**
 * Search time tracking
 */
let searchTimes: number[] = [];

/**
 * Main message handler for search operations
 */
self.onmessage = async (event: MessageEvent<SearchWorkerMessage>) => {
  const { id, type, data } = event.data;
  const startTime = performance.now();

  try {
    let result: any;

    switch (type) {
      case 'ping':
        result = await handlePing(data);
        break;

      case 'indexItems':
        result = await handleIndexItems(data);
        break;

      case 'search':
        result = await handleSearch(data);
        break;

      case 'searchEncrypted':
        result = await handleSearchEncrypted(data);
        break;

      case 'updateIndex':
        result = await handleUpdateIndex(data);
        break;

      case 'removeFromIndex':
        result = await handleRemoveFromIndex(data);
        break;

      case 'clearIndex':
        result = await handleClearIndex(data);
        break;

      case 'fuzzySearch':
        result = await handleFuzzySearch(data);
        break;

      case 'getSearchStats':
        result = await handleGetSearchStats(data);
        break;

      case 'rebuildIndex':
        result = await handleRebuildIndex(data);
        break;

      default:
        result = {
          success: false,
          error: `Unknown operation type: ${type}`,
          errorCode: 'UNKNOWN_OPERATION',
        };
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Track search performance
    if (type === 'search' || type === 'fuzzySearch') {
      trackSearchPerformance(duration);
    }

    const response: SearchWorkerResponse = {
      id,
      success: result.success,
      data: result.data,
      error: result.error,
      errorCode: result.errorCode,
      metrics: {
        duration,
        itemsSearched: result.metrics?.itemsSearched ?? searchStats.totalItems,
        indexSize: searchStats.indexSize,
        memoryUsed: result.metrics?.memoryUsed ?? 0,
        cpuUsage: result.metrics?.cpuUsage ?? 0,
      },
    };

    self.postMessage(response);
  } catch (error) {
    const endTime = performance.now();
    const response: SearchWorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'WORKER_EXCEPTION',
      metrics: {
        duration: endTime - startTime,
        itemsSearched: 0,
        indexSize: searchStats.indexSize,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };

    self.postMessage(response);
  }
};

/**
 * Handle ping operation for health checks
 */
async function handlePing(
  _data: any
): Promise<CryptoOperationResult<{ status: string; timestamp: number }>> {
  return {
    success: true,
    data: {
      status: 'healthy',
      timestamp: Date.now(),
    },
    metrics: {
      duration: 0,
      memoryUsed: 0,
      cpuUsage: 0,
    },
  };
}

/**
 * Handle indexing vault items
 */
async function handleIndexItems(data: {
  items: VaultItem[];
  config?: Partial<SearchIndexConfig>;
}): Promise<CryptoOperationResult<{ indexedCount: number }>> {
  const { items, config } = data;

  try {
    const finalConfig = { ...defaultSearchConfig, ...config };
    const searchableItems: SearchableItem[] = [];

    for (const item of items) {
      // Note: This assumes items are already decrypted on the main thread
      // In a real implementation, we'd need the decryption key to decrypt here
      const searchableItem = await convertToSearchableItem(item);
      if (searchableItem) {
        searchableItems.push(searchableItem);
      }
    }

    // Create new search index
    searchIndex = new Fuse(searchableItems, {
      threshold: finalConfig.fuzzyThreshold,
      includeScore: finalConfig.includeScore,
      includeMatches: finalConfig.includeMatches,
      minMatchCharLength: finalConfig.minMatchCharLength,
      keys: finalConfig.keys,
    });

    // Update statistics
    updateSearchStats(searchableItems);

    return {
      success: true,
      data: { indexedCount: searchableItems.length },
      metrics: {
        duration: 0,
        memoryUsed: estimateIndexSize(searchableItems),
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Index creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'INDEX_CREATION_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Handle search operations
 */
async function handleSearch(data: {
  criteria: VaultSearchCriteria;
  config?: Partial<SearchIndexConfig>;
}): Promise<CryptoOperationResult<{ results: SearchableItem[]; matches: any[] }>> {
  const { criteria, config } = data;

  try {
    if (!searchIndex) {
      return {
        success: false,
        error: 'Search index not initialized',
        errorCode: 'INDEX_NOT_INITIALIZED',
        metrics: {
          duration: 0,
          memoryUsed: 0,
          cpuUsage: 0,
        },
      };
    }

    const finalConfig = { ...defaultSearchConfig, ...config };
    let results: any[] = [];

    if (criteria.query) {
      // Perform fuzzy search
      results = searchIndex.search(criteria.query, {
        limit: finalConfig.maxResults,
      });
    } else {
      // Return all items if no query - get items from search index
      const indexData = searchIndex.getIndex() as any;
      const docs = indexData.docs || [];
      results = docs.map((item: any, index: number) => ({
        item,
        refIndex: index,
        score: 0,
      }));
    }

    // Apply additional filters
    let filteredResults = results;

    if (criteria.types && criteria.types.length > 0) {
      filteredResults = filteredResults.filter(result =>
        criteria.types!.includes(result.item.type)
      );
    }

    if (criteria.tags && criteria.tags.length > 0) {
      filteredResults = filteredResults.filter(result =>
        criteria.tags!.some(tag => result.item.tags.includes(tag))
      );
    }

    if (criteria.folders && criteria.folders.length > 0) {
      filteredResults = filteredResults.filter(result =>
        criteria.folders!.includes(result.item.metadata.folder || '')
      );
    }

    if (criteria.favoritesOnly) {
      filteredResults = filteredResults.filter(result => result.item.metadata.favorite === true);
    }

    if (criteria.dateRange) {
      filteredResults = filteredResults.filter(result => {
        const itemDate = new Date(result.item.metadata.modified);
        return itemDate >= criteria.dateRange!.from && itemDate <= criteria.dateRange!.to;
      });
    }

    // Sort results
    filteredResults.sort((a, b) => {
      if (criteria.query) {
        // Sort by search score for query searches
        return (a.score || 0) - (b.score || 0);
      } else {
        // Sort by modified date for non-query searches
        return (
          new Date(b.item.metadata.modified).getTime() -
          new Date(a.item.metadata.modified).getTime()
        );
      }
    });

    // Limit results
    const limitedResults = filteredResults.slice(0, finalConfig.maxResults);

    return {
      success: true,
      data: {
        results: limitedResults.map(r => r.item),
        matches: limitedResults.map(r => r.matches || []),
      },
      metrics: {
        duration: 0,
        memoryUsed: estimateMemoryUsage(limitedResults),
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'SEARCH_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Handle encrypted search (decrypt on demand)
 */
async function handleSearchEncrypted(data: {
  encryptedItems: VaultItem[];
  criteria: VaultSearchCriteria;
  decryptionKey: Uint8Array;
  context?: DecryptionContext;
}): Promise<CryptoOperationResult<{ results: VaultItem[] }>> {
  // Mark parameters as used to avoid linter warning
  void data.encryptedItems;
  void data.criteria;
  void data.decryptionKey;
  void data.context;

  try {
    // This would require importing crypto functions in the worker
    // For now, return a placeholder implementation

    return {
      success: false,
      error: 'Encrypted search not yet implemented - items should be decrypted on main thread',
      errorCode: 'ENCRYPTED_SEARCH_NOT_IMPLEMENTED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Encrypted search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'ENCRYPTED_SEARCH_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Handle index updates
 */
async function handleUpdateIndex(data: {
  item: VaultItem;
}): Promise<CryptoOperationResult<boolean>> {
  const { item } = data;

  try {
    if (!searchIndex) {
      return {
        success: false,
        error: 'Search index not initialized',
        errorCode: 'INDEX_NOT_INITIALIZED',
        metrics: {
          duration: 0,
          memoryUsed: 0,
          cpuUsage: 0,
        },
      };
    }

    const searchableItem = await convertToSearchableItem(item);
    if (!searchableItem) {
      return {
        success: false,
        error: 'Failed to convert item to searchable format',
        errorCode: 'ITEM_CONVERSION_FAILED',
        metrics: {
          duration: 0,
          memoryUsed: 0,
          cpuUsage: 0,
        },
      };
    }

    // Remove existing item and add updated one
    await handleRemoveFromIndex({ itemId: item.id });

    // Add to index (Fuse.js doesn't have direct update, so we rebuild)
    const indexData = searchIndex.getIndex() as any;
    const currentDocs = (indexData.docs || []) as SearchableItem[];
    const updatedDocs = [...currentDocs, searchableItem];

    // Get current options from the search index
    const currentOptions = {
      threshold: defaultSearchConfig.fuzzyThreshold,
      includeScore: defaultSearchConfig.includeScore,
      includeMatches: defaultSearchConfig.includeMatches,
      minMatchCharLength: defaultSearchConfig.minMatchCharLength,
      keys: defaultSearchConfig.keys,
    };

    searchIndex = new Fuse(updatedDocs, currentOptions);
    updateSearchStats(updatedDocs);

    return {
      success: true,
      data: true,
      metrics: {
        duration: 0,
        memoryUsed: estimateIndexSize(updatedDocs),
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Index update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'INDEX_UPDATE_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Handle item removal from index
 */
async function handleRemoveFromIndex(data: {
  itemId: string;
}): Promise<CryptoOperationResult<boolean>> {
  const { itemId } = data;

  try {
    if (!searchIndex) {
      return {
        success: false,
        error: 'Search index not initialized',
        errorCode: 'INDEX_NOT_INITIALIZED',
        metrics: {
          duration: 0,
          memoryUsed: 0,
          cpuUsage: 0,
        },
      };
    }

    // Rebuild index without the specified item
    const indexData = searchIndex.getIndex() as any;
    const currentDocs = (indexData.docs || []) as SearchableItem[];
    const filteredDocs = currentDocs.filter(item => item.id !== itemId);

    // Get current options from the search index
    const currentOptions = {
      threshold: defaultSearchConfig.fuzzyThreshold,
      includeScore: defaultSearchConfig.includeScore,
      includeMatches: defaultSearchConfig.includeMatches,
      minMatchCharLength: defaultSearchConfig.minMatchCharLength,
      keys: defaultSearchConfig.keys,
    };

    searchIndex = new Fuse(filteredDocs, currentOptions);
    updateSearchStats(filteredDocs);

    return {
      success: true,
      data: true,
      metrics: {
        duration: 0,
        memoryUsed: estimateIndexSize(filteredDocs),
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Index removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'INDEX_REMOVAL_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Handle index clearing
 */
async function handleClearIndex(_data: any): Promise<CryptoOperationResult<boolean>> {
  try {
    searchIndex = null;
    searchStats = {
      totalItems: 0,
      itemsByType: {},
      indexSize: 0,
      lastUpdated: new Date(),
      searchCount: 0,
      averageSearchTime: 0,
    };
    searchTimes = [];

    return {
      success: true,
      data: true,
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Index clearing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'INDEX_CLEAR_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Handle fuzzy search with advanced options
 */
async function handleFuzzySearch(data: {
  query: string;
  options?: {
    threshold?: number;
    limit?: number;
    includeMatches?: boolean;
  };
}): Promise<CryptoOperationResult<{ results: any[] }>> {
  const { query, options = {} } = data;

  try {
    if (!searchIndex) {
      return {
        success: false,
        error: 'Search index not initialized',
        errorCode: 'INDEX_NOT_INITIALIZED',
        metrics: {
          duration: 0,
          memoryUsed: 0,
          cpuUsage: 0,
        },
      };
    }

    const searchOptions = {
      limit: options.limit || defaultSearchConfig.maxResults,
      includeMatches: options.includeMatches ?? defaultSearchConfig.includeMatches,
    };

    // Note: For now, we'll use the existing search index
    // Custom threshold would require rebuilding the index which is expensive
    const results = searchIndex.search(query, searchOptions);

    return {
      success: true,
      data: { results },
      metrics: {
        duration: 0,
        memoryUsed: estimateMemoryUsage(results),
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Fuzzy search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'FUZZY_SEARCH_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Handle search statistics retrieval
 */
async function handleGetSearchStats(_data: any): Promise<CryptoOperationResult<SearchStats>> {
  try {
    return {
      success: true,
      data: { ...searchStats },
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Stats retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'STATS_RETRIEVAL_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Handle index rebuilding
 */
async function handleRebuildIndex(data: {
  items: VaultItem[];
  config?: Partial<SearchIndexConfig>;
}): Promise<CryptoOperationResult<{ rebuiltCount: number }>> {
  const { items, config } = data;

  try {
    // Clear existing index
    await handleClearIndex({});

    // Rebuild with new items - handle undefined config properly
    const result = await handleIndexItems({
      items,
      ...(config && { config }),
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Unknown error',
        errorCode: result.errorCode || 'UNKNOWN_ERROR',
        metrics: {
          duration: 0,
          memoryUsed: 0,
          cpuUsage: 0,
        },
      };
    }

    return {
      success: true,
      data: { rebuiltCount: result.data?.indexedCount || 0 },
      metrics: {
        duration: 0,
        memoryUsed: result.metrics?.memoryUsed || 0,
        cpuUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Index rebuild failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'INDEX_REBUILD_FAILED',
      metrics: {
        duration: 0,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };
  }
}

/**
 * Utility functions
 */

async function convertToSearchableItem(item: VaultItem): Promise<SearchableItem | null> {
  try {
    // For now, assume the item contains decrypted data
    // In a real implementation, this would decrypt the item.encrypted data

    let title = '';
    let content = '';
    let url = '';
    let username = '';

    // Extract searchable content based on item type
    if (item.type === 'password') {
      const passwordItem = item as PasswordEntry;
      if (passwordItem.decrypted) {
        title = passwordItem.decrypted.title || '';
        content = passwordItem.decrypted.notes || '';
        url = passwordItem.decrypted.url || '';
        username = passwordItem.decrypted.username || '';
      }
    } else if (item.type === 'note') {
      const noteItem = item as NoteEntry;
      if (noteItem.decrypted) {
        title = noteItem.decrypted.title || '';
        content = noteItem.decrypted.content || '';
      }
    } else if (item.type === 'card') {
      const cardItem = item as CardEntry;
      if (cardItem.decrypted) {
        title = cardItem.decrypted.cardholderName || '';
        content = `${cardItem.decrypted.brand || ''} ending in ${cardItem.decrypted.number?.slice(-4) || ''}`;
      }
    } else if (item.type === 'identity') {
      const identityItem = item as IdentityEntry;
      if (identityItem.decrypted) {
        title =
          `${identityItem.decrypted.name?.first || ''} ${identityItem.decrypted.name?.last || ''}`.trim();
        content = identityItem.decrypted.emails?.join(' ') || '';
      }
    } else if (item.type === 'file') {
      const fileItem = item as FileEntry;
      if (fileItem.decrypted) {
        title = fileItem.decrypted.filename || '';
        content = fileItem.decrypted.mimeType || '';
      }
    }

    // Fallback to metadata title if no decrypted title
    if (!title) {
      title = item.metadata.title || '';
    }

    // Create combined search text
    const searchText = [title, content, url, username, ...item.metadata.tags]
      .join(' ')
      .toLowerCase();

    const searchableItem: SearchableItem = {
      id: item.id,
      type: item.type,
      title,
      content,
      tags: item.metadata.tags,
      url,
      username,
      metadata: {
        created: item.created,
        modified: item.modified,
        ...(item.metadata.lastAccessed && { lastAccessed: item.metadata.lastAccessed }),
        ...(item.folder && { folder: item.folder }),
        ...(item.favorite !== undefined && { favorite: item.favorite }),
      },
      searchText,
    };

    return searchableItem;
  } catch (error) {
    console.error('Failed to convert item to searchable format:', error);
    return null;
  }
}

function updateSearchStats(items: SearchableItem[]): void {
  searchStats.totalItems = items.length;
  searchStats.itemsByType = {};
  searchStats.indexSize = estimateIndexSize(items);
  searchStats.lastUpdated = new Date();

  // Count items by type
  for (const item of items) {
    searchStats.itemsByType[item.type] = (searchStats.itemsByType[item.type] || 0) + 1;
  }
}

function trackSearchPerformance(duration: number): void {
  searchTimes.push(duration);
  searchStats.searchCount++;

  // Keep only recent search times (last 100)
  if (searchTimes.length > 100) {
    searchTimes = searchTimes.slice(-100);
  }

  // Calculate average search time
  searchStats.averageSearchTime =
    searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length;
}

function estimateMemoryUsage(data: any): number {
  // Rough estimation of memory usage
  return JSON.stringify(data).length * 2; // Estimate 2 bytes per character
}

function estimateIndexSize(items: SearchableItem[]): number {
  // Rough estimate: each item is about 1KB on average
  return items.length * 1024;
}

// Log that the search worker is initialized
console.log('Search Worker initialized');

// Set up periodic cleanup of search statistics
setInterval(() => {
  // Clean up old search times if too many accumulate
  if (searchTimes.length > 1000) {
    searchTimes = searchTimes.slice(-100);
    searchStats.averageSearchTime =
      searchTimes.reduce((sum, time) => sum + time, 0) / searchTimes.length;
  }
}, 60000); // Clean up every minute
