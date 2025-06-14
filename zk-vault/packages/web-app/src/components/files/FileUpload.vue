<template>
  <div class="file-upload">
    <!-- Upload Area -->
    <div
      ref="dropZone"
      class="upload-zone"
      :class="{
        'drag-over': isDragOver,
        uploading: isUploading,
        disabled: disabled,
      }"
      @click="triggerFileSelect"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div class="upload-content">
        <div class="upload-icon">
          <svg
            v-if="!isUploading"
            class="h-12 w-12 text-neutral-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          <LoadingSpinner v-else class="h-12 w-12" />
        </div>

        <div class="upload-text">
          <h3 class="upload-title">
            {{ isUploading ? 'Uploading files...' : 'Upload files' }}
          </h3>
          <p class="upload-description">
            {{
              isUploading
                ? `${uploadProgress.length} file(s) uploading`
                : 'Drag and drop files here, or click to select'
            }}
          </p>
          <p class="upload-limits">Maximum file size: {{ maxFileSizeMB }}MB</p>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        multiple
        v-bind="{ ...(acceptedTypes && { accept: acceptedTypes }) }"
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
            :value="uploadOptions.description || ''"
            @input="uploadOptions.description = ($event.target as HTMLTextAreaElement).value"
            placeholder="Optional description for the files"
            :rows="2"
            class="option-textarea"
          />
        </label>
      </div>

      <div class="option-group">
        <label class="option-checkbox">
          <input v-model="uploadOptions.generateThumbnail" type="checkbox" />
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
          :class="{ error: progress.status === 'error' }"
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
                'bg-blue-600': progress.status === 'uploading' || progress.status === 'encrypting',
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
        <BaseButton v-if="hasCompletedUploads" variant="ghost" @click="clearCompleted">
          Clear Completed
        </BaseButton>
        <BaseButton v-if="hasActiveUploads" variant="outline" @click="cancelUploads">
          Cancel All
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import BaseButton from '@/components/common/BaseButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import {
  fileService,
  type FileUploadProgress,
  type FileUploadOptions,
} from '@/services/file.service';

interface Props {
  disabled?: boolean;
  acceptedTypes?: string;
  maxFileSizeMB?: number;
  showOptions?: boolean;
  folder?: string;
}

interface Emits {
  (e: 'upload-complete', files: any[]): void;
  (e: 'upload-error', error: string): void;
  (e: 'upload-progress', progress: FileUploadProgress[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  acceptedTypes: '*/*',
  maxFileSizeMB: 100,
  showOptions: true,
  folder: '',
});

const emit = defineEmits<Emits>();

// Refs
const dropZone = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// State
const isDragOver = ref(false);
const isUploading = ref(false);
const uploadProgress = ref<FileUploadProgress[]>([]);
const folders = ref<string[]>([]);
const tagsInput = ref('');

const uploadOptions = reactive<FileUploadOptions>({
  folder: props.folder,
  tags: [],
  description: '',
  generateThumbnail: true,
});

// Computed
const hasActiveUploads = computed(() =>
  uploadProgress.value.some(
    (p: FileUploadProgress) => p.status === 'uploading' || p.status === 'encrypting'
  )
);

const hasCompletedUploads = computed(() =>
  uploadProgress.value.some(
    (p: FileUploadProgress) => p.status === 'completed' || p.status === 'error'
  )
);

// Methods
const triggerFileSelect = () => {
  if (!props.disabled && !isUploading.value) {
    fileInput.value?.click();
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  if (files.length > 0) {
    uploadFiles(files);
  }
  // Clear input to allow re-selecting the same file
  target.value = '';
};

const handleDragOver = (event: DragEvent) => {
  if (props.disabled || isUploading.value) return;
  isDragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  if (props.disabled || isUploading.value) return;
  isDragOver.value = false;
};

const handleDrop = (event: DragEvent) => {
  if (props.disabled || isUploading.value) return;

  isDragOver.value = false;
  const files = Array.from(event.dataTransfer?.files || []);

  if (files.length > 0) {
    uploadFiles(files);
  }
};

const uploadFiles = async (files: File[]) => {
  // Validate files
  const validFiles = files.filter(file => {
    if (file.size > props.maxFileSizeMB * 1024 * 1024) {
      emit('upload-error', `File "${file.name}" exceeds maximum size of ${props.maxFileSizeMB}MB`);
      return false;
    }
    return true;
  });

  if (validFiles.length === 0) return;

  isUploading.value = true;

  // Parse tags
  const tags = tagsInput.value
    .split(',')
    .map((tag: string) => tag.trim())
    .filter((tag: string) => tag.length > 0);

  const options: FileUploadOptions = {
    ...uploadOptions,
    tags,
  };

  const uploadedFiles: any[] = [];

  // Upload files sequentially to avoid overwhelming the system
  for (const file of validFiles) {
    try {
      const uploadedFile = await fileService.uploadFile(file, options, progress => {
        updateProgress(progress);
        emit('upload-progress', uploadProgress.value);
      });

      uploadedFiles.push(uploadedFile);
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      emit('upload-error', `Failed to upload "${file.name}": ${errorMessage}`);
    }
  }

  isUploading.value = false;

  if (uploadedFiles.length > 0) {
    emit('upload-complete', uploadedFiles);
  }
};

const updateProgress = (progress: FileUploadProgress) => {
  const existingIndex = uploadProgress.value.findIndex(
    (p: FileUploadProgress) => p.fileId === progress.fileId
  );

  if (existingIndex >= 0) {
    uploadProgress.value[existingIndex] = progress;
  } else {
    uploadProgress.value.push(progress);
  }
};

const getStatusText = (progress: FileUploadProgress): string => {
  switch (progress.status) {
    case 'uploading':
      return 'Uploading...';
    case 'encrypting':
      return 'Encrypting...';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
    default:
      return 'Processing...';
  }
};

const clearCompleted = () => {
  uploadProgress.value = uploadProgress.value.filter(
    (p: FileUploadProgress) => p.status !== 'completed' && p.status !== 'error'
  );
};

const cancelUploads = () => {
  // In a real implementation, this would cancel ongoing uploads
  uploadProgress.value = [];
  isUploading.value = false;
};

const loadFolders = async () => {
  try {
    folders.value = await fileService.getFolders();
  } catch (error: unknown) {
    console.error('Failed to load folders:', error);
  }
};

// Lifecycle
onMounted(() => {
  loadFolders();
});

// Cleanup
onUnmounted(() => {
  // Cancel any ongoing uploads
  if (isUploading.value) {
    cancelUploads();
  }
});
</script>

<!-- CSS classes are now defined in /styles/components/files/file-upload.css -->
