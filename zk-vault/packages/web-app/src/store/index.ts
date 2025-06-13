/**
 * @fileoverview Store Index
 * @description Central export for all Pinia stores
 */

// Store exports
export { useAuthStore } from './auth.store';
export { useVaultStore } from './vault.store';
export { useSearchStore } from './search.store';

// Composable exports
export { useAuth } from '@/composables/useAuth';
export { useVault } from '@/composables/useVault';
export { useSearch } from '@/composables/useSearch';

// Type exports from stores
export type { SearchFilters, SearchHistoryEntry, SearchSuggestion } from './search.store';

// Re-export Pinia for convenience
export { createPinia } from 'pinia';
