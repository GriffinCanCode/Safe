<template>
  <div class="search-bar" :class="searchBarClasses">
    <div class="search-container" ref="searchContainer">
      <!-- Search Input -->
      <div class="search-input-wrapper">
        <input
          ref="searchInput"
          v-model="localQuery"
          type="search"
          :placeholder="placeholder"
          class="search-input"
          :class="inputClasses"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
          @keyup.escape="handleEscape"
          :disabled="disabled"
          autocomplete="off"
          spellcheck="false"
        />
        
        <!-- Search Icon -->
        <svg 
          v-if="!isLoading" 
          class="search-icon" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        
        <!-- Loading Spinner -->
        <div v-else class="search-loading">
          <LoadingSpinner size="sm" />
        </div>
        
        <!-- Clear Button -->
        <button
          v-if="localQuery && !isLoading"
          class="search-clear"
          @click="clearSearch"
          :aria-label="clearLabel"
          type="button"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <!-- Filter Toggle -->
        <button
          v-if="showFilterToggle"
          class="search-filter-toggle"
          :class="{ 'active': showFilters || appliedFiltersCount > 0 }"
          @click="toggleFilters"
          :aria-label="filterToggleLabel"
          type="button"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          <span v-if="appliedFiltersCount > 0" class="filter-badge">{{ appliedFiltersCount }}</span>
        </button>
      </div>
      
      <!-- Search Suggestions Dropdown -->
      <div
        v-if="showSuggestions && (suggestions.length > 0 || recentSearches.length > 0)"
        class="search-suggestions"
        @mousedown.prevent
      >
        <!-- Current Query Suggestions -->
        <div v-if="suggestions.length > 0" class="suggestions-section">
          <div class="suggestions-header">
            <span class="suggestions-title">Suggestions</span>
          </div>
          <div class="suggestions-list">
            <button
              v-for="(suggestion, index) in suggestions"
              :key="`suggestion-${index}`"
              class="suggestion-item"
              :class="{ 'active': selectedSuggestionIndex === index }"
              @click="selectSuggestion(suggestion)"
              @mouseenter="selectedSuggestionIndex = index"
            >
              <div class="suggestion-icon">
                <svg v-if="suggestion.type === 'query'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <svg v-else-if="suggestion.type === 'filter'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <div class="suggestion-content">
                <div class="suggestion-text">{{ suggestion.value }}</div>
                <div v-if="suggestion.description" class="suggestion-description">{{ suggestion.description }}</div>
              </div>
            </button>
          </div>
        </div>
        
        <!-- Recent Searches -->
        <div v-if="recentSearches.length > 0 && !localQuery" class="suggestions-section">
          <div class="suggestions-header">
            <span class="suggestions-title">Recent Searches</span>
            <button class="suggestions-clear" @click="clearHistory" type="button">
              Clear
            </button>
          </div>
          <div class="suggestions-list">
            <button
              v-for="(search, index) in recentSearches.slice(0, 5)"
              :key="`recent-${search.id}`"
              class="suggestion-item"
              :class="{ 'active': selectedSuggestionIndex === suggestions.length + index }"
              @click="selectRecentSearch(search)"
              @mouseenter="selectedSuggestionIndex = suggestions.length + index"
            >
              <div class="suggestion-icon">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="suggestion-content">
                <div class="suggestion-text">{{ search.query || 'Advanced Search' }}</div>
                <div class="suggestion-description">{{ search.resultCount }} results • {{ formatDate(search.timestamp) }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Filter Panel -->
    <SearchFilters
      v-if="showFilters"
      :model-value="filters"
      @update:model-value="updateFilters"
      @apply="applyFilters"
      @clear="clearFilters"
      class="search-filters-panel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useSearch, type SearchFilters as SearchFiltersType, type SearchSuggestion, type SearchHistoryEntry } from '@/store'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import SearchFilters from './SearchFilters.vue'

interface Props {
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showFilterToggle?: boolean
  autoSearch?: boolean
  debounceMs?: number
  clearLabel?: string
  filterToggleLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search vault...',
  disabled: false,
  size: 'md',
  showFilterToggle: true,
  autoSearch: true,
  debounceMs: 300,
  clearLabel: 'Clear search',
  filterToggleLabel: 'Toggle filters'
})

const emit = defineEmits<{
  search: [query: string, filters: SearchFiltersType]
  focus: []
  blur: []
  suggestionSelected: [suggestion: SearchSuggestion]
  recentSearchSelected: [search: SearchHistoryEntry]
}>()

// Search composable
const {
  query,
  filters,
  suggestions,
  recentSearches,
  isSearching,
  appliedFiltersCount,
  setQuery,
  setFilters,
  search,
  generateSuggestions,
  clearHistory,
  clearAll
} = useSearch({
  autoSearch: props.autoSearch,
  debounceMs: props.debounceMs
})

// Local state
const searchInput = ref<HTMLInputElement | null>(null)
const searchContainer = ref<HTMLElement | null>(null)
const localQuery = ref('')
const showSuggestions = ref(false)
const showFilters = ref(false)
const selectedSuggestionIndex = ref(-1)
const debounceTimer = ref<number | undefined>(undefined)

// Computed
const isLoading = computed(() => isSearching.value)

const searchBarClasses = computed(() => ({
  'search-bar-sm': props.size === 'sm',
  'search-bar-md': props.size === 'md',
  'search-bar-lg': props.size === 'lg',
  'search-bar-disabled': props.disabled,
  'search-bar-focused': showSuggestions.value,
  'search-bar-with-filters': showFilters.value
}))

const inputClasses = computed(() => ({
  'search-input-sm': props.size === 'sm',
  'search-input-md': props.size === 'md',
  'search-input-lg': props.size === 'lg',
  'search-input-with-clear': localQuery.value && !isLoading.value,
  'search-input-with-filter': props.showFilterToggle
}))

const totalSuggestions = computed(() => {
  return suggestions.value.length + (localQuery.value ? 0 : recentSearches.value.slice(0, 5).length)
})

// Methods
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  localQuery.value = target.value
  
  // Debounced search
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
  
  debounceTimer.value = window.setTimeout(() => {
    setQuery(localQuery.value)
    if (localQuery.value.length >= 2) {
      generateSuggestions()
    }
  }, props.debounceMs)
}

const handleFocus = () => {
  showSuggestions.value = true
  selectedSuggestionIndex.value = -1
  emit('focus')
  
  // Generate suggestions if query exists
  if (localQuery.value.length >= 2) {
    generateSuggestions()
  }
}

const handleBlur = () => {
  // Delay hiding suggestions to allow clicks
  setTimeout(() => {
    showSuggestions.value = false
    selectedSuggestionIndex.value = -1
  }, 150)
  emit('blur')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!showSuggestions.value) return
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedSuggestionIndex.value = Math.min(
        selectedSuggestionIndex.value + 1,
        totalSuggestions.value - 1
      )
      break
      
    case 'ArrowUp':
      event.preventDefault()
      selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, -1)
      break
      
    case 'Enter':
      event.preventDefault()
      if (selectedSuggestionIndex.value >= 0) {
        if (selectedSuggestionIndex.value < suggestions.value.length) {
          selectSuggestion(suggestions.value[selectedSuggestionIndex.value])
        } else {
          const recentIndex = selectedSuggestionIndex.value - suggestions.value.length
          selectRecentSearch(recentSearches.value[recentIndex])
        }
      } else {
        performSearch()
      }
      break
      
    case 'Tab':
      if (selectedSuggestionIndex.value >= 0) {
        event.preventDefault()
        if (selectedSuggestionIndex.value < suggestions.value.length) {
          selectSuggestion(suggestions.value[selectedSuggestionIndex.value])
        }
      }
      break
  }
}

const handleEscape = () => {
  showSuggestions.value = false
  selectedSuggestionIndex.value = -1
  searchInput.value?.blur()
}

const clearSearch = () => {
  localQuery.value = ''
  setQuery('')
  showSuggestions.value = false
  searchInput.value?.focus()
}

const toggleFilters = () => {
  showFilters.value = !showFilters.value
}

const updateFilters = (newFilters: SearchFiltersType) => {
  setFilters(newFilters)
}

const applyFilters = () => {
  showFilters.value = false
  performSearch()
}

const clearFilters = () => {
  setFilters({})
  showFilters.value = false
}

const selectSuggestion = (suggestion: SearchSuggestion) => {
  if (suggestion.type === 'query') {
    localQuery.value = suggestion.value
    setQuery(suggestion.value)
  } else if (suggestion.type === 'filter') {
    // Apply the filter suggestion
    updateFilters({ ...filters.value, type: suggestion.value })
  }
  
  showSuggestions.value = false
  performSearch()
  emit('suggestionSelected', suggestion)
}

const selectRecentSearch = (search: SearchHistoryEntry) => {
  localQuery.value = search.query
  setQuery(search.query)
  setFilters(search.filters)
  showSuggestions.value = false
  performSearch()
  emit('recentSearchSelected', search)
}

const performSearch = async () => {
  await search()
  emit('search', localQuery.value, filters.value)
}

const formatDate = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

// Click outside to close
const handleClickOutside = (event: Event) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    showFilters.value = false
  }
}

// Sync with store query
watch(
  () => query.value,
  (newQuery: string) => {
    if (newQuery !== localQuery.value) {
      localQuery.value = newQuery
    }
  },
  { immediate: true }
)

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
})

// Expose methods
defineExpose({
  focus: () => searchInput.value?.focus(),
  blur: () => searchInput.value?.blur(),
  clear: clearSearch
})
</script>

<style scoped>
.search-bar {
  @apply relative w-full;
}

.search-container {
  @apply relative;
}

.search-input-wrapper {
  @apply relative flex items-center;
}

.search-input {
  @apply w-full border border-neutral-300 rounded-lg bg-white text-neutral-900;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
  @apply placeholder-neutral-500 transition-all duration-200;
  @apply disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed;
}

/* Size variants */
.search-input-sm {
  @apply pl-9 pr-8 py-1.5 text-sm;
}

.search-input-md {
  @apply pl-10 pr-10 py-2 text-sm;
}

.search-input-lg {
  @apply pl-12 pr-12 py-3 text-base;
}

.search-input-with-clear.search-input-sm {
  @apply pr-16;
}

.search-input-with-clear.search-input-md {
  @apply pr-20;
}

.search-input-with-clear.search-input-lg {
  @apply pr-24;
}

.search-input-with-filter.search-input-sm {
  @apply pr-16;
}

.search-input-with-filter.search-input-md {
  @apply pr-20;
}

.search-input-with-filter.search-input-lg {
  @apply pr-24;
}

.search-input-with-clear.search-input-with-filter.search-input-sm {
  @apply pr-24;
}

.search-input-with-clear.search-input-with-filter.search-input-md {
  @apply pr-28;
}

.search-input-with-clear.search-input-with-filter.search-input-lg {
  @apply pr-32;
}

/* Icons and buttons */
.search-icon,
.search-loading {
  @apply absolute left-3 w-4 h-4 text-neutral-400;
}

.search-bar-sm .search-icon,
.search-bar-sm .search-loading {
  @apply left-2.5 w-3 h-3;
}

.search-bar-lg .search-icon,
.search-bar-lg .search-loading {
  @apply left-4 w-5 h-5;
}

.search-clear,
.search-filter-toggle {
  @apply absolute w-4 h-4 text-neutral-400 hover:text-neutral-600;
  @apply transition-colors duration-200 cursor-pointer;
  @apply flex items-center justify-center;
}

.search-clear {
  @apply right-10;
}

.search-filter-toggle {
  @apply right-3;
}

.search-bar-sm .search-clear {
  @apply right-8 w-3 h-3;
}

.search-bar-sm .search-filter-toggle {
  @apply right-2.5 w-3 h-3;
}

.search-bar-lg .search-clear {
  @apply right-12 w-5 h-5;
}

.search-bar-lg .search-filter-toggle {
  @apply right-4 w-5 h-5;
}

.search-filter-toggle.active {
  @apply text-primary-600;
}

.filter-badge {
  @apply absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs;
  @apply rounded-full flex items-center justify-center;
}

/* Suggestions dropdown */
.search-suggestions {
  @apply absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200;
  @apply rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto;
}

.suggestions-section {
  @apply border-b border-neutral-100 last:border-b-0;
}

.suggestions-header {
  @apply flex items-center justify-between px-4 py-2 bg-neutral-50 border-b border-neutral-100;
}

.suggestions-title {
  @apply text-xs font-medium text-neutral-600 uppercase tracking-wider;
}

.suggestions-clear {
  @apply text-xs text-primary-600 hover:text-primary-700 font-medium;
}

.suggestions-list {
  @apply divide-y divide-neutral-100;
}

.suggestion-item {
  @apply w-full flex items-center gap-3 px-4 py-3 text-left;
  @apply hover:bg-neutral-50 transition-colors cursor-pointer;
}

.suggestion-item.active {
  @apply bg-primary-50 text-primary-900;
}

.suggestion-icon {
  @apply flex-shrink-0 w-4 h-4 text-neutral-400;
}

.suggestion-item.active .suggestion-icon {
  @apply text-primary-600;
}

.suggestion-content {
  @apply flex-1 min-w-0;
}

.suggestion-text {
  @apply font-medium text-neutral-900 truncate;
}

.suggestion-item.active .suggestion-text {
  @apply text-primary-900;
}

.suggestion-description {
  @apply text-xs text-neutral-500 truncate;
}

.suggestion-item.active .suggestion-description {
  @apply text-primary-700;
}

/* Filter panel */
.search-filters-panel {
  @apply absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200;
  @apply rounded-lg shadow-lg z-40;
}

/* Focus states */
.search-bar-focused .search-input {
  @apply ring-2 ring-primary-500 border-primary-500;
}

.search-bar-with-filters .search-input {
  @apply rounded-b-none border-b-transparent;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .search-input {
    @apply bg-neutral-800 border-neutral-600 text-neutral-100;
    @apply placeholder-neutral-400;
    @apply focus:border-primary-400 focus:ring-primary-400;
    @apply disabled:bg-neutral-900 disabled:text-neutral-600;
  }
  
  .search-icon,
  .search-clear,
  .search-filter-toggle {
    @apply text-neutral-500 hover:text-neutral-300;
  }
  
  .search-filter-toggle.active {
    @apply text-primary-400;
  }
  
  .search-suggestions {
    @apply bg-neutral-800 border-neutral-600;
  }
  
  .suggestions-header {
    @apply bg-neutral-700 border-neutral-600;
  }
  
  .suggestions-title {
    @apply text-neutral-400;
  }
  
  .suggestions-clear {
    @apply text-primary-400 hover:text-primary-300;
  }
  
  .suggestions-list {
    @apply divide-neutral-600;
  }
  
  .suggestion-item {
    @apply hover:bg-neutral-700;
  }
  
  .suggestion-item.active {
    @apply bg-primary-900 text-primary-100;
  }
  
  .suggestion-text {
    @apply text-neutral-100;
  }
  
  .suggestion-item.active .suggestion-text {
    @apply text-primary-100;
  }
  
  .suggestion-description {
    @apply text-neutral-400;
  }
  
  .suggestion-item.active .suggestion-description {
    @apply text-primary-300;
  }
  
  .search-filters-panel {
    @apply bg-neutral-800 border-neutral-600;
  }
}
</style> 