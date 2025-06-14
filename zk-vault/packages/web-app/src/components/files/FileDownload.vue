<template>
  <div class="file-download">
    <BaseButton
      v-bind="{
        ...(variant && { variant }),
        ...(size && { size }),
        ...(icon && { icon }),
        ...(disabled !== undefined && { disabled }),
      }"
      :loading="downloading"
      @click="handleDownload"
    >
      <slot>{{ downloadText }}</slot>
    </BaseButton>

    <!-- Download Progress Modal -->
    <BaseModal :model-value="showProgress" title="Downloading File" @close="cancelDownload">
      <div class="download-progress">
        <div class="progress-info">
          <div class="file-icon">
            <svg class="h-8 w-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="file-details">
            <h3 class="file-name">{{ file?.name || 'Unknown file' }}</h3>
            <p class="file-size">{{ file ? formatFileSize(file.size) : '' }}</p>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-bar">
            <div
              class="progress-fill dynamic-progress"
              :style="{ '--progress-width': `${downloadProgress}%` }"
            />
          </div>
          <div class="progress-text">
            <span class="progress-percentage">{{ downloadProgress }}%</span>
            <span class="progress-status">{{ progressStatus }}</span>
          </div>
        </div>

        <div v-if="error" class="error-message">
          <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span>{{ error }}</span>
        </div>

        <div class="modal-actions">
          <BaseButton v-if="!completed && !error" variant="ghost" @click="cancelDownload">
            Cancel
          </BaseButton>
          <BaseButton v-if="completed" variant="primary" @click="closeProgress"> Done </BaseButton>
          <BaseButton v-if="error" variant="outline" @click="retryDownload"> Retry </BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { fileService, type FileMetadata } from '@/services/file.service';

interface Props {
  file?: FileMetadata;
  fileId?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: string;
  showProgress?: boolean;
  autoDownload?: boolean;
}

interface Emits {
  (e: 'download-start', file: FileMetadata): void;
  (e: 'download-progress', progress: number): void;
  (e: 'download-complete', file: FileMetadata, blob: Blob): void;
  (e: 'download-error', error: string): void;
  (e: 'download-cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'outline',
  size: 'md',
  disabled: false,
  icon: 'download',
  showProgress: true,
  autoDownload: false,
});

const emit = defineEmits<Emits>();

// State
const downloading = ref(false);
const downloadProgress = ref(0);
const progressStatus = ref('');
const error = ref('');
const completed = ref(false);
const showProgressModal = ref(false);
const currentFile = ref<FileMetadata | undefined>(undefined);

// Computed
const downloadText = computed(() => {
  if (downloading.value) return 'Downloading...';
  return 'Download';
});

const showProgress = computed(() => {
  return props.showProgress && showProgressModal.value;
});

const file = computed(() => {
  return props.file || currentFile.value;
});

// Methods
const handleDownload = async () => {
  if (downloading.value || props.disabled) return;

  try {
    let targetFile = props.file;

    // If no file provided but fileId is available, fetch the file
    if (!targetFile && props.fileId) {
      const fetchedFile = await fileService.getFile(props.fileId);
      if (!fetchedFile) {
        throw new Error('File not found');
      }
      targetFile = fetchedFile;
      currentFile.value = fetchedFile;
    }

    if (!targetFile) {
      throw new Error('No file specified for download');
    }

    await downloadFile(targetFile);
  } catch (err: any) {
    handleError(err.message || 'Failed to download file');
  }
};

const downloadFile = async (fileToDownload: FileMetadata) => {
  downloading.value = true;
  downloadProgress.value = 0;
  progressStatus.value = 'Preparing download...';
  error.value = '';
  completed.value = false;

  if (props.showProgress) {
    showProgressModal.value = true;
  }

  emit('download-start', fileToDownload);

  try {
    // Simulate progress for decryption phase
    progressStatus.value = 'Decrypting file...';
    downloadProgress.value = 20;
    emit('download-progress', downloadProgress.value);

    // Download and decrypt the file
    const result = await fileService.downloadFile(fileToDownload.id);

    progressStatus.value = 'Processing...';
    downloadProgress.value = 80;
    emit('download-progress', downloadProgress.value);

    // Create download link and trigger download
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    progressStatus.value = 'Download complete';
    downloadProgress.value = 100;
    completed.value = true;
    emit('download-progress', downloadProgress.value);
    emit('download-complete', fileToDownload, result.blob);

    // Auto-close progress modal after a delay
    if (props.showProgress) {
      setTimeout(() => {
        closeProgress();
      }, 2000);
    }
  } catch (err: any) {
    handleError(err.message || 'Download failed');
  } finally {
    downloading.value = false;
  }
};

const handleError = (errorMessage: string) => {
  error.value = errorMessage;
  progressStatus.value = 'Download failed';
  emit('download-error', errorMessage);
};

const cancelDownload = () => {
  downloading.value = false;
  showProgressModal.value = false;
  downloadProgress.value = 0;
  progressStatus.value = '';
  error.value = '';
  completed.value = false;
  emit('download-cancel');
};

const closeProgress = () => {
  showProgressModal.value = false;
  downloadProgress.value = 0;
  progressStatus.value = '';
  error.value = '';
  completed.value = false;
};

const retryDownload = () => {
  error.value = '';
  if (file.value) {
    downloadFile(file.value);
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Auto-download if enabled
if (props.autoDownload && (props.file || props.fileId)) {
  handleDownload();
}
</script>
