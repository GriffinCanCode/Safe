<template>
  <MainLayout>
    <div class="files-view">
    <!-- Header -->
    <div class="files-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">Files</h1>
          <p class="page-description">Securely store and manage your files with zero-knowledge encryption</p>
        </div>
        
        <div class="header-actions">
          <BaseButton
            variant="outline"
            @click="showUploadModal = true"
            icon="upload"
          >
            Upload Files
          </BaseButton>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ fileStats.totalFiles }}</div>
            <div class="stat-label">Total Files</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatFileSize(fileStats.totalSize) }}</div>
            <div class="stat-label">Total Size</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ fileStats.sharedFiles }}</div>
            <div class="stat-label">Shared Files</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ fileStats.favoriteFiles }}</div>
            <div class="stat-label">Favorites</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="files-content">
      <!-- File Explorer -->
      <FileExplorer
        :folder="currentFolder"
        :selected-file-ids="selectedFileIds"
        @upload-files="showUploadModal = true"
        @file-open="handleFileOpen"
        @file-share="handleFileShare"
        @file-download="handleFileDownload"
        @selection-change="handleSelectionChange"
      />
    </div>

    <!-- Upload Modal -->
    <BaseModal
      v-if="showUploadModal"
      title="Upload Files"
      size="lg"
      @close="showUploadModal = false"
    >
      <FileUpload
        :folder="currentFolder"
        @upload-complete="handleUploadComplete"
        @upload-error="handleUploadError"
      />
    </BaseModal>

    <!-- File Preview Modal -->
    <BaseModal
      v-if="showPreviewModal && selectedFile"
      :title="selectedFile.name"
      size="xl"
      @close="closePreview"
    >
      <div class="preview-container">
        <FilePreview
          :file="selectedFile"
          @preview-error="handlePreviewError"
        />
        
        <div class="preview-actions">
          <FileDownload
            :file="selectedFile"
            variant="outline"
          >
            Download
          </FileDownload>
          
          <FileSharing
            :file="selectedFile"
            @share-created="handleShareCreated"
            @share-error="handleShareError"
          />
          
          <BaseButton
            variant="ghost"
            @click="closePreview"
          >
            Close
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Bulk Actions Bar -->
    <div v-if="selectedFileIds.length > 0" class="bulk-actions-bar">
      <div class="bulk-info">
        <span class="selected-count">{{ selectedFileIds.length }} file(s) selected</span>
      </div>
      
      <div class="bulk-actions">
        <BaseButton
          variant="outline"
          size="sm"
          @click="downloadSelectedFiles"
          :loading="bulkDownloading"
        >
          Download All
        </BaseButton>
        
        <BaseButton
          variant="outline"
          size="sm"
          @click="deleteSelectedFiles"
          :loading="bulkDeleting"
          class="text-red-600 hover:text-red-700"
        >
          Delete
        </BaseButton>
        
        <BaseButton
          variant="ghost"
          size="sm"
          @click="clearSelection"
        >
          Clear Selection
        </BaseButton>
      </div>
    </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import FileExplorer from '@/components/files/FileExplorer.vue'
import FileUpload from '@/components/files/FileUpload.vue'
import FilePreview from '@/components/files/FilePreview.vue'
import FileDownload from '@/components/files/FileDownload.vue'
import FileSharing from '@/components/files/FileSharing.vue'
import { fileService, type FileMetadata } from '@/services/file.service'

// State
const showUploadModal = ref(false)
const showPreviewModal = ref(false)
const selectedFile = ref<FileMetadata | undefined>(undefined)
const selectedFileIds = ref<string[]>([])
const currentFolder = ref('')
const bulkDownloading = ref(false)
const bulkDeleting = ref(false)

const fileStats = reactive({
  totalFiles: 0,
  totalSize: 0,
  sharedFiles: 0,
  favoriteFiles: 0
})

// Methods
const loadFileStats = async () => {
  try {
    const result = await fileService.searchFiles({}, { limit: 1000 })
    const files = result.files

    fileStats.totalFiles = files.length
    fileStats.totalSize = files.reduce((sum, file) => sum + file.size, 0)
    fileStats.sharedFiles = files.filter(file => file.shared).length
    fileStats.favoriteFiles = files.filter(file => file.favorite).length
  } catch (error) {
    console.error('Failed to load file stats:', error)
  }
}

const handleFileOpen = (file: FileMetadata) => {
  selectedFile.value = file
  showPreviewModal.value = true
}

const handleFileShare = (file: FileMetadata) => {
  selectedFile.value = file
  // FileSharing component will handle the modal
}

const handleFileDownload = (file: FileMetadata) => {
  // FileDownload component will handle the download
}

const handleSelectionChange = (fileIds: string[]) => {
  selectedFileIds.value = fileIds
}

const handleUploadComplete = (files: FileMetadata[]) => {
  showUploadModal.value = false
  loadFileStats()
  
  // Show success notification
  const count = files.length
  addNotification({
    type: 'success',
    title: 'Upload Complete',
    message: `Successfully uploaded ${count} file${count > 1 ? 's' : ''}`,
    dismissible: true,
    duration: 5000
  })
}

const handleUploadError = (error: string) => {
  addNotification({
    type: 'error',
    title: 'Upload Failed',
    message: error,
    dismissible: true,
    duration: 5000
  })
}

const handlePreviewError = (error: string) => {
  addNotification({
    type: 'error',
    title: 'Preview Error',
    message: error,
    dismissible: true,
    duration: 5000
  })
}

const handleShareCreated = (shareId: string) => {
  loadFileStats()
  addNotification({
    type: 'success',
    title: 'File Shared',
    message: 'File has been shared successfully',
    dismissible: true,
    duration: 5000
  })
}

const handleShareError = (error: string) => {
  addNotification({
    type: 'error',
    title: 'Share Failed',
    message: error,
    dismissible: true,
    duration: 5000
  })
}

const closePreview = () => {
  showPreviewModal.value = false
  selectedFile.value = undefined
}

const downloadSelectedFiles = async () => {
  if (selectedFileIds.value.length === 0) return
  
  bulkDownloading.value = true
  
  try {
    // Download files one by one
    for (const fileId of selectedFileIds.value) {
      const file = await fileService.getFile(fileId)
      if (file) {
        const result = await fileService.downloadFile(fileId)
        
        // Create download link
        const url = URL.createObjectURL(result.blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    }
    
    addNotification({
      type: 'success',
      title: 'Download Complete',
      message: `Downloaded ${selectedFileIds.value.length} files`,
      dismissible: true,
      duration: 5000
    })
    
    clearSelection()
  } catch (error: any) {
    addNotification({
      type: 'error',
      title: 'Download Failed',
      message: error.message || 'Failed to download files',
      dismissible: true,
      duration: 5000
    })
  } finally {
    bulkDownloading.value = false
  }
}

const deleteSelectedFiles = async () => {
  if (selectedFileIds.value.length === 0) return
  
  const confirmed = confirm(`Are you sure you want to delete ${selectedFileIds.value.length} file(s)? This action cannot be undone.`)
  if (!confirmed) return
  
  bulkDeleting.value = true
  
  try {
    // Delete files one by one
    for (const fileId of selectedFileIds.value) {
      await fileService.deleteFile(fileId)
    }
    
    addNotification({
      type: 'success',
      title: 'Files Deleted',
      message: `Deleted ${selectedFileIds.value.length} files`,
      dismissible: true,
      duration: 5000
    })
    
    clearSelection()
    loadFileStats()
  } catch (error: any) {
    addNotification({
      type: 'error',
      title: 'Delete Failed',
      message: error.message || 'Failed to delete files',
      dismissible: true,
      duration: 5000
    })
  } finally {
    bulkDeleting.value = false
  }
}

const clearSelection = () => {
  selectedFileIds.value = []
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Global notification function (would be provided by parent or store)
const addNotification = (notification: any) => {
  // This would typically come from a global store or be injected
  console.log('Notification:', notification)
}

// Lifecycle
onMounted(() => {
  loadFileStats()
})
</script>

<style scoped>
.files-view {
  @apply min-h-screen bg-neutral-50;
}

.files-header {
  @apply bg-white border-b border-neutral-200 px-6 py-8;
}

.header-content {
  @apply flex items-start justify-between mb-8;
}

.header-info {
  @apply flex-1;
}

.page-title {
  @apply text-3xl font-bold text-neutral-900 mb-2;
}

.page-description {
  @apply text-neutral-600 max-w-2xl;
}

.header-actions {
  @apply flex gap-3;
}

.stats-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6;
}

.stat-card {
  @apply bg-white p-6 rounded-lg border border-neutral-200 shadow-sm;
}

.stat-icon {
  @apply mb-4;
}

.stat-content {
  @apply space-y-1;
}

.stat-value {
  @apply text-2xl font-bold text-neutral-900;
}

.stat-label {
  @apply text-sm text-neutral-600;
}

.files-content {
  @apply p-6;
}

.preview-container {
  @apply space-y-6;
}

.preview-actions {
  @apply flex justify-end gap-3 pt-4 border-t border-neutral-200;
}

.bulk-actions-bar {
  @apply fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-neutral-200 rounded-lg shadow-lg px-6 py-4 flex items-center justify-between gap-6 z-40;
  @apply min-w-96;
}

.bulk-info {
  @apply flex items-center;
}

.selected-count {
  @apply text-sm font-medium text-neutral-700;
}

.bulk-actions {
  @apply flex gap-3;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .files-view {
    @apply bg-neutral-900;
  }

  .files-header {
    @apply bg-neutral-800 border-neutral-700;
  }

  .page-title {
    @apply text-neutral-100;
  }

  .page-description {
    @apply text-neutral-400;
  }

  .stat-card {
    @apply bg-neutral-800 border-neutral-700;
  }

  .stat-value {
    @apply text-neutral-100;
  }

  .stat-label {
    @apply text-neutral-400;
  }

  .preview-actions {
    @apply border-neutral-700;
  }

  .bulk-actions-bar {
    @apply bg-neutral-800 border-neutral-700;
  }

  .selected-count {
    @apply text-neutral-300;
  }
}
</style>
