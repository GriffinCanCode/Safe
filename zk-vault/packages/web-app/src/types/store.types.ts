/**
 * @fileoverview Store Type Definitions
 * @responsibility Types for Pinia stores and state management
 */

import type { Ref, ComputedRef } from 'vue';

/**
 * Base store state
 */
export interface BaseStoreState {
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

/**
 * Store action result
 */
export interface StoreActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Async store action
 */
export type AsyncStoreAction<T = any, P = any> = (params?: P) => Promise<StoreActionResult<T>>;

/**
 * Store getter
 */
export type StoreGetter<T = any> = ComputedRef<T>;

/**
 * Store state ref
 */
export type StoreStateRef<T = any> = Ref<T>;

/**
 * Auth store state
 */
export interface AuthStoreState extends BaseStoreState {
  user: any | null;
  profile: any | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  sessionExpiry: Date | null;
  lastActivity: Date | null;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  permissions: string[];
  roles: string[];
}

/**
 * Auth store actions
 */
export interface AuthStoreActions {
  initialize: AsyncStoreAction<void>;
  login: AsyncStoreAction<any, { email: string; password: string; rememberMe?: boolean }>;
  register: AsyncStoreAction<any, any>;
  logout: AsyncStoreAction<void>;
  resetPassword: AsyncStoreAction<void, { email: string }>;
  updatePassword: AsyncStoreAction<void, { newPassword: string }>;
  updateProfile: AsyncStoreAction<any, Partial<any>>;
  deleteAccount: AsyncStoreAction<void>;
  enableBiometric: AsyncStoreAction<void>;
  disableBiometric: AsyncStoreAction<void>;
  authenticateWithBiometric: AsyncStoreAction<boolean>;
  enable2FA: AsyncStoreAction<string[]>;
  disable2FA: AsyncStoreAction<void>;
  sendEmailVerification: AsyncStoreAction<void>;
  refreshProfile: AsyncStoreAction<void>;
  updateActivity: () => void;
  clearError: () => void;
}

/**
 * Auth store getters
 */
export interface AuthStoreGetters {
  isLoggedIn: StoreGetter<boolean>;
  userDisplayName: StoreGetter<string>;
  userEmail: StoreGetter<string>;
  hasPermission: StoreGetter<(permission: string) => boolean>;
  hasRole: StoreGetter<(role: string) => boolean>;
  sessionTimeRemaining: StoreGetter<number>;
  isSessionExpired: StoreGetter<boolean>;
  securityLevel: StoreGetter<'low' | 'medium' | 'high'>;
}

/**
 * Vault store state
 */
export interface VaultStoreState extends BaseStoreState {
  items: any[];
  selectedItem: any | null;
  searchQuery: string;
  filters: any;
  stats: any | null;
  folders: string[];
  tags: string[];
  hasMore: boolean;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Vault store actions
 */
export interface VaultStoreActions {
  initialize: AsyncStoreAction<void>;
  loadItems: AsyncStoreAction<any[], { loadMore?: boolean }>;
  createItem: AsyncStoreAction<any, Omit<any, 'id' | 'createdAt' | 'updatedAt' | 'version'>>;
  updateItem: AsyncStoreAction<any, { id: string; updates: Partial<any> }>;
  deleteItem: AsyncStoreAction<void, { id: string }>;
  getItem: AsyncStoreAction<any | null, { id: string }>;
  selectItem: (item: any | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: any) => void;
  clearFilters: () => void;
  addToFavorites: AsyncStoreAction<void, { id: string }>;
  removeFromFavorites: AsyncStoreAction<void, { id: string }>;
  moveToFolder: AsyncStoreAction<void, { id: string; folder: string }>;
  addTags: AsyncStoreAction<void, { id: string; tags: string[] }>;
  removeTags: AsyncStoreAction<void, { id: string; tags: string[] }>;
  refreshStats: AsyncStoreAction<void>;
  refreshFolders: AsyncStoreAction<void>;
  refreshTags: AsyncStoreAction<void>;
  generatePassword: (options: any) => string;
  calculatePasswordStrength: (password: string) => number;
  checkPasswordInBreach: AsyncStoreAction<boolean, { password: string }>;
  exportVault: AsyncStoreAction<string, { format: 'json' | 'csv' }>;
  clearError: () => void;
  refresh: AsyncStoreAction<void>;
}

/**
 * Vault store getters
 */
export interface VaultStoreGetters {
  filteredItems: StoreGetter<any[]>;
  favoriteItems: StoreGetter<any[]>;
  recentItems: StoreGetter<any[]>;
  itemsByType: StoreGetter<Record<string, any[]>>;
  itemsByFolder: StoreGetter<Record<string, any[]>>;
  searchResults: StoreGetter<any[]>;
  hasItems: StoreGetter<boolean>;
  isEmpty: StoreGetter<boolean>;
  isFiltered: StoreGetter<boolean>;
  securityScore: StoreGetter<number>;
  weakPasswords: StoreGetter<any[]>;
  compromisedPasswords: StoreGetter<any[]>;
  duplicatePasswords: StoreGetter<any[]>;
}

/**
 * Files store state
 */
export interface FilesStoreState extends BaseStoreState {
  files: any[];
  selectedFiles: string[];
  searchQuery: string;
  filters: any;
  folders: string[];
  tags: string[];
  uploadProgress: Record<string, number>;
  hasMore: boolean;
  currentPage: number;
  pageSize: number;
  totalFiles: number;
  totalSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Files store actions
 */
export interface FilesStoreActions {
  initialize: AsyncStoreAction<void>;
  loadFiles: AsyncStoreAction<any[], { loadMore?: boolean }>;
  uploadFile: AsyncStoreAction<any, { file: File; options?: any }>;
  uploadMultipleFiles: AsyncStoreAction<any[], { files: FileList | File[]; options?: any }>;
  downloadFile: AsyncStoreAction<any, { fileId: string }>;
  getFile: AsyncStoreAction<any | null, { fileId: string }>;
  updateFile: AsyncStoreAction<any, { fileId: string; updates: Partial<any> }>;
  deleteFile: AsyncStoreAction<void, { fileId: string }>;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: any) => void;
  clearFilters: () => void;
  selectFile: (fileId: string) => void;
  deselectFile: (fileId: string) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  deleteSelectedFiles: AsyncStoreAction<void>;
  moveSelectedToFolder: AsyncStoreAction<void, { folder: string }>;
  addTagsToSelected: AsyncStoreAction<void, { tags: string[] }>;
  toggleFavorite: AsyncStoreAction<void, { fileId: string }>;
  shareFile: AsyncStoreAction<string, { fileId: string; shareSettings: any }>;
  unshareFile: AsyncStoreAction<void, { fileId: string }>;
  clearError: () => void;
  refresh: AsyncStoreAction<void>;
}

/**
 * Files store getters
 */
export interface FilesStoreGetters {
  filteredFiles: StoreGetter<any[]>;
  favoriteFiles: StoreGetter<any[]>;
  recentFiles: StoreGetter<any[]>;
  filesByType: StoreGetter<Record<string, any[]>>;
  filesByFolder: StoreGetter<Record<string, any[]>>;
  searchResults: StoreGetter<any[]>;
  hasFiles: StoreGetter<boolean>;
  isEmpty: StoreGetter<boolean>;
  isFiltered: StoreGetter<boolean>;
  selectedFileCount: StoreGetter<number>;
  totalSelectedSize: StoreGetter<number>;
  storageUsage: StoreGetter<{ used: number; total: number; percentage: number }>;
}

/**
 * Search store state
 */
export interface SearchStoreState extends BaseStoreState {
  query: string;
  filters: any;
  results: any[];
  matches: any[];
  suggestions: string[];
  history: any[];
  stats: any | null;
  recentQueries: string[];
  isIndexing: boolean;
  isSearching: boolean;
  indexError: string | null;
  config: any;
  searchMetrics: any | null;
}

/**
 * Search store actions
 */
export interface SearchStoreActions {
  initialize: AsyncStoreAction<void>;
  setQuery: (query: string) => void;
  setFilters: (filters: any) => void;
  updateFilter: <K extends keyof any>(key: K, value: any[K]) => void;
  removeFilter: (key: keyof any) => void;
  clearFilters: () => void;
  clearQuery: () => void;
  clearAll: () => void;
  search: AsyncStoreAction<void>;
  fuzzySearch: AsyncStoreAction<any[], { query?: string }>;
  buildIndex: AsyncStoreAction<void>;
  rebuildIndex: AsyncStoreAction<void>;
  clearIndex: AsyncStoreAction<void>;
  refreshStats: AsyncStoreAction<void>;
  updateItemInIndex: AsyncStoreAction<void, { item: any }>;
  removeItemFromIndex: AsyncStoreAction<void, { itemId: string }>;
  updateConfig: (config: Partial<any>) => void;
  generateSuggestions: AsyncStoreAction<void>;
  clearHistory: () => void;
  exportResults: AsyncStoreAction<string, { format: 'json' | 'csv' }>;
  clearError: () => void;
  refresh: AsyncStoreAction<void>;
}

/**
 * Search store getters
 */
export interface SearchStoreGetters {
  hasQuery: StoreGetter<boolean>;
  hasFilters: StoreGetter<boolean>;
  hasResults: StoreGetter<boolean>;
  isIndexAvailable: StoreGetter<boolean>;
  isEmpty: StoreGetter<boolean>;
  isActive: StoreGetter<boolean>;
  resultCount: StoreGetter<number>;
  hasMatches: StoreGetter<boolean>;
  filteredSuggestions: StoreGetter<string[]>;
  appliedFiltersCount: StoreGetter<number>;
  recentSearches: StoreGetter<any[]>;
  popularSearches: StoreGetter<any[]>;
}

/**
 * Settings store state
 */
export interface SettingsStoreState extends BaseStoreState {
  theme: 'auto' | 'light' | 'dark';
  language: string;
  autoLockTimeout: number;
  clipboardTimeout: number;
  notifications: {
    security: boolean;
    updates: boolean;
  };
  biometricEnabled: boolean;
  failedLoginProtection: boolean;
  autoBackup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retention: number;
  };
}

/**
 * Settings store actions
 */
export interface SettingsStoreActions {
  initialize: AsyncStoreAction<void>;
  loadSettings: AsyncStoreAction<void>;
  updateSettings: AsyncStoreAction<void, Partial<any>>;
  setSetting: <K extends keyof any>(key: K, value: any[K]) => void;
  resetSettings: AsyncStoreAction<void>;
  exportSettings: AsyncStoreAction<string>;
  importSettings: AsyncStoreAction<void, { settings: string }>;
  clearError: () => void;
}

/**
 * Settings store getters
 */
export interface SettingsStoreGetters {
  isDarkMode: StoreGetter<boolean>;
  isLightMode: StoreGetter<boolean>;
  isAutoTheme: StoreGetter<boolean>;
  currentLanguage: StoreGetter<string>;
  autoLockEnabled: StoreGetter<boolean>;
  clipboardClearEnabled: StoreGetter<boolean>;
  securityNotificationsEnabled: StoreGetter<boolean>;
  updateNotificationsEnabled: StoreGetter<boolean>;
  autoBackupEnabled: StoreGetter<boolean>;
}

/**
 * Store composition
 */
export type StoreComposition<S, A, G> = S & A & G;

/**
 * Store plugin
 */
export interface StorePlugin {
  name: string;
  install: (store: any) => void;
  uninstall?: (store: any) => void;
}

/**
 * Store middleware
 */
export interface StoreMiddleware {
  name: string;
  before?: (action: string, params: any, store: any) => void | Promise<void>;
  after?: (action: string, result: any, store: any) => void | Promise<void>;
  error?: (action: string, error: Error, store: any) => void | Promise<void>;
}

/**
 * Store persistence options
 */
export interface StorePersistenceOptions {
  key: string;
  storage: 'localStorage' | 'sessionStorage' | 'indexedDB';
  paths?: string[];
  beforeRestore?: (state: any) => any;
  afterRestore?: (state: any) => void;
  serializer?: {
    serialize: (value: any) => string;
    deserialize: (value: string) => any;
  };
}

/**
 * Store subscription
 */
export interface StoreSubscription {
  id: string;
  callback: (mutation: any, state: any) => void;
  options?: {
    immediate?: boolean;
    deep?: boolean;
  };
}

/**
 * Store mutation
 */
export interface StoreMutation {
  type: string;
  payload: any;
  timestamp: Date;
  storeId: string;
}

/**
 * Store devtools integration
 */
export interface StoreDevtools {
  enabled: boolean;
  logActions: boolean;
  logMutations: boolean;
  logSubscriptions: boolean;
  inspector: boolean;
  timeline: boolean;
} 