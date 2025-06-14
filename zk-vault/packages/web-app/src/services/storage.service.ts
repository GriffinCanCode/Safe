/**
 * @fileoverview Firebase Storage Service
 * @description Manages encrypted file storage operations for ZK-Vault
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
  updateMetadata,
  listAll,
  type StorageReference,
  type UploadTask,
  type FullMetadata,
  type UploadMetadata,
  type FirebaseStorage
} from 'firebase/storage';
import { firebaseService } from './firebase.service';
import { cryptoVaultService } from './crypto-vault.service';
import { firestoreService } from './firestore.service';
import { authService } from './auth.service';

// Upload progress interface
export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  state: 'paused' | 'running' | 'success' | 'canceled' | 'error';
  progress: number;
  timeRemaining?: number | undefined;
  speed?: number | undefined;
}

// File metadata interface
export interface EncryptedFileMetadata {
  fileName: string;
  originalSize: number;
  encryptedSize: number;
  mimeType: string;
  checksum: string;
  algorithm: string;
  uploadedAt: Date;
  uploadedBy: string;
  tags?: string[] | undefined;
  description?: string | undefined;
}

// Upload options interface
export interface UploadOptions {
  folder?: string | undefined;
  tags?: string[] | undefined;
  description?: string | undefined;
  onProgress?: ((progress: UploadProgress) => void) | undefined;
  customMetadata?: Record<string, string> | undefined;
  cacheControl?: string | undefined;
  contentDisposition?: string | undefined;
  contentEncoding?: string | undefined;
  contentLanguage?: string | undefined;
  contentType?: string | undefined;
}

// Download options interface
export interface DownloadOptions {
  maxDownloadSizeBytes?: number;
  timeout?: number;
}

// File reference interface
export interface FileReference {
  id: string;
  path: string;
  name: string;
  size: number;
  url?: string;
  metadata: EncryptedFileMetadata;
  createdAt: Date;
  updatedAt: Date;
}

class StorageService {
  private static instance: StorageService;
  private storage = firebaseService.storage;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload an encrypted file to Firebase Storage
   */
  async uploadFile(
    file: File,
    path: string,
    options: UploadOptions = {}
  ): Promise<FileReference> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!cryptoVaultService.isInitialized()) {
        throw new Error('Crypto vault not initialized');
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = this.sanitizeFileName(file.name);
      const fullPath = `${path}/${timestamp}_${sanitizedFileName}`;
      const storageRef = ref(this.storage, fullPath);

      // Calculate file checksum
      const fileBuffer = await file.arrayBuffer();
      const checksum = await this.calculateChecksum(new Uint8Array(fileBuffer));

      // Encrypt file data
      const encryptResult = await cryptoVaultService.encryptItemData(
        JSON.stringify({
          data: Array.from(new Uint8Array(fileBuffer)),
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          checksum
        })
      );

      if (!encryptResult.success || !encryptResult.encryptedData) {
        throw new Error(encryptResult.error || 'Failed to encrypt file');
      }

      // Convert encrypted data to blob
      const encryptedBlob = new Blob([JSON.stringify(encryptResult.encryptedData)], {
        type: 'application/octet-stream'
      });

      // Prepare metadata
      const metadata: UploadMetadata = {
        contentType: 'application/octet-stream',
        cacheControl: options.cacheControl || 'public, max-age=31536000',
        customMetadata: {
          encrypted: 'true',
          checksum,
          originalFileName: file.name,
          originalMimeType: file.type,
          originalSize: file.size.toString(),
          algorithm: 'aes-gcm', // This should come from crypto service
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString(),
          ...options.customMetadata
        }
      };

      if (options.contentDisposition) {
        metadata.contentDisposition = options.contentDisposition;
      }
      if (options.contentEncoding) {
        metadata.contentEncoding = options.contentEncoding;
      }
      if (options.contentLanguage) {
        metadata.contentLanguage = options.contentLanguage;
      }

      // Upload file with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, encryptedBlob, metadata);

      return new Promise((resolve, reject) => {
        let lastProgressTime = Date.now();
        let lastBytesTransferred = 0;

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const now = Date.now();
            const timeDiff = (now - lastProgressTime) / 1000; // seconds
            const bytesDiff = snapshot.bytesTransferred - lastBytesTransferred;
            const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
            const timeRemaining = speed > 0 ? (snapshot.totalBytes - snapshot.bytesTransferred) / speed : undefined;

            const progress: UploadProgress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              state: snapshot.state as any,
              progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
              speed,
              timeRemaining
            };

            options.onProgress?.(progress);

            lastProgressTime = now;
            lastBytesTransferred = snapshot.bytesTransferred;
          },
          (error) => {
            console.error('Upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              // Get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Get final metadata
              const finalMetadata = await getMetadata(uploadTask.snapshot.ref);

              // Create file metadata
              const fileMetadata: EncryptedFileMetadata = {
                fileName: file.name,
                originalSize: file.size,
                encryptedSize: finalMetadata.size,
                mimeType: file.type,
                checksum,
                algorithm: 'aes-gcm',
                uploadedAt: new Date(),
                uploadedBy: user.uid,
                tags: options.tags,
                description: options.description
              };

              // Store file reference in Firestore
              const fileRef = await firestoreService.createFileReference({
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                storageRef: fullPath,
                encryptedMetadata: btoa(JSON.stringify(fileMetadata)),
                checksum,
                uploadedBy: user.uid,
                createdBy: user.uid
              });

              const result: FileReference = {
                id: fileRef.id,
                path: fullPath,
                name: file.name,
                size: file.size,
                url: downloadURL,
                metadata: fileMetadata,
                createdAt: fileRef.createdAt,
                updatedAt: fileRef.updatedAt
              };

              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download and decrypt a file from Firebase Storage
   */
  async downloadFile(
    fileReference: FileReference,
    options: DownloadOptions = {}
  ): Promise<{ file: File; metadata: EncryptedFileMetadata }> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!cryptoVaultService.isInitialized()) {
        throw new Error('Crypto vault not initialized');
      }

      // Get storage reference
      const storageRef = ref(this.storage, fileReference.path);

      // Download encrypted data
      const response = await fetch(fileReference.url || await getDownloadURL(storageRef));
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const encryptedData = await response.text();
      const parsedEncryptedData = JSON.parse(encryptedData);

      // Decrypt file data
      const decryptResult = await cryptoVaultService.decryptItemData(parsedEncryptedData);
      if (!decryptResult.success || !decryptResult.data) {
        throw new Error(decryptResult.error || 'Failed to decrypt file');
      }

      const fileData = JSON.parse(decryptResult.data);
      
      // Verify checksum
      const decryptedBuffer = new Uint8Array(fileData.data);
      const calculatedChecksum = await this.calculateChecksum(decryptedBuffer);
      
      if (calculatedChecksum !== fileData.checksum) {
        throw new Error('File integrity check failed');
      }

      // Create file object
      const file = new File([decryptedBuffer], fileData.fileName, {
        type: fileData.mimeType
      });

      return {
        file,
        metadata: fileReference.metadata
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file from Firebase Storage and Firestore
   */
  async deleteFile(fileReference: FileReference): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete from Storage
      const storageRef = ref(this.storage, fileReference.path);
      await deleteObject(storageRef);

      // Delete reference from Firestore
      await firestoreService.deleteFileReference(user.uid, fileReference.id);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's file references from Firestore
   */
  async getUserFiles(): Promise<FileReference[]> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileRefs = await firestoreService.getUserFileReferences(user.uid);
      
      return fileRefs.map(ref => ({
        id: ref.id,
        path: ref.storageRef,
        name: ref.fileName,
        size: ref.fileSize,
        metadata: JSON.parse(atob(ref.encryptedMetadata)),
        createdAt: ref.createdAt,
        updatedAt: ref.updatedAt
      }));
    } catch (error) {
      console.error('Error getting user files:', error);
      throw new Error(`Failed to get user files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file metadata without downloading
   */
  async getFileMetadata(path: string): Promise<FullMetadata> {
    try {
      const storageRef = ref(this.storage, path);
      return await getMetadata(storageRef);
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    path: string,
    metadata: Partial<UploadMetadata>
  ): Promise<FullMetadata> {
    try {
      const storageRef = ref(this.storage, path);
      return await updateMetadata(storageRef, metadata);
    } catch (error) {
      console.error('Error updating file metadata:', error);
      throw new Error(`Failed to update file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<StorageReference[]> {
    try {
      const storageRef = ref(this.storage, path);
      const result = await listAll(storageRef);
      return result.items;
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get download URL for a file
   */
  async getDownloadURL(path: string): Promise<string> {
    try {
      const storageRef = ref(this.storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw new Error(`Failed to get download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files with batch processing
   */
  async uploadMultipleFiles(
    files: File[],
    basePath: string,
    options: UploadOptions = {}
  ): Promise<FileReference[]> {
    try {
      const uploadPromises = files.map((file, index) => {
        const fileOptions = {
          ...options,
          onProgress: options.onProgress ? 
            (progress: UploadProgress) => {
              // Adjust progress for batch upload
              const adjustedProgress = {
                ...progress,
                progress: (index * 100 + progress.progress) / files.length
              };
              options.onProgress!(adjustedProgress);
            } : undefined
        };

        return this.uploadFile(file, basePath, fileOptions);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading multiple files:', error);
      throw new Error(`Failed to upload multiple files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a backup of user's vault files
   */
  async createBackup(): Promise<FileReference> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get all user files
      const userFiles = await this.getUserFiles();
      
      // Create backup data
      const backupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        userId: user.uid,
        files: userFiles.map(file => ({
          id: file.id,
          name: file.name,
          path: file.path,
          metadata: file.metadata
        }))
      };

      // Create backup file
      const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });

      const backupFile = new File([backupBlob], `vault-backup-${Date.now()}.json`, {
        type: 'application/json'
      });

      // Upload backup
      return await this.uploadFile(backupFile, `backups/${user.uid}`, {
        tags: ['backup', 'vault'],
        description: 'Vault backup file'
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupFileReference: FileReference): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Download and decrypt backup file
      const { file } = await this.downloadFile(backupFileReference);
      const backupText = await file.text();
      const backupData = JSON.parse(backupText);

      // Validate backup format
      if (!backupData.version || !backupData.files) {
        throw new Error('Invalid backup file format');
      }

      // TODO: Implement restore logic based on backup data
      console.log('Backup data:', backupData);
      
      // This would involve recreating file references in Firestore
      // and potentially re-uploading files if they don't exist
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility Methods

  /**
   * Calculate SHA-256 checksum of file data
   */
  private async calculateChecksum(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sanitize file name for storage
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Get storage usage for user
   */
  async getStorageUsage(): Promise<{ totalBytes: number; fileCount: number }> {
    try {
      const userFiles = await this.getUserFiles();
      
      const totalBytes = userFiles.reduce((total, file) => total + file.size, 0);
      const fileCount = userFiles.length;

      return { totalBytes, fileCount };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      throw new Error(`Failed to get storage usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for storage service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      // Try to get metadata from a test path
      const testRef = ref(this.storage, 'health/check.txt');
      
      try {
        await getMetadata(testRef);
      } catch (error: any) {
        // File not found is expected and means storage is working
        if (error.code === 'storage/object-not-found') {
          return { status: 'healthy', message: 'Storage connection is healthy' };
        }
        throw error;
      }
      
      return { status: 'healthy', message: 'Storage connection is healthy' };
    } catch (error) {
      console.error('Storage health check failed:', error);
      return { 
        status: 'unhealthy', 
        message: `Storage connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();
export default storageService; 