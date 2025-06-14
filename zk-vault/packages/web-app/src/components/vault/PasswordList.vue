<template>
  <div class="password-list">
    <!-- Header with Search and Add Button -->
    <div ref="headerElement" class="list-header">
      <div class="search-section">
        <BaseInput
          v-model="searchQuery"
          placeholder="Search passwords..."
          prefix-icon="search"
          class="search-input"
        />
        <div class="filters">
          <select v-model="selectedFolder" class="filter-select">
            <option value="">All folders</option>
            <option v-for="folder in folders" :key="folder" :value="folder">
              {{ folder }}
            </option>
          </select>
          <button
            @click="showFavoritesOnly = !showFavoritesOnly"
            :class="['filter-btn', { active: showFavoritesOnly }]"
            title="Show favorites only"
          >
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          </button>
        </div>
      </div>
      <BaseButton
        ref="addButtonElement"
        variant="primary"
        @click="$emit('add-password')"
        icon="plus"
        class="animate-button-hover"
      >
        Add Password
      </BaseButton>
    </div>

    <!-- List Controls -->
    <div ref="controlsElement" class="list-controls" v-if="passwords.length > 0">
      <div class="view-options">
        <button @click="viewMode = 'grid'" :class="['view-btn', { active: viewMode === 'grid' }]">
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </button>
        <button @click="viewMode = 'list'" :class="['view-btn', { active: viewMode === 'list' }]">
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div class="sort-options">
        <label class="sort-label">Sort by:</label>
        <select v-model="sortBy" class="sort-select">
          <option value="name">Name</option>
          <option value="website">Website</option>
          <option value="updatedAt">Last Updated</option>
          <option value="createdAt">Date Created</option>
        </select>
        <button
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
          class="sort-direction-btn"
          :title="sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'"
        >
          <svg v-if="sortOrder === 'asc'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
              clip-rule="evenodd"
            />
          </svg>
          <svg v-else class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" ref="loadingElement" class="loading-state animate-fade-in">
      <LoadingSpinner />
      <p class="loading-text">Loading passwords...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="passwords.length === 0"
      ref="emptyStateElement"
      class="empty-state animate-fade-in"
    >
      <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <h3 class="empty-title">No passwords found</h3>
      <p class="empty-description">
        {{
          searchQuery
            ? 'Try adjusting your search terms.'
            : 'Get started by adding your first password.'
        }}
      </p>
      <BaseButton
        v-if="!searchQuery"
        variant="primary"
        @click="$emit('add-password')"
        icon="plus"
        class="animate-button-hover"
      >
        Add Your First Password
      </BaseButton>
    </div>

    <!-- Password Items -->
    <div
      v-else-if="viewMode === 'grid'"
      ref="gridContainerElement"
      class="password-grid animate-stagger-in"
    >
      <PasswordItem
        v-for="(password, index) in sortedPasswords"
        :key="password.id"
        :item="convertToVaultItem(password)"
        :style="{ '--stagger-delay': `${index * 0.1}s` }"
        class="animate-slide-up-stagger"
        @edit="$emit('edit-password', password)"
        @delete="handleDelete"
        @copy-username="copyToClipboard"
        @copy-password="copyToClipboard"
        @toggle-favorite="toggleFavorite"
        view-mode="grid"
      />
    </div>

    <div v-else ref="listContainerElement" class="password-list-view animate-stagger-in">
      <PasswordItem
        v-for="(password, index) in sortedPasswords"
        :key="password.id"
        :item="convertToVaultItem(password)"
        :style="{ '--stagger-delay': `${index * 0.05}s` }"
        class="animate-slide-up-stagger"
        @edit="$emit('edit-password', password)"
        @delete="handleDelete"
        @copy-username="copyToClipboard"
        @copy-password="copyToClipboard"
        @toggle-favorite="toggleFavorite"
        view-mode="list"
      />
    </div>

    <!-- Load More Button -->
    <div v-if="hasMore" ref="loadMoreElement" class="load-more-section">
      <BaseButton
        variant="outline"
        @click="loadMore"
        :loading="loadingMore"
        class="animate-button-hover"
        block
      >
        Load More Passwords
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import PasswordItem from './PasswordItem.vue';
import { vaultService } from '@/services/vault.service';
import { useEnhancedAnimations } from '@/composables/useEnhancedAnimations';
import type { PasswordVaultItem, VaultSearchFilters } from '@/services/vault.service';

interface Emits {
  (event: 'add-password'): void;
  (event: 'edit-password', item: PasswordVaultItem): void;
}

const emit = defineEmits<Emits>();

// Template refs
const headerElement = ref<HTMLElement>();
const controlsElement = ref<HTMLElement>();
const loadingElement = ref<HTMLElement>();
const emptyStateElement = ref<HTMLElement>();
const gridContainerElement = ref<HTMLElement>();
const listContainerElement = ref<HTMLElement>();
const loadMoreElement = ref<HTMLElement>();
const addButtonElement = ref<HTMLElement>();

// Animation composable
const { shouldAnimate } = useEnhancedAnimations();

// State
const loading = ref(false);
const loadingMore = ref(false);
const passwords = ref<PasswordVaultItem[]>([]);
const folders = ref<string[]>([]);
const searchQuery = ref('');
const selectedFolder = ref('');
const showFavoritesOnly = ref(false);
const viewMode = ref<'grid' | 'list'>('grid');
const sortBy = ref<'name' | 'website' | 'updatedAt' | 'createdAt'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
const hasMore = ref(false);
const currentCursor = ref<string | undefined>(undefined);

// Computed
const searchFilters = computed((): VaultSearchFilters => {
  const filters: VaultSearchFilters = {
    type: 'password',
  };

  if (searchQuery.value) {
    filters.query = searchQuery.value;
  }

  if (selectedFolder.value) {
    filters.folder = selectedFolder.value;
  }

  if (showFavoritesOnly.value) {
    filters.favorite = true;
  }

  return filters;
});

const sortedPasswords = computed(() => {
  const sorted = [...passwords.value].sort((a, b) => {
    let aValue: any = a[sortBy.value];
    let bValue: any = b[sortBy.value];

    // Handle date fields
    if (sortBy.value === 'updatedAt' || sortBy.value === 'createdAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle string fields
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
    }
    if (typeof bValue === 'string') {
      bValue = bValue.toLowerCase();
    }

    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortOrder.value === 'asc' ? comparison : -comparison;
  });

  return sorted;
});

// Methods
const loadPasswords = async (append = false) => {
  if (!append) loading.value = true;
  else loadingMore.value = true;

  try {
    const searchOptions: any = {
      limit: 20,
    };

    if (append && currentCursor.value) {
      searchOptions.cursor = currentCursor.value;
    }

    const result = await vaultService.searchItems(searchFilters.value, searchOptions);

    const passwordItems = result.items.filter(
      item => item.type === 'password'
    ) as PasswordVaultItem[];

    if (append) {
      passwords.value = [...passwords.value, ...passwordItems];
    } else {
      passwords.value = passwordItems;
    }

    hasMore.value = result.hasMore;
    currentCursor.value = result.nextCursor;
  } catch (error) {
    console.error('Failed to load passwords:', error);
    // TODO: Show error notification
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMore = () => {
  if (hasMore.value && !loadingMore.value) {
    loadPasswords(true);
  }
};

const loadFolders = async () => {
  try {
    folders.value = await vaultService.getFolders();
  } catch (error) {
    console.error('Failed to load folders:', error);
  }
};

// Convert PasswordVaultItem to VaultItem for PasswordItem component
const convertToVaultItem = (item: PasswordVaultItem) => {
  const vaultItem: any = {
    id: item.id,
    name: item.name,
    username: item.username,
    password: item.password,
    website: item.website || '',
    isFavorite: item.favorite || false,
    tags: item.tags || [],
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };

  // Only add optional properties if they have values
  if (item.notes) {
    vaultItem.notes = item.notes;
  }

  if (item.metadata?.strength !== undefined) {
    vaultItem.passwordStrength = item.metadata.strength;
  }

  if (item.lastAccessed) {
    vaultItem.lastUsed = new Date(item.lastAccessed);
  }

  return vaultItem;
};

const handleDelete = async (vaultItem: any) => {
  if (!confirm('Are you sure you want to delete this password? This action cannot be undone.')) {
    return;
  }

  try {
    await vaultService.deleteItem(vaultItem.id);
    passwords.value = passwords.value.filter((p: PasswordVaultItem) => p.id !== vaultItem.id);
    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to delete password:', error);
    // TODO: Show error notification
  }
};

const toggleFavorite = async (vaultItem: any, favorite: boolean) => {
  try {
    const updated = (await vaultService.updateItem(vaultItem.id, {
      favorite,
    })) as PasswordVaultItem;

    const index = passwords.value.findIndex((p: PasswordVaultItem) => p.id === vaultItem.id);
    if (index > -1) {
      passwords.value[index] = updated;
    }
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    // TODO: Show error notification
  }
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // TODO: Show error notification
  }
};

// Setup entrance animations
const setupAnimations = () => {
  if (!shouldAnimate.value) return;

  nextTick(() => {
    // Animate header entrance
    if (headerElement.value) {
      headerElement.value.classList.add('animate-slide-down');
    }

    // Animate controls entrance
    if (controlsElement.value) {
      controlsElement.value.classList.add('animate-fade-in');
    }
  });
};

// Watchers
watch(
  [searchQuery, selectedFolder, showFavoritesOnly],
  () => {
    loadPasswords();
  },
  { deep: true }
);

watch(
  passwords,
  () => {
    setupAnimations();
  },
  { flush: 'post' }
);

// Lifecycle
onMounted(async () => {
  await Promise.all([loadPasswords(), loadFolders()]);
  setupAnimations();
});
</script>
