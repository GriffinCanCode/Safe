/**
 * @fileoverview File Storage Composable
 * @description Provides file upload, download, and management functionality
 */

import { ref, computed, onMounted } from 'vue';
import {
  fileService,
  type FileMetadata,
  type FileUploadOptions,
  type FileUploadProgress,
  type FileDownloadResult,
  type FileSearchFilters,
  type FileSearchResult,
  type FileType,
} from '@/services/file.service';

export interface UseFileStorageOptions {
  autoLoad?: boolean;
  pageSize?: number;
}

export interface FileUploadConfig extends FileUploadOptions {
  onProgress?: (progress: FileUploadProgress) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<FileType, number>;
  sizeByType: Record<FileType, number>;
}

export function useFileStorage(options: UseFileStorageOptions = {}) {
  // Local state
  const isLoading = ref(false);
  const isUploading = ref(false);
  const isDownloading = ref(false);
  const fileError = ref<string | null>(null);
  const files = ref<FileMetadata[]>([]);
  const selectedFiles = ref<string[]>([]);
  const uploadProgress = ref<FileUploadProgress[]>([]);
  const searchQuery = ref('');
  const currentFilters = ref<FileSearchFilters>({});
  const hasMore = ref(false);
  const nextCursor = ref<string | undefined>(undefined);

  // Computed properties
  const filteredFiles = computed(() => {
    let result = files.value;

    // Apply search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (file: FileMetadata) =>
          file.name.toLowerCase().includes(query) ||
          file.originalName.toLowerCase().includes(query) ||
          (file.description && file.description.toLowerCase().includes(query)) ||
          file.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (currentFilters.value.type) {
      result = result.filter((file: FileMetadata) => file.type === currentFilters.value.type);
    }

    if (currentFilters.value.folder) {
      result = result.filter((file: FileMetadata) => file.folder === currentFilters.value.folder);
    }

    if (currentFilters.value.favorite !== undefined) {
      result = result.filter(
        (file: FileMetadata) => file.favorite === currentFilters.value.favorite
      );
    }

    if (currentFilters.value.shared !== undefined) {
      result = result.filter((file: FileMetadata) => file.shared === currentFilters.value.shared);
    }

    if (currentFilters.value.tags?.length) {
      result = result.filter((file: FileMetadata) =>
        currentFilters.value.tags!.some((tag: string) => file.tags.includes(tag))
      );
    }

    return result;
  });

  const filesByType = computed(() => {
    const grouped: Record<FileType, FileMetadata[]> = {
      document: [],
      image: [],
      video: [],
      audio: [],
      archive: [],
      other: [],
    };

    filteredFiles.value.forEach((file: FileMetadata) => {
      grouped[file.type as FileType].push(file);
    });

    return grouped;
  });

  const favoriteFiles = computed(() =>
    filteredFiles.value.filter((file: FileMetadata) => file.favorite)
  );

  const recentFiles = computed(() =>
    [...filteredFiles.value]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
  );

  const fileStats = computed((): FileStats => {
    const stats: FileStats = {
      totalFiles: files.value.length,
      totalSize: 0,
      filesByType: {
        document: 0,
        image: 0,
        video: 0,
        audio: 0,
        archive: 0,
        other: 0,
      },
      sizeByType: {
        document: 0,
        image: 0,
        video: 0,
        audio: 0,
        archive: 0,
        other: 0,
      },
    };

    files.value.forEach((file: FileMetadata) => {
      stats.totalSize += file.size;
      stats.filesByType[file.type]++;
      stats.sizeByType[file.type] += file.size;
    });

    return stats;
  });

  const isSelectionMode = computed(() => selectedFiles.value.length > 0);

  // File management methods
  const loadFiles = async (loadMore = false): Promise<void> => {
    if (isLoading.value) return;

    isLoading.value = true;
    fileError.value = null;

    try {
      const cursor = loadMore ? nextCursor.value : undefined;
      const result: FileSearchResult = await fileService.searchFiles(currentFilters.value, {
        limit: options.pageSize || 50,
        cursor,
      });

      if (loadMore && nextCursor.value) {
        files.value = [...files.value, ...result.files];
      } else {
        files.value = result.files;
      }

      hasMore.value = result.hasMore;
      nextCursor.value = result.nextCursor;
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const uploadFile = async (file: File, config: FileUploadConfig = {}): Promise<FileMetadata> => {
    try {
      fileError.value = null;
      isUploading.value = true;

      // Validate file size
      if (config.maxFileSize && file.size > config.maxFileSize) {
        throw new Error(`File size exceeds maximum limit of ${config.maxFileSize / 1024 / 1024}MB`);
      }

      // Validate file type
      if (config.allowedTypes && !config.allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed`);
      }

      const onProgress = (progress: FileUploadProgress) => {
        // Update progress tracking
        const existingIndex = uploadProgress.value.findIndex(
          (p: FileUploadProgress) => p.fileId === progress.fileId
        );
        if (existingIndex >= 0) {
          uploadProgress.value[existingIndex] = progress;
        } else {
          uploadProgress.value.push(progress);
        }

        // Call user-provided progress callback
        config.onProgress?.(progress);

        // Remove completed uploads from progress tracking
        if (progress.status === 'completed' || progress.status === 'error') {
          setTimeout(() => {
            uploadProgress.value = uploadProgress.value.filter(
              (p: FileUploadProgress) => p.fileId !== progress.fileId
            );
          }, 2000);
        }
      };

      // Build upload options, only including defined properties
      const uploadOptions: FileUploadOptions = {};
      if (config.folder !== undefined) {
        uploadOptions.folder = config.folder;
      }
      if (config.tags !== undefined) {
        uploadOptions.tags = config.tags;
      }
      if (config.description !== undefined) {
        uploadOptions.description = config.description;
      }
      if (config.generateThumbnail !== undefined) {
        uploadOptions.generateThumbnail = config.generateThumbnail;
      }

      const metadata = await fileService.uploadFile(file, uploadOptions, onProgress);

      // Add to files list
      files.value.unshift(metadata);

      return metadata;
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    } finally {
      isUploading.value = false;
    }
  };

  const uploadMultipleFiles = async (
    fileList: FileList | File[],
    config: FileUploadConfig = {}
  ): Promise<FileMetadata[]> => {
    const filesArray = Array.from(fileList);
    const results: FileMetadata[] = [];
    const errors: string[] = [];

    for (const file of filesArray) {
      try {
        const metadata = await uploadFile(file, config);
        results.push(metadata);
      } catch (error: any) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      fileError.value = `Some files failed to upload: ${errors.join(', ')}`;
    }

    return results;
  };

  const downloadFile = async (fileId: string): Promise<FileDownloadResult> => {
    try {
      fileError.value = null;
      isDownloading.value = true;

      const result = await fileService.downloadFile(fileId);

      // Trigger browser download
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return result;
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    } finally {
      isDownloading.value = false;
    }
  };

  const getFile = async (fileId: string): Promise<FileMetadata | null> => {
    try {
      fileError.value = null;
      return await fileService.getFile(fileId);
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    }
  };

  const updateFile = async (
    fileId: string,
    updates: Partial<Pick<FileMetadata, 'name' | 'folder' | 'tags' | 'description' | 'favorite'>>
  ): Promise<FileMetadata> => {
    try {
      fileError.value = null;
      const updatedFile = await fileService.updateFile(fileId, updates);

      // Update in local state
      const index = files.value.findIndex((f: FileMetadata) => f.id === fileId);
      if (index >= 0) {
        files.value[index] = updatedFile;
      }

      return updatedFile;
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    }
  };

  const deleteFile = async (fileId: string): Promise<void> => {
    try {
      fileError.value = null;
      await fileService.deleteFile(fileId);

      // Remove from local state
      files.value = files.value.filter((f: FileMetadata) => f.id !== fileId);
      selectedFiles.value = selectedFiles.value.filter((id: string) => id !== fileId);
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    }
  };

  // Search and filtering
  const setSearchQuery = (query: string): void => {
    searchQuery.value = query;
  };

  const setFilters = (filters: FileSearchFilters): void => {
    currentFilters.value = { ...filters };
  };

  const clearFilters = (): void => {
    currentFilters.value = {};
    searchQuery.value = '';
  };

  const searchFiles = async (query?: string, filters?: FileSearchFilters): Promise<void> => {
    if (query !== undefined) {
      setSearchQuery(query);
    }
    if (filters) {
      setFilters(filters);
    }
    await loadFiles();
  };

  // Selection management
  const selectFile = (fileId: string): void => {
    if (!selectedFiles.value.includes(fileId)) {
      selectedFiles.value.push(fileId);
    }
  };

  const deselectFile = (fileId: string): void => {
    selectedFiles.value = selectedFiles.value.filter((id: string) => id !== fileId);
  };

  const toggleFileSelection = (fileId: string): void => {
    if (selectedFiles.value.includes(fileId)) {
      deselectFile(fileId);
    } else {
      selectFile(fileId);
    }
  };

  const selectAllFiles = (): void => {
    selectedFiles.value = filteredFiles.value.map((f: FileMetadata) => f.id);
  };

  const clearSelection = (): void => {
    selectedFiles.value = [];
  };

  // Bulk operations
  const deleteSelectedFiles = async (): Promise<void> => {
    try {
      fileError.value = null;
      await Promise.all(selectedFiles.value.map((id: string) => fileService.deleteFile(id)));

      // Remove from local state
      files.value = files.value.filter((f: FileMetadata) => !selectedFiles.value.includes(f.id));
      clearSelection();
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    }
  };

  const moveSelectedToFolder = async (folder: string): Promise<void> => {
    try {
      fileError.value = null;
      await Promise.all(
        selectedFiles.value.map((id: string) => fileService.updateFile(id, { folder }))
      );

      // Update local state
      files.value = files.value.map((file: FileMetadata) =>
        selectedFiles.value.includes(file.id) ? { ...file, folder } : file
      );

      clearSelection();
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    }
  };

  const addTagsToSelected = async (tags: string[]): Promise<void> => {
    try {
      fileError.value = null;

      for (const fileId of selectedFiles.value) {
        const file = files.value.find((f: FileMetadata) => f.id === fileId);
        if (file) {
          const updatedTags = [...new Set([...file.tags, ...tags])];
          await fileService.updateFile(fileId, { tags: updatedTags });

          // Update local state
          const index = files.value.findIndex((f: FileMetadata) => f.id === fileId);
          if (index >= 0) {
            files.value[index] = { ...files.value[index], tags: updatedTags };
          }
        }
      }

      clearSelection();
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    }
  };

  // Favorites management
  const toggleFavorite = async (fileId: string): Promise<void> => {
    const file = files.value.find((f: FileMetadata) => f.id === fileId);
    if (file) {
      await updateFile(fileId, { favorite: !file.favorite });
    }
  };

  // Folder and tag management
  const getFolders = async (): Promise<string[]> => {
    try {
      return await fileService.getFolders();
    } catch (error: any) {
      fileError.value = error.message;
      return [];
    }
  };

  const getTags = async (): Promise<string[]> => {
    try {
      return await fileService.getTags();
    } catch (error: any) {
      fileError.value = error.message;
      return [];
    }
  };

  // File sharing
  const shareFile = async (fileId: string, shareSettings: any): Promise<string> => {
    try {
      fileError.value = null;
      const shareId = await fileService.shareFile(fileId, shareSettings);

      // Update local state
      const index = files.value.findIndex((f: FileMetadata) => f.id === fileId);
      if (index >= 0) {
        files.value[index] = {
          ...files.value[index],
          shared: true,
          shareSettings: { ...shareSettings, shareId, downloadCount: 0 },
        };
      }

      return shareId;
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    }
  };

  const unshareFile = async (fileId: string): Promise<void> => {
    try {
      fileError.value = null;
      await fileService.unshareFile(fileId);

      // Update local state
      const index = files.value.findIndex((f: FileMetadata) => f.id === fileId);
      if (index >= 0) {
        files.value[index] = {
          ...files.value[index],
          shared: false,
          shareSettings: undefined,
        };
      }
    } catch (error: any) {
      fileError.value = error.message;
      throw error;
    }
  };

  // Utility methods
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive';
    return 'file';
  };

  const clearError = (): void => {
    fileError.value = null;
  };

  const refresh = async (): Promise<void> => {
    await loadFiles();
  };

  // Initialize
  const initialize = async (): Promise<void> => {
    if (options.autoLoad !== false) {
      await loadFiles();
    }
  };

  // Lifecycle hooks
  onMounted(() => {
    initialize();
  });

  return {
    // State
    files,
    filteredFiles,
    filesByType,
    favoriteFiles,
    recentFiles,
    fileStats,
    selectedFiles,
    isSelectionMode,
    uploadProgress,
    searchQuery,
    currentFilters,
    isLoading,
    isUploading,
    isDownloading,
    hasMore,
    fileError,

    // File operations
    uploadFile,
    uploadMultipleFiles,
    downloadFile,
    getFile,
    updateFile,
    deleteFile,
    loadFiles,

    // Search and filtering
    setSearchQuery,
    setFilters,
    clearFilters,
    searchFiles,

    // Selection
    selectFile,
    deselectFile,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,

    // Bulk operations
    deleteSelectedFiles,
    moveSelectedToFolder,
    addTagsToSelected,

    // Favorites
    toggleFavorite,

    // Folders and tags
    getFolders,
    getTags,

    // Sharing
    shareFile,
    unshareFile,

    // Utilities
    formatFileSize,
    getFileIcon,
    clearError,
    refresh,
  };
}
