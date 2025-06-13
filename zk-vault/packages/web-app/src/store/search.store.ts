/**
 * @fileoverview Search Store
 * @description Pinia store for managing global search functionality and state
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  searchService,
  type SearchConfig,
  type SearchResult,
  type SearchStats,
} from '@/services/search.service';
import type { VaultSearchCriteria, VaultItem } from '@zk-vault/shared';
import type { DecryptedVaultItem } from '@/services/vault.service';

/**
 * Search filter options
 */
export interface SearchFilters {
  type?: string;
  folder?: string;
  tags?: string[];
  favorite?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  strength?: {
    min?: number;
    max?: number;
  };
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: Date;
  resultCount: number;
}

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  type: 'query' | 'filter' | 'tag' | 'folder';
  value: string;
  description?: string;
  count?: number;
}

export const useSearchStore = defineStore('search', () => {
  // State
  const query = ref('');
  const filters = ref<SearchFilters>({});
  const results = ref<DecryptedVaultItem[]>([]);
  const matches = ref<any[]>([]);
  const suggestions = ref<SearchSuggestion[]>([]);
  const history = ref<SearchHistoryEntry[]>([]);
  const stats = ref<SearchStats | null>(null);
  const recentQueries = ref<string[]>([]);
  const popularFilters = ref<SearchFilters[]>([]);
  
  // Loading and error states
  const isLoading = ref(false);
  const isIndexing = ref(false);
  const isSearching = ref(false);
  const error = ref<string | null>(null);
  const indexError = ref<string | null>(null);

  // Configuration
  const config = ref<SearchConfig>({
    fuzzyThreshold: 0.6,
    includeScore: true,
    includeMatches: true,
    maxResults: 100,
    minMatchCharLength: 2,
  });

  // Search metrics
  const searchMetrics = ref({
    totalSearches: 0,
    averageSearchTime: 0,
    lastSearchTime: 0,
    totalResults: 0,
  });

  // Getters
  const hasQuery = computed(() => query.value.length > 0);
  const hasFilters = computed(() => Object.keys(filters.value).length > 0);
  const hasResults = computed(() => results.value.length > 0);
  const isIndexAvailable = computed(() => searchService.isIndexAvailable());
  const isEmpty = computed(() => !hasQuery.value && !hasFilters.value);
  const isActive = computed(() => hasQuery.value || hasFilters.value);
  
  const resultCount = computed(() => results.value.length);
  const hasMatches = computed(() => matches.value.length > 0);
  
  const filteredSuggestions = computed(() => {
    if (!query.value) return suggestions.value.slice(0, 10);
    
    const queryLower = query.value.toLowerCase();
    return suggestions.value
      .filter((suggestion: SearchSuggestion) => 
        suggestion.value.toLowerCase().includes(queryLower) ||
        suggestion.description?.toLowerCase().includes(queryLower)
      )
      .slice(0, 10);
  });

  const appliedFiltersCount = computed(() => {
    let count = 0;
    if (filters.value.type) count++;
    if (filters.value.folder) count++;
    if (filters.value.tags?.length) count++;
    if (filters.value.favorite !== undefined) count++;
    if (filters.value.dateRange?.start || filters.value.dateRange?.end) count++;
    if (filters.value.strength?.min !== undefined || filters.value.strength?.max !== undefined) count++;
    return count;
  });

  const recentSearches = computed(() => 
    history.value
      .slice()
      .sort((a: SearchHistoryEntry, b: SearchHistoryEntry) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
  );

  const popularSearches = computed(() =>
    history.value
      .reduce((acc: Array<{ query: string; count: number; lastUsed: number }>, entry: SearchHistoryEntry) => {
        const existing = acc.find((item: { query: string; count: number; lastUsed: number }) => item.query === entry.query);
        if (existing) {
          existing.count++;
          existing.lastUsed = Math.max(existing.lastUsed, entry.timestamp.getTime());
        } else {
          acc.push({
            query: entry.query,
            count: 1,
            lastUsed: entry.timestamp.getTime(),
          });
        }
        return acc;
      }, [] as Array<{ query: string; count: number; lastUsed: number }>)
      .sort((a: { query: string; count: number; lastUsed: number }, b: { query: string; count: number; lastUsed: number }) => b.count - a.count || b.lastUsed - a.lastUsed)
      .slice(0, 5)
  );

  // Actions
  const setQuery = (newQuery: string): void => {
    query.value = newQuery;
  };

  const setFilters = (newFilters: SearchFilters): void => {
    filters.value = { ...newFilters };
  };

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ): void => {
    filters.value = { ...filters.value, [key]: value };
  };

  const removeFilter = (key: keyof SearchFilters): void => {
    const newFilters = { ...filters.value };
    delete newFilters[key];
    filters.value = newFilters;
  };

  const clearFilters = (): void => {
    filters.value = {};
  };

  const clearQuery = (): void => {
    query.value = '';
  };

  const clearAll = (): void => {
    query.value = '';
    filters.value = {};
    results.value = [];
    matches.value = [];
    error.value = null;
  };

  const buildSearchCriteria = (): VaultSearchCriteria => {
    const criteria: VaultSearchCriteria = {};

    if (query.value) {
      criteria.query = query.value;
    }

    if (filters.value.type) {
      criteria.types = [filters.value.type as VaultItem['type']];
    }

    if (filters.value.folder) {
      criteria.folders = [filters.value.folder];
    }

    if (filters.value.tags?.length) {
      criteria.tags = filters.value.tags;
    }

    if (filters.value.favorite !== undefined) {
      criteria.favoritesOnly = filters.value.favorite;
    }

    if (filters.value.dateRange?.start || filters.value.dateRange?.end) {
      criteria.dateRange = {
        from: filters.value.dateRange?.start || new Date(0),
        to: filters.value.dateRange?.end || new Date(),
      };
    }

    return criteria;
  };

  const search = async (): Promise<void> => {
    if (!hasQuery.value && !hasFilters.value) {
      results.value = [];
      matches.value = [];
      return;
    }

    isSearching.value = true;
    error.value = null;

    try {
      const startTime = Date.now();
      const criteria = buildSearchCriteria();
      
      const result: SearchResult = await searchService.search(criteria, config.value);
      
      results.value = result.items;
      matches.value = result.matches;
      
      // Update metrics
      const searchTime = Date.now() - startTime;
      searchMetrics.value.lastSearchTime = searchTime;
      searchMetrics.value.totalSearches++;
      searchMetrics.value.averageSearchTime = 
        (searchMetrics.value.averageSearchTime * (searchMetrics.value.totalSearches - 1) + searchTime) / 
        searchMetrics.value.totalSearches;
      searchMetrics.value.totalResults = result.items.length;

      // Add to history
      await addToHistory(query.value, filters.value, result.items.length);

      // Update recent queries
      if (query.value && !recentQueries.value.includes(query.value)) {
        recentQueries.value = [query.value, ...recentQueries.value.slice(0, 9)];
      }

    } catch (err: any) {
      error.value = err.message;
      console.error('Search failed:', err);
    } finally {
      isSearching.value = false;
    }
  };

  const fuzzySearch = async (searchQuery?: string): Promise<DecryptedVaultItem[]> => {
    const queryToUse = searchQuery || query.value;
    if (!queryToUse) return [];

    isSearching.value = true;
    error.value = null;

    try {
      const startTime = Date.now();
      const options = {
        threshold: config.value.fuzzyThreshold,
        limit: config.value.maxResults,
        includeMatches: config.value.includeMatches,
      };

      const result = await searchService.fuzzySearch(queryToUse, options);
      
      // Update metrics
      const searchTime = Date.now() - startTime;
      searchMetrics.value.lastSearchTime = searchTime;

      return result;
    } catch (err: any) {
      error.value = err.message;
      console.error('Fuzzy search failed:', err);
      return [];
    } finally {
      isSearching.value = false;
    }
  };

  const buildIndex = async (): Promise<void> => {
    isIndexing.value = true;
    indexError.value = null;

    try {
      await searchService.buildIndex(config.value);
      await refreshStats();
    } catch (err: any) {
      indexError.value = err.message;
      console.error('Failed to build search index:', err);
      throw err;
    } finally {
      isIndexing.value = false;
    }
  };

  const rebuildIndex = async (): Promise<void> => {
    isIndexing.value = true;
    indexError.value = null;

    try {
      await searchService.rebuildIndex(config.value);
      await refreshStats();
    } catch (err: any) {
      indexError.value = err.message;
      console.error('Failed to rebuild search index:', err);
      throw err;
    } finally {
      isIndexing.value = false;
    }
  };

  const clearIndex = async (): Promise<void> => {
    isIndexing.value = true;
    indexError.value = null;

    try {
      await searchService.clearIndex();
      stats.value = null;
    } catch (err: any) {
      indexError.value = err.message;
      console.error('Failed to clear search index:', err);
      throw err;
    } finally {
      isIndexing.value = false;
    }
  };

  const refreshStats = async (): Promise<void> => {
    try {
      stats.value = await searchService.getSearchStats();
    } catch (err: any) {
      console.error('Failed to refresh search stats:', err);
    }
  };

  const updateItemInIndex = async (item: DecryptedVaultItem): Promise<void> => {
    try {
      await searchService.updateItemInIndex(item);
    } catch (err: any) {
      console.error('Failed to update item in search index:', err);
    }
  };

  const removeItemFromIndex = async (itemId: string): Promise<void> => {
    try {
      await searchService.removeItemFromIndex(itemId);
    } catch (err: any) {
      console.error('Failed to remove item from search index:', err);
    }
  };

  const updateConfig = (newConfig: Partial<SearchConfig>): void => {
    config.value = { ...config.value, ...newConfig };
  };

  const generateSuggestions = async (): Promise<void> => {
    try {
      // Generate suggestions based on query and current context
      const newSuggestions: SearchSuggestion[] = [];

      // Add query suggestions from history
      if (query.value.length >= 2) {
        const queryMatch = history.value
          .filter((entry: SearchHistoryEntry) => 
            entry.query.toLowerCase().includes(query.value.toLowerCase()) &&
            entry.query !== query.value
          )
          .slice(0, 3)
          .map((entry: SearchHistoryEntry) => ({
            type: 'query' as const,
            value: entry.query,
            description: `${entry.resultCount} results`,
          }));
        
        newSuggestions.push(...queryMatch);
      }

      // Add filter suggestions
      if (stats.value) {
        Object.entries(stats.value.itemsByType).forEach(([type, count]) => {
          if (!filters.value.type || type.toLowerCase().includes(filters.value.type.toLowerCase())) {
            newSuggestions.push({
              type: 'filter',
              value: type,
              description: `${count} ${type} items`,
              count: count as number,
            });
          }
        });
      }

      suggestions.value = newSuggestions;
    } catch (err: any) {
      console.error('Failed to generate suggestions:', err);
    }
  };

  const addToHistory = async (
    searchQuery: string,
    searchFilters: SearchFilters,
    resultCount: number
  ): Promise<void> => {
    if (!searchQuery && Object.keys(searchFilters).length === 0) return;

    const entry: SearchHistoryEntry = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: searchQuery,
      filters: { ...searchFilters },
      timestamp: new Date(),
      resultCount,
    };

    // Avoid duplicates
    const existingIndex = history.value.findIndex(
      (h: SearchHistoryEntry) => h.query === entry.query && JSON.stringify(h.filters) === JSON.stringify(entry.filters)
    );

    if (existingIndex !== -1) {
      history.value[existingIndex] = entry;
    } else {
      history.value = [entry, ...history.value.slice(0, 99)]; // Keep last 100 searches
    }
  };

  const removeFromHistory = (entryId: string): void => {
    history.value = history.value.filter((entry: SearchHistoryEntry) => entry.id !== entryId);
  };

  const clearHistory = (): void => {
    history.value = [];
    recentQueries.value = [];
  };

  const saveSearch = (name: string): void => {
    // This could save named searches for later
    console.log('Saving search:', name, query.value, filters.value);
  };

  const loadSavedSearch = (searchId: string): void => {
    // This could load a saved search
    console.log('Loading saved search:', searchId);
  };

  const exportSearchResults = async (format: 'json' | 'csv'): Promise<string> => {
    try {
      if (format === 'json') {
        return JSON.stringify(
          {
            query: query.value,
            filters: filters.value,
            results: results.value,
            matches: matches.value,
            timestamp: new Date().toISOString(),
            resultCount: results.value.length,
          },
          null,
          2
        );
      } else {
        // CSV export
        const headers = ['Name', 'Type', 'Folder', 'Tags', 'Created', 'Last Modified'];
        const rows = results.value.map((item: DecryptedVaultItem) => [
          item.name,
          item.type,
          item.folder || '',
          item.tags.join(';'),
          item.createdAt.toISOString(),
          item.updatedAt.toISOString(),
        ]);

        return [headers, ...rows]
          .map(row => row.map((cell: string) => `"${cell}"`).join(','))
          .join('\n');
      }
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  };

  const clearError = (): void => {
    error.value = null;
    indexError.value = null;
  };

  // Initialize the store
  const initialize = async (): Promise<void> => {
    isLoading.value = true;

    try {
      // Build index if not available
      if (!searchService.isIndexAvailable()) {
        await buildIndex();
      }

      // Load initial stats
      await refreshStats();
    } catch (err: any) {
      console.error('Failed to initialize search store:', err);
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  };

  // Initialize on store creation
  initialize();

  return {
    // State
    query,
    filters,
    results,
    matches,
    suggestions,
    history,
    stats,
    recentQueries,
    popularFilters,
    isLoading,
    isIndexing,
    isSearching,
    error,
    indexError,
    config,
    searchMetrics,

    // Getters
    hasQuery,
    hasFilters,
    hasResults,
    isIndexAvailable,
    isEmpty,
    isActive,
    resultCount,
    hasMatches,
    filteredSuggestions,
    appliedFiltersCount,
    recentSearches,
    popularSearches,

    // Actions
    setQuery,
    setFilters,
    updateFilter,
    removeFilter,
    clearFilters,
    clearQuery,
    clearAll,
    search,
    fuzzySearch,
    buildIndex,
    rebuildIndex,
    clearIndex,
    refreshStats,
    updateItemInIndex,
    removeItemFromIndex,
    updateConfig,
    generateSuggestions,
    addToHistory,
    removeFromHistory,
    clearHistory,
    saveSearch,
    loadSavedSearch,
    exportSearchResults,
    clearError,
    initialize,
  };
}); 