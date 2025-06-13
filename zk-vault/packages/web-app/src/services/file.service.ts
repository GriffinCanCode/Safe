/**
 * @fileoverview File Service
 * @description Manages encrypted file storage and operations
 */

import { authService } from './auth.service';
import { cryptoVaultService } from './crypto-vault.service';
import { workerManager } from './worker-manager.service';

// File types
export type FileType = 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';

// File metadata interface
export interface FileMetadata {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  type: FileType;
  mimeType: string;
  size: number;
  folder?: string | undefined;
  tags: string[];
  description?: string | undefined;
  favorite: boolean;
  shared: boolean;
  shareSettings?: FileShareSettings | undefined;
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date | undefined;
  version: number;
  encryptedData: string; // Base64 encoded encrypted file data
  thumbnail?: string | undefined; // Base64 encoded thumbnail for images/videos
}

// File share settings
export interface FileShareSettings {
  shareId: string;
  expiresAt?: Date;
  password?: string;
  downloadLimit?: number;
  downloadCount: number;
  allowPreview: boolean;
  allowDownload: boolean;
}

// File upload options
export interface FileUploadOptions {
  folder?: string;
  tags?: string[];
  description?: string;
  generateThumbnail?: boolean;
  useWorker?: boolean;
  chunkSize?: number;
  priority?: 'low' | 'normal' | 'high';
}

// File search filters
export interface FileSearchFilters {
  query?: string | undefined;
  type?: FileType | undefined;
  folder?: string | undefined;
  tags?: string[] | undefined;
  favorite?: boolean | undefined;
  shared?: boolean | undefined;
  mimeType?: string | undefined;
}

// Pagination options
export interface PaginationOptions {
  limit: number;
  cursor?: string;
}

// File search result
export interface FileSearchResult {
  files: FileMetadata[];
  total: number;
  hasMore: boolean;
  nextCursor?: string | undefined;
}

// File upload progress
export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'encrypting' | 'completed' | 'error';
  error?: string;
  workerUsed?: boolean;
  metrics?: {
    duration: number;
    processingSpeed: number;
    memoryUsed: number;
  };
}

// File download result
export interface FileDownloadResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  metrics?: {
    duration: number;
    processingSpeed: number;
    workerUsed: boolean;
  };
}

class FileService {
  private static instance: FileService;
  private readonly STORAGE_KEY = 'zk-vault-files';
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly WORKER_THRESHOLD = 10 * 1024 * 1024; // 10MB - use worker for files larger than this
  private readonly THUMBNAIL_THRESHOLD = 5 * 1024 * 1024; // 5MB - use worker for thumbnail generation
  private readonly SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

  private constructor() {}

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * Upload a file with encryption and intelligent worker usage
   */
  async uploadFile(
    file: File,
    options: FileUploadOptions = {},
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileMetadata> {
    const startTime = performance.now();

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!cryptoVaultService.isInitialized()) {
        throw new Error('Vault not initialized');
      }

      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      const fileId = this.generateFileId();
      const now = new Date();

      // Determine if we should use workers
      const useWorker = options.useWorker ?? this.shouldUseWorkerForFile(file);
      const useWorkerForThumbnail =
        file.size > this.THUMBNAIL_THRESHOLD && this.canGenerateThumbnail(file.type);

      // Report upload start
      onProgress?.({
        fileId,
        fileName: file.name,
        progress: 0,
        status: 'uploading',
        workerUsed: useWorker,
      });

      // Read file data
      const fileData = await this.readFileAsArrayBuffer(file);

      onProgress?.({
        fileId,
        fileName: file.name,
        progress: 20,
        status: 'encrypting',
        workerUsed: useWorker,
      });

      // Encrypt file data using worker or main thread
      let encryptResult: any;
      let encryptionMetrics: any = {};

      if (useWorker && workerManager.isWorkerHealthy('fileProcessing')) {
        try {
          const workerStartTime = performance.now();

          const workerResult = await workerManager.sendMessage<{ encryptedData?: any }>(
            'fileProcessing',
            'encryptFile',
            {
              fileData: Array.from(new Uint8Array(fileData)),
              filename: file.name,
              mimeType: file.type,
              options: {
                chunkSize: options.chunkSize,
                priority: options.priority || 'normal',
              },
            },
            {
              priority: options.priority || 'normal',
              timeout: this.calculateTimeout(file.size),
            }
          );

          const workerDuration = performance.now() - workerStartTime;
          encryptionMetrics = {
            duration: workerDuration,
            processingSpeed: file.size / (workerDuration / 1000),
            workerUsed: true,
          };

          // Convert worker result to expected format
          encryptResult = {
            success: true,
            encryptedData: workerResult.encryptedData || workerResult,
          };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker encryption failed, falling back to main thread:', error);
          // Fallback to main thread
          const mainThreadResult = await this.encryptOnMainThread(fileData);
          encryptResult = mainThreadResult.result;
          encryptionMetrics = mainThreadResult.metrics;
        }
      } else {
        // Use main thread for smaller files or when worker not available
        const mainThreadResult = await this.encryptOnMainThread(fileData);
        encryptResult = mainThreadResult.result;
        encryptionMetrics = mainThreadResult.metrics;
      }

      if (!encryptResult.success || !encryptResult.encryptedData) {
        throw new Error(encryptResult.error || 'Failed to encrypt file');
      }

      onProgress?.({
        fileId,
        fileName: file.name,
        progress: 60,
        status: 'uploading',
        workerUsed: useWorker,
        metrics: encryptionMetrics,
      });

      // Generate thumbnail if needed
      let thumbnail: string | undefined;
      if (options.generateThumbnail && this.canGenerateThumbnail(file.type)) {
        try {
          if (useWorkerForThumbnail && workerManager.isWorkerHealthy('fileProcessing')) {
            try {
              const result = await workerManager.sendMessage<{ thumbnail?: string }>(
                'fileProcessing',
                'generateThumbnail',
                {
                  fileData: Array.from(new Uint8Array(fileData)),
                  mimeType: file.type,
                  filename: file.name,
                  options: {
                    maxWidth: 300,
                    maxHeight: 300,
                    quality: 0.8,
                  },
                },
                { priority: 'low' }
              );

              thumbnail = result.thumbnail;
            } catch (error) {
              // eslint-disable-next-line no-console
              console.warn(
                'Worker thumbnail generation failed, falling back to main thread:',
                error
              );
              thumbnail = await this.generateThumbnail(file);
            }
          } else {
            thumbnail = await this.generateThumbnail(file);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Failed to generate thumbnail:', error);
        }
      }

      onProgress?.({
        fileId,
        fileName: file.name,
        progress: 80,
        status: 'uploading',
        workerUsed: useWorker,
        metrics: encryptionMetrics,
      });

      // Create file metadata
      const fileMetadata: FileMetadata = {
        id: fileId,
        userId: user.uid,
        name: this.sanitizeFileName(file.name),
        originalName: file.name,
        type: this.getFileType(file.type),
        mimeType: file.type,
        size: file.size,
        folder: options.folder || undefined,
        tags: options.tags || [],
        description: options.description || undefined,
        favorite: false,
        shared: false,
        createdAt: now,
        updatedAt: now,
        version: 1,
        encryptedData: btoa(JSON.stringify(encryptResult.encryptedData)),
        thumbnail: thumbnail || undefined,
      };

      // Save to storage
      const files = this.getStoredFiles(user.uid);
      files.push(fileMetadata);
      this.saveStoredFiles(user.uid, files);

      const totalDuration = performance.now() - startTime;
      const finalMetrics = {
        ...encryptionMetrics,
        totalDuration,
        overallSpeed: file.size / (totalDuration / 1000),
      };

      onProgress?.({
        fileId,
        fileName: file.name,
        progress: 100,
        status: 'completed',
        workerUsed: useWorker,
        metrics: finalMetrics,
      });

      return fileMetadata;
    } catch (error: any) {
      const totalDuration = performance.now() - startTime;

      onProgress?.({
        fileId: '',
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: error.message,
        workerUsed: false,
        metrics: {
          duration: totalDuration,
          processingSpeed: 0,
          memoryUsed: 0,
        },
      });

      // eslint-disable-next-line no-console
      console.error('Failed to upload file:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download a file with decryption and intelligent worker usage
   */
  async downloadFile(
    fileId: string,
    options?: { useWorker?: boolean }
  ): Promise<FileDownloadResult> {
    const startTime = performance.now();

    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!cryptoVaultService.isInitialized()) {
        throw new Error('Vault not initialized');
      }

      const files = this.getStoredFiles(user.uid);
      const fileMetadata = files.find(f => f.id === fileId && f.userId === user.uid);

      if (!fileMetadata) {
        throw new Error('File not found');
      }

      // Update last accessed
      await this.updateLastAccessed(fileId);

      // Determine if we should use worker
      const useWorker =
        options?.useWorker ?? this.shouldUseWorkerForFile({ size: fileMetadata.size } as File);

      // Decrypt file data
      const encryptedData = JSON.parse(atob(fileMetadata.encryptedData));
      let decryptResult: any;
      let workerUsed = false;

      if (useWorker && workerManager.isWorkerHealthy('fileProcessing')) {
        try {
          const workerResult = await workerManager.sendMessage<{ fileData?: any }>(
            'fileProcessing',
            'decryptFile',
            {
              encryptedFile: encryptedData,
              filename: fileMetadata.originalName,
              mimeType: fileMetadata.mimeType,
            },
            {
              priority: 'normal',
              timeout: this.calculateTimeout(fileMetadata.size),
            }
          );

          decryptResult = {
            success: true,
            data: workerResult.fileData,
          };
          workerUsed = true;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker decryption failed, falling back to main thread:', error);
          // Fallback to main thread
          decryptResult = await cryptoVaultService.decryptItemData(encryptedData);
        }
      } else {
        // Use main thread
        decryptResult = await cryptoVaultService.decryptItemData(encryptedData);
      }

      if (!decryptResult.success || !decryptResult.data) {
        throw new Error(decryptResult.error || 'Failed to decrypt file');
      }

      // Convert back to binary data
      let bytes: Uint8Array;
      if (workerUsed && Array.isArray(decryptResult.data)) {
        // Worker returns array
        bytes = new Uint8Array(decryptResult.data);
      } else {
        // Main thread returns base64 string
        const binaryString = atob(decryptResult.data);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i += 1) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      }

      const blob = new Blob([bytes], { type: fileMetadata.mimeType });
      const duration = performance.now() - startTime;

      return {
        blob,
        filename: fileMetadata.originalName,
        mimeType: fileMetadata.mimeType,
        metrics: {
          duration,
          processingSpeed: fileMetadata.size / (duration / 1000),
          workerUsed,
        },
      };
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to download file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Batch upload multiple files efficiently
   */
  async batchUpload(
    files: File[],
    options: FileUploadOptions & { batchSize?: number } = {},
    onProgress?: (fileId: string, progress: FileUploadProgress) => void
  ): Promise<FileMetadata[]> {
    const batchSize = options.batchSize || 3; // Process 3 files concurrently
    const results: FileMetadata[] = [];

    // Process files in batches to avoid overwhelming the system
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const batchPromises = batch.map(async file => {
        const fileOptions = {
          ...options,
          // Use worker for large files in batch operations
          useWorker: file.size > this.WORKER_THRESHOLD / 2, // Lower threshold for batch
        };

        return this.uploadFile(
          file,
          fileOptions,
          onProgress ? progress => onProgress(progress.fileId, progress) : undefined
        );
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // eslint-disable-next-line no-console
          console.error('Batch upload failed for file:', result.reason);
        }
      });
    }

    return results;
  }

  /**
   * Batch download multiple files efficiently
   */
  async batchDownload(
    fileIds: string[],
    options: { batchSize?: number; useWorker?: boolean } = {}
  ): Promise<Array<{ fileId: string; result?: FileDownloadResult; error?: string }>> {
    const batchSize = options.batchSize || 3;
    const results: Array<{ fileId: string; result?: FileDownloadResult; error?: string }> = [];

    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async fileId => {
        try {
          const downloadOptions =
            options.useWorker !== undefined ? { useWorker: options.useWorker } : undefined;
          const result = await this.downloadFile(fileId, downloadOptions);
          return { fileId, result };
        } catch (error) {
          return {
            fileId,
            error: error instanceof Error ? error.message : 'Download failed',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get file metadata by ID
   */
  async getFile(fileId: string): Promise<FileMetadata | null> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const files = this.getStoredFiles(user.uid);
      const file = files.find(f => f.id === fileId && f.userId === user.uid);

      if (file) {
        await this.updateLastAccessed(fileId);
      }

      return file || null;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to get file:', error);
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  /**
   * Update file metadata
   */
  async updateFile(
    fileId: string,
    updates: Partial<Pick<FileMetadata, 'name' | 'folder' | 'tags' | 'description' | 'favorite'>>
  ): Promise<FileMetadata> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const files = this.getStoredFiles(user.uid);
      const fileIndex = files.findIndex(f => f.id === fileId && f.userId === user.uid);

      if (fileIndex === -1) {
        throw new Error('File not found');
      }

      const file = files[fileIndex];
      const updatedFile: FileMetadata = {
        ...file,
        ...updates,
        updatedAt: new Date(),
        version: file.version + 1,
      };

      files[fileIndex] = updatedFile;
      this.saveStoredFiles(user.uid, files);

      return updatedFile;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to update file:', error);
      throw new Error(`Failed to update file: ${error.message}`);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const files = this.getStoredFiles(user.uid);
      const filteredFiles = files.filter(f => !(f.id === fileId && f.userId === user.uid));

      if (filteredFiles.length === files.length) {
        throw new Error('File not found');
      }

      this.saveStoredFiles(user.uid, filteredFiles);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Search files with filters and pagination
   */
  async searchFiles(
    filters: FileSearchFilters = {},
    pagination: PaginationOptions = { limit: 50 }
  ): Promise<FileSearchResult> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      let files = this.getStoredFiles(user.uid);

      // Apply filters
      if (filters.type) {
        files = files.filter(f => f.type === filters.type);
      }

      if (filters.folder) {
        files = files.filter(f => f.folder === filters.folder);
      }

      if (filters.favorite !== undefined) {
        files = files.filter(f => f.favorite === filters.favorite);
      }

      if (filters.shared !== undefined) {
        files = files.filter(f => f.shared === filters.shared);
      }

      if (filters.mimeType) {
        files = files.filter(f => f.mimeType === filters.mimeType);
      }

      if (filters.tags?.length) {
        files = files.filter(f => filters.tags!.some(tag => f.tags.includes(tag)));
      }

      if (filters.query) {
        const searchTerm = filters.query.toLowerCase();
        files = files.filter(f => {
          const searchableText = [f.name, f.originalName, f.description || '', ...f.tags]
            .join(' ')
            .toLowerCase();

          return searchableText.includes(searchTerm);
        });
      }

      // Sort by updated date (most recent first)
      files.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Apply pagination
      const startIndex = 0;
      const endIndex = Math.min(pagination.limit, files.length);
      const paginatedFiles = files.slice(startIndex, endIndex);

      return {
        files: paginatedFiles,
        total: files.length,
        hasMore: endIndex < files.length,
        nextCursor: endIndex < files.length ? endIndex.toString() : undefined,
      };
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to search files:', error);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Get file folders
   */
  async getFolders(): Promise<string[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const files = this.getStoredFiles(user.uid);
      const folders = new Set<string>();

      files.forEach(file => {
        if (file.folder) {
          folders.add(file.folder);
        }
      });

      return Array.from(folders).sort();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to get folders:', error);
      throw new Error(`Failed to get folders: ${error.message}`);
    }
  }

  /**
   * Get file tags
   */
  async getTags(): Promise<string[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const files = this.getStoredFiles(user.uid);
      const tags = new Set<string>();

      files.forEach(file => {
        file.tags.forEach(tag => tags.add(tag));
      });

      return Array.from(tags).sort();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to get tags:', error);
      throw new Error(`Failed to get tags: ${error.message}`);
    }
  }

  /**
   * Share a file
   */
  async shareFile(
    fileId: string,
    shareSettings: Omit<FileShareSettings, 'shareId' | 'downloadCount'>
  ): Promise<string> {
    try {
      const shareId = this.generateShareId();
      const files = this.getStoredFiles(authService.getCurrentUser()!.uid);
      const fileIndex = files.findIndex(f => f.id === fileId);

      if (fileIndex === -1) {
        throw new Error('File not found');
      }

      files[fileIndex].shared = true;
      files[fileIndex].shareSettings = {
        ...shareSettings,
        shareId,
        downloadCount: 0,
      };

      this.saveStoredFiles(authService.getCurrentUser()!.uid, files);
      return shareId;
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to share file:', error);
      throw new Error(`Failed to share file: ${error.message}`);
    }
  }

  /**
   * Unshare a file
   */
  async unshareFile(fileId: string): Promise<void> {
    try {
      const files = this.getStoredFiles(authService.getCurrentUser()!.uid);
      const fileIndex = files.findIndex(f => f.id === fileId);

      if (fileIndex === -1) {
        throw new Error('File not found');
      }

      files[fileIndex].shared = false;
      files[fileIndex].shareSettings = undefined;

      this.saveStoredFiles(authService.getCurrentUser()!.uid, files);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to unshare file:', error);
      throw new Error(`Failed to unshare file: ${error.message}`);
    }
  }

  // Private helper methods

  private shouldUseWorkerForFile(file: { size: number }): boolean {
    return file.size > this.WORKER_THRESHOLD && workerManager.isWorkerHealthy('fileProcessing');
  }

  private calculateTimeout(fileSize: number): number {
    // Base timeout of 30 seconds, plus 1 second per MB
    return 30000 + (fileSize / (1024 * 1024)) * 1000;
  }

  private async encryptOnMainThread(fileData: ArrayBuffer): Promise<{
    result: any;
    metrics: any;
  }> {
    const startTime = performance.now();

    const result = await cryptoVaultService.encryptItemData(
      btoa(String.fromCharCode(...new Uint8Array(fileData)))
    );

    const duration = performance.now() - startTime;

    return {
      result,
      metrics: {
        duration,
        processingSpeed: fileData.byteLength / (duration / 1000),
        workerUsed: false,
      },
    };
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeFileName(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar'))
      return 'archive';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
      return 'document';
    return 'other';
  }

  private canGenerateThumbnail(mimeType: string): boolean {
    return (
      this.SUPPORTED_IMAGE_TYPES.includes(mimeType) || this.SUPPORTED_VIDEO_TYPES.includes(mimeType)
    );
  }

  private async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          const maxSize = 300;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;

          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
      } else {
        reject(new Error('Thumbnail generation not supported for this file type'));
      }
    });
  }

  private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async updateLastAccessed(fileId: string): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const files = this.getStoredFiles(user.uid);
      const fileIndex = files.findIndex(f => f.id === fileId);

      if (fileIndex !== -1) {
        files[fileIndex].lastAccessed = new Date();
        this.saveStoredFiles(user.uid, files);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to update last accessed time:', error);
    }
  }

  private getStoredFiles(userId: string): FileMetadata[] {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return parsed.map((file: any) => ({
        ...file,
        createdAt: new Date(file.createdAt),
        updatedAt: new Date(file.updatedAt),
        lastAccessed: file.lastAccessed ? new Date(file.lastAccessed) : undefined,
        shareSettings: file.shareSettings
          ? {
              ...file.shareSettings,
              expiresAt: file.shareSettings.expiresAt
                ? new Date(file.shareSettings.expiresAt)
                : undefined,
            }
          : undefined,
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse stored files:', error);
      return [];
    }
  }

  private saveStoredFiles(userId: string, files: FileMetadata[]): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(files));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save files to storage:', error);
      throw new Error('Failed to save files to storage');
    }
  }
}

export const fileService = FileService.getInstance();
