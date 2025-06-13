<template>
  <div class="search-view">
    <!-- Search Header -->
    <div class="search-header">
      <div class="header-content">
        <h1 class="page-title">Search Your Vault</h1>
        <p class="page-subtitle">Find passwords, notes, cards, and identities quickly and efficiently</p>
      </div>
    </div>

    <!-- Main Search Bar -->
    <div class="main-search-container">
      <SearchBar
        size="lg"
        placeholder="Search for passwords, notes, cards, identities..."
        :show-filter-toggle="true"
        :auto-search="true"
        @search="handleSearch"
        @suggestion-selected="handleSuggestionSelected"
        @recent-search-selected="handleRecentSearchSelected"
        ref="mainSearchBar"
      />
    </div>

    <!-- Quick Search Categories -->
    <div class="quick-search-section" v-if="isEmpty && !isActive">
      <h2 class="section-title">Quick Search</h2>
      <div class="quick-search-grid">
        <button
          v-for="category in quickSearchCategories"
          :key="category.type"
          class="quick-search-card"
          @click="handleQuickSearch(category)"
        >
          <div class="quick-search-icon">
            <component :is="category.icon" class="icon" />
          </div>
          <div class="quick-search-content">
            <h3 class="quick-search-title">{{ category.title }}</h3>
            <p class="quick-search-description">{{ category.description }}</p>
            <span class="quick-search-count">{{ category.count }} items</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Search Shortcuts -->
    <div class="search-shortcuts" v-if="isEmpty && !isActive">
      <h2 class="section-title">Search Shortcuts</h2>
      <div class="shortcuts-grid">
        <button
          v-for="shortcut in searchShortcuts"
          :key="shortcut.label"
          class="shortcut-button"
          @click="handleShortcut(shortcut)"
        >
          <div class="shortcut-icon">
            <component :is="shortcut.icon" class="icon" />
          </div>
          <span class="shortcut-label">{{ shortcut.label }}</span>
        </button>
      </div>
    </div>

    <!-- Recent Searches -->
    <div class="recent-searches-section" v-if="recentSearches.length > 0 && isEmpty && !isActive">
      <div class="section-header">
        <h2 class="section-title">Recent Searches</h2>
        <button class="clear-history-button" @click="clearSearchHistory">
          Clear History
        </button>
      </div>
      <div class="recent-searches-list">
        <button
          v-for="search in recentSearches.slice(0, 5)"
          :key="search.id"
          class="recent-search-item"
          @click="handleRecentSearch(search)"
        >
          <div class="recent-search-content">
            <div class="recent-search-query">
              {{ search.query || 'Advanced Search' }}
            </div>
            <div class="recent-search-meta">
              {{ search.resultCount }} results • {{ formatDate(search.timestamp) }}
            </div>
          </div>
          <div class="recent-search-filters" v-if="hasActiveFilters(search.filters)">
            <span class="filter-badge">{{ getFilterCount(search.filters) }} filters</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Search Results -->
    <SearchResults
      v-if="isActive"
      :results="results"
      :is-loading="isLoading"
      :is-loading-more="isLoadingMore"
      :has-more="hasMore"
      :search-query="query"
      :has-query="hasQuery"
      :has-filters="hasFilters"
      :show-stats="true"
      :search-time="searchMetrics.lastSearchTime"
      :items-searched="searchMetrics.totalResults"
      :index-size="0"
      @select-item="handleSelectItem"
      @edit-item="handleEditItem"
      @delete-item="handleDeleteItem"
      @copy-field="handleCopyField"
      @toggle-favorite="handleToggleFavorite"
      @load-more="handleLoadMore"
      @add-item="handleAddItem"
      @clear-search="handleClearSearch"
    />

    <!-- Search Tips -->
    <div class="search-tips" v-if="isEmpty && !isActive">
      <h2 class="section-title">Search Tips</h2>
      <div class="tips-grid">
        <div class="tip-card">
          <div class="tip-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div class="tip-content">
            <h3 class="tip-title">Basic Search</h3>
            <p class="tip-description">Search by name, username, URL, or notes content</p>
          </div>
        </div>

        <div class="tip-card">
          <div class="tip-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div class="tip-content">
            <h3 class="tip-title">Filter by Tags</h3>
            <p class="tip-description">Use filters to search by tags, folders, or item types</p>
          </div>
        </div>

        <div class="tip-card">
          <div class="tip-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div class="tip-content">
            <h3 class="tip-title">Smart Suggestions</h3>
            <p class="tip-description">Get intelligent search suggestions as you type</p>
          </div>
        </div>

        <div class="tip-card">
          <div class="tip-icon">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="tip-content">
            <h3 class="tip-title">Fast Performance</h3>
            <p class="tip-description">Powered by web workers for lightning-fast search</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Analytics (for development) -->
    <div class="search-analytics" v-if="showAnalytics && stats">
      <h2 class="section-title">Search Analytics</h2>
      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-value">{{ stats.totalItems }}</div>
          <div class="analytics-label">Total Items Indexed</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-value">{{ searchMetrics.totalSearches }}</div>
          <div class="analytics-label">Total Searches</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-value">{{ formatSearchTime(searchMetrics.averageSearchTime) }}</div>
          <div class="analytics-label">Average Search Time</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-value">{{ isIndexAvailable ? 'Ready' : 'Building' }}</div>
          <div class="analytics-label">Search Index Status</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearch, useVault } from '@/store'
import SearchBar from '@/components/search/SearchBar.vue'
import SearchResults from '@/components/search/SearchResults.vue'
import type { SearchFilters, SearchHistoryEntry, SearchSuggestion } from '@/store/search.store'
import type { DecryptedVaultItem } from '@/services/vault.service'

// Router
const route = useRoute()
const router = useRouter()

// Search composable
const {
  query,
  results,
  isLoading,
  hasQuery,
  hasFilters,
  isEmpty,
  isActive,
  recentSearches,
  stats,
  searchMetrics,
  isIndexAvailable,
  setQuery,
  setFilters,
  search,
  clearHistory,
  clearAll
} = useSearch({
  autoSearch: true,
  debounceMs: 300
})

// Vault composable for stats
const { stats: vaultStats } = useVault()

// Local state
const mainSearchBar = ref<any>(null)
const isLoadingMore = ref(false)
const showAnalytics = ref(false) // Set to true for development
const hasMore = ref(false) // Add hasMore as local state since it's not in the search store

// Quick search categories
const quickSearchCategories = computed(() => [
  {
    type: 'password',
    title: 'Passwords',
    description: 'Login credentials and passwords',
    count: vaultStats.value?.itemsByType.password || 0,
    icon: {
      template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" /></svg>`
    }
  },
  {
    type: 'note',
    title: 'Secure Notes',
    description: 'Private notes and documents',
    count: vaultStats.value?.itemsByType.note || 0,
    icon: {
      template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>`
    }
  },
  {
    type: 'card',
    title: 'Payment Cards',
    description: 'Credit and debit cards',
    count: vaultStats.value?.itemsByType.card || 0,
    icon: {
      template: `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" /></svg>`
    }
  },
  {
    type: 'identity',
    title: 'Identities',
    description: 'Personal information and contacts',
    count: vaultStats.value?.itemsByType.identity || 0,
    icon: {
      template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>`
    }
  }
])

// Search shortcuts
const searchShortcuts = [
  {
    label: 'Favorites',
    icon: {
      template: `<svg fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`
    },
    filters: { favorite: true }
  },
  {
    label: 'Weak Passwords',
    icon: {
      template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`
    },
    filters: { type: 'password', strength: { max: 2 } }
  },
  {
    label: 'Recent Items',
    icon: {
      template: `<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>`
    },
    filters: { 
      dateRange: { 
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    }
  }
]

// Methods
const handleSearch = async (searchQuery: string, searchFilters: SearchFilters) => {
  // Update URL without navigation
  const queryParams: any = {}
  if (searchQuery) queryParams.q = searchQuery
  if (Object.keys(searchFilters).length > 0) {
    queryParams.filters = JSON.stringify(searchFilters)
  }
  
  await router.replace({ query: queryParams })
}

const handleQuickSearch = (category: any) => {
  setFilters({ type: category.type })
  search()
}

const handleShortcut = (shortcut: any) => {
  setFilters(shortcut.filters)
  search()
}

const handleRecentSearch = (searchEntry: SearchHistoryEntry) => {
  setQuery(searchEntry.query)
  setFilters(searchEntry.filters)
  search()
}

const handleSuggestionSelected = (suggestion: SearchSuggestion) => {
  // Auto-handled by SearchBar
}

const handleRecentSearchSelected = (search: SearchHistoryEntry) => {
  // Auto-handled by SearchBar
}

const handleSelectItem = (item: DecryptedVaultItem) => {
  // Navigate to item details or open in modal
  console.log('Select item:', item)
}

const handleEditItem = (item: DecryptedVaultItem) => {
  // Open edit modal or navigate to edit page
  console.log('Edit item:', item)
}

const handleDeleteItem = (itemId: string) => {
  // Confirm and delete item
  console.log('Delete item:', itemId)
}

const handleCopyField = (data: { field: string; value: string }) => {
  // Copy to clipboard
  navigator.clipboard.writeText(data.value)
  console.log(`Copied ${data.field}:`, data.value)
}

const handleToggleFavorite = (item: DecryptedVaultItem) => {
  // Toggle favorite status
  console.log('Toggle favorite:', item)
}

const handleLoadMore = () => {
  isLoadingMore.value = true
  // Load more results
  setTimeout(() => {
    isLoadingMore.value = false
  }, 1000)
}

const handleAddItem = () => {
  // Navigate to add item page
  router.push('/vault/add')
}

const handleClearSearch = () => {
  clearAll()
  router.replace({ query: {} })
}

const clearSearchHistory = () => {
  clearHistory()
}

const hasActiveFilters = (searchFilters: SearchFilters): boolean => {
  return Object.keys(searchFilters).length > 0
}

const getFilterCount = (searchFilters: SearchFilters): number => {
  return Object.keys(searchFilters).length
}

const formatDate = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

const formatSearchTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// Initialize from URL parameters
onMounted(() => {
  const urlQuery = route.query.q as string
  const urlFilters = route.query.filters as string
  
  if (urlQuery) {
    setQuery(urlQuery)
  }
  
  if (urlFilters) {
    try {
      const filters = JSON.parse(urlFilters)
      setFilters(filters)
    } catch (error) {
      console.error('Failed to parse filters from URL:', error)
    }
  }
  
  // Trigger search if we have query or filters
  if (urlQuery || urlFilters) {
    search()
  }
})

// Watch for route changes
watch(
  () => route.query,
  (newQuery: any) => {
    const urlQuery = newQuery.q as string
    const urlFilters = newQuery.filters as string
    
    if (urlQuery !== query.value) {
      setQuery(urlQuery || '')
    }
    
    if (urlFilters) {
      try {
        const filters = JSON.parse(urlFilters)
        setFilters(filters)
      } catch (error) {
        console.error('Failed to parse filters from URL:', error)
      }
    } else if (!urlFilters && hasFilters.value) {
      setFilters({})
    }
  }
)
</script>

<!-- Styles handled by /src/styles/components/search/search-view.css --> 