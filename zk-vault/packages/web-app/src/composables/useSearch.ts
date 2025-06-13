/**
 * @fileoverview Search Composable
 * @description Provides reactive search state and methods for Vue components
 */

import { ref, computed, onMounted, watch } from 'vue';
import { useSearchStore, type SearchFilters } from '@/store/search.store';
import type { DecryptedVaultItem } from '@/services/vault.service';
import type { SearchConfig } from '@/services/search.service';

export interface UseSearchOptions {
  autoInitialize?: boolean;
  autoSearch?: boolean;
  debounceMs?: number;
  defaultFilters?: SearchFilters;
  defaultConfig?: Partial<SearchConfig>;
}

interface UseSearchReturn {
  // State
  query: any;
  filters: any;
  results: any;
  matches: any;
  suggestions: any;
  history: any;
  stats: any;
  recentQueries: any;
  isLoading: any;
  isIndexing: any;
  isSearching: any;
  error: any;
  indexError: any;
  config: any;
  searchMetrics: any;

  // Getters
  hasQuery: any;
  hasFilters: any;
  hasResults: any;
  isIndexAvailable: any;
  isEmpty: any;
  isActive: any;
  resultCount: any;
  hasMatches: any;
  filteredSuggestions: any;
  appliedFiltersCount: any;
  recentSearches: any;
  popularSearches: any;

  // Local state
  searchError: any;

  // Methods
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  removeFilter: (key: keyof SearchFilters) => void;
  clearFilters: () => void;
  clearQuery: () => void;
  clearAll: () => void;
  search: () => Promise<void>;
  fuzzySearch: (query?: string) => Promise<DecryptedVaultItem[]>;
  buildIndex: () => Promise<void>;
  rebuildIndex: () => Promise<void>;
  clearIndex: () => Promise<void>;
  refreshStats: () => Promise<void>;
  updateItemInIndex: (item: DecryptedVaultItem) => Promise<void>;
  removeItemFromIndex: (itemId: string) => Promise<void>;
  updateConfig: (config: Partial<SearchConfig>) => void;
  generateSuggestions: () => Promise<void>;
  clearHistory: () => void;
  exportResults: (format: 'json' | 'csv') => Promise<string>;
  clearError: () => void;
  refresh: () => Promise<void>;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const searchStore = useSearchStore();

  // Local state
  const searchError = ref<string | null>(null);
  const debounceTimer = ref<number | null>(null);

  // Computed properties from store
  const query = computed(() => searchStore.query);
  const filters = computed(() => searchStore.filters);
  const results = computed(() => searchStore.results);
  const matches = computed(() => searchStore.matches);
  const suggestions = computed(() => searchStore.suggestions);
  const history = computed(() => searchStore.history);
  const stats = computed(() => searchStore.stats);
  const recentQueries = computed(() => searchStore.recentQueries);
  const isLoading = computed(() => searchStore.isLoading);
  const isIndexing = computed(() => searchStore.isIndexing);
  const isSearching = computed(() => searchStore.isSearching);
  const error = computed(() => searchStore.error);
  const indexError = computed(() => searchStore.indexError);
  const config = computed(() => searchStore.config);
  const searchMetrics = computed(() => searchStore.searchMetrics);

  // Getters
  const hasQuery = computed(() => searchStore.hasQuery);
  const hasFilters = computed(() => searchStore.hasFilters);
  const hasResults = computed(() => searchStore.hasResults);
  const isIndexAvailable = computed(() => searchStore.isIndexAvailable);
  const isEmpty = computed(() => searchStore.isEmpty);
  const isActive = computed(() => searchStore.isActive);
  const resultCount = computed(() => searchStore.resultCount);
  const hasMatches = computed(() => searchStore.hasMatches);
  const filteredSuggestions = computed(() => searchStore.filteredSuggestions);
  const appliedFiltersCount = computed(() => searchStore.appliedFiltersCount);
  const recentSearches = computed(() => searchStore.recentSearches);
  const popularSearches = computed(() => searchStore.popularSearches);

  // Search methods
  const setQuery = (newQuery: string): void => {
    try {
      searchError.value = null;
      searchStore.setQuery(newQuery);

      if (options.autoSearch) {
        debouncedSearch();
      }
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const setFilters = (newFilters: SearchFilters): void => {
    try {
      searchError.value = null;
      searchStore.setFilters(newFilters);

      if (options.autoSearch) {
        search();
      }
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]): void => {
    try {
      searchError.value = null;
      searchStore.updateFilter(key, value);

      if (options.autoSearch) {
        search();
      }
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const removeFilter = (key: keyof SearchFilters): void => {
    try {
      searchError.value = null;
      searchStore.removeFilter(key);

      if (options.autoSearch) {
        search();
      }
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const clearFilters = (): void => {
    try {
      searchError.value = null;
      searchStore.clearFilters();
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const clearQuery = (): void => {
    try {
      searchError.value = null;
      searchStore.clearQuery();
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const clearAll = (): void => {
    try {
      searchError.value = null;
      searchStore.clearAll();
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const search = async (): Promise<void> => {
    try {
      searchError.value = null;
      await searchStore.search();
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const fuzzySearch = async (searchQuery?: string): Promise<DecryptedVaultItem[]> => {
    try {
      searchError.value = null;
      return await searchStore.fuzzySearch(searchQuery);
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const buildIndex = async (): Promise<void> => {
    try {
      searchError.value = null;
      await searchStore.buildIndex();
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const rebuildIndex = async (): Promise<void> => {
    try {
      searchError.value = null;
      await searchStore.rebuildIndex();
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const clearIndex = async (): Promise<void> => {
    try {
      searchError.value = null;
      await searchStore.clearIndex();
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const refreshStats = async (): Promise<void> => {
    try {
      searchError.value = null;
      await searchStore.refreshStats();
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const updateItemInIndex = async (item: DecryptedVaultItem): Promise<void> => {
    try {
      searchError.value = null;
      await searchStore.updateItemInIndex(item);
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const removeItemFromIndex = async (itemId: string): Promise<void> => {
    try {
      searchError.value = null;
      await searchStore.removeItemFromIndex(itemId);
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const updateConfig = (newConfig: Partial<SearchConfig>): void => {
    try {
      searchError.value = null;
      searchStore.updateConfig(newConfig);
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const generateSuggestions = async (): Promise<void> => {
    try {
      searchError.value = null;
      await searchStore.generateSuggestions();
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const clearHistory = (): void => {
    try {
      searchError.value = null;
      searchStore.clearHistory();
    } catch (error: any) {
      searchError.value = error.message;
    }
  };

  const exportResults = async (format: 'json' | 'csv'): Promise<string> => {
    try {
      searchError.value = null;
      return await searchStore.exportSearchResults(format);
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  const clearError = (): void => {
    searchError.value = null;
    searchStore.clearError();
  };

  const refresh = async (): Promise<void> => {
    try {
      searchError.value = null;
      await Promise.all([searchStore.refreshStats(), searchStore.generateSuggestions()]);
    } catch (error: any) {
      searchError.value = error.message;
      throw error;
    }
  };

  // Debounced search for auto-search
  const debouncedSearch = (): void => {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value);
    }

    debounceTimer.value = window.setTimeout(() => {
      search();
    }, options.debounceMs || 300);
  };

  // Initialize with default options
  const initialize = async (): Promise<void> => {
    try {
      searchError.value = null;

      // Set default filters if provided
      if (options.defaultFilters) {
        searchStore.setFilters(options.defaultFilters);
      }

      // Set default config if provided
      if (options.defaultConfig) {
        searchStore.updateConfig(options.defaultConfig);
      }

      // Auto-initialize if enabled
      if (options.autoInitialize !== false) {
        await searchStore.initialize();
      }
    } catch (error: any) {
      console.error('Failed to initialize search:', error);
      searchError.value = error.message;
    }
  };

  // Watch for query changes to generate suggestions
  watch(
    () => searchStore.query,
    async (newQuery: string) => {
      if (newQuery.length >= 2) {
        try {
          await generateSuggestions();
        } catch (error) {
          // Suggestions are not critical, don't throw
          console.warn('Failed to generate suggestions:', error);
        }
      }
    },
    { debounce: 150 }
  );

  // Lifecycle hooks
  onMounted(() => {
    initialize();
  });

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

    // Local state
    searchError,

    // Methods
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
    clearHistory,
    exportResults,
    clearError,
    refresh,
  };
}
