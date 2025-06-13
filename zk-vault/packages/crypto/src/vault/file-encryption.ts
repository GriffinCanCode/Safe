/**
 * @fileoverview File Encryption
 * @responsibility Handles encryption of large files using chunked encryption
 * @principle Single Responsibility - Only file encryption operations
 * @security Chunked encryption for large files with integrity verification
 */

import {
  EncryptionResult,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
  FILE_ENCRYPTION,
  DEFAULT_CONTEXTS,
} from '@zk-vault/shared';

import { AESGCMCipher } from '../algorithms/aes-gcm';
import { ItemKeyDerivation } from '../key-derivation/item-key';

/**
 * File chunk metadata
 * @responsibility Contains information about a file chunk
 */
export interface FileChunk {
  /** Chunk index */
  index: number;
  /** Chunk size in bytes */
  size: number;
  /** Encrypted chunk data */
  encryptedData: EncryptionResult;
  /** Chunk hash for integrity verification */
  hash: string;
}

/**
 * Encrypted file metadata
 * @responsibility Contains metadata about an encrypted file
 */
export interface EncryptedFileMetadata {
  /** Original filename */
  filename: string;
  /** Original file size in bytes */
  originalSize: number;
  /** MIME type */
  mimeType: string;
  /** Number of chunks */
  chunkCount: number;
  /** Chunk size used */
  chunkSize: number;
  /** File hash for integrity verification */
  fileHash: string;
  /** Encryption timestamp */
  encryptedAt: number;
  /** Encryption version */
  version: number;
}

/**
 * Encrypted file structure
 * @responsibility Complete encrypted file with metadata and chunks
 */
export interface EncryptedFile {
  /** File metadata */
  metadata: EncryptedFileMetadata;
  /** Encrypted file chunks */
  chunks: FileChunk[];
}

/**
 * File encryption progress callback
 * @responsibility Reports encryption/decryption progress
 */
export interface FileProgressCallback {
  (progress: {
    processed: number;
    total: number;
    percentage: number;
    currentChunk: number;
    totalChunks: number;
  }): void;
}

/**
 * File encryption for large files
 * @responsibility Handles chunked encryption/decryption of files
 * @security Uses per-chunk keys for enhanced security
 */
export class FileEncryption {
  /**
   * Encrypts a file using chunked encryption
   * @param fileData File data to encrypt
   * @param filename Original filename
   * @param mimeType File MIME type
   * @param accountKey Account-level encryption key
   * @param itemId Item identifier for key derivation
   * @param options Encryption options
   * @returns Encrypted file structure
   */
  static async encryptFile(
    fileData: Uint8Array,
    filename: string,
    mimeType: string,
    accountKey: Uint8Array,
    itemId: string,
    options: {
      chunkSize?: number;
      progressCallback?: FileProgressCallback;
      context?: EncryptionContext;
    } = {}
  ): Promise<CryptoOperationResult<EncryptedFile>> {
    try {
      // Validate inputs
      if (fileData.length === 0) {
        return {
          success: false,
          error: 'Cannot encrypt empty file',
          errorCode: 'EMPTY_FILE',
        };
      }

      if (fileData.length > FILE_ENCRYPTION.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File too large. Maximum size is ${FILE_ENCRYPTION.MAX_FILE_SIZE} bytes`,
          errorCode: 'FILE_TOO_LARGE',
        };
      }

      // Derive item-specific encryption key
      const itemKeyResult = await ItemKeyDerivation.deriveItemKey(accountKey, itemId, 'file');

      if (!itemKeyResult.success || !itemKeyResult.data) {
        return {
          success: false,
          error: itemKeyResult.error || 'Failed to derive item key',
          errorCode: itemKeyResult.errorCode || 'ITEM_KEY_DERIVATION_FAILED',
        };
      }

      const itemKey = itemKeyResult.data;

      // Determine chunk size
      const chunkSize = Math.min(
        Math.max(options.chunkSize || FILE_ENCRYPTION.CHUNK_SIZE, FILE_ENCRYPTION.MIN_CHUNK_SIZE),
        FILE_ENCRYPTION.MAX_CHUNK_SIZE
      );

      // Calculate number of chunks
      const chunkCount = Math.ceil(fileData.length / chunkSize);

      // Compute file hash for integrity
      const fileHash = await this.computeFileHash(fileData);

      // Create encryption context
      const encryptionContext: EncryptionContext = {
        ...DEFAULT_CONTEXTS.FILE_CHUNK,
        ...options.context,
        itemId,
        purpose: 'file-chunk',
      };

      // Encrypt chunks
      const chunks: FileChunk[] = [];
      let processedBytes = 0;

      for (let i = 0; i < chunkCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileData.length);
        const chunkData = fileData.slice(start, end);

        // Derive chunk-specific key
        const chunkKeyResult = await ItemKeyDerivation.deriveChunkKey(itemKey, i, chunkCount);

        if (!chunkKeyResult.success || !chunkKeyResult.data) {
          return {
            success: false,
            error: `Failed to derive key for chunk ${i}`,
            errorCode: 'CHUNK_KEY_DERIVATION_FAILED',
          };
        }

        const chunkKey = chunkKeyResult.data;

        // Encrypt chunk
        const encryptResult = await AESGCMCipher.encrypt(chunkData, chunkKey, encryptionContext);

        if (!encryptResult.success || !encryptResult.data) {
          return {
            success: false,
            error: `Failed to encrypt chunk ${i}`,
            errorCode: 'CHUNK_ENCRYPTION_FAILED',
          };
        }

        // Compute chunk hash
        const chunkHash = await this.computeChunkHash(chunkData);

        chunks.push({
          index: i,
          size: chunkData.length,
          encryptedData: encryptResult.data,
          hash: chunkHash,
        });

        processedBytes += chunkData.length;

        // Report progress
        if (options.progressCallback) {
          options.progressCallback({
            processed: processedBytes,
            total: fileData.length,
            percentage: (processedBytes / fileData.length) * 100,
            currentChunk: i + 1,
            totalChunks: chunkCount,
          });
        }

        // Clear chunk key from memory
        this.clearSensitiveData(chunkKey);
      }

      // Create encrypted file metadata
      const metadata: EncryptedFileMetadata = {
        filename,
        originalSize: fileData.length,
        mimeType,
        chunkCount,
        chunkSize,
        fileHash,
        encryptedAt: Date.now(),
        version: 1,
      };

      // Clear item key from memory
      this.clearSensitiveData(itemKey);

      return {
        success: true,
        data: {
          metadata,
          chunks,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `File encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'FILE_ENCRYPTION_FAILED',
      };
    }
  }

  /**
   * Decrypts a file from encrypted chunks
   * @param encryptedFile Encrypted file structure
   * @param accountKey Account-level encryption key
   * @param itemId Item identifier for key derivation
   * @param options Decryption options
   * @returns Decrypted file data
   */
  static async decryptFile(
    encryptedFile: EncryptedFile,
    accountKey: Uint8Array,
    itemId: string,
    options: {
      progressCallback?: FileProgressCallback;
      context?: DecryptionContext;
      verifyIntegrity?: boolean;
    } = {}
  ): Promise<
    CryptoOperationResult<{
      data: Uint8Array;
      filename: string;
      mimeType: string;
    }>
  > {
    try {
      // Validate encrypted file structure
      if (!this.validateEncryptedFile(encryptedFile)) {
        return {
          success: false,
          error: 'Invalid encrypted file structure',
          errorCode: 'INVALID_ENCRYPTED_FILE',
        };
      }

      // Derive item-specific encryption key
      const itemKeyResult = await ItemKeyDerivation.deriveItemKey(accountKey, itemId, 'file');

      if (!itemKeyResult.success || !itemKeyResult.data) {
        return {
          success: false,
          error: itemKeyResult.error || 'Failed to derive item key',
          errorCode: itemKeyResult.errorCode || 'ITEM_KEY_DERIVATION_FAILED',
        };
      }

      const itemKey = itemKeyResult.data;

      // Create decryption context
      const decryptionContext: DecryptionContext = {
        expectedPurpose: 'file-chunk',
        ...options.context,
      };

      // Decrypt chunks in order
      const decryptedChunks: Uint8Array[] = [];
      let processedBytes = 0;

      for (let i = 0; i < encryptedFile.chunks.length; i++) {
        const chunk = encryptedFile.chunks.find(c => c.index === i);
        if (!chunk) {
          return {
            success: false,
            error: `Missing chunk ${i}`,
            errorCode: 'MISSING_CHUNK',
          };
        }

        // Derive chunk-specific key
        const chunkKeyResult = await ItemKeyDerivation.deriveChunkKey(
          itemKey,
          i,
          encryptedFile.metadata.chunkCount
        );

        if (!chunkKeyResult.success || !chunkKeyResult.data) {
          return {
            success: false,
            error: `Failed to derive key for chunk ${i}`,
            errorCode: 'CHUNK_KEY_DERIVATION_FAILED',
          };
        }

        const chunkKey = chunkKeyResult.data;

        // Decrypt chunk
        const decryptResult = await AESGCMCipher.decrypt(
          chunk.encryptedData,
          chunkKey,
          decryptionContext
        );

        if (!decryptResult.success || !decryptResult.data) {
          return {
            success: false,
            error: `Failed to decrypt chunk ${i}`,
            errorCode: 'CHUNK_DECRYPTION_FAILED',
          };
        }

        const chunkData = decryptResult.data;

        // Verify chunk integrity if requested
        if (options.verifyIntegrity) {
          const chunkHash = await this.computeChunkHash(chunkData);
          if (chunkHash !== chunk.hash) {
            return {
              success: false,
              error: `Chunk ${i} integrity verification failed`,
              errorCode: 'CHUNK_INTEGRITY_FAILED',
            };
          }
        }

        decryptedChunks.push(chunkData);
        processedBytes += chunkData.length;

        // Report progress
        if (options.progressCallback) {
          options.progressCallback({
            processed: processedBytes,
            total: encryptedFile.metadata.originalSize,
            percentage: (processedBytes / encryptedFile.metadata.originalSize) * 100,
            currentChunk: i + 1,
            totalChunks: encryptedFile.metadata.chunkCount,
          });
        }

        // Clear chunk key from memory
        this.clearSensitiveData(chunkKey);
      }

      // Combine chunks into complete file
      const fileData = this.combineChunks(decryptedChunks);

      // Verify file integrity if requested
      if (options.verifyIntegrity) {
        const fileHash = await this.computeFileHash(fileData);
        if (fileHash !== encryptedFile.metadata.fileHash) {
          return {
            success: false,
            error: 'File integrity verification failed',
            errorCode: 'FILE_INTEGRITY_FAILED',
          };
        }
      }

      // Clear item key from memory
      this.clearSensitiveData(itemKey);

      return {
        success: true,
        data: {
          data: fileData,
          filename: encryptedFile.metadata.filename,
          mimeType: encryptedFile.metadata.mimeType,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `File decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'FILE_DECRYPTION_FAILED',
      };
    }
  }

  /**
   * Computes SHA-256 hash of file data
   * @param data File data
   * @returns Hash as hex string
   */
  private static async computeFileHash(data: Uint8Array): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest(FILE_ENCRYPTION.HASH_ALGORITHM, data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      throw new Error('SHA-256 not available in this environment');
    }
  }

  /**
   * Computes SHA-256 hash of chunk data
   * @param data Chunk data
   * @returns Hash as hex string
   */
  private static async computeChunkHash(data: Uint8Array): Promise<string> {
    return await this.computeFileHash(data);
  }

  /**
   * Combines decrypted chunks into complete file data
   * @param chunks Array of decrypted chunks
   * @returns Combined file data
   */
  private static combineChunks(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return combined;
  }

  /**
   * Validates encrypted file structure
   * @param encryptedFile Encrypted file to validate
   * @returns True if structure is valid
   */
  private static validateEncryptedFile(encryptedFile: EncryptedFile): boolean {
    return (
      encryptedFile &&
      encryptedFile.metadata &&
      typeof encryptedFile.metadata.filename === 'string' &&
      typeof encryptedFile.metadata.originalSize === 'number' &&
      typeof encryptedFile.metadata.chunkCount === 'number' &&
      Array.isArray(encryptedFile.chunks) &&
      encryptedFile.chunks.length === encryptedFile.metadata.chunkCount &&
      encryptedFile.chunks.every(
        chunk =>
          typeof chunk.index === 'number' &&
          typeof chunk.size === 'number' &&
          chunk.encryptedData &&
          typeof chunk.hash === 'string'
      )
    );
  }

  /**
   * Securely clears sensitive data from memory
   * @param data Sensitive data to clear
   */
  private static clearSensitiveData(data: Uint8Array): void {
    // Overwrite with random data multiple times
    for (let pass = 0; pass < 3; pass++) {
      if (pass === 0) {
        data.fill(0);
      } else if (pass === 1) {
        data.fill(0xff);
      } else {
        crypto.getRandomValues(data);
      }
    }
  }

  /**
   * Estimates the storage overhead of file encryption
   * @param originalSize Original file size
   * @param chunkSize Chunk size used
   * @returns Estimated encrypted size
   */
  static estimateEncryptedSize(
    originalSize: number,
    chunkSize: number = FILE_ENCRYPTION.CHUNK_SIZE
  ): number {
    const chunkCount = Math.ceil(originalSize / chunkSize);

    // Each chunk adds IV (12 bytes) + auth tag (16 bytes)
    const encryptionOverhead = chunkCount * (12 + 16);

    // Metadata overhead (approximate)
    const metadataOverhead = 1024; // JSON metadata

    return originalSize + encryptionOverhead + metadataOverhead;
  }

  /**
   * Gets optimal chunk size for a file
   * @param fileSize File size in bytes
   * @returns Optimal chunk size
   */
  static getOptimalChunkSize(fileSize: number): number {
    if (fileSize <= FILE_ENCRYPTION.MIN_CHUNK_SIZE) {
      return FILE_ENCRYPTION.MIN_CHUNK_SIZE;
    } else if (fileSize <= 1024 * 1024) {
      // 1 MB
      return 64 * 1024; // 64 KB chunks
    } else if (fileSize <= 10 * 1024 * 1024) {
      // 10 MB
      return 256 * 1024; // 256 KB chunks
    } else {
      return FILE_ENCRYPTION.CHUNK_SIZE; // Default 4 MB chunks
    }
  }
}
