/**
 * @fileoverview File Storage Types
 * @responsibility Defines all file storage and encryption related type interfaces
 * @principle Single Responsibility - Only file storage type definitions
 * @security Chunked encryption for large files with deduplication
 */

import { EncryptedData } from './encryption.types';

/**
 * File upload progress information
 * @responsibility Track file upload progress and status
 */
export interface FileUploadProgress {
  /** File identifier */
  fileId: string;
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Current upload status */
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Bytes uploaded */
  bytesUploaded: number;
  /** Total file size */
  totalBytes: number;
  /** Upload speed in bytes per second */
  uploadSpeed: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * File chunk information
 * @responsibility Individual chunk data for large file encryption
 */
export interface FileChunk {
  /** Chunk index in the file */
  index: number;
  /** Chunk size in bytes */
  size: number;
  /** Content hash for deduplication */
  hash: string;
  /** Encrypted chunk data */
  encrypted: EncryptedData;
  /** Storage reference */
  storageRef: string;
  /** Upload timestamp */
  uploadedAt: Date;
  /** Chunk verification status */
  verified: boolean;
}

/**
 * File manifest containing metadata and chunk references
 * @responsibility Complete file structure with all chunks
 */
export interface FileManifest {
  /** File unique identifier */
  id: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** File content hash */
  hash: string;
  /** Number of chunks */
  chunkCount: number;
  /** Chunk size used for splitting */
  chunkSize: number;
  /** Array of chunk references */
  chunks: FileChunkReference[];
  /** File creation timestamp */
  createdAt: Date;
  /** File modification timestamp */
  modifiedAt: Date;
  /** Encryption algorithm used */
  encryptionAlgorithm: string;
  /** File compression used */
  compression?: 'gzip' | 'brotli' | 'none';
  /** Thumbnail reference if applicable */
  thumbnailRef?: string;
}

/**
 * File chunk reference
 * @responsibility Reference to a file chunk without the actual data
 */
export interface FileChunkReference {
  /** Chunk index */
  index: number;
  /** Chunk hash for integrity */
  hash: string;
  /** Storage reference */
  storageRef: string;
  /** Chunk size */
  size: number;
  /** Encryption nonce */
  nonce: string;
}

/**
 * File download progress
 * @responsibility Track file download and decryption progress
 */
export interface FileDownloadProgress {
  /** File identifier */
  fileId: string;
  /** Download progress percentage (0-100) */
  progress: number;
  /** Current download status */
  status: 'pending' | 'downloading' | 'decrypting' | 'completed' | 'failed' | 'cancelled';
  /** Bytes downloaded */
  bytesDownloaded: number;
  /** Total file size */
  totalBytes: number;
  /** Download speed in bytes per second */
  downloadSpeed: number;
  /** Chunks downloaded */
  chunksDownloaded: number;
  /** Total chunks */
  totalChunks: number;
  /** Error message if failed */
  error?: string;
}

/**
 * File sharing configuration
 * @responsibility File sharing settings and permissions
 */
export interface FileSharingConfig {
  /** Sharing enabled */
  enabled: boolean;
  /** Share expiration date */
  expiresAt?: Date;
  /** Password protection */
  passwordProtected: boolean;
  /** Download limit */
  downloadLimit?: number;
  /** Current download count */
  downloadCount: number;
  /** Allowed recipients */
  allowedRecipients?: string[];
  /** Public sharing link */
  publicLink?: string;
  /** Sharing permissions */
  permissions: FileSharePermissions;
}

/**
 * File share permissions
 * @responsibility Define what actions are allowed on shared files
 */
export interface FileSharePermissions {
  /** Can download the file */
  download: boolean;
  /** Can view file metadata */
  viewMetadata: boolean;
  /** Can share with others */
  reshare: boolean;
  /** Can modify sharing settings */
  modifySharing: boolean;
}

/**
 * File storage statistics
 * @responsibility Storage usage and performance metrics
 */
export interface FileStorageStats {
  /** Total files stored */
  totalFiles: number;
  /** Total storage used in bytes */
  totalSize: number;
  /** Storage by file type */
  sizeByType: Record<string, number>;
  /** Deduplication savings in bytes */
  deduplicationSavings: number;
  /** Compression savings in bytes */
  compressionSavings: number;
  /** Average file size */
  averageFileSize: number;
  /** Largest file size */
  largestFileSize: number;
  /** Most common file types */
  commonFileTypes: Array<{ type: string; count: number }>;
}

/**
 * File search criteria
 * @responsibility Define search parameters for files
 */
export interface FileSearchCriteria {
  /** Search query */
  query?: string;
  /** File types to include */
  mimeTypes?: string[];
  /** Size range in bytes */
  sizeRange?: {
    min: number;
    max: number;
  };
  /** Date range */
  dateRange?: {
    from: Date;
    to: Date;
  };
  /** Include shared files */
  includeShared?: boolean;
  /** Sort criteria */
  sortBy?: 'name' | 'size' | 'date' | 'type';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * File operation result
 * @responsibility Result of file operations
 */
export interface FileOperationResult {
  /** Operation success status */
  success: boolean;
  /** File ID if successful */
  fileId?: string;
  /** Error message if failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: FileErrorCode;
  /** Operation metrics */
  metrics?: FileOperationMetrics;
}

/**
 * File operation metrics
 * @responsibility Performance metrics for file operations
 */
export interface FileOperationMetrics {
  /** Operation duration in milliseconds */
  duration: number;
  /** Bytes processed */
  bytesProcessed: number;
  /** Processing speed in bytes per second */
  processingSpeed: number;
  /** Memory used in bytes */
  memoryUsed: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Network bandwidth used */
  networkUsage: number;
}

/**
 * File error codes
 * @responsibility Standardized error codes for file operations
 */
export type FileErrorCode =
  | 'file-not-found'
  | 'file-too-large'
  | 'invalid-file-type'
  | 'insufficient-storage'
  | 'upload-failed'
  | 'download-failed'
  | 'encryption-failed'
  | 'decryption-failed'
  | 'chunk-missing'
  | 'integrity-check-failed'
  | 'permission-denied'
  | 'quota-exceeded'
  | 'network-error'
  | 'unknown-error';

/**
 * File thumbnail configuration
 * @responsibility Thumbnail generation settings
 */
export interface FileThumbnailConfig {
  /** Generate thumbnails */
  enabled: boolean;
  /** Maximum thumbnail width */
  maxWidth: number;
  /** Maximum thumbnail height */
  maxHeight: number;
  /** Thumbnail quality (0-100) */
  quality: number;
  /** Supported file types for thumbnails */
  supportedTypes: string[];
  /** Thumbnail format */
  format: 'jpeg' | 'png' | 'webp';
}

/**
 * File backup configuration
 * @responsibility File backup and versioning settings
 */
export interface FileBackupConfig {
  /** Backup enabled */
  enabled: boolean;
  /** Maximum versions to keep */
  maxVersions: number;
  /** Backup frequency */
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  /** Backup retention period in days */
  retentionDays: number;
  /** Backup compression */
  compression: boolean;
  /** Backup encryption */
  encryption: boolean;
}

/**
 * File version information
 * @responsibility File version tracking
 */
export interface FileVersion {
  /** Version identifier */
  versionId: string;
  /** Version number */
  version: number;
  /** File size at this version */
  size: number;
  /** File hash at this version */
  hash: string;
  /** Version creation timestamp */
  createdAt: Date;
  /** Version description */
  description?: string;
  /** Storage reference */
  storageRef: string;
  /** Previous version ID */
  previousVersionId?: string;
}

/**
 * File synchronization status
 * @responsibility Track file sync across devices
 */
export interface FileSyncStatus {
  /** File identifier */
  fileId: string;
  /** Sync status */
  status: 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';
  /** Last sync timestamp */
  lastSync: Date;
  /** Devices synced to */
  syncedDevices: string[];
  /** Pending devices */
  pendingDevices: string[];
  /** Sync conflicts */
  conflicts?: FileSyncConflict[];
  /** Sync error message */
  error?: string;
}

/**
 * File sync conflict
 * @responsibility Information about sync conflicts
 */
export interface FileSyncConflict {
  /** Conflict identifier */
  conflictId: string;
  /** Conflicting device */
  deviceId: string;
  /** Conflict type */
  type: 'modification' | 'deletion' | 'creation';
  /** Conflict timestamp */
  timestamp: Date;
  /** Local file version */
  localVersion: string;
  /** Remote file version */
  remoteVersion: string;
  /** Conflict resolution */
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
}
