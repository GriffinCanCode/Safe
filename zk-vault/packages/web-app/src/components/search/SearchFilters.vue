<template>
  <div class="search-filters">
    <div class="filters-header">
      <h3 class="filters-title">Search Filters</h3>
      <div class="filters-actions">
        <button class="filters-action" @click="clearAllFilters" type="button">Clear All</button>
        <button class="filters-action primary" @click="applyFilters" type="button">
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
            :class="{ active: localFilters.type === type.value }"
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
        <select v-model="localFilters.folder" class="filter-select" @change="updateFilters">
          <option value="">All Folders</option>
          <option v-for="folder in folders" :key="folder" :value="folder">
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
            <button v-if="tagInput" class="tags-add-button" @click="addTag" type="button">
              Add
            </button>
          </div>

          <!-- Selected Tags -->
          <div v-if="localFilters.tags?.length" class="selected-tags">
            <span v-for="tag in localFilters.tags" :key="tag" class="selected-tag">
              {{ tag }}
              <button class="remove-tag" @click="removeTag(tag)" type="button">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
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
                :class="{ active: localFilters.tags?.includes(tag) }"
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
            :class="{ active: localFilters.favorite === true }"
            @click="toggleFavorites"
            type="button"
          >
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
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
              v-model="dateRangeStart"
              type="date"
              class="date-input"
              @change="updateFilters"
            />
          </div>
          <div class="date-input-group">
            <label class="date-label">To</label>
            <input
              v-model="dateRangeEnd"
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
              v-model="strengthMin"
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
              v-model="strengthMax"
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
import { ref, computed, watch, onMounted } from 'vue';
import { useVault } from '@/composables/useVault';
import type { SearchFilters } from '@/store/search.store';

interface Props {
  modelValue: SearchFilters;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [filters: SearchFilters];
  apply: [];
  clear: [];
}>();

// Vault composable for folders and tags
const { folders, tags } = useVault();

// Local state
const localFilters = ref<SearchFilters>({
  dateRange: {},
  strength: {},
  ...props.modelValue,
});
const tagInput = ref('');

// Item types configuration
const itemTypes = [
  {
    value: 'password',
    label: 'Passwords',
    icon: 'svg', // Will be replaced with actual icon component
  },
  {
    value: 'note',
    label: 'Notes',
    icon: 'svg',
  },
  {
    value: 'card',
    label: 'Cards',
    icon: 'svg',
  },
  {
    value: 'identity',
    label: 'Identities',
    icon: 'svg',
  },
];

// Quick date ranges
const quickDateRanges = [
  {
    label: 'Last 7 days',
    days: 7,
  },
  {
    label: 'Last 30 days',
    days: 30,
  },
  {
    label: 'Last 90 days',
    days: 90,
  },
  {
    label: 'Last year',
    days: 365,
  },
];

// Computed
const popularTags = computed(() => {
  // Return most common tags (this would come from search statistics)
  return tags.value.slice(0, 10);
});

// Computed properties for nested optional bindings
const dateRangeStart = computed({
  get: () => localFilters.value.dateRange?.start,
  set: (value: Date | undefined) => {
    if (!localFilters.value.dateRange) {
      localFilters.value.dateRange = {};
    }
    if (value !== undefined) {
      localFilters.value.dateRange.start = value;
    } else {
      delete localFilters.value.dateRange.start;
    }
  }
});

const dateRangeEnd = computed({
  get: () => localFilters.value.dateRange?.end,
  set: (value: Date | undefined) => {
    if (!localFilters.value.dateRange) {
      localFilters.value.dateRange = {};
    }
    if (value !== undefined) {
      localFilters.value.dateRange.end = value;
    } else {
      delete localFilters.value.dateRange.end;
    }
  }
});

const strengthMin = computed({
  get: () => localFilters.value.strength?.min,
  set: (value: number | undefined) => {
    if (!localFilters.value.strength) {
      localFilters.value.strength = {};
    }
    if (value !== undefined) {
      localFilters.value.strength.min = value;
    } else {
      delete localFilters.value.strength.min;
    }
  }
});

const strengthMax = computed({
  get: () => localFilters.value.strength?.max,
  set: (value: number | undefined) => {
    if (!localFilters.value.strength) {
      localFilters.value.strength = {};
    }
    if (value !== undefined) {
      localFilters.value.strength.max = value;
    } else {
      delete localFilters.value.strength.max;
    }
  }
});

// Methods
const updateFilters = () => {
  emit('update:modelValue', { ...localFilters.value });
};

const toggleType = (type: string) => {
  if (localFilters.value.type === type) {
    delete localFilters.value.type;
  } else {
    localFilters.value.type = type;
  }
  updateFilters();
};

const toggleFavorites = () => {
  if (localFilters.value.favorite === true) {
    delete localFilters.value.favorite;
  } else {
    localFilters.value.favorite = true;
  }
  updateFilters();
};

const addTag = () => {
  const tag = tagInput.value.trim();
  if (!tag) return;

  if (!localFilters.value.tags) {
    localFilters.value.tags = [];
  }

  if (!localFilters.value.tags.includes(tag)) {
    localFilters.value.tags.push(tag);
    updateFilters();
  }

  tagInput.value = '';
};

const removeTag = (tag: string) => {
  if (localFilters.value.tags) {
    localFilters.value.tags = localFilters.value.tags.filter((t: string) => t !== tag);
    if (localFilters.value.tags.length === 0) {
      delete localFilters.value.tags;
    }
    updateFilters();
  }
};

const toggleTag = (tag: string) => {
  if (!localFilters.value.tags) {
    localFilters.value.tags = [];
  }

  if (localFilters.value.tags.includes(tag)) {
    removeTag(tag);
  } else {
    localFilters.value.tags.push(tag);
    updateFilters();
  }
};

const setQuickDateRange = (range: { label: string; days: number }) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - range.days);

  localFilters.value.dateRange = {
    start,
    end,
  };
  updateFilters();
};

const clearAllFilters = () => {
  localFilters.value = {
    dateRange: {},
    strength: {},
  };
  updateFilters();
  emit('clear');
};

const applyFilters = () => {
  updateFilters();
  emit('apply');
};

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue: SearchFilters) => {
    localFilters.value = {
      dateRange: {},
      strength: {},
      ...newValue,
    };
  },
  { deep: true }
);
</script>

<!-- CSS classes are now defined in /src/styles/components/search/search-filters.css -->
