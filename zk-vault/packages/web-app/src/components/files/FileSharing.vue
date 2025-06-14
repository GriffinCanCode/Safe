<template>
  <div class="file-sharing">
    <BaseModal
      :model-value="showModal"
      :title="file?.shared ? 'Manage File Sharing' : 'Share File'"
      @close="closeModal"
    >
      <div class="sharing-content">
        <!-- File Info -->
        <div class="file-info">
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
            <h3 class="file-name">{{ file?.name }}</h3>
            <p class="file-meta">
              {{ formatFileSize(file?.size || 0) }} • {{ getFileTypeLabel(file?.type || 'other') }}
            </p>
          </div>
        </div>

        <!-- Share Settings Form -->
        <div class="share-settings">
          <h4 class="settings-title">
            {{ file?.shared ? 'Update Share Settings' : 'Share Settings' }}
          </h4>

          <div class="settings-form">
            <!-- Permissions -->
            <div class="form-group">
              <label class="form-label">Permissions:</label>
              <div class="permissions-options">
                <label class="permission-option">
                  <input
                    v-model="shareSettings.allowPreview"
                    type="checkbox"
                    class="form-checkbox"
                  />
                  <span class="checkbox-label">Allow preview</span>
                </label>
                <label class="permission-option">
                  <input
                    v-model="shareSettings.allowDownload"
                    type="checkbox"
                    class="form-checkbox"
                  />
                  <span class="checkbox-label">Allow download</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <BaseButton variant="ghost" @click="closeModal"> Cancel </BaseButton>

          <BaseButton
            variant="primary"
            @click="shareFile"
            :loading="sharing"
            :disabled="!isFormValid"
          >
            {{ file?.shared ? 'Update Share' : 'Share File' }}
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <!-- Share Button -->
    <BaseButton
      v-if="!showModal"
      v-bind="{
        ...(variant && { variant }),
        ...(size && { size }),
        ...(icon && { icon }),
      }"
      @click="openModal"
    >
      <slot>{{ file?.shared ? 'Manage Share' : 'Share' }}</slot>
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { fileService, type FileMetadata, type FileShareSettings } from '@/services/file.service';

interface Props {
  file?: FileMetadata;
  fileId?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

interface Emits {
  (e: 'share-created', shareId: string): void;
  (e: 'share-updated', shareId: string): void;
  (e: 'share-error', error: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'outline',
  size: 'md',
  icon: 'share',
});

const emit = defineEmits<Emits>();

// State
const showModal = ref(false);
const sharing = ref(false);
const currentFile = ref<FileMetadata | undefined>(undefined);

const shareSettings = reactive({
  allowPreview: true,
  allowDownload: true,
});

// Computed
const file = computed(() => {
  return props.file || currentFile.value;
});

const isFormValid = computed(() => {
  return shareSettings.allowPreview || shareSettings.allowDownload;
});

// Methods
const openModal = async () => {
  if (!file.value && props.fileId) {
    try {
      const fetchedFile = await fileService.getFile(props.fileId);
      if (fetchedFile) {
        currentFile.value = fetchedFile;
      }
    } catch (error: any) {
      emit('share-error', error.message || 'Failed to load file');
      return;
    }
  }

  if (file.value) {
    loadCurrentSettings();
    showModal.value = true;
  }
};

const closeModal = () => {
  showModal.value = false;
};

const loadCurrentSettings = () => {
  if (!file.value?.shareSettings) return;

  const settings = file.value.shareSettings;
  shareSettings.allowPreview = settings.allowPreview;
  shareSettings.allowDownload = settings.allowDownload;
};

const shareFile = async () => {
  if (!file.value || !isFormValid.value) return;

  sharing.value = true;

  try {
    const settings: Omit<FileShareSettings, 'shareId' | 'downloadCount'> = {
      allowPreview: shareSettings.allowPreview,
      allowDownload: shareSettings.allowDownload,
    };

    const shareId = await fileService.shareFile(file.value.id, settings);
    emit('share-created', shareId);
    closeModal();
  } catch (error: any) {
    emit('share-error', error.message || 'Failed to share file');
  } finally {
    sharing.value = false;
  }
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
</script>

<!-- CSS classes are now defined in /styles/components/files/file-sharing.css -->
