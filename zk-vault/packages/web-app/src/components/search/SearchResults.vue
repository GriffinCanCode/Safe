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
            :class="{ 'active': viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="List view"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            class="view-mode-button"
            :class="{ 'active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Grid view"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
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
        <button
          class="export-button"
          @click="showExportDialog = true"
          title="Export results"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
    <div v-else-if="!isLoading && results.length === 0 && (hasQuery || hasFilters)" class="empty-state">
      <div class="empty-icon">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.239 0-4.236-.18-5.536-.485C5.68 14.344 5 13.542 5 12.6V8.4c0-.942.68-1.744 1.464-1.915C7.764 6.18 9.761 6 12 6s4.236.18 5.536.485C18.32 6.656 19 7.458 19 8.4v4.2c0 .942-.68 1.744-1.464 1.915z" />
        </svg>
      </div>
      <h3 class="empty-title">No results found</h3>
      <p class="empty-description">
        Try adjusting your search terms or filters to find what you're looking for.
      </p>
      <div class="empty-actions">
        <button class="clear-search-button" @click="clearSearch">
          Clear Search
        </button>
        <button class="add-item-button" @click="$emit('addItem')">
          Add New Item
        </button>
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
          :search-query="searchQuery"
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
          :disabled="isLoadingMore"
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
          <span class="stat-value">{{ formatSearchTime(searchTime) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Items Searched</span>
          <span class="stat-value">{{ itemsSearched.toLocaleString() }}</span>
        </div>
        <div class="stat-item" v-if="indexSize > 0">
          <span class="stat-label">Index Size</span>
          <span class="stat-value">{{ formatBytes(indexSize) }}</span>
        </div>
      </div>
    </div>

    <!-- Export Dialog -->
    <BaseModal v-if="showExportDialog" @close="showExportDialog = false">
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
          <button class="cancel-button" @click="showExportDialog = false">
            Cancel
          </button>
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
import { ref, computed, watch } from 'vue'
import { useSearch } from '@/store'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import SearchResultItem from './SearchResultItem.vue'
import type { DecryptedVaultItem } from '@/services/vault.service'

interface Props {
  results: DecryptedVaultItem[]
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  searchQuery?: string
  hasQuery?: boolean
  hasFilters?: boolean
  showStats?: boolean
  searchTime?: number
  itemsSearched?: number
  indexSize?: number
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
  indexSize: 0
})

const emit = defineEmits<{
  selectItem: [item: DecryptedVaultItem]
  editItem: [item: DecryptedVaultItem]
  deleteItem: [itemId: string]
  copyField: [data: { field: string; value: string }]
  toggleFavorite: [item: DecryptedVaultItem]
  loadMore: []
  addItem: []
  clearSearch: []
}>()

// Search composable
const { matches, exportResults } = useSearch()

// Local state
const viewMode = ref<'list' | 'grid'>('list')
const sortBy = ref('relevance')
const showExportDialog = ref(false)
const exportFormat = ref<'json' | 'csv'>('json')
const isExporting = ref(false)

// Computed
const gridClasses = computed(() => ({
  'results-list': viewMode.value === 'list',
  'results-grid-view': viewMode.value === 'grid'
}))

const sortedResults = computed(() => {
  const items = [...props.results]
  
  switch (sortBy.value) {
    case 'name':
      return items.sort((a, b) => a.name.localeCompare(b.name))
    case 'created':
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case 'modified':
      return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    case 'type':
      return items.sort((a, b) => a.type.localeCompare(b.type))
    case 'relevance':
    default:
      return items // Keep original order (relevance-sorted)
  }
})

// Methods
const getResultsTitle = (): string => {
  const count = props.results.length
  if (count === 0) return 'No results'
  if (count === 1) return '1 result found'
  return `${count.toLocaleString()} results found`
}

const getResultsSubtitle = (): string => {
  if (props.searchQuery && props.hasFilters) {
    return `for "${props.searchQuery}" with filters applied`
  } else if (props.searchQuery) {
    return `for "${props.searchQuery}"`
  } else if (props.hasFilters) {
    return 'with filters applied'
  }
  return ''
}

const getItemMatches = (itemId: string) => {
  return matches.value.filter((match: any) => match.itemId === itemId)
}

const sortResults = () => {
  // Sorting is handled by computed property
}

const clearSearch = () => {
  emit('clearSearch')
}

const handleExport = async () => {
  isExporting.value = true
  
  try {
    const data = await exportResults(exportFormat.value)
    
    // Create and download file
    const blob = new Blob([data], {
      type: exportFormat.value === 'json' ? 'application/json' : 'text/csv'
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `search-results-${new Date().toISOString().split('T')[0]}.${exportFormat.value}`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    showExportDialog.value = false
  } catch (error) {
    console.error('Export failed:', error)
    // TODO: Show error notification
  } finally {
    isExporting.value = false
  }
}

const formatSearchTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.search-results {
  @apply space-y-6;
}

.results-header {
  @apply flex items-start justify-between gap-4 flex-wrap;
}

.results-info {
  @apply flex-1 min-w-0;
}

.results-title {
  @apply text-2xl font-bold text-neutral-900;
}

.results-subtitle {
  @apply text-neutral-600 mt-1;
}

.results-actions {
  @apply flex items-center gap-3;
}

.view-mode-toggle {
  @apply flex border border-neutral-300 rounded-lg overflow-hidden;
}

.view-mode-button {
  @apply px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50;
  @apply transition-colors border-r border-neutral-300 last:border-r-0;
}

.view-mode-button.active {
  @apply bg-primary-100 text-primary-700;
}

.sort-select {
  @apply px-3 py-2 border border-neutral-300 rounded-lg bg-white text-neutral-900;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.export-button {
  @apply p-2 border border-neutral-300 rounded-lg text-neutral-600;
  @apply hover:text-neutral-900 hover:bg-neutral-50 transition-colors;
}

/* Loading State */
.loading-state {
  @apply flex flex-col items-center justify-center py-16 space-y-4;
}

.loading-text {
  @apply text-neutral-600 text-lg;
}

/* Empty State */
.empty-state {
  @apply flex flex-col items-center justify-center py-16 space-y-6;
}

.empty-icon {
  @apply text-neutral-400;
}

.empty-title {
  @apply text-2xl font-semibold text-neutral-900;
}

.empty-description {
  @apply text-neutral-600 text-center max-w-md;
}

.empty-actions {
  @apply flex items-center gap-3;
}

.clear-search-button {
  @apply px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700;
  @apply hover:bg-neutral-50 transition-colors;
}

.add-item-button {
  @apply px-4 py-2 bg-primary-600 text-white rounded-lg;
  @apply hover:bg-primary-700 transition-colors;
}

/* Results Container */
.results-container {
  @apply space-y-6;
}

.results-grid {
  @apply space-y-3;
}

.results-grid.results-grid-view {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0;
}

.load-more-container {
  @apply flex justify-center pt-6;
}

.load-more-button {
  @apply flex items-center gap-2 px-6 py-3 border border-neutral-300 rounded-lg;
  @apply hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Search Statistics */
.search-stats {
  @apply mt-8 p-4 bg-neutral-50 rounded-lg border border-neutral-200;
}

.stats-grid {
  @apply grid grid-cols-1 sm:grid-cols-3 gap-4;
}

.stat-item {
  @apply text-center;
}

.stat-label {
  @apply block text-xs text-neutral-500 font-medium uppercase tracking-wider;
}

.stat-value {
  @apply block text-lg font-semibold text-neutral-900 mt-1;
}

/* Export Dialog */
.export-options {
  @apply space-y-6;
}

.export-format {
  @apply space-y-3;
}

.export-label {
  @apply block text-sm font-medium text-neutral-700;
}

.format-options {
  @apply space-y-3;
}

.format-option {
  @apply flex items-start gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer;
  @apply hover:border-neutral-300 transition-colors;
}

.format-option input[type="radio"] {
  @apply mt-0.5;
}

.format-option span {
  @apply font-medium text-neutral-900;
}

.format-option small {
  @apply block text-neutral-500 text-xs mt-1;
}

.export-info {
  @apply p-3 bg-neutral-50 rounded-lg;
}

.export-description {
  @apply text-sm text-neutral-600;
}

.modal-actions {
  @apply flex items-center justify-end gap-3;
}

.cancel-button {
  @apply px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700;
  @apply hover:bg-neutral-50 transition-colors;
}

.export-confirm-button {
  @apply flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg;
  @apply hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .results-title {
    @apply text-neutral-100;
  }
  
  .results-subtitle {
    @apply text-neutral-400;
  }
  
  .view-mode-toggle {
    @apply border-neutral-600;
  }
  
  .view-mode-button {
    @apply text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 border-neutral-600;
  }
  
  .view-mode-button.active {
    @apply bg-primary-900 text-primary-100;
  }
  
  .sort-select,
  .export-button {
    @apply bg-neutral-800 border-neutral-600 text-neutral-100;
    @apply focus:border-primary-400 focus:ring-primary-400;
  }
  
  .loading-text {
    @apply text-neutral-400;
  }
  
  .empty-icon {
    @apply text-neutral-500;
  }
  
  .empty-title {
    @apply text-neutral-100;
  }
  
  .empty-description {
    @apply text-neutral-400;
  }
  
  .clear-search-button {
    @apply bg-neutral-700 border-neutral-600 text-neutral-300;
    @apply hover:bg-neutral-600;
  }
  
  .search-stats {
    @apply bg-neutral-800 border-neutral-600;
  }
  
  .stat-label {
    @apply text-neutral-400;
  }
  
  .stat-value {
    @apply text-neutral-100;
  }
}
</style> 