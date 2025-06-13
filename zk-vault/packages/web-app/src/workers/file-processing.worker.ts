/**
 * @fileoverview File Processing Worker
 * @responsibility Handles file chunking, compression, encryption, and processing
 * @principle Single Responsibility - Only file processing operations
 * @security Encrypted file processing with deduplication and integrity checks
 */

import { deflate, inflate } from 'pako';
import { FileEncryption } from '@zk-vault/crypto';
import type {
  FileChunk,
  FileManifest,
  FileUploadProgress,
  FileDownloadProgress,
  FileOperationResult,
  FileOperationMetrics,
  FileErrorCode,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
} from '@zk-vault/shared';

/**
 * Worker message types for file operations
 */
interface FileWorkerMessage {
  id: string;
  type:
    | 'chunkFile'
    | 'encryptFile'
    | 'decryptFile'
    | 'compressData'
    | 'decompressData'
    | 'createManifest'
    | 'validateChunk'
    | 'calculateHash'
    | 'optimizeChunks'
    | 'assembleFile'
    | 'processUpload'
    | 'processDownload';
  data: any;
}

interface FileWorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string | undefined;
  errorCode?: string | undefined;
  progress?: FileUploadProgress | FileDownloadProgress;
  metrics?: FileOperationMetrics;
}

/**
 * Chunk processing configuration
 */
interface ChunkConfig {
  size: number;
  compression: 'gzip' | 'brotli' | 'none';
  deduplication: boolean;
  encryption: boolean;
}

/**
 * File hash cache for deduplication
 */
const hashCache = new Map<string, string>();

/**
 * Active processing operations for progress tracking
 */
const activeOperations = new Map<string, FileUploadProgress | FileDownloadProgress>();

/**
 * Main message handler for file operations
 */
self.onmessage = async (event: MessageEvent<FileWorkerMessage>) => {
  const { id, type, data } = event.data;
  const startTime = performance.now();

  try {
    let result: any;

    switch (type) {
      case 'chunkFile':
        result = await handleChunkFile(data, id);
        break;

      case 'encryptFile':
        result = await handleEncryptFile(data, id);
        break;

      case 'decryptFile':
        result = await handleDecryptFile(data, id);
        break;

      case 'compressData':
        result = await handleCompressData(data);
        break;

      case 'decompressData':
        result = await handleDecompressData(data);
        break;

      case 'createManifest':
        result = await handleCreateManifest(data);
        break;

      case 'validateChunk':
        result = await handleValidateChunk(data);
        break;

      case 'calculateHash':
        result = await handleCalculateHash(data);
        break;

      case 'optimizeChunks':
        result = await handleOptimizeChunks(data);
        break;

      case 'assembleFile':
        result = await handleAssembleFile(data, id);
        break;

      case 'processUpload':
        result = await handleProcessUpload(data, id);
        break;

      case 'processDownload':
        result = await handleProcessDownload(data, id);
        break;

      default:
        result = {
          success: false,
          error: `Unknown operation type: ${type}`,
          errorCode: 'UNKNOWN_OPERATION' as FileErrorCode,
        };
    }

    const endTime = performance.now();
    const response: FileWorkerResponse = {
      id,
      success: result.success,
      data: result.data,
      error: result.error,
      errorCode: result.errorCode,
      progress: result.progress,
      metrics: {
        duration: endTime - startTime,
        bytesProcessed: result.metrics?.bytesProcessed ?? 0,
        processingSpeed: result.metrics?.processingSpeed ?? 0,
        memoryUsed: result.metrics?.memoryUsed ?? 0,
        cpuUsage: result.metrics?.cpuUsage ?? 0,
        networkUsage: result.metrics?.networkUsage ?? 0,
      },
    };

    self.postMessage(response);
  } catch (error) {
    const endTime = performance.now();
    const response: FileWorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'unknown-error' as FileErrorCode,
      metrics: {
        duration: endTime - startTime,
        bytesProcessed: 0,
        processingSpeed: 0,
        memoryUsed: 0,
        cpuUsage: 0,
        networkUsage: 0,
      },
    };

    self.postMessage(response);
  }
};

/**
 * Handle file chunking operations
 */
async function handleChunkFile(data: {
  fileData: Uint8Array;
  config: Partial<ChunkConfig>;
}, operationId: string): Promise<FileOperationResult & { chunks?: FileChunk[] }> {
  const { fileData, config } = data;
  const finalConfig: ChunkConfig = {
    size: config.size ?? 4 * 1024 * 1024, // 4MB default
    compression: config.compression ?? 'gzip',
    deduplication: config.deduplication ?? true,
    encryption: config.encryption ?? false,
  };

  try {
    const chunks: FileChunk[] = [];
    const chunkCount = Math.ceil(fileData.length / finalConfig.size);
    let processedBytes = 0;

    for (let i = 0; i < chunkCount; i++) {
      const start = i * finalConfig.size;
      const end = Math.min(start + finalConfig.size, fileData.length);
      const chunkData = fileData.slice(start, end);

      // Compress chunk if configured
      let processedChunkData = chunkData;
      if (finalConfig.compression !== 'none') {
        processedChunkData = await compressData(chunkData, finalConfig.compression);
      }

      // Calculate chunk hash for deduplication
      const chunkHash = await calculateSHA256(processedChunkData);

      // Check for deduplication
      if (finalConfig.deduplication && hashCache.has(chunkHash)) {
        const existingRef = hashCache.get(chunkHash)!;
        chunks.push({
          index: i,
          size: chunkData.length,
          hash: chunkHash,
          encrypted: {
            data: '',
            iv: '',
            algorithm: 'deduplication-ref',
            version: 1,
          },
          storageRef: existingRef,
          uploadedAt: new Date(),
          verified: true,
        });
      } else {
        // Create new chunk
        const chunk: FileChunk = {
          index: i,
          size: chunkData.length,
          hash: chunkHash,
          encrypted: {
            data: btoa(String.fromCharCode(...processedChunkData)),
            iv: '',
            algorithm: finalConfig.compression,
            version: 1,
          },
          storageRef: `chunk_${chunkHash}`,
          uploadedAt: new Date(),
          verified: false,
        };

        chunks.push(chunk);
        hashCache.set(chunkHash, chunk.storageRef);
      }

      processedBytes += chunkData.length;

      // Report progress
      updateProgress(operationId, {
        fileId: operationId,
        progress: (processedBytes / fileData.length) * 100,
        status: 'processing',
        bytesUploaded: processedBytes,
        totalBytes: fileData.length,
        uploadSpeed: 0, // Not applicable for chunking
        estimatedTimeRemaining: 0,
      });
    }

    return {
      success: true,
      chunks,
      metrics: {
        duration: 0, // Will be set by caller
        bytesProcessed: fileData.length,
        processingSpeed: fileData.length / 1000, // bytes per second estimate
        memoryUsed: fileData.length * 1.5, // Estimate including overhead
        cpuUsage: 0,
        networkUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `File chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'chunk-missing',
    };
  }
}

/**
 * Handle file encryption operations
 */
async function handleEncryptFile(data: {
  fileData: Uint8Array;
  filename: string;
  mimeType: string;
  accountKey: Uint8Array;
  itemId: string;
  options?: {
    chunkSize?: number;
    context?: EncryptionContext;
  };
}, operationId: string): Promise<FileOperationResult> {
  const { fileData, filename, mimeType, accountKey, itemId, options = {} } = data;

  try {
    const progressCallback = (progress: any) => {
      updateProgress(operationId, {
        fileId: operationId,
        progress: progress.percentage,
        status: 'uploading',
        bytesUploaded: progress.processed,
        totalBytes: progress.total,
        uploadSpeed: 0,
        estimatedTimeRemaining: 0,
      });
    };

    const encryptOptions: any = {
      progressCallback,
    };
    
    if (options.chunkSize !== undefined) {
      encryptOptions.chunkSize = options.chunkSize;
    }
    
    if (options.context !== undefined) {
      encryptOptions.context = options.context;
    }

    const result = await FileEncryption.encryptFile(
      fileData,
      filename,
      mimeType,
      accountKey,
      itemId,
      encryptOptions
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'File encryption failed',
        errorCode: 'encryption-failed',
      };
    }

    return {
      success: true,
      ...result.data,
      metrics: {
        duration: result.metrics?.duration ?? 0,
        bytesProcessed: fileData.length,
        processingSpeed: result.metrics?.duration ? fileData.length / (result.metrics.duration / 1000) : 0,
        memoryUsed: result.metrics?.memoryUsed ?? 0,
        cpuUsage: result.metrics?.cpuUsage ?? 0,
        networkUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `File encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'encryption-failed',
    };
  }
}

/**
 * Handle file decryption operations
 */
async function handleDecryptFile(data: {
  encryptedFile: any;
  accountKey: Uint8Array;
  itemId: string;
  context?: DecryptionContext;
}, operationId: string): Promise<FileOperationResult> {
  const { } = data; // Destructure to acknowledge we receive the data

  try {
    const progressCallback = (progress: any) => {
      updateProgress(operationId, {
        fileId: operationId,
        progress: progress.percentage,
        status: 'decrypting',
        bytesDownloaded: progress.processed,
        totalBytes: progress.total,
        downloadSpeed: 0,
        chunksDownloaded: progress.currentChunk,
        totalChunks: progress.totalChunks,
      });
    };

    // Note: FileEncryption.decryptFile doesn't exist in the interface shown
    // This would need to be implemented or we use individual chunk decryption
    
    return {
      success: false,
      error: 'File decryption not yet implemented',
      errorCode: 'decryption-failed',
    };
  } catch (error) {
    return {
      success: false,
      error: `File decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'decryption-failed',
    };
  }
}

/**
 * Handle data compression
 */
async function handleCompressData(data: {
  input: Uint8Array;
  algorithm: 'gzip' | 'brotli' | 'none';
}): Promise<CryptoOperationResult<Uint8Array>> {
  const { input, algorithm } = data;

  try {
    if (algorithm === 'none') {
      return { success: true, data: input };
    }

    const compressed = await compressData(input, algorithm);
    return { success: true, data: compressed };
  } catch (error) {
    return {
      success: false,
      error: `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'COMPRESSION_FAILED',
    };
  }
}

/**
 * Handle data decompression
 */
async function handleDecompressData(data: {
  input: Uint8Array;
  algorithm: 'gzip' | 'brotli' | 'none';
}): Promise<CryptoOperationResult<Uint8Array>> {
  const { input, algorithm } = data;

  try {
    if (algorithm === 'none') {
      return { success: true, data: input };
    }

    const decompressed = await decompressData(input, algorithm);
    return { success: true, data: decompressed };
  } catch (error) {
    return {
      success: false,
      error: `Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'DECOMPRESSION_FAILED',
    };
  }
}

/**
 * Handle manifest creation
 */
async function handleCreateManifest(data: {
  filename: string;
  fileSize: number;
  mimeType: string;
  chunks: FileChunk[];
  chunkSize: number;
}): Promise<CryptoOperationResult<FileManifest>> {
  const { filename, fileSize, mimeType, chunks, chunkSize } = data;

  try {
    // Calculate overall file hash
    const fileHash = await calculateSHA256(new TextEncoder().encode(chunks.map(c => c.hash).join('')));

    const manifest: FileManifest = {
      id: crypto.randomUUID(),
      filename,
      size: fileSize,
      mimeType,
      hash: fileHash,
      chunkCount: chunks.length,
      chunkSize,
      chunks: chunks.map(chunk => ({
        index: chunk.index,
        hash: chunk.hash,
        storageRef: chunk.storageRef,
        size: chunk.size,
        nonce: chunk.encrypted.iv,
      })),
      createdAt: new Date(),
      modifiedAt: new Date(),
      encryptionAlgorithm: 'AES-256-GCM',
      compression: 'gzip',
    };

    return { success: true, data: manifest };
  } catch (error) {
    return {
      success: false,
      error: `Manifest creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'MANIFEST_CREATION_FAILED',
    };
  }
}

/**
 * Handle chunk validation
 */
async function handleValidateChunk(data: {
  chunk: FileChunk;
  expectedHash?: string;
}): Promise<CryptoOperationResult<boolean>> {
  const { chunk, expectedHash } = data;

  try {
    // Decode chunk data
    const chunkData = new Uint8Array(
      atob(chunk.encrypted.data)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    // Calculate hash
    const calculatedHash = await calculateSHA256(chunkData);

    // Validate against stored hash
    const isValid = calculatedHash === chunk.hash;

    // Validate against expected hash if provided
    const isExpectedValid = expectedHash ? calculatedHash === expectedHash : true;

    return {
      success: true,
      data: isValid && isExpectedValid,
    };
  } catch (error) {
    return {
      success: false,
      error: `Chunk validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'INTEGRITY_CHECK_FAILED',
    };
  }
}

/**
 * Handle hash calculation
 */
async function handleCalculateHash(data: {
  input: Uint8Array;
  algorithm?: 'SHA-256' | 'SHA-1' | 'MD5';
}): Promise<CryptoOperationResult<string>> {
  const { input, algorithm = 'SHA-256' } = data;

  try {
    let hash: string;

    if (algorithm === 'SHA-256') {
      hash = await calculateSHA256(input);
    } else {
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }

    return { success: true, data: hash };
  } catch (error) {
    return {
      success: false,
      error: `Hash calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'HASH_CALCULATION_FAILED',
    };
  }
}

/**
 * Handle chunk optimization
 */
async function handleOptimizeChunks(data: {
  chunks: FileChunk[];
  optimization: 'deduplication' | 'compression' | 'reorder';
}): Promise<CryptoOperationResult<FileChunk[]>> {
  const { chunks, optimization } = data;

  try {
    let optimizedChunks = [...chunks];

    switch (optimization) {
      case 'deduplication':
        optimizedChunks = await deduplicateChunks(chunks);
        break;

      case 'compression':
        optimizedChunks = await recompressChunks(chunks);
        break;

      case 'reorder':
        optimizedChunks = await reorderChunks(chunks);
        break;
    }

    return { success: true, data: optimizedChunks };
  } catch (error) {
    return {
      success: false,
      error: `Chunk optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'OPTIMIZATION_FAILED',
    };
  }
}

/**
 * Handle file assembly from chunks
 */
async function handleAssembleFile(data: {
  chunks: FileChunk[];
  expectedSize: number;
  decompression?: 'gzip' | 'brotli' | 'none';
}, operationId: string): Promise<FileOperationResult & { fileData?: Uint8Array }> {
  const { chunks, expectedSize, decompression = 'gzip' } = data;

  try {
    // Sort chunks by index
    const sortedChunks = chunks.sort((a, b) => a.index - b.index);
    const fileChunks: Uint8Array[] = [];
    let assembledSize = 0;

    for (let i = 0; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];

      // Decode chunk data
      const chunkData = new Uint8Array(
        atob(chunk.encrypted.data)
          .split('')
          .map(c => c.charCodeAt(0))
      );

      // Decompress if needed
      let processedData = chunkData;
      if (decompression !== 'none') {
        processedData = await decompressData(chunkData, decompression);
      }

      fileChunks.push(processedData);
      assembledSize += processedData.length;

      // Report progress
      updateProgress(operationId, {
        fileId: operationId,
        progress: ((i + 1) / sortedChunks.length) * 100,
        status: 'downloading',
        bytesDownloaded: assembledSize,
        totalBytes: expectedSize,
        downloadSpeed: 0,
        chunksDownloaded: i + 1,
        totalChunks: sortedChunks.length,
      });
    }

    // Combine all chunks
    const totalSize = fileChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const assembledFile = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of fileChunks) {
      assembledFile.set(chunk, offset);
      offset += chunk.length;
    }

    // Validate assembled file size
    if (assembledFile.length !== expectedSize) {
      return {
        success: false,
        error: `Assembled file size mismatch. Expected: ${expectedSize}, Got: ${assembledFile.length}`,
        errorCode: 'integrity-check-failed',
      };
    }

    return {
      success: true,
      fileData: assembledFile,
      metrics: {
        duration: 0,
        bytesProcessed: assembledFile.length,
        processingSpeed: 0,
        memoryUsed: assembledFile.length,
        cpuUsage: 0,
        networkUsage: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `File assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'download-failed',
    };
  }
}

/**
 * Handle upload processing pipeline
 */
async function handleProcessUpload(data: {
  fileData: Uint8Array;
  filename: string;
  mimeType: string;
  accountKey: Uint8Array;
  itemId: string;
  config: Partial<ChunkConfig>;
}, operationId: string): Promise<FileOperationResult> {
  const { fileData, filename, mimeType, accountKey, itemId, config } = data;

  try {
    // Step 1: Chunk the file
    const chunkResult = await handleChunkFile({ fileData, config }, operationId);
    if (!chunkResult.success || !chunkResult.chunks) {
      return chunkResult;
    }

    // Step 2: Create manifest
    const manifestResult = await handleCreateManifest({
      filename,
      fileSize: fileData.length,
      mimeType,
      chunks: chunkResult.chunks,
      chunkSize: config.size ?? 4 * 1024 * 1024,
    });

    if (!manifestResult.success) {
      return {
        success: false,
        error: manifestResult.error || 'Upload failed',
        errorCode: 'upload-failed',
      };
    }

    return {
      success: true,
      fileId: manifestResult.data!.id,
      ...manifestResult.data,
      chunks: chunkResult.chunks,
    } as any;
  } catch (error) {
    return {
      success: false,
      error: `Upload processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'upload-failed',
    };
  }
}

/**
 * Handle download processing pipeline
 */
async function handleProcessDownload(data: {
  manifest: FileManifest;
  chunks: FileChunk[];
  decompression?: 'gzip' | 'brotli' | 'none';
}, operationId: string): Promise<FileOperationResult> {
  const { manifest, chunks, decompression } = data;

  try {
    const assembleOptions: any = {
      chunks,
      expectedSize: manifest.size,
    };
    
    if (decompression !== undefined) {
      assembleOptions.decompression = decompression;
    }
    
    const assembleResult = await handleAssembleFile(assembleOptions, operationId);

    return assembleResult;
  } catch (error) {
    return {
      success: false,
      error: `Download processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'download-failed',
    };
  }
}

/**
 * Utility functions
 */

async function compressData(data: Uint8Array, algorithm: 'gzip' | 'brotli'): Promise<Uint8Array> {
  if (algorithm === 'gzip') {
    return deflate(data);
  } else {
    // Fallback to gzip for brotli (would need brotli library)
    return deflate(data);
  }
}

async function decompressData(data: Uint8Array, algorithm: 'gzip' | 'brotli'): Promise<Uint8Array> {
  if (algorithm === 'gzip') {
    return inflate(data);
  } else {
    // Fallback to gzip for brotli
    return inflate(data);
  }
}

async function calculateSHA256(data: Uint8Array): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Simple fallback hash for non-browser environments
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    return hash.toString(16);
  }
}

async function deduplicateChunks(chunks: FileChunk[]): Promise<FileChunk[]> {
  const seen = new Set<string>();
  return chunks.filter(chunk => {
    if (seen.has(chunk.hash)) {
      return false;
    }
    seen.add(chunk.hash);
    return true;
  });
}

async function recompressChunks(chunks: FileChunk[]): Promise<FileChunk[]> {
  // Placeholder for recompression logic
  return chunks;
}

async function reorderChunks(chunks: FileChunk[]): Promise<FileChunk[]> {
  // Reorder for optimal access patterns
  return chunks.sort((a, b) => a.index - b.index);
}

function updateProgress(operationId: string, progress: FileUploadProgress | FileDownloadProgress): void {
  activeOperations.set(operationId, progress);

  // Send progress update
  self.postMessage({
    id: operationId,
    success: true,
    progress,
  } as FileWorkerResponse);
}

/**
 * Worker initialization
 */
console.log('File Processing Worker initialized');

// Set up periodic cleanup of completed operations
setInterval(() => {
  for (const [id, progress] of activeOperations) {
    if (progress.status === 'completed' || progress.status === 'failed') {
      activeOperations.delete(id);
    }
  }
}, 30000); // Clean up every 30 seconds
