<template>
  <div class="search-filters">
    <div class="filters-header">
      <h3 class="filters-title">Search Filters</h3>
      <div class="filters-actions">
        <button
          class="filters-action"
          @click="clearAllFilters"
          type="button"
        >
          Clear All
        </button>
        <button
          class="filters-action primary"
          @click="applyFilters"
          type="button"
        >
          Apply Filters
        </button>
      </div>
    </div>

    <div class="filters-content">
      <!-- Item Type Filter -->
      <div class="filter-group">
        <label class="filter-label">Item Type</label>
        <div class="filter-options">
          <button
            v-for="type in itemTypes"
            :key="type.value"
            class="filter-option"
            :class="{ 'active': localFilters.type === type.value }"
            @click="toggleType(type.value)"
            type="button"
          >
            <component :is="type.icon" class="filter-option-icon" />
            <span>{{ type.label }}</span>
          </button>
        </div>
      </div>

      <!-- Folder Filter -->
      <div class="filter-group" v-if="folders.length > 0">
        <label class="filter-label">Folder</label>
        <select
          v-model="localFilters.folder"
          class="filter-select"
          @change="updateFilters"
        >
          <option value="">All Folders</option>
          <option
            v-for="folder in folders"
            :key="folder"
            :value="folder"
          >
            {{ folder }}
          </option>
        </select>
      </div>

      <!-- Tags Filter -->
      <div class="filter-group" v-if="tags.length > 0">
        <label class="filter-label">Tags</label>
        <div class="tags-container">
          <div class="tags-input-wrapper">
            <input
              v-model="tagInput"
              type="text"
              class="tags-input"
              placeholder="Add tag filter..."
              @keydown.enter.prevent="addTag"
              @keydown.comma.prevent="addTag"
            />
            <button
              v-if="tagInput"
              class="tags-add-button"
              @click="addTag"
              type="button"
            >
              Add
            </button>
          </div>
          
          <!-- Selected Tags -->
          <div v-if="localFilters.tags?.length" class="selected-tags">
            <span
              v-for="tag in localFilters.tags"
              :key="tag"
              class="selected-tag"
            >
              {{ tag }}
              <button
                class="remove-tag"
                @click="removeTag(tag)"
                type="button"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
          
          <!-- Popular Tags -->
          <div v-if="popularTags.length > 0" class="popular-tags">
            <div class="popular-tags-label">Popular tags:</div>
            <div class="popular-tags-list">
              <button
                v-for="tag in popularTags.slice(0, 8)"
                :key="tag"
                class="popular-tag"
                :class="{ 'active': localFilters.tags?.includes(tag) }"
                @click="toggleTag(tag)"
                type="button"
              >
                {{ tag }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Favorites Filter -->
      <div class="filter-group">
        <label class="filter-label">Show Only</label>
        <div class="filter-toggles">
          <button
            class="filter-toggle"
            :class="{ 'active': localFilters.favorite === true }"
            @click="toggleFavorites"
            type="button"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>Favorites</span>
          </button>
        </div>
      </div>

      <!-- Date Range Filter -->
      <div class="filter-group">
        <label class="filter-label">Date Range</label>
        <div class="date-range-controls">
          <div class="date-input-group">
            <label class="date-label">From</label>
            <input
              v-model="localFilters.dateRange.start"
              type="date"
              class="date-input"
              @change="updateFilters"
            />
          </div>
          <div class="date-input-group">
            <label class="date-label">To</label>
            <input
              v-model="localFilters.dateRange.end"
              type="date"
              class="date-input"
              @change="updateFilters"
            />
          </div>
        </div>
        
        <!-- Quick Date Ranges -->
        <div class="quick-date-ranges">
          <button
            v-for="range in quickDateRanges"
            :key="range.label"
            class="quick-date-range"
            @click="setQuickDateRange(range)"
            type="button"
          >
            {{ range.label }}
          </button>
        </div>
      </div>

      <!-- Password Strength Filter (for password items) -->
      <div class="filter-group" v-if="!localFilters.type || localFilters.type === 'password'">
        <label class="filter-label">Password Strength</label>
        <div class="strength-filter">
          <div class="strength-range">
            <label class="strength-label">Minimum:</label>
            <select
              v-model="localFilters.strength.min"
              class="strength-select"
              @change="updateFilters"
            >
              <option :value="undefined">Any</option>
              <option :value="1">Very Weak</option>
              <option :value="2">Weak</option>
              <option :value="3">Fair</option>
              <option :value="4">Good</option>
              <option :value="5">Strong</option>
            </select>
          </div>
          <div class="strength-range">
            <label class="strength-label">Maximum:</label>
            <select
              v-model="localFilters.strength.max"
              class="strength-select"
              @change="updateFilters"
            >
              <option :value="undefined">Any</option>
              <option :value="1">Very Weak</option>
              <option :value="2">Weak</option>
              <option :value="3">Fair</option>
              <option :value="4">Good</option>
              <option :value="5">Strong</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useVault } from '@/composables/useVault'
import type { SearchFilters } from '@/store/search.store'

interface Props {
  modelValue: SearchFilters
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [filters: SearchFilters]
  apply: []
  clear: []
}>()

// Vault composable for folders and tags
const { folders, tags } = useVault()

// Local state
const localFilters = ref<SearchFilters>({
  dateRange: {},
  strength: {},
  ...props.modelValue
})
const tagInput = ref('')

// Item types configuration
const itemTypes = [
  {
    value: 'password',
    label: 'Passwords',
    icon: 'svg'  // Will be replaced with actual icon component
  },
  {
    value: 'note',
    label: 'Notes',
    icon: 'svg'
  },
  {
    value: 'card',
    label: 'Cards',
    icon: 'svg'
  },
  {
    value: 'identity',
    label: 'Identities',
    icon: 'svg'
  }
]

// Quick date ranges
const quickDateRanges = [
  {
    label: 'Last 7 days',
    days: 7
  },
  {
    label: 'Last 30 days',
    days: 30
  },
  {
    label: 'Last 90 days',
    days: 90
  },
  {
    label: 'Last year',
    days: 365
  }
]

// Computed
const popularTags = computed(() => {
  // Return most common tags (this would come from search statistics)
  return tags.value.slice(0, 10)
})

// Methods
const updateFilters = () => {
  emit('update:modelValue', { ...localFilters.value })
}

const toggleType = (type: string) => {
  if (localFilters.value.type === type) {
    localFilters.value.type = undefined
  } else {
    localFilters.value.type = type
  }
  updateFilters()
}

const toggleFavorites = () => {
  if (localFilters.value.favorite === true) {
    localFilters.value.favorite = undefined
  } else {
    localFilters.value.favorite = true
  }
  updateFilters()
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (!tag) return
  
  if (!localFilters.value.tags) {
    localFilters.value.tags = []
  }
  
  if (!localFilters.value.tags.includes(tag)) {
    localFilters.value.tags.push(tag)
    updateFilters()
  }
  
  tagInput.value = ''
}

const removeTag = (tag: string) => {
  if (localFilters.value.tags) {
    localFilters.value.tags = localFilters.value.tags.filter((t: string) => t !== tag)
    if (localFilters.value.tags.length === 0) {
      localFilters.value.tags = undefined
    }
    updateFilters()
  }
}

const toggleTag = (tag: string) => {
  if (!localFilters.value.tags) {
    localFilters.value.tags = []
  }
  
  if (localFilters.value.tags.includes(tag)) {
    removeTag(tag)
  } else {
    localFilters.value.tags.push(tag)
    updateFilters()
  }
}

const setQuickDateRange = (range: { label: string; days: number }) => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - range.days)
  
  localFilters.value.dateRange = {
    start,
    end
  }
  updateFilters()
}

const clearAllFilters = () => {
  localFilters.value = {
    dateRange: {},
    strength: {}
  }
  updateFilters()
  emit('clear')
}

const applyFilters = () => {
  updateFilters()
  emit('apply')
}

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue: SearchFilters) => {
    localFilters.value = {
      dateRange: {},
      strength: {},
      ...newValue
    }
  },
  { deep: true }
)
</script>

<style scoped>
.search-filters {
  @apply bg-white border border-neutral-200 rounded-lg shadow-lg;
  @apply max-h-96 overflow-y-auto;
}

.filters-header {
  @apply flex items-center justify-between p-4 border-b border-neutral-200;
  @apply sticky top-0 bg-white z-10;
}

.filters-title {
  @apply text-lg font-semibold text-neutral-900;
}

.filters-actions {
  @apply flex items-center gap-2;
}

.filters-action {
  @apply px-3 py-1.5 text-sm font-medium rounded-md transition-colors;
  @apply border border-neutral-300 bg-white text-neutral-700;
  @apply hover:bg-neutral-50;
}

.filters-action.primary {
  @apply bg-primary-600 text-white border-primary-600;
  @apply hover:bg-primary-700;
}

.filters-content {
  @apply p-4 space-y-6;
}

.filter-group {
  @apply space-y-3;
}

.filter-label {
  @apply block text-sm font-medium text-neutral-700;
}

/* Item Type Filter */
.filter-options {
  @apply grid grid-cols-2 gap-2;
}

.filter-option {
  @apply flex items-center gap-2 p-3 rounded-lg border border-neutral-200;
  @apply hover:border-neutral-300 transition-colors text-left;
}

.filter-option.active {
  @apply border-primary-500 bg-primary-50 text-primary-700;
}

.filter-option-icon {
  @apply w-4 h-4;
}

/* Select Inputs */
.filter-select,
.strength-select {
  @apply w-full px-3 py-2 border border-neutral-300 rounded-md;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
  @apply bg-white text-neutral-900;
}

/* Tags */
.tags-container {
  @apply space-y-3;
}

.tags-input-wrapper {
  @apply flex gap-2;
}

.tags-input {
  @apply flex-1 px-3 py-2 border border-neutral-300 rounded-md;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
  @apply bg-white text-neutral-900;
}

.tags-add-button {
  @apply px-3 py-2 bg-primary-600 text-white rounded-md;
  @apply hover:bg-primary-700 transition-colors;
}

.selected-tags {
  @apply flex flex-wrap gap-2;
}

.selected-tag {
  @apply inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-800;
  @apply rounded-full text-sm font-medium;
}

.remove-tag {
  @apply text-primary-600 hover:text-primary-800 transition-colors;
}

.popular-tags {
  @apply space-y-2;
}

.popular-tags-label {
  @apply text-xs text-neutral-500 font-medium;
}

.popular-tags-list {
  @apply flex flex-wrap gap-1;
}

.popular-tag {
  @apply px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded-full;
  @apply hover:bg-neutral-200 transition-colors;
}

.popular-tag.active {
  @apply bg-primary-100 text-primary-700;
}

/* Toggles */
.filter-toggles {
  @apply space-y-2;
}

.filter-toggle {
  @apply flex items-center gap-2 p-2 rounded-lg border border-neutral-200;
  @apply hover:border-neutral-300 transition-colors text-left;
}

.filter-toggle.active {
  @apply border-primary-500 bg-primary-50 text-primary-700;
}

/* Date Range */
.date-range-controls {
  @apply grid grid-cols-2 gap-3;
}

.date-input-group {
  @apply space-y-1;
}

.date-label {
  @apply text-xs text-neutral-500 font-medium;
}

.date-input {
  @apply w-full px-3 py-2 border border-neutral-300 rounded-md;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
  @apply bg-white text-neutral-900;
}

.quick-date-ranges {
  @apply flex flex-wrap gap-2 mt-3;
}

.quick-date-range {
  @apply px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded-full;
  @apply hover:bg-neutral-200 transition-colors;
}

/* Strength Filter */
.strength-filter {
  @apply space-y-3;
}

.strength-range {
  @apply space-y-1;
}

.strength-label {
  @apply text-xs text-neutral-500 font-medium;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .search-filters {
    @apply bg-neutral-800 border-neutral-600;
  }
  
  .filters-header {
    @apply bg-neutral-800 border-neutral-600;
  }
  
  .filters-title {
    @apply text-neutral-100;
  }
  
  .filters-action {
    @apply bg-neutral-700 border-neutral-600 text-neutral-300;
    @apply hover:bg-neutral-600;
  }
  
  .filters-action.primary {
    @apply bg-primary-600 border-primary-600 text-white;
    @apply hover:bg-primary-700;
  }
  
  .filter-label,
  .date-label,
  .strength-label {
    @apply text-neutral-300;
  }
  
  .filter-option {
    @apply border-neutral-600 text-neutral-300;
    @apply hover:border-neutral-500;
  }
  
  .filter-option.active {
    @apply border-primary-400 bg-primary-900 text-primary-100;
  }
  
  .filter-select,
  .strength-select,
  .tags-input,
  .date-input {
    @apply bg-neutral-700 border-neutral-600 text-neutral-100;
    @apply focus:border-primary-400 focus:ring-primary-400;
  }
  
  .selected-tag {
    @apply bg-primary-900 text-primary-100;
  }
  
  .popular-tags-label {
    @apply text-neutral-400;
  }
  
  .popular-tag {
    @apply bg-neutral-700 text-neutral-300;
    @apply hover:bg-neutral-600;
  }
  
  .popular-tag.active {
    @apply bg-primary-900 text-primary-100;
  }
  
  .filter-toggle {
    @apply border-neutral-600 text-neutral-300;
    @apply hover:border-neutral-500;
  }
  
  .filter-toggle.active {
    @apply border-primary-400 bg-primary-900 text-primary-100;
  }
  
  .quick-date-range {
    @apply bg-neutral-700 text-neutral-300;
    @apply hover:bg-neutral-600;
  }
}
</style> 