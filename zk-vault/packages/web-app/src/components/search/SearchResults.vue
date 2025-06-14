<template>
  <div class="search-results">
    <!-- Results Header -->
    <div class="results-header" v-if="!isLoading || results.length > 0">
      <div class="results-info">
        <h2 class="results-title">
          {{ isLoading ? 'Searching...' : getResultsTitle() }}
        </h2>
        <p class="results-subtitle" v-if="!isLoading">
          {{ getResultsSubtitle() }}
        </p>
      </div>

      <div class="results-actions" v-if="!isLoading && results.length > 0">
        <!-- View Mode Toggle -->
        <div class="view-mode-toggle">
          <button
            class="view-mode-button"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="List view"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>
          <button
            class="view-mode-button"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Grid view"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
          </button>
        </div>

        <!-- Sort Options -->
        <select v-model="sortBy" class="sort-select" @change="sortResults">
          <option value="relevance">Sort by Relevance</option>
          <option value="name">Sort by Name</option>
          <option value="created">Sort by Created Date</option>
          <option value="modified">Sort by Modified Date</option>
          <option value="type">Sort by Type</option>
        </select>

        <!-- Export Button -->
        <button class="export-button" @click="showExportDialog = true" title="Export results">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && results.length === 0" class="loading-state">
      <LoadingSpinner size="lg" />
      <p class="loading-text">Searching your vault...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!isLoading && results.length === 0 && (hasQuery || hasFilters)"
      class="empty-state"
    >
      <div class="empty-icon">
        <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.239 0-4.236-.18-5.536-.485C5.68 14.344 5 13.542 5 12.6V8.4c0-.942.68-1.744 1.464-1.915C7.764 6.18 9.761 6 12 6s4.236.18 5.536.485C18.32 6.656 19 7.458 19 8.4v4.2c0 .942-.68 1.744-1.464 1.915z"
          />
        </svg>
      </div>
      <h3 class="empty-title">No results found</h3>
      <p class="empty-description">
        Try adjusting your search terms or filters to find what you're looking for.
      </p>
      <div class="empty-actions">
        <button class="clear-search-button" @click="clearSearch">Clear Search</button>
        <button class="add-item-button" @click="$emit('addItem')">Add New Item</button>
      </div>
    </div>

    <!-- Results List/Grid -->
    <div v-else-if="sortedResults.length > 0" class="results-container">
      <div class="results-grid" :class="gridClasses">
        <SearchResultItem
          v-for="item in sortedResults"
          :key="item.id"
          :item="item"
          :view-mode="viewMode"
          :search-query="searchQuery || ''"
          :matches="getItemMatches(item.id)"
          @select="$emit('selectItem', item)"
          @edit="$emit('editItem', item)"
          @delete="$emit('deleteItem', item.id)"
          @copy="$emit('copyField', $event)"
          @toggle-favorite="$emit('toggleFavorite', item)"
        />
      </div>

      <!-- Load More Button -->
      <div v-if="hasMore" class="load-more-container">
        <button
          class="load-more-button"
          @click="$emit('loadMore')"
          :disabled="isLoadingMore || false"
        >
          <LoadingSpinner v-if="isLoadingMore" size="sm" />
          <span>{{ isLoadingMore ? 'Loading...' : 'Load More Results' }}</span>
        </button>
      </div>
    </div>

    <!-- Search Statistics -->
    <div v-if="showStats && !isLoading" class="search-stats">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Search Time</span>
          <span class="stat-value">{{ formatSearchTime(searchTime || 0) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Items Searched</span>
          <span class="stat-value">{{ (itemsSearched || 0).toLocaleString() }}</span>
        </div>
        <div class="stat-item" v-if="(indexSize || 0) > 0">
          <span class="stat-label">Index Size</span>
          <span class="stat-value">{{ formatBytes(indexSize || 0) }}</span>
        </div>
      </div>
    </div>

    <!-- Export Dialog -->
    <BaseModal v-model="showExportDialog">
      <template #header>
        <h3>Export Search Results</h3>
      </template>

      <template #default>
        <div class="export-options">
          <div class="export-format">
            <label class="export-label">Export Format</label>
            <div class="format-options">
              <label class="format-option">
                <input type="radio" v-model="exportFormat" value="json" />
                <span>JSON</span>
                <small>Complete data structure</small>
              </label>
              <label class="format-option">
                <input type="radio" v-model="exportFormat" value="csv" />
                <span>CSV</span>
                <small>Spreadsheet compatible</small>
              </label>
            </div>
          </div>

          <div class="export-info">
            <p class="export-description">
              Export {{ results.length }} search results as {{ exportFormat.toUpperCase() }} file.
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="modal-actions">
          <button class="cancel-button" @click="showExportDialog = false">Cancel</button>
          <button class="export-confirm-button" @click="handleExport" :disabled="isExporting">
            <LoadingSpinner v-if="isExporting" size="sm" />
            <span>{{ isExporting ? 'Exporting...' : 'Export' }}</span>
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSearch } from '@/store';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import SearchResultItem from './SearchResultItem.vue';
import type { DecryptedVaultItem } from '@/services/vault.service';

interface Props {
  results: DecryptedVaultItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  searchQuery?: string;
  hasQuery?: boolean;
  hasFilters?: boolean;
  showStats?: boolean;
  searchTime?: number;
  itemsSearched?: number;
  indexSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  searchQuery: '',
  hasQuery: false,
  hasFilters: false,
  showStats: false,
  searchTime: 0,
  itemsSearched: 0,
  indexSize: 0,
});

const emit = defineEmits<{
  selectItem: [item: DecryptedVaultItem];
  editItem: [item: DecryptedVaultItem];
  deleteItem: [itemId: string];
  copyField: [data: { field: string; value: string }];
  toggleFavorite: [item: DecryptedVaultItem];
  loadMore: [];
  addItem: [];
  clearSearch: [];
}>();

// Search composable
const { matches, exportResults } = useSearch();

// Local state
const viewMode = ref<'list' | 'grid'>('list');
const sortBy = ref('relevance');
const showExportDialog = ref(false);
const exportFormat = ref<'json' | 'csv'>('json');
const isExporting = ref(false);

// Computed
const gridClasses = computed(() => ({
  'results-list': viewMode.value === 'list',
  'results-grid-view': viewMode.value === 'grid',
}));

const sortedResults = computed(() => {
  const items = [...props.results];

  switch (sortBy.value) {
    case 'name':
      return items.sort((a, b) => a.name.localeCompare(b.name));
    case 'created':
      return items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'modified':
      return items.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    case 'type':
      return items.sort((a, b) => a.type.localeCompare(b.type));
    case 'relevance':
    default:
      return items; // Keep original order (relevance-sorted)
  }
});

// Methods
const getResultsTitle = (): string => {
  const count = props.results.length;
  if (count === 0) return 'No results';
  if (count === 1) return '1 result found';
  return `${count.toLocaleString()} results found`;
};

const getResultsSubtitle = (): string => {
  if (props.searchQuery && props.hasFilters) {
    return `for "${props.searchQuery}" with filters applied`;
  } else if (props.searchQuery) {
    return `for "${props.searchQuery}"`;
  } else if (props.hasFilters) {
    return 'with filters applied';
  }
  return '';
};

const getItemMatches = (itemId: string) => {
  return matches.value.filter((match: any) => match.itemId === itemId);
};

const sortResults = () => {
  // Sorting is handled by computed property
};

const clearSearch = () => {
  emit('clearSearch');
};

const handleExport = async () => {
  isExporting.value = true;

  try {
    const data = await exportResults(exportFormat.value);

    // Create and download file
    const blob = new Blob([data], {
      type: exportFormat.value === 'json' ? 'application/json' : 'text/csv',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search-results-${new Date().toISOString().split('T')[0]}.${exportFormat.value}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    showExportDialog.value = false;
  } catch (error) {
    console.error('Export failed:', error);
    // TODO: Show error notification
  } finally {
    isExporting.value = false;
  }
};

const formatSearchTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
</script>

<!-- CSS classes are now defined in /styles/components/search/search-results.css -->
