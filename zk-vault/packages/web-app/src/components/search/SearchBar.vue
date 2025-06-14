<template>
  <div class="search-bar" :class="searchBarClasses">
    <div class="search-container" ref="searchContainer">
      <!-- Search Input -->
      <div class="search-input-wrapper">
        <input
          ref="searchInput"
          v-model="localQuery"
          type="search"
          class="search-input"
          :class="inputClasses"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
          @keyup.escape="handleEscape"
          v-bind="{
            ...(placeholder ? { placeholder } : {}),
            ...(disabled ? { disabled: true } : {}),
          }"
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
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
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
          v-bind="clearLabel ? { 'aria-label': clearLabel } : {}"
          type="button"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <!-- Filter Toggle -->
        <button
          v-if="showFilterToggle"
          class="search-filter-toggle"
          :class="{ active: showFilters || appliedFiltersCount > 0 }"
          @click="toggleFilters"
          v-bind="filterToggleLabel ? { 'aria-label': filterToggleLabel } : {}"
          type="button"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
            />
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
              :class="{ active: selectedSuggestionIndex === index }"
              @click="selectSuggestion(suggestion)"
              @mouseenter="selectedSuggestionIndex = index"
            >
              <div class="suggestion-icon">
                <svg
                  v-if="suggestion.type === 'query'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <svg
                  v-else-if="suggestion.type === 'filter'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                  />
                </svg>
              </div>
              <div class="suggestion-content">
                <div class="suggestion-text">{{ suggestion.value }}</div>
                <div v-if="suggestion.description" class="suggestion-description">
                  {{ suggestion.description }}
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Recent Searches -->
        <div v-if="recentSearches.length > 0 && !localQuery" class="suggestions-section">
          <div class="suggestions-header">
            <span class="suggestions-title">Recent Searches</span>
            <button class="suggestions-clear" @click="clearHistory" type="button">Clear</button>
          </div>
          <div class="suggestions-list">
            <button
              v-for="(search, index) in recentSearches.slice(0, 5)"
              :key="`recent-${search.id}`"
              class="suggestion-item"
              :class="{ active: selectedSuggestionIndex === suggestions.length + index }"
              @click="selectRecentSearch(search)"
              @mouseenter="selectedSuggestionIndex = suggestions.length + index"
            >
              <div class="suggestion-icon">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="suggestion-content">
                <div class="suggestion-text">{{ search.query || 'Advanced Search' }}</div>
                <div class="suggestion-description">
                  {{ search.resultCount }} results • {{ formatDate(search.timestamp) }}
                </div>
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  useSearch,
  type SearchFilters as SearchFiltersType,
  type SearchSuggestion,
  type SearchHistoryEntry,
} from '@/store';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import SearchFilters from './SearchFilters.vue';

interface Props {
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showFilterToggle?: boolean;
  autoSearch?: boolean;
  debounceMs?: number;
  clearLabel?: string;
  filterToggleLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search vault...',
  disabled: false,
  size: 'md',
  showFilterToggle: true,
  autoSearch: true,
  debounceMs: 300,
  clearLabel: 'Clear search',
  filterToggleLabel: 'Toggle filters',
});

const emit = defineEmits<{
  search: [query: string, filters: SearchFiltersType];
  focus: [];
  blur: [];
  suggestionSelected: [suggestion: SearchSuggestion];
  recentSearchSelected: [search: SearchHistoryEntry];
}>();

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
  clearAll,
} = useSearch({
  autoSearch: props.autoSearch,
  debounceMs: props.debounceMs,
});

// Local state
const searchInput = ref<HTMLInputElement | null>(null);
const searchContainer = ref<HTMLElement | null>(null);
const localQuery = ref('');
const showSuggestions = ref(false);
const showFilters = ref(false);
const selectedSuggestionIndex = ref(-1);
const debounceTimer = ref<number | undefined>(undefined);

// Computed
const isLoading = computed(() => isSearching.value);

const searchBarClasses = computed(() => ({
  'search-bar-sm': props.size === 'sm',
  'search-bar-md': props.size === 'md',
  'search-bar-lg': props.size === 'lg',
  'search-bar-disabled': props.disabled,
  'search-bar-focused': showSuggestions.value,
  'search-bar-with-filters': showFilters.value,
}));

const inputClasses = computed(() => ({
  'search-input-sm': props.size === 'sm',
  'search-input-md': props.size === 'md',
  'search-input-lg': props.size === 'lg',
  'search-input-with-clear': localQuery.value && !isLoading.value,
  'search-input-with-filter': props.showFilterToggle,
}));

const totalSuggestions = computed(() => {
  return (
    suggestions.value.length + (localQuery.value ? 0 : recentSearches.value.slice(0, 5).length)
  );
});

// Methods
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  localQuery.value = target.value;

  // Debounced search
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }

  debounceTimer.value = window.setTimeout(() => {
    setQuery(localQuery.value);
    if (localQuery.value.length >= 2) {
      generateSuggestions();
    }
  }, props.debounceMs);
};

const handleFocus = () => {
  showSuggestions.value = true;
  selectedSuggestionIndex.value = -1;
  emit('focus');

  // Generate suggestions if query exists
  if (localQuery.value.length >= 2) {
    generateSuggestions();
  }
};

const handleBlur = () => {
  // Delay hiding suggestions to allow clicks
  setTimeout(() => {
    showSuggestions.value = false;
    selectedSuggestionIndex.value = -1;
  }, 150);
  emit('blur');
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!showSuggestions.value) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedSuggestionIndex.value = Math.min(
        selectedSuggestionIndex.value + 1,
        totalSuggestions.value - 1
      );
      break;

    case 'ArrowUp':
      event.preventDefault();
      selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, -1);
      break;

    case 'Enter':
      event.preventDefault();
      if (selectedSuggestionIndex.value >= 0) {
        if (selectedSuggestionIndex.value < suggestions.value.length) {
          selectSuggestion(suggestions.value[selectedSuggestionIndex.value]);
        } else {
          const recentIndex = selectedSuggestionIndex.value - suggestions.value.length;
          selectRecentSearch(recentSearches.value[recentIndex]);
        }
      } else {
        performSearch();
      }
      break;

    case 'Tab':
      if (selectedSuggestionIndex.value >= 0) {
        event.preventDefault();
        if (selectedSuggestionIndex.value < suggestions.value.length) {
          selectSuggestion(suggestions.value[selectedSuggestionIndex.value]);
        }
      }
      break;
  }
};

const handleEscape = () => {
  showSuggestions.value = false;
  selectedSuggestionIndex.value = -1;
  searchInput.value?.blur();
};

const clearSearch = () => {
  localQuery.value = '';
  setQuery('');
  showSuggestions.value = false;
  searchInput.value?.focus();
};

const toggleFilters = () => {
  showFilters.value = !showFilters.value;
};

const updateFilters = (newFilters: SearchFiltersType) => {
  setFilters(newFilters);
};

const applyFilters = () => {
  showFilters.value = false;
  performSearch();
};

const clearFilters = () => {
  setFilters({});
  showFilters.value = false;
};

const selectSuggestion = (suggestion: SearchSuggestion) => {
  if (suggestion.type === 'query') {
    localQuery.value = suggestion.value;
    setQuery(suggestion.value);
  } else if (suggestion.type === 'filter') {
    // Apply the filter suggestion
    updateFilters({ ...filters.value, type: suggestion.value });
  }

  showSuggestions.value = false;
  performSearch();
  emit('suggestionSelected', suggestion);
};

const selectRecentSearch = (search: SearchHistoryEntry) => {
  localQuery.value = search.query;
  setQuery(search.query);
  setFilters(search.filters);
  showSuggestions.value = false;
  performSearch();
  emit('recentSearchSelected', search);
};

const performSearch = async () => {
  await search();
  emit('search', localQuery.value, filters.value);
};

const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

// Click outside to close
const handleClickOutside = (event: Event) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target as Node)) {
    showFilters.value = false;
  }
};

// Sync with store query
watch(
  () => query.value,
  (newQuery: string) => {
    if (newQuery !== localQuery.value) {
      localQuery.value = newQuery;
    }
  },
  { immediate: true }
);

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
});

// Expose methods
defineExpose({
  focus: () => searchInput.value?.focus(),
  blur: () => searchInput.value?.blur(),
  clear: clearSearch,
});
</script>

<!-- Styles are now handled by the comprehensive CSS architecture in /src/styles/components/search/search-bar.css -->
