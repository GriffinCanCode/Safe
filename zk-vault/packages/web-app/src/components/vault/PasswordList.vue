<template>
  <div class="password-list">
    <!-- Header with Search and Add Button -->
    <div class="list-header">
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
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        </div>
      </div>
      <BaseButton
        variant="primary"
        @click="$emit('add-password')"
        icon="plus"
      >
        Add Password
      </BaseButton>
    </div>

    <!-- List Controls -->
    <div class="list-controls" v-if="passwords.length > 0">
      <div class="view-options">
        <button
          @click="viewMode = 'grid'"
          :class="['view-btn', { active: viewMode === 'grid' }]"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          @click="viewMode = 'list'"
          :class="['view-btn', { active: viewMode === 'list' }]"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
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
          <svg v-if="sortOrder === 'asc'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <LoadingSpinner />
      <p class="loading-text">Loading passwords...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="passwords.length === 0" class="empty-state">
      <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <h3 class="empty-title">No passwords found</h3>
      <p class="empty-description">
        {{ searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first password.' }}
      </p>
      <BaseButton
        v-if="!searchQuery"
        variant="primary"
        @click="$emit('add-password')"
        icon="plus"
      >
        Add Your First Password
      </BaseButton>
    </div>

    <!-- Password Items -->
    <div v-else-if="viewMode === 'grid'" class="password-grid">
      <PasswordItem
        v-for="password in sortedPasswords"
        :key="password.id"
        :item="password"
        @edit="$emit('edit-password', password)"
        @delete="handleDelete"
        @copy-username="copyToClipboard"
        @copy-password="copyToClipboard"
        @toggle-favorite="toggleFavorite"
        view-mode="grid"
      />
    </div>

    <div v-else class="password-list-view">
      <PasswordItem
        v-for="password in sortedPasswords"
        :key="password.id"
        :item="password"
        @edit="$emit('edit-password', password)"
        @delete="handleDelete"
        @copy-username="copyToClipboard"
        @copy-password="copyToClipboard"
        @toggle-favorite="toggleFavorite"
        view-mode="list"
      />
    </div>

    <!-- Load More Button -->
    <div v-if="hasMore" class="load-more-section">
      <BaseButton
        variant="outline"
        @click="loadMore"
        :loading="loadingMore"
        block
      >
        Load More Passwords
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PasswordItem from './PasswordItem.vue'
import { vaultService } from '@/services/vault.service'
import type { PasswordVaultItem, VaultSearchFilters } from '@/services/vault.service'

interface Emits {
  (event: 'add-password'): void
  (event: 'edit-password', item: PasswordVaultItem): void
}

const emit = defineEmits<Emits>()

// State
const loading = ref(false)
const loadingMore = ref(false)
const passwords = ref<PasswordVaultItem[]>([])
const folders = ref<string[]>([])
const searchQuery = ref('')
const selectedFolder = ref('')
const showFavoritesOnly = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')
const sortBy = ref<'name' | 'website' | 'updatedAt' | 'createdAt'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const hasMore = ref(false)
const currentCursor = ref<string | undefined>(undefined)

// Computed
const searchFilters = computed((): VaultSearchFilters => ({
  query: searchQuery.value || undefined,
  type: 'password',
  folder: selectedFolder.value || undefined,
  favorite: showFavoritesOnly.value || undefined
}))

const sortedPasswords = computed(() => {
  const sorted = [...passwords.value].sort((a, b) => {
    let aValue: any = a[sortBy.value]
    let bValue: any = b[sortBy.value]

    // Handle date fields
    if (sortBy.value === 'updatedAt' || sortBy.value === 'createdAt') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    // Handle string fields
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
    }
    if (typeof bValue === 'string') {
      bValue = bValue.toLowerCase()
    }

    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    return sortOrder.value === 'asc' ? comparison : -comparison
  })

  return sorted
})

// Methods
const loadPasswords = async (append = false) => {
  if (!append) loading.value = true
  else loadingMore.value = true

  try {
    const result = await vaultService.searchItems(searchFilters.value, {
      limit: 20,
      cursor: append ? currentCursor.value : undefined
    })

    const passwordItems = result.items.filter(item => item.type === 'password') as PasswordVaultItem[]

    if (append) {
      passwords.value = [...passwords.value, ...passwordItems]
    } else {
      passwords.value = passwordItems
    }

    hasMore.value = result.hasMore
    currentCursor.value = result.nextCursor
  } catch (error) {
    console.error('Failed to load passwords:', error)
    // TODO: Show error notification
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadMore = () => {
  if (hasMore.value && !loadingMore.value) {
    loadPasswords(true)
  }
}

const loadFolders = async () => {
  try {
    folders.value = await vaultService.getFolders()
  } catch (error) {
    console.error('Failed to load folders:', error)
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure you want to delete this password? This action cannot be undone.')) {
    return
  }

  try {
    await vaultService.deleteItem(id)
    passwords.value = passwords.value.filter((p: PasswordVaultItem) => p.id !== id)
    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to delete password:', error)
    // TODO: Show error notification
  }
}

const toggleFavorite = async (item: PasswordVaultItem) => {
  try {
    const updated = await vaultService.updateItem(item.id, {
      favorite: !item.favorite
    }) as PasswordVaultItem

    const index = passwords.value.findIndex((p: PasswordVaultItem) => p.id === item.id)
    if (index > -1) {
      passwords.value[index] = updated
    }
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
    // TODO: Show error notification
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // TODO: Show error notification
  }
}

// Watchers
watch([searchQuery, selectedFolder, showFavoritesOnly], () => {
  loadPasswords()
}, { deep: true })

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadPasswords(),
    loadFolders()
  ])
})
</script>

<style scoped>
.password-list {
  @apply space-y-6;
}

.list-header {
  @apply flex items-center justify-between gap-4 flex-wrap;
}

.search-section {
  @apply flex items-center gap-3 flex-1 min-w-0;
}

.search-input {
  @apply flex-1 min-w-0;
}

.filters {
  @apply flex items-center gap-2;
}

.filter-select {
  @apply px-3 py-2 border border-neutral-300 rounded-lg text-sm;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.filter-btn {
  @apply p-2 border border-neutral-300 rounded-lg text-neutral-600;
  @apply hover:bg-neutral-50 transition-colors;
}

.filter-btn.active {
  @apply bg-primary-50 border-primary-300 text-primary-600;
}

.list-controls {
  @apply flex items-center justify-between py-4 border-b border-neutral-200;
}

.view-options {
  @apply flex items-center gap-1 p-1 bg-neutral-100 rounded-lg;
}

.view-btn {
  @apply p-2 rounded-md text-neutral-600 hover:text-neutral-900 transition-colors;
}

.view-btn.active {
  @apply bg-white text-primary-600 shadow-sm;
}

.sort-options {
  @apply flex items-center gap-2;
}

.sort-label {
  @apply text-sm font-medium text-neutral-700;
}

.sort-select {
  @apply px-3 py-1 border border-neutral-300 rounded text-sm;
  @apply focus:ring-1 focus:ring-primary-500 focus:border-primary-500;
}

.sort-direction-btn {
  @apply p-1 text-neutral-600 hover:text-neutral-900 transition-colors;
}

.loading-state {
  @apply flex flex-col items-center justify-center py-12 text-neutral-500;
}

.loading-text {
  @apply mt-3 text-sm;
}

.empty-state {
  @apply text-center py-12;
}

.empty-icon {
  @apply w-16 h-16 mx-auto text-neutral-400 mb-4;
}

.empty-title {
  @apply text-lg font-semibold text-neutral-900 mb-2;
}

.empty-description {
  @apply text-neutral-600 mb-6 max-w-md mx-auto;
}

.password-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.password-list-view {
  @apply space-y-2;
}

.load-more-section {
  @apply pt-6;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .filter-select,
  .sort-select {
    @apply bg-neutral-700 border-neutral-600 text-neutral-100;
  }

  .filter-btn {
    @apply border-neutral-600 text-neutral-400;
  }

  .filter-btn:hover {
    @apply bg-neutral-700;
  }

  .filter-btn.active {
    @apply bg-primary-900 border-primary-700 text-primary-300;
  }

  .list-controls {
    @apply border-neutral-700;
  }

  .view-options {
    @apply bg-neutral-700;
  }

  .view-btn.active {
    @apply bg-neutral-600 text-primary-400;
  }

  .sort-label {
    @apply text-neutral-300;
  }

  .empty-title {
    @apply text-neutral-100;
  }

  .empty-description {
    @apply text-neutral-400;
  }
}
</style>
