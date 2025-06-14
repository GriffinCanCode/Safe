<template>
  <div class="file-preview">
    <div v-if="loading" class="preview-loading">
      <LoadingSpinner class="h-8 w-8" />
      <p>Loading preview...</p>
    </div>

    <div v-else-if="error" class="preview-error">
      <div class="error-icon">
        <svg class="h-12 w-12 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <h3 class="error-title">Preview not available</h3>
      <p class="error-message">{{ error }}</p>
      <BaseButton variant="outline" @click="retryPreview" class="mt-4"> Retry </BaseButton>
    </div>

    <div v-else-if="!canPreview" class="preview-unavailable">
      <div class="unavailable-icon">
        <svg class="h-12 w-12 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <h3 class="unavailable-title">Preview not supported</h3>
      <p class="unavailable-message">
        This file type cannot be previewed. You can download it to view the content.
      </p>
      <FileDownload
        v-if="file || fileId"
        v-bind="{
          ...(file && { file }),
          ...(fileId && { 'file-id': fileId }),
        }"
        variant="primary"
        class="mt-4"
      >
        Download File
      </FileDownload>
    </div>

    <div v-else class="preview-content">
      <!-- Image Preview -->
      <div v-if="file?.type === 'image'" class="image-preview">
        <img
          :src="previewUrl"
          :alt="file.name"
          class="preview-image"
          @load="onImageLoad"
          @error="onImageError"
        />
        <div class="image-info">
          <div class="info-item">
            <span class="info-label">Dimensions:</span>
            <span class="info-value">{{ imageInfo.width }} × {{ imageInfo.height }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Size:</span>
            <span class="info-value">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
      </div>

      <!-- Text Preview -->
      <div v-else-if="file?.type === 'document' && isTextFile" class="text-preview">
        <div class="text-header">
          <h3 class="text-title">{{ file.name }}</h3>
          <div class="text-actions">
            <button
              @click="toggleWordWrap"
              class="action-button"
              :class="{ active: wordWrap }"
              title="Toggle word wrap"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="text-content">
          <pre :class="{ 'word-wrap': wordWrap }" class="text-display">{{ textContent }}</pre>
        </div>
      </div>

      <!-- Video Preview -->
      <div v-else-if="file?.type === 'video'" class="video-preview">
        <video
          :src="previewUrl"
          controls
          class="preview-video"
          @loadedmetadata="onVideoLoad"
          @error="onVideoError"
        >
          Your browser does not support video playback.
        </video>
        <div class="video-info">
          <div class="info-item">
            <span class="info-label">Duration:</span>
            <span class="info-value">{{ formatDuration(videoInfo.duration) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Size:</span>
            <span class="info-value">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
      </div>

      <!-- Audio Preview -->
      <div v-else-if="file?.type === 'audio'" class="audio-preview">
        <div class="audio-player">
          <audio
            :src="previewUrl"
            controls
            class="preview-audio"
            @loadedmetadata="onAudioLoad"
            @error="onAudioError"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
        <div class="audio-info">
          <div class="info-item">
            <span class="info-label">Duration:</span>
            <span class="info-value">{{ formatDuration(audioInfo.duration) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Size:</span>
            <span class="info-value">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
      </div>

      <!-- Thumbnail Preview for other types -->
      <div v-else-if="file?.thumbnail" class="thumbnail-preview">
        <img :src="file.thumbnail" :alt="file.name" class="preview-thumbnail" />
        <div class="thumbnail-info">
          <h3 class="thumbnail-title">{{ file.name }}</h3>
          <p class="thumbnail-type">{{ getFileTypeLabel(file.type) }}</p>
          <p class="thumbnail-size">{{ formatFileSize(file.size) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import BaseButton from '@/components/common/BaseButton.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import FileDownload from './FileDownload.vue';
import { fileService, type FileMetadata } from '@/services/file.service';

interface Props {
  file?: FileMetadata;
  fileId?: string;
  maxSize?: number; // Maximum file size to preview (in bytes)
}

interface Emits {
  (e: 'preview-load', file: FileMetadata): void;
  (e: 'preview-error', error: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  maxSize: 10 * 1024 * 1024, // 10MB default
});

const emit = defineEmits<Emits>();

// State
const loading = ref(false);
const error = ref('');
const previewUrl = ref('');
const textContent = ref('');
const wordWrap = ref(false);
const currentFile = ref<FileMetadata | undefined>(undefined);

const imageInfo = reactive({
  width: 0,
  height: 0,
});

const videoInfo = reactive({
  duration: 0,
});

const audioInfo = reactive({
  duration: 0,
});

// Computed
const file = computed(() => {
  return props.file || currentFile.value;
});

const canPreview = computed(() => {
  if (!file.value) return false;

  // Check file size limit
  if (file.value.size > props.maxSize) return false;

  // Check supported file types
  const supportedTypes = ['image', 'video', 'audio', 'document'];
  if (!supportedTypes.includes(file.value.type)) return false;

  // For documents, only preview text files
  if (file.value.type === 'document') {
    return isTextFile.value;
  }

  return true;
});

const isTextFile = computed(() => {
  if (!file.value) return false;

  const textMimeTypes = [
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'text/xml',
  ];

  return (
    textMimeTypes.includes(file.value.mimeType) ||
    file.value.name.match(/\.(txt|md|json|xml|html|css|js|ts|vue|py|java|cpp|c|h)$/i)
  );
});

// Methods
const loadPreview = async () => {
  if (!file.value || !canPreview.value) return;

  loading.value = true;
  error.value = '';

  try {
    const result = await fileService.downloadFile(file.value.id);
    previewUrl.value = URL.createObjectURL(result.blob);

    // For text files, read the content
    if (file.value.type === 'document' && isTextFile.value) {
      textContent.value = await result.blob.text();
    }

    emit('preview-load', file.value);
  } catch (err: any) {
    error.value = err.message || 'Failed to load preview';
    emit('preview-error', error.value);
  } finally {
    loading.value = false;
  }
};

const retryPreview = () => {
  loadPreview();
};

const toggleWordWrap = () => {
  wordWrap.value = !wordWrap.value;
};

const onImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement;
  imageInfo.width = img.naturalWidth;
  imageInfo.height = img.naturalHeight;
};

const onImageError = () => {
  error.value = 'Failed to load image';
};

const onVideoLoad = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  videoInfo.duration = video.duration;
};

const onVideoError = () => {
  error.value = 'Failed to load video';
};

const onAudioLoad = (event: Event) => {
  const audio = event.target as HTMLAudioElement;
  audioInfo.duration = audio.duration;
};

const onAudioError = () => {
  error.value = 'Failed to load audio';
};

const getFileTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    document: 'Document',
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    archive: 'Archive',
    other: 'Other',
  };
  return labels[type] || 'Unknown';
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Watchers
watch(
  () => props.file,
  async (newFile: FileMetadata | undefined) => {
    if (newFile) {
      await loadPreview();
    }
  }
);

watch(
  () => props.fileId,
  async (newFileId: string | undefined) => {
    if (newFileId && !props.file) {
      try {
        const fetchedFile = await fileService.getFile(newFileId);
        if (fetchedFile) {
          currentFile.value = fetchedFile;
          await loadPreview();
        }
      } catch (err: any) {
        error.value = err.message || 'Failed to load file';
      }
    }
  }
);

// Lifecycle
onMounted(async () => {
  if (props.file) {
    await loadPreview();
  } else if (props.fileId) {
    try {
      const fetchedFile = await fileService.getFile(props.fileId);
      if (fetchedFile) {
        currentFile.value = fetchedFile;
        await loadPreview();
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to load file';
    }
  }
});

// Cleanup
const cleanup = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
};

// Cleanup on unmount
import { onUnmounted } from 'vue';
onUnmounted(cleanup);
</script>

<!-- CSS classes are now defined in /styles/components/files/file-preview.css -->
