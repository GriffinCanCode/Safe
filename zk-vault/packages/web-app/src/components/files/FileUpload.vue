<template>
  <div class="file-upload">
    <!-- Upload Area -->
    <div
      ref="dropZone"
      class="upload-zone"
      :class="{
        'drag-over': isDragOver,
        'uploading': isUploading,
        'disabled': disabled
      }"
      @click="triggerFileSelect"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div class="upload-content">
        <div class="upload-icon">
          <svg v-if="!isUploading" class="w-12 h-12 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          <LoadingSpinner v-else class="w-12 h-12" />
        </div>
        
        <div class="upload-text">
          <h3 class="upload-title">
            {{ isUploading ? 'Uploading files...' : 'Upload files' }}
          </h3>
          <p class="upload-description">
            {{ isUploading ? `${uploadProgress.length} file(s) uploading` : 'Drag and drop files here, or click to select' }}
          </p>
          <p class="upload-limits">
            Maximum file size: {{ maxFileSizeMB }}MB
          </p>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        multiple
        :accept="acceptedTypes"
        :disabled="disabled || isUploading"
        @change="handleFileSelect"
        class="file-input"
      />
    </div>

    <!-- Upload Options -->
    <div v-if="showOptions && !isUploading" class="upload-options">
      <div class="option-group">
        <label class="option-label">
          Folder
          <select v-model="uploadOptions.folder" class="option-select">
            <option value="">No folder</option>
            <option v-for="folder in folders" :key="folder" :value="folder">
              {{ folder }}
            </option>
          </select>
        </label>
      </div>

      <div class="option-group">
        <label class="option-label">
          Tags (comma separated)
          <input
            v-model="tagsInput"
            type="text"
            placeholder="e.g. work, important, project"
            class="option-input"
          />
        </label>
      </div>

      <div class="option-group">
        <label class="option-label">
          Description
          <textarea
            v-model="uploadOptions.description"
            placeholder="Optional description for the files"
            rows="2"
            class="option-textarea"
          />
        </label>
      </div>

      <div class="option-group">
        <label class="option-checkbox">
          <input
            v-model="uploadOptions.generateThumbnail"
            type="checkbox"
          />
          <span class="checkbox-label">Generate thumbnails for images</span>
        </label>
      </div>
    </div>

    <!-- Upload Progress -->
    <div v-if="uploadProgress.length > 0" class="upload-progress">
      <h4 class="progress-title">Upload Progress</h4>
      <div class="progress-list">
        <div
          v-for="progress in uploadProgress"
          :key="progress.fileId"
          class="progress-item"
          :class="{ 'error': progress.status === 'error' }"
        >
          <div class="progress-info">
            <div class="progress-name">{{ progress.fileName }}</div>
            <div class="progress-status">
              <span class="status-text">{{ getStatusText(progress) }}</span>
              <span v-if="progress.status !== 'error'" class="status-percentage">
                {{ progress.progress }}%
              </span>
            </div>
          </div>
          
          <div class="progress-bar">
            <div
              class="progress-fill dynamic-progress"
              :class="{
                'bg-primary-600': progress.status === 'completed',
                'bg-red-600': progress.status === 'error',
                'bg-blue-600': progress.status === 'uploading' || progress.status === 'encrypting'
              }"
              :style="{ '--progress-width': `${progress.progress}%` }"
            />
          </div>

          <div v-if="progress.error" class="progress-error">
            {{ progress.error }}
          </div>
        </div>
      </div>

      <div class="progress-actions">
        <BaseButton
          v-if="hasCompletedUploads"
          variant="ghost"
          @click="clearCompleted"
        >
          Clear Completed
        </BaseButton>
        <BaseButton
          v-if="hasActiveUploads"
          variant="outline"
          @click="cancelUploads"
        >
          Cancel All
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import BaseButton from '@/components/common/BaseButton.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { fileService, type FileUploadProgress, type FileUploadOptions } from '@/services/file.service'

interface Props {
  disabled?: boolean
  acceptedTypes?: string
  maxFileSizeMB?: number
  showOptions?: boolean
  folder?: string
}

interface Emits {
  (e: 'upload-complete', files: any[]): void
  (e: 'upload-error', error: string): void
  (e: 'upload-progress', progress: FileUploadProgress[]): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  acceptedTypes: '*/*',
  maxFileSizeMB: 100,
  showOptions: true,
  folder: ''
})

const emit = defineEmits<Emits>()

// Refs
const dropZone = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// State
const isDragOver = ref(false)
const isUploading = ref(false)
const uploadProgress = ref<FileUploadProgress[]>([])
const folders = ref<string[]>([])
const tagsInput = ref('')

const uploadOptions = reactive<FileUploadOptions>({
  folder: props.folder,
  tags: [],
  description: '',
  generateThumbnail: true
})

// Computed
const hasActiveUploads = computed(() =>
  uploadProgress.value.some((p: FileUploadProgress) => p.status === 'uploading' || p.status === 'encrypting')
)

const hasCompletedUploads = computed(() =>
  uploadProgress.value.some((p: FileUploadProgress) => p.status === 'completed' || p.status === 'error')
)

// Methods
const triggerFileSelect = () => {
  if (!props.disabled && !isUploading.value) {
    fileInput.value?.click()
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length > 0) {
    uploadFiles(files)
  }
  // Clear input to allow re-selecting the same file
  target.value = ''
}

const handleDragOver = (event: DragEvent) => {
  if (props.disabled || isUploading.value) return
  isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  if (props.disabled || isUploading.value) return
  isDragOver.value = false
}

const handleDrop = (event: DragEvent) => {
  if (props.disabled || isUploading.value) return
  
  isDragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  
  if (files.length > 0) {
    uploadFiles(files)
  }
}

const uploadFiles = async (files: File[]) => {
  // Validate files
  const validFiles = files.filter(file => {
    if (file.size > props.maxFileSizeMB * 1024 * 1024) {
      emit('upload-error', `File "${file.name}" exceeds maximum size of ${props.maxFileSizeMB}MB`)
      return false
    }
    return true
  })

  if (validFiles.length === 0) return

  isUploading.value = true
  
  // Parse tags
  const tags = tagsInput.value
    .split(',')
    .map((tag: string) => tag.trim())
    .filter((tag: string) => tag.length > 0)

  const options: FileUploadOptions = {
    ...uploadOptions,
    tags
  }

  const uploadedFiles: any[] = []

  // Upload files sequentially to avoid overwhelming the system
  for (const file of validFiles) {
    try {
      const uploadedFile = await fileService.uploadFile(file, options, (progress) => {
        updateProgress(progress)
        emit('upload-progress', uploadProgress.value)
      })
      
      uploadedFiles.push(uploadedFile)
    } catch (error: any) {
      console.error('Upload failed:', error)
      emit('upload-error', `Failed to upload "${file.name}": ${error.message}`)
    }
  }

  isUploading.value = false
  
  if (uploadedFiles.length > 0) {
    emit('upload-complete', uploadedFiles)
  }
}

const updateProgress = (progress: FileUploadProgress) => {
  const existingIndex = uploadProgress.value.findIndex((p: FileUploadProgress) => p.fileId === progress.fileId)
  
  if (existingIndex >= 0) {
    uploadProgress.value[existingIndex] = progress
  } else {
    uploadProgress.value.push(progress)
  }
}

const getStatusText = (progress: FileUploadProgress): string => {
  switch (progress.status) {
    case 'uploading':
      return 'Uploading...'
    case 'encrypting':
      return 'Encrypting...'
    case 'completed':
      return 'Completed'
    case 'error':
      return 'Error'
    default:
      return 'Processing...'
  }
}

const clearCompleted = () => {
  uploadProgress.value = uploadProgress.value.filter(
    (p: FileUploadProgress) => p.status !== 'completed' && p.status !== 'error'
  )
}

const cancelUploads = () => {
  // In a real implementation, this would cancel ongoing uploads
  uploadProgress.value = []
  isUploading.value = false
}

const loadFolders = async () => {
  try {
    folders.value = await fileService.getFolders()
  } catch (error) {
    console.error('Failed to load folders:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadFolders()
})

// Cleanup
onUnmounted(() => {
  // Cancel any ongoing uploads
  if (isUploading.value) {
    cancelUploads()
  }
})
</script>

<style scoped>
.file-upload {
  @apply space-y-6;
}

.upload-zone {
  @apply relative border-2 border-dashed border-neutral-300 rounded-lg p-8;
  @apply hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer;
}

.upload-zone.drag-over {
  @apply border-primary-500 bg-primary-100;
}

.upload-zone.uploading {
  @apply border-blue-400 bg-blue-50 cursor-not-allowed;
}

.upload-zone.disabled {
  @apply border-neutral-200 bg-neutral-50 cursor-not-allowed;
}

.upload-content {
  @apply flex flex-col items-center text-center space-y-4;
}

.upload-icon {
  @apply flex justify-center;
}

.upload-text {
  @apply space-y-2;
}

.upload-title {
  @apply text-lg font-semibold text-neutral-900;
}

.upload-description {
  @apply text-neutral-600;
}

.upload-limits {
  @apply text-sm text-neutral-500;
}

.file-input {
  @apply absolute inset-0 w-full h-full opacity-0 cursor-pointer;
}

.upload-options {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg;
}

.option-group {
  @apply space-y-2;
}

.option-label {
  @apply block text-sm font-medium text-neutral-700;
}

.option-select,
.option-input {
  @apply mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.option-textarea {
  @apply mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md resize-none;
  @apply focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.option-checkbox {
  @apply flex items-center space-x-2 cursor-pointer;
}

.checkbox-label {
  @apply text-sm text-neutral-700;
}

.upload-progress {
  @apply space-y-4;
}

.progress-title {
  @apply text-lg font-semibold text-neutral-900;
}

.progress-list {
  @apply space-y-3;
}

.progress-item {
  @apply p-4 bg-white border border-neutral-200 rounded-lg space-y-3;
}

.progress-item.error {
  @apply border-red-200 bg-red-50;
}

.progress-info {
  @apply flex justify-between items-start;
}

.progress-name {
  @apply font-medium text-neutral-900 truncate;
}

.progress-status {
  @apply flex items-center space-x-2 text-sm;
}

.status-text {
  @apply text-neutral-600;
}

.status-percentage {
  @apply font-medium text-neutral-900;
}

.progress-bar {
  @apply w-full bg-neutral-200 rounded-full h-2;
}

.progress-fill {
  @apply h-2 rounded-full transition-all duration-300;
}

.progress-error {
  @apply text-sm text-red-600 mt-2;
}

.progress-actions {
  @apply flex justify-end space-x-3;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .upload-zone {
    @apply border-neutral-600 hover:border-primary-500 hover:bg-primary-900/20;
  }

  .upload-zone.drag-over {
    @apply border-primary-400 bg-primary-900/30;
  }

  .upload-zone.uploading {
    @apply border-blue-500 bg-blue-900/20;
  }

  .upload-zone.disabled {
    @apply border-neutral-700 bg-neutral-800;
  }

  .upload-title {
    @apply text-neutral-100;
  }

  .upload-description {
    @apply text-neutral-400;
  }

  .upload-limits {
    @apply text-neutral-500;
  }

  .upload-options {
    @apply bg-neutral-800;
  }

  .option-label {
    @apply text-neutral-300;
  }

  .option-select,
  .option-input,
  .option-textarea {
    @apply bg-neutral-700 border-neutral-600 text-neutral-100;
  }

  .checkbox-label {
    @apply text-neutral-300;
  }

  .progress-title {
    @apply text-neutral-100;
  }

  .progress-item {
    @apply bg-neutral-800 border-neutral-700;
  }

  .progress-item.error {
    @apply border-red-700 bg-red-900/20;
  }

  .progress-name {
    @apply text-neutral-100;
  }

  .status-text {
    @apply text-neutral-400;
  }

  .status-percentage {
    @apply text-neutral-100;
  }

  .progress-bar {
    @apply bg-neutral-700;
  }

  .progress-error {
    @apply text-red-400;
  }
}
</style>
