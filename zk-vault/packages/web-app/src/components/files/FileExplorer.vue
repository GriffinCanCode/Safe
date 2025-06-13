<template>
  <div class="file-explorer">
    <!-- Header with Search and Actions -->
    <div class="explorer-header">
      <div class="search-section">
        <div class="search-input-wrapper">
          <svg class="search-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search files..."
            class="search-input"
            @input="handleSearch"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="clear-search"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div class="header-actions">
        <div class="view-controls">
          <button
            @click="viewMode = 'grid'"
            :class="{ active: viewMode === 'grid' }"
            class="view-button"
            title="Grid view"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            @click="viewMode = 'list'"
            :class="{ active: viewMode === 'list' }"
            class="view-button"
            title="List view"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <BaseButton
          variant="primary"
          @click="$emit('upload-files')"
          icon="upload"
        >
          Upload Files
        </BaseButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label class="filter-label">Type:</label>
        <select v-model="filters.type" @change="applyFilters" class="filter-select">
          <option value="">All types</option>
          <option value="document">Documents</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="archive">Archives</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Folder:</label>
        <select v-model="filters.folder" @change="applyFilters" class="filter-select">
          <option value="">All folders</option>
          <option v-for="folder in folders" :key="folder" :value="folder">
            {{ folder }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Sort by:</label>
        <select v-model="sortBy" @change="applySorting" class="filter-select">
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="type">Type</option>
          <option value="updatedAt">Modified</option>
          <option value="createdAt">Created</option>
        </select>
      </div>

      <div class="filter-group">
        <button
          @click="toggleSortOrder"
          class="sort-order-button"
          :title="sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'"
        >
          <svg v-if="sortOrder === 'asc'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
          </svg>
        </button>
      </div>

      <div class="filter-actions">
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="clear-filters"
        >
          Clear filters
        </button>
      </div>
    </div>

    <!-- File Grid/List -->
    <div class="files-container">
      <div v-if="loading" class="loading-state">
        <LoadingSpinner class="w-8 h-8" />
        <p>Loading files...</p>
      </div>

      <div v-else-if="files.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg class="w-16 h-16 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
          </svg>
        </div>
        <h3 class="empty-title">No files found</h3>
        <p class="empty-description">
          {{ searchQuery ? 'Try adjusting your search or filters' : 'Upload some files to get started' }}
        </p>
        <BaseButton
          v-if="!searchQuery"
          variant="primary"
          @click="$emit('upload-files')"
          class="mt-4"
        >
          Upload Files
        </BaseButton>
      </div>

      <div v-else>
        <!-- Grid View -->
        <div v-if="viewMode === 'grid'" class="files-grid">
          <div
            v-for="file in files"
            :key="file.id"
            class="file-card"
            @click="selectFile(file)"
            @dblclick="$emit('file-open', file)"
            :class="{ selected: selectedFiles.includes(file.id) }"
          >
            <div class="file-thumbnail">
              <img
                v-if="file.thumbnail"
                :src="file.thumbnail"
                :alt="file.name"
                class="thumbnail-image"
              />
              <div v-else class="file-icon">
                <component :is="getFileIcon(file.type)" class="w-8 h-8" />
              </div>
            </div>

            <div class="file-info">
              <div class="file-name" :title="file.name">{{ file.name }}</div>
              <div class="file-meta">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="file-date">{{ formatDate(file.updatedAt) }}</span>
              </div>
            </div>

            <div class="file-actions">
              <button
                @click.stop="toggleFavorite(file)"
                class="action-button"
                :class="{ active: file.favorite }"
                title="Toggle favorite"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>

              <button
                @click.stop="$emit('file-share', file)"
                class="action-button"
                title="Share file"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
              </button>

              <button
                @click.stop="$emit('file-download', file)"
                class="action-button"
                title="Download file"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div v-else class="files-list">
          <div class="list-header">
            <div class="header-cell name-header">Name</div>
            <div class="header-cell size-header">Size</div>
            <div class="header-cell type-header">Type</div>
            <div class="header-cell date-header">Modified</div>
            <div class="header-cell actions-header">Actions</div>
          </div>

          <div
            v-for="file in files"
            :key="file.id"
            class="file-row"
            @click="selectFile(file)"
            @dblclick="$emit('file-open', file)"
            :class="{ selected: selectedFiles.includes(file.id) }"
          >
            <div class="row-cell name-cell">
              <div class="file-icon-small">
                <component :is="getFileIcon(file.type)" class="w-5 h-5" />
              </div>
              <span class="file-name-text" :title="file.name">{{ file.name }}</span>
              <svg v-if="file.favorite" class="favorite-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>

            <div class="row-cell size-cell">{{ formatFileSize(file.size) }}</div>
            <div class="row-cell type-cell">{{ getFileTypeLabel(file.type) }}</div>
            <div class="row-cell date-cell">{{ formatDate(file.updatedAt) }}</div>

            <div class="row-cell actions-cell">
              <button
                @click.stop="toggleFavorite(file)"
                class="list-action-button"
                :class="{ active: file.favorite }"
                title="Toggle favorite"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>

              <button
                @click.stop="$emit('file-share', file)"
                class="list-action-button"
                title="Share file"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
              </button>

              <button
                @click.stop="$emit('file-download', file)"
                class="list-action-button"
                title="Download file"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="files.length > 0 && hasMore" class="pagination">
      <BaseButton
        variant="outline"
        @click="loadMore"
        :loading="loadingMore"
      >
        Load More Files
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { fileService, type FileMetadata, type FileSearchFilters } from '@/services/file.service'

interface Props {
  folder?: string
  selectedFileIds?: string[]
}

interface Emits {
  (e: 'upload-files'): void
  (e: 'file-open', file: FileMetadata): void
  (e: 'file-share', file: FileMetadata): void
  (e: 'file-download', file: FileMetadata): void
  (e: 'selection-change', fileIds: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  folder: '',
  selectedFileIds: () => []
})

const emit = defineEmits<Emits>()

// State
const files = ref<FileMetadata[]>([])
const folders = ref<string[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const selectedFiles = ref<string[]>([])
const sortBy = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

const filters = reactive<FileSearchFilters>({
  query: '',
  type: undefined as FileSearchFilters['type'],
  folder: props.folder || undefined
})

// Computed
const hasActiveFilters = computed(() => {
  return !!(filters.query || filters.type || filters.folder)
})

// Methods
const loadFiles = async (append = false) => {
  if (!append) {
    loading.value = true
    files.value = []
  } else {
    loadingMore.value = true
  }

  try {
    const result = await fileService.searchFiles(filters, { limit: 50 })
    
    if (append) {
      files.value.push(...result.files)
    } else {
      files.value = result.files
    }
    
    hasMore.value = result.hasMore
    applySorting()
  } catch (error) {
    console.error('Failed to load files:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const loadFolders = async () => {
  try {
    folders.value = await fileService.getFolders()
  } catch (error) {
    console.error('Failed to load folders:', error)
  }
}

const handleSearch = () => {
  filters.query = searchQuery.value
  applyFilters()
}

const clearSearch = () => {
  searchQuery.value = ''
  filters.query = ''
  applyFilters()
}

const applyFilters = () => {
  loadFiles()
}

const applySorting = () => {
  files.value.sort((a: FileMetadata, b: FileMetadata) => {
    let aValue: any
    let bValue: any

    switch (sortBy.value) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'size':
        aValue = a.size
        bValue = b.size
        break
      case 'type':
        aValue = a.type
        bValue = b.type
        break
      case 'updatedAt':
        aValue = a.updatedAt.getTime()
        bValue = b.updatedAt.getTime()
        break
      case 'createdAt':
        aValue = a.createdAt.getTime()
        bValue = b.createdAt.getTime()
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  applySorting()
}

const clearFilters = () => {
  searchQuery.value = ''
  filters.query = ''
  filters.type = undefined
  filters.folder = props.folder || undefined
  loadFiles()
}

const selectFile = (file: FileMetadata) => {
  const index = selectedFiles.value.indexOf(file.id)
  if (index >= 0) {
    selectedFiles.value.splice(index, 1)
  } else {
    selectedFiles.value.push(file.id)
  }
  emit('selection-change', selectedFiles.value)
}

const toggleFavorite = async (file: FileMetadata) => {
  try {
    await fileService.updateFile(file.id, { favorite: !file.favorite })
    file.favorite = !file.favorite
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
  }
}

const loadMore = () => {
  loadFiles(true)
}

const getFileIcon = (type: string) => {
  // Return appropriate icon component based on file type
  // For now, using a generic file icon
  return 'svg'
}

const getFileTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    document: 'Document',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    archive: 'Archive',
    other: 'Other'
  }
  return labels[type] || 'Unknown'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Watchers
watch(() => props.folder, (newFolder: string) => {
  filters.folder = newFolder || undefined
  loadFiles()
})

watch(() => props.selectedFileIds, (newSelection: string[]) => {
  selectedFiles.value = [...newSelection]
})

watch(sortBy, () => {
  applySorting()
})

// Lifecycle
onMounted(() => {
  loadFiles()
  loadFolders()
})
</script>

<style scoped>
.file-explorer {
  @apply space-y-6;
}

.explorer-header {
  @apply flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between;
}

.search-section {
  @apply flex-1 max-w-md;
}

.search-input-wrapper {
  @apply relative;
}

.search-icon {
  @apply absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400;
}

.search-input {
  @apply w-full pl-10 pr-10 py-2 border border-neutral-300 rounded-lg;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.clear-search {
  @apply absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600;
}

.header-actions {
  @apply flex items-center gap-4;
}

.view-controls {
  @apply flex border border-neutral-300 rounded-lg overflow-hidden;
}

.view-button {
  @apply px-3 py-2 text-neutral-600 hover:bg-neutral-100 transition-colors;
}

.view-button.active {
  @apply bg-primary-100 text-primary-700;
}

.filters-section {
  @apply flex flex-wrap items-center gap-4 p-4 bg-neutral-50 rounded-lg;
}

.filter-group {
  @apply flex items-center gap-2;
}

.filter-label {
  @apply text-sm font-medium text-neutral-700;
}

.filter-select {
  @apply px-3 py-1 border border-neutral-300 rounded text-sm;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.sort-order-button {
  @apply p-1 text-neutral-600 hover:text-neutral-800 transition-colors;
}

.filter-actions {
  @apply ml-auto;
}

.clear-filters {
  @apply text-sm text-primary-600 hover:text-primary-800 underline;
}

.files-container {
  @apply min-h-96;
}

.loading-state,
.empty-state {
  @apply flex flex-col items-center justify-center py-16 text-center;
}

.empty-icon {
  @apply mb-4;
}

.empty-title {
  @apply text-lg font-semibold text-neutral-900 mb-2;
}

.empty-description {
  @apply text-neutral-600;
}

.files-grid {
  @apply grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4;
}

.file-card {
  @apply relative p-4 border border-neutral-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer;
}

.file-card.selected {
  @apply border-primary-500 bg-primary-50;
}

.file-thumbnail {
  @apply mb-3 flex justify-center;
}

.thumbnail-image {
  @apply w-16 h-16 object-cover rounded;
}

.file-icon {
  @apply w-16 h-16 flex items-center justify-center text-neutral-400;
}

.file-info {
  @apply space-y-1;
}

.file-name {
  @apply font-medium text-sm text-neutral-900 truncate;
}

.file-meta {
  @apply text-xs text-neutral-500 space-y-1;
}

.file-actions {
  @apply absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity;
}

.file-card:hover .file-actions {
  @apply opacity-100;
}

.action-button {
  @apply p-1 text-neutral-400 hover:text-neutral-600 transition-colors;
}

.action-button.active {
  @apply text-yellow-500;
}

.files-list {
  @apply bg-white border border-neutral-200 rounded-lg overflow-hidden;
}

.list-header {
  @apply grid grid-cols-12 gap-4 p-4 bg-neutral-50 border-b border-neutral-200 font-medium text-sm text-neutral-700;
}

.header-cell {
  @apply truncate;
}

.name-header {
  @apply col-span-5;
}

.size-header {
  @apply col-span-2;
}

.type-header {
  @apply col-span-2;
}

.date-header {
  @apply col-span-2;
}

.actions-header {
  @apply col-span-1;
}

.file-row {
  @apply grid grid-cols-12 gap-4 p-4 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer;
}

.file-row.selected {
  @apply bg-primary-50;
}

.row-cell {
  @apply flex items-center truncate text-sm;
}

.name-cell {
  @apply col-span-5 gap-3;
}

.file-icon-small {
  @apply flex-shrink-0 text-neutral-400;
}

.file-name-text {
  @apply truncate;
}

.favorite-icon {
  @apply w-4 h-4 text-yellow-500 flex-shrink-0;
}

.size-cell {
  @apply col-span-2 text-neutral-600;
}

.type-cell {
  @apply col-span-2 text-neutral-600;
}

.date-cell {
  @apply col-span-2 text-neutral-600;
}

.actions-cell {
  @apply col-span-1 gap-1;
}

.list-action-button {
  @apply p-1 text-neutral-400 hover:text-neutral-600 transition-colors;
}

.list-action-button.active {
  @apply text-yellow-500;
}

.pagination {
  @apply flex justify-center;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .search-input {
    @apply bg-neutral-800 border-neutral-600 text-neutral-100;
  }

  .view-button {
    @apply text-neutral-400 hover:bg-neutral-700;
  }

  .view-button.active {
    @apply bg-primary-900/30 text-primary-400;
  }

  .filters-section {
    @apply bg-neutral-800;
  }

  .filter-label {
    @apply text-neutral-300;
  }

  .filter-select {
    @apply bg-neutral-700 border-neutral-600 text-neutral-100;
  }

  .clear-filters {
    @apply text-primary-400 hover:text-primary-300;
  }

  .empty-title {
    @apply text-neutral-100;
  }

  .empty-description {
    @apply text-neutral-400;
  }

  .file-card {
    @apply bg-neutral-800 border-neutral-700;
  }

  .file-card.selected {
    @apply border-primary-600 bg-primary-900/20;
  }

  .file-name {
    @apply text-neutral-100;
  }

  .file-meta {
    @apply text-neutral-400;
  }

  .files-list {
    @apply bg-neutral-800 border-neutral-700;
  }

  .list-header {
    @apply bg-neutral-700 border-neutral-600 text-neutral-300;
  }

  .file-row {
    @apply border-neutral-700 hover:bg-neutral-700;
  }

  .file-row.selected {
    @apply bg-primary-900/20;
  }

  .size-cell,
  .type-cell,
  .date-cell {
    @apply text-neutral-400;
  }
}
</style>
