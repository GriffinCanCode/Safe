/**
 * @fileoverview Vault Composable
 * @description Provides reactive vault state and methods for Vue components
 */

import { ref, computed, onMounted, watch } from 'vue';
import {
  vaultService,
  type VaultItem,
  type VaultStats,
  type VaultSearchFilters,
  type VaultItemType,
  type PasswordVaultItem,
  type NoteVaultItem,
  type CardVaultItem,
  type IdentityVaultItem,
  type DecryptedVaultItem,
} from '@/services/vault.service';
import { useVaultStore } from '@/store/vault.store';

export interface UseVaultOptions {
  autoLoad?: boolean;
  filters?: VaultSearchFilters;
  pageSize?: number;
}

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
}

export interface VaultItemInput {
  type: VaultItemType;
  name: string;
  folder?: string | undefined;
  tags?: string[];
  favorite?: boolean;
  [key: string]: any;
}

export function useVault(options: UseVaultOptions = {}) {
  const vaultStore = useVaultStore();

  // Local state
  const isInitializing = ref(true);
  const vaultError = ref<string | null>(null);
  const searchQuery = ref(options.filters?.query || '');
  const currentFilters = ref<VaultSearchFilters>(options.filters || {});

  // Computed properties from store
  const items = computed(() => vaultStore.items);
  const selectedItem = computed(() => vaultStore.selectedItem);
  const stats = computed(() => vaultStore.stats);
  const folders = computed(() => vaultStore.folders);
  const tags = computed(() => vaultStore.tags);
  const isLoading = computed(() => vaultStore.isLoading);
  const hasMore = computed(() => vaultStore.hasMore);
  const filteredItems = computed(() => vaultStore.filteredItems);
  const itemsByType = computed(() => vaultStore.itemsByType);
  const passwordItems = computed(() => vaultStore.passwordItems);
  const noteItems = computed(() => vaultStore.noteItems);
  const cardItems = computed(() => vaultStore.cardItems);
  const identityItems = computed(() => vaultStore.identityItems);
  const favoriteItems = computed(() => vaultStore.favoriteItems);
  const recentItems = computed(() => vaultStore.recentItems);
  const weakPasswords = computed(() => vaultStore.weakPasswords);
  const compromisedPasswords = computed(() => vaultStore.compromisedPasswords);
  const duplicatePasswords = computed(() => vaultStore.duplicatePasswords);
  const securityScore = computed(() => vaultStore.securityScore);

  // Item management methods
  const createItem = async (itemData: VaultItemInput): Promise<VaultItem> => {
    try {
      vaultError.value = null;
      const item = await vaultStore.createItem(itemData as any);
      return item;
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const updateItem = async (id: string, updates: Partial<VaultItem>): Promise<VaultItem> => {
    try {
      vaultError.value = null;
      return await vaultStore.updateItem(id, updates);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.deleteItem(id);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const getItem = async (id: string): Promise<VaultItem | null> => {
    try {
      vaultError.value = null;
      return await vaultStore.getItem(id);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const selectItem = (item: VaultItem | null): void => {
    vaultStore.selectItem(item);
  };

  // Search and filtering
  const setSearchQuery = (query: string): void => {
    searchQuery.value = query;
    vaultStore.setSearchQuery(query);
  };

  const setFilters = (filters: VaultSearchFilters): void => {
    currentFilters.value = { ...filters };
    vaultStore.setFilters(filters);
  };

  const clearFilters = (): void => {
    currentFilters.value = {};
    searchQuery.value = '';
    vaultStore.clearFilters();
  };

  const searchItems = async (query?: string, filters?: VaultSearchFilters): Promise<void> => {
    try {
      vaultError.value = null;
      if (query !== undefined) {
        setSearchQuery(query);
      }
      if (filters) {
        setFilters(filters);
      }
      await vaultStore.loadItems();
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const loadMoreItems = async (): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.loadItems(true);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  // Favorites management
  const addToFavorites = async (id: string): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.addToFavorites(id);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const removeFromFavorites = async (id: string): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.removeFromFavorites(id);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const toggleFavorite = async (id: string): Promise<void> => {
    const item = items.value.find((i: VaultItem) => i.id === id);
    if (item) {
      if (item.favorite) {
        await removeFromFavorites(id);
      } else {
        await addToFavorites(id);
      }
    }
  };

  // Folder and tag management
  const moveToFolder = async (id: string, folder: string): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.moveToFolder(id, folder);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const addTags = async (id: string, newTags: string[]): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.addTags(id, newTags);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const removeTags = async (id: string, tagsToRemove: string[]): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.removeTags(id, tagsToRemove);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  // Password-specific methods
  const generatePassword = (options: PasswordGeneratorOptions): string => {
    try {
      return vaultStore.generatePassword(options);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const calculatePasswordStrength = (password: string): number => {
    return vaultStore.calculatePasswordStrength(password);
  };

  const checkPasswordInBreach = async (password: string): Promise<boolean> => {
    try {
      return await vaultStore.checkPasswordInBreach(password);
    } catch (error: any) {
      vaultError.value = error.message;
      return false;
    }
  };

  // Specialized item creation methods
  const createPasswordItem = async (data: {
    name: string;
    username: string;
    password: string;
    website?: string;
    notes?: string;
    totpSecret?: string;
    customFields?: Record<string, string>;
    folder?: string;
    tags?: string[];
    favorite?: boolean;
  }): Promise<PasswordVaultItem> => {
    const passwordStrength = calculatePasswordStrength(data.password);
    const isCompromised = await checkPasswordInBreach(data.password);

    const item: VaultItemInput = {
      type: 'password',
      name: data.name,
      username: data.username,
      password: data.password,
      website: data.website,
      notes: data.notes,
      totpSecret: data.totpSecret,
      customFields: data.customFields || {},
      folder: data.folder,
      tags: data.tags || [],
      favorite: data.favorite || false,
      metadata: {
        strength: passwordStrength,
        compromised: isCompromised,
        lastPasswordChange: new Date(),
        autoFill: true,
      },
    };

    return (await createItem(item)) as PasswordVaultItem;
  };

  const createNoteItem = async (data: {
    name: string;
    content: string;
    notes?: string;
    folder?: string;
    tags?: string[];
    favorite?: boolean;
  }): Promise<NoteVaultItem> => {
    const item: VaultItemInput = {
      type: 'note',
      name: data.name,
      content: data.content,
      notes: data.notes,
      folder: data.folder,
      tags: data.tags || [],
      favorite: data.favorite || false,
    };

    return (await createItem(item)) as NoteVaultItem;
  };

  const createCardItem = async (data: {
    name: string;
    cardholderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    folder?: string;
    tags?: string[];
    favorite?: boolean;
  }): Promise<CardVaultItem> => {
    const currentYear = new Date().getFullYear();
    const expiryYear = parseInt(data.expiryYear);
    const expiryMonth = parseInt(data.expiryMonth);
    const currentMonth = new Date().getMonth() + 1;

    const isExpired =
      expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth);

    // Detect card brand from number
    const cardNumber = data.number.replace(/\s/g, '');
    let brand = 'unknown';
    if (/^4/.test(cardNumber)) brand = 'visa';
    else if (/^5[1-5]/.test(cardNumber)) brand = 'mastercard';
    else if (/^3[47]/.test(cardNumber)) brand = 'amex';
    else if (/^6/.test(cardNumber)) brand = 'discover';

    const item: VaultItemInput = {
      type: 'card',
      name: data.name,
      cardholderName: data.cardholderName,
      number: data.number,
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      cvv: data.cvv,
      folder: data.folder,
      tags: data.tags || [],
      favorite: data.favorite || false,
      metadata: {
        brand,
        expired: isExpired,
      },
    };

    return (await createItem(item)) as CardVaultItem;
  };

  const createIdentityItem = async (data: {
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    folder?: string;
    tags?: string[];
    favorite?: boolean;
  }): Promise<IdentityVaultItem> => {
    const item: VaultItemInput = {
      type: 'identity',
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      folder: data.folder,
      tags: data.tags || [],
      favorite: data.favorite || false,
    };

    return (await createItem(item)) as IdentityVaultItem;
  };

  // Bulk operations
  const deleteMultipleItems = async (ids: string[]): Promise<void> => {
    try {
      vaultError.value = null;
      await Promise.all(ids.map(id => vaultStore.deleteItem(id)));
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const moveMultipleToFolder = async (ids: string[], folder: string): Promise<void> => {
    try {
      vaultError.value = null;
      await Promise.all(ids.map(id => vaultStore.moveToFolder(id, folder)));
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const addTagsToMultiple = async (ids: string[], tags: string[]): Promise<void> => {
    try {
      vaultError.value = null;
      await Promise.all(ids.map(id => vaultStore.addTags(id, tags)));
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  // Export functionality
  const exportVault = async (format: 'json' | 'csv' = 'json'): Promise<string> => {
    try {
      vaultError.value = null;
      return await vaultStore.exportVault(format);
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  // Statistics and analytics
  const refreshStats = async (): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.refreshStats();
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const getSecurityInsights = () => {
    return {
      totalItems: stats.value?.totalItems || 0,
      securityScore: securityScore.value,
      weakPasswords: weakPasswords.value.length,
      compromisedPasswords: compromisedPasswords.value.length,
      duplicatePasswords: duplicatePasswords.value.length,
      averagePasswordStrength: stats.value?.averagePasswordStrength || 0,
      recommendations: getSecurityRecommendations(),
    };
  };

  const getSecurityRecommendations = (): string[] => {
    const recommendations: string[] = [];

    if (weakPasswords.value.length > 0) {
      recommendations.push(`Strengthen ${weakPasswords.value.length} weak passwords`);
    }

    if (compromisedPasswords.value.length > 0) {
      recommendations.push(`Change ${compromisedPasswords.value.length} compromised passwords`);
    }

    if (duplicatePasswords.value.length > 0) {
      recommendations.push(`Replace ${duplicatePasswords.value.length} duplicate passwords`);
    }

    if (passwordItems.value.length > 0) {
      const withoutTOTP = passwordItems.value.filter(
        (p: PasswordVaultItem) => !p.totpSecret
      ).length;
      if (withoutTOTP > 0) {
        recommendations.push(`Enable 2FA for ${withoutTOTP} accounts`);
      }
    }

    return recommendations;
  };

  // Utility methods
  const clearError = (): void => {
    vaultError.value = null;
    vaultStore.clearError();
  };

  const refresh = async (): Promise<void> => {
    try {
      vaultError.value = null;
      await vaultStore.refresh();
    } catch (error: any) {
      vaultError.value = error.message;
      throw error;
    }
  };

  const initialize = async (): Promise<void> => {
    try {
      isInitializing.value = true;
      vaultError.value = null;

      if (options.autoLoad !== false) {
        await vaultStore.initialize();
      }
    } catch (error: any) {
      console.error('Failed to initialize vault:', error);
      vaultError.value = error.message;
    } finally {
      isInitializing.value = false;
    }
  };

  // Watch for filter changes
  watch(
    () => currentFilters.value,
    (newFilters: VaultSearchFilters) => {
      vaultStore.setFilters(newFilters);
    },
    { deep: true }
  );

  watch(
    () => searchQuery.value,
    (newQuery: string) => {
      vaultStore.setSearchQuery(newQuery);
    }
  );

  // Lifecycle hooks
  onMounted(() => {
    initialize();
  });

  return {
    // State
    items,
    selectedItem,
    stats,
    folders,
    tags,
    isLoading,
    isInitializing,
    hasMore,
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
    searchQuery,
    currentFilters,
    vaultError,

    // Methods
    createItem,
    updateItem,
    deleteItem,
    getItem,
    selectItem,
    setSearchQuery,
    setFilters,
    clearFilters,
    searchItems,
    loadMoreItems,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    moveToFolder,
    addTags,
    removeTags,
    generatePassword,
    calculatePasswordStrength,
    checkPasswordInBreach,
    createPasswordItem,
    createNoteItem,
    createCardItem,
    createIdentityItem,
    deleteMultipleItems,
    moveMultipleToFolder,
    addTagsToMultiple,
    exportVault,
    refreshStats,
    getSecurityInsights,
    getSecurityRecommendations,
    clearError,
    refresh,
    initialize,
  };
}
