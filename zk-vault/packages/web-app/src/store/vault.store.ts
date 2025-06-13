/**
 * @fileoverview Vault Store
 * @description Pinia store for managing vault items, search, and encryption state
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  vaultService,
  type VaultItem,
  type VaultStats,
  type VaultSearchFilters,
  type VaultSearchResult,
  type VaultItemType,
  type PasswordVaultItem,
  type NoteVaultItem,
  type CardVaultItem,
  type IdentityVaultItem,
} from '@/services/vault.service';
import { vaultIntegration } from '@/services/vault-integration.service';
import type { SearchResult } from '@/services/search.service';

export const useVaultStore = defineStore('vault', () => {
  // State
  const items = ref<VaultItem[]>([]);
  const selectedItem = ref<VaultItem | null>(null);
  const searchQuery = ref('');
  const filters = ref<VaultSearchFilters>({});
  const stats = ref<VaultStats | null>(null);
  const folders = ref<string[]>([]);
  const tags = ref<string[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const hasMore = ref(false);
  const nextCursor = ref<string | null>(null);

  // Computed
  const filteredItems = computed(() => {
    let result = items.value;

    // Apply search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (item: VaultItem) =>
          item.name.toLowerCase().includes(query) ||
          ('notes' in item && item.notes?.toLowerCase().includes(query)) ||
          item.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.value.type) {
      result = result.filter((item: VaultItem) => item.type === filters.value.type);
    }

    if (filters.value.folder) {
      result = result.filter((item: VaultItem) => item.folder === filters.value.folder);
    }

    if (filters.value.favorite !== undefined) {
      result = result.filter((item: VaultItem) => item.favorite === filters.value.favorite);
    }

    if (filters.value.tags?.length) {
      result = result.filter((item: VaultItem) =>
        filters.value.tags!.some((tag: string) => item.tags.includes(tag))
      );
    }

    if (filters.value.compromised !== undefined) {
      result = result.filter((item: VaultItem) => {
        if (item.type === 'password') {
          return (item as PasswordVaultItem).metadata.compromised === filters.value.compromised;
        }
        return false;
      });
    }

    if (filters.value.weak !== undefined) {
      result = result.filter((item: VaultItem) => {
        if (item.type === 'password') {
          return (item as PasswordVaultItem).metadata.strength < 3 === filters.value.weak;
        }
        return false;
      });
    }

    return result;
  });

  const itemsByType = computed(() => {
    const grouped: Record<VaultItemType, VaultItem[]> = {
      password: [],
      note: [],
      card: [],
      identity: [],
    };

    filteredItems.value.forEach((item: VaultItem) => {
      grouped[item.type as VaultItemType].push(item);
    });

    return grouped;
  });

  const passwordItems = computed(() => itemsByType.value.password as PasswordVaultItem[]);
  const noteItems = computed(() => itemsByType.value.note as NoteVaultItem[]);
  const cardItems = computed(() => itemsByType.value.card as CardVaultItem[]);
  const identityItems = computed(() => itemsByType.value.identity as IdentityVaultItem[]);

  const favoriteItems = computed(() =>
    filteredItems.value.filter((item: VaultItem) => item.favorite)
  );
  const recentItems = computed(() =>
    [...filteredItems.value]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
  );

  const weakPasswords = computed(() =>
    passwordItems.value.filter((item: PasswordVaultItem) => item.metadata.strength < 3)
  );

  const compromisedPasswords = computed(() =>
    passwordItems.value.filter((item: PasswordVaultItem) => item.metadata.compromised)
  );

  const duplicatePasswords = computed(() => {
    const passwordCounts = new Map<string, PasswordVaultItem[]>();

    passwordItems.value.forEach((item: PasswordVaultItem) => {
      const password = item.password;
      if (!passwordCounts.has(password)) {
        passwordCounts.set(password, []);
      }
      passwordCounts.get(password)!.push(item);
    });

    return Array.from(passwordCounts.values())
      .filter(group => group.length > 1)
      .flat();
  });

  const securityScore = computed(() => {
    if (!stats.value || stats.value.totalItems === 0) return 0;

    const totalPasswords = stats.value.itemsByType.password;
    if (totalPasswords === 0) return 100;

    const issues =
      stats.value.compromisedPasswords + stats.value.weakPasswords + stats.value.reusedPasswords;
    const score = Math.max(0, 100 - (issues / totalPasswords) * 100);

    return Math.round(score);
  });

  // Actions
  const loadItems = async (loadMore = false): Promise<void> => {
    if (isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const cursor = loadMore ? nextCursor.value : undefined;
      
      // Use enhanced search that leverages workers when available
      let result: SearchResult;
      try {
        result = await vaultIntegration.search(filters.value, {
          maxResults: 50,
        });
        
        // Convert to VaultSearchResult format for compatibility
        const vaultResult: VaultSearchResult = {
          items: result.items,
          total: result.total,
          hasMore: result.items.length >= 50, // Simplified hasMore logic
          nextCursor: result.items.length >= 50 ? '50' : undefined,
        };
        
        if (loadMore && nextCursor.value) {
          items.value = [...items.value, ...vaultResult.items];
        } else {
          items.value = vaultResult.items;
        }

        hasMore.value = vaultResult.hasMore;
        nextCursor.value = vaultResult.nextCursor || null;
      } catch (workerError) {
        console.warn('Enhanced search failed, falling back to vault service:', workerError);
        
        // Fallback to original vault service search
        const vaultResult: VaultSearchResult = await vaultService.searchItems(filters.value, {
          limit: 50,
          cursor: cursor || undefined,
        });

        if (loadMore && nextCursor.value) {
          items.value = [...items.value, ...vaultResult.items];
        } else {
          items.value = vaultResult.items;
        }

        hasMore.value = vaultResult.hasMore;
        nextCursor.value = vaultResult.nextCursor || null;
      }
    } catch (err: any) {
      error.value = err.message;
      console.error('Failed to load vault items:', err);
    } finally {
      isLoading.value = false;
    }
  };

  const createItem = async (
    item: Omit<VaultItem, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<VaultItem> => {
    isLoading.value = true;
    error.value = null;

    try {
      const newItem = await vaultService.createItem(item);
      items.value.unshift(newItem);
      await refreshStats();
      await refreshFolders();
      await refreshTags();
      return newItem;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateItem = async (id: string, updates: Partial<VaultItem>): Promise<VaultItem> => {
    isLoading.value = true;
    error.value = null;

    try {
      const updatedItem = await vaultService.updateItem(id, updates);
      const index = items.value.findIndex((item: VaultItem) => item.id === id);
      if (index !== -1) {
        items.value[index] = updatedItem;
      }

      if (selectedItem.value?.id === id) {
        selectedItem.value = updatedItem;
      }

      await refreshStats();
      await refreshFolders();
      await refreshTags();

      return updatedItem;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      await vaultService.deleteItem(id);
      items.value = items.value.filter((item: VaultItem) => item.id !== id);

      if (selectedItem.value?.id === id) {
        selectedItem.value = null;
      }

      await refreshStats();
      await refreshFolders();
      await refreshTags();
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const getItem = async (id: string): Promise<VaultItem | null> => {
    try {
      // Check if item is already in cache
      const cachedItem = items.value.find((item: VaultItem) => item.id === id);
      if (cachedItem) {
        selectedItem.value = cachedItem;
        return cachedItem;
      }

      // Fetch from service
      const item = await vaultService.getItem(id);
      if (item) {
        selectedItem.value = item;
        // Update cache if item exists
        const index = items.value.findIndex((existingItem: VaultItem) => existingItem.id === id);
        if (index !== -1) {
          items.value[index] = item;
        }
      }
      return item;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  };

  const selectItem = (item: VaultItem | null): void => {
    selectedItem.value = item;
  };

  const setSearchQuery = (query: string): void => {
    searchQuery.value = query;
  };

  const setFilters = (newFilters: VaultSearchFilters): void => {
    filters.value = { ...newFilters };
  };

  const clearFilters = (): void => {
    filters.value = {};
    searchQuery.value = '';
  };

  const addToFavorites = async (id: string): Promise<void> => {
    const item = items.value.find((item: VaultItem) => item.id === id);
    if (item) {
      await updateItem(id, { favorite: true });
    }
  };

  const removeFromFavorites = async (id: string): Promise<void> => {
    const item = items.value.find((item: VaultItem) => item.id === id);
    if (item) {
      await updateItem(id, { favorite: false });
    }
  };

  const moveToFolder = async (id: string, folder: string): Promise<void> => {
    await updateItem(id, { folder });
  };

  const addTags = async (id: string, newTags: string[]): Promise<void> => {
    const item = items.value.find((item: VaultItem) => item.id === id);
    if (item) {
      const updatedTags = [...new Set([...item.tags, ...newTags])];
      await updateItem(id, { tags: updatedTags });
    }
  };

  const removeTags = async (id: string, tagsToRemove: string[]): Promise<void> => {
    const item = items.value.find((item: VaultItem) => item.id === id);
    if (item) {
      const updatedTags = item.tags.filter((tag: string) => !tagsToRemove.includes(tag));
      await updateItem(id, { tags: updatedTags });
    }
  };

  const refreshStats = async (): Promise<void> => {
    try {
      stats.value = await vaultService.getVaultStats();
    } catch (err: any) {
      console.error('Failed to refresh vault stats:', err);
    }
  };

  const refreshFolders = async (): Promise<void> => {
    try {
      folders.value = await vaultService.getFolders();
    } catch (err: any) {
      console.error('Failed to refresh folders:', err);
    }
  };

  const refreshTags = async (): Promise<void> => {
    try {
      tags.value = await vaultService.getTags();
    } catch (err: any) {
      console.error('Failed to refresh tags:', err);
    }
  };

  const generatePassword = (options: {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
    excludeSimilar: boolean;
    excludeAmbiguous: boolean;
  }): string => {
    return vaultService.generatePassword(options);
  };

  const calculatePasswordStrength = (password: string): number => {
    return vaultService.calculatePasswordStrength(password);
  };

  const checkPasswordInBreach = async (_password: string): Promise<boolean> => {
    try {
      // This would integrate with HaveIBeenPwned API or similar
      // For now, return false
      return false;
    } catch {
      return false;
    }
  };

  // Enhanced search methods using workers
  const performFuzzySearch = async (query: string, options?: {
    threshold?: number;
    limit?: number;
    includeMatches?: boolean;
  }): Promise<VaultItem[]> => {
    try {
      return await vaultIntegration.fuzzySearch(query, options);
    } catch (error: any) {
      console.error('Fuzzy search failed:', error);
      // Fallback to regular search
      const searchConfig = options?.limit ? { maxResults: options.limit } : undefined;
      const searchResult = await vaultIntegration.search({ query }, searchConfig);
      return searchResult.items;
    }
  };

  const getSearchStatistics = async (): Promise<any> => {
    try {
      return await vaultIntegration.getSearchStatistics();
    } catch (error: any) {
      console.error('Failed to get search statistics:', error);
      return null;
    }
  };

  const rebuildSearchIndex = async (): Promise<void> => {
    try {
      await vaultIntegration.rebuildSearchIndex();
    } catch (error: any) {
      console.error('Failed to rebuild search index:', error);
      throw error;
    }
  };

  const getWorkerStatus = () => {
    return vaultIntegration.getWorkerStatus();
  };

  const isWorkerSearchAvailable = (): boolean => {
    return vaultIntegration.isWorkerSearchAvailable();
  };

  const exportVault = async (format: 'json' | 'csv'): Promise<string> => {
    try {
      if (format === 'json') {
        return JSON.stringify(
          {
            items: items.value,
            stats: stats.value,
            exportedAt: new Date().toISOString(),
            version: '1.0',
          },
          null,
          2
        );
      } else {
        // CSV export for basic data
        const csvHeaders = ['Name', 'Type', 'Folder', 'Tags', 'Created', 'Updated'];
        const csvRows = items.value.map((item: VaultItem) => [
          item.name,
          item.type,
          item.folder || '',
          item.tags.join(';'),
          item.createdAt.toISOString(),
          item.updatedAt.toISOString(),
        ]);

        return [csvHeaders, ...csvRows]
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
  };

  const refresh = async (): Promise<void> => {
    await Promise.all([loadItems(), refreshStats(), refreshFolders(), refreshTags()]);
  };

  // Initialize data on store creation
  const initialize = async (): Promise<void> => {
    await refresh();
  };

  return {
    // State
    items: computed(() => items.value),
    selectedItem: computed(() => selectedItem.value),
    searchQuery: computed(() => searchQuery.value),
    filters: computed(() => filters.value),
    stats: computed(() => stats.value),
    folders: computed(() => folders.value),
    tags: computed(() => tags.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    hasMore: computed(() => hasMore.value),

    // Computed
    filteredItems,
    itemsByType,
    passwordItems,
    noteItems,
    cardItems,
    identityItems,
    favoriteItems,
    recentItems,
    weakPasswords,
    compromisedPasswords,
    duplicatePasswords,
    securityScore,

    // Actions
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    getItem,
    selectItem,
    setSearchQuery,
    setFilters,
    clearFilters,
    addToFavorites,
    removeFromFavorites,
    moveToFolder,
    addTags,
    removeTags,
    refreshStats,
    refreshFolders,
    refreshTags,
    generatePassword,
    calculatePasswordStrength,
    checkPasswordInBreach,
    performFuzzySearch,
    getSearchStatistics,
    rebuildSearchIndex,
    getWorkerStatus,
    isWorkerSearchAvailable,
    exportVault,
    clearError,
    refresh,
    initialize,
  };
});
