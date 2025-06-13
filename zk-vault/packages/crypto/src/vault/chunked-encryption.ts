/**
 * @fileoverview Chunked Encryption
 * @responsibility Handles streaming encryption of large data with memory efficiency
 * @principle Single Responsibility - Only chunked encryption operations
 * @security Memory-efficient encryption for large datasets with integrity verification
 */

import {
  EncryptionResult,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
  FILE_ENCRYPTION,
} from '@zk-vault/shared';

import { AESGCMCipher } from '../algorithms/aes-gcm';
import { HKDF } from '../key-derivation/hkdf';

/**
 * Chunk encryption metadata
 * @responsibility Contains information about encrypted chunks
 */
export interface ChunkMetadata {
  /** Chunk index in sequence */
  index: number;
  /** Original chunk size */
  originalSize: number;
  /** Encrypted chunk size */
  encryptedSize: number;
  /** Chunk hash for integrity */
  hash: string;
  /** Encryption timestamp */
  timestamp: number;
}

/**
 * Chunked encryption session
 * @responsibility Manages state for chunked encryption operations
 */
export interface ChunkedEncryptionSession {
  /** Session identifier */
  sessionId: string;
  /** Total data size */
  totalSize: number;
  /** Chunk size being used */
  chunkSize: number;
  /** Total number of chunks */
  totalChunks: number;
  /** Chunks processed so far */
  processedChunks: number;
  /** Session creation time */
  createdAt: number;
  /** Chunk metadata */
  chunks: ChunkMetadata[];
}

/**
 * Streaming encryption interface
 * @responsibility Defines streaming encryption operations
 */
export interface StreamingEncryption {
  /** Processes a chunk of data */
  processChunk(data: Uint8Array): Promise<CryptoOperationResult<EncryptionResult>>;
  /** Finalizes the encryption session */
  finalize(): Promise<CryptoOperationResult<ChunkedEncryptionSession>>;
  /** Gets current progress */
  getProgress(): { processed: number; total: number; percentage: number };
}

/**
 * Streaming decryption interface
 * @responsibility Defines streaming decryption operations
 */
export interface StreamingDecryption {
  /** Processes an encrypted chunk */
  processChunk(
    encryptedData: EncryptionResult,
    metadata: ChunkMetadata
  ): Promise<CryptoOperationResult<Uint8Array>>;
  /** Finalizes the decryption session */
  finalize(): Promise<CryptoOperationResult<boolean>>;
  /** Gets current progress */
  getProgress(): { processed: number; total: number; percentage: number };
}

/**
 * Chunked encryption for large data processing
 * @responsibility Handles memory-efficient encryption of large datasets
 * @security Uses per-chunk keys and integrity verification
 */
export class ChunkedEncryption {
  /**
   * Creates a streaming encryption session
   * @param masterKey Master encryption key
   * @param totalSize Total size of data to encrypt
   * @param chunkSize Size of each chunk
   * @param context Encryption context
   * @returns Streaming encryption interface
   */
  static createEncryptionStream(
    masterKey: Uint8Array,
    totalSize: number,
    chunkSize: number = FILE_ENCRYPTION.CHUNK_SIZE,
    context?: EncryptionContext
  ): CryptoOperationResult<StreamingEncryption> {
    try {
      // Validate inputs
      if (masterKey.length !== 32) {
        return {
          success: false,
          error: 'Master key must be 32 bytes',
          errorCode: 'INVALID_MASTER_KEY_LENGTH',
        };
      }

      if (totalSize <= 0) {
        return {
          success: false,
          error: 'Total size must be positive',
          errorCode: 'INVALID_TOTAL_SIZE',
        };
      }

      if (
        chunkSize < FILE_ENCRYPTION.MIN_CHUNK_SIZE ||
        chunkSize > FILE_ENCRYPTION.MAX_CHUNK_SIZE
      ) {
        return {
          success: false,
          error: `Chunk size must be between ${FILE_ENCRYPTION.MIN_CHUNK_SIZE} and ${FILE_ENCRYPTION.MAX_CHUNK_SIZE} bytes`,
          errorCode: 'INVALID_CHUNK_SIZE',
        };
      }

      const sessionId = this.generateSessionId();
      const totalChunks = Math.ceil(totalSize / chunkSize);

      const session: ChunkedEncryptionSession = {
        sessionId,
        totalSize,
        chunkSize,
        totalChunks,
        processedChunks: 0,
        createdAt: Date.now(),
        chunks: [],
      };

      const stream = new ChunkedEncryptionStream(masterKey, session, context);

      return {
        success: true,
        data: stream,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create encryption stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'STREAM_CREATION_FAILED',
      };
    }
  }

  /**
   * Creates a streaming decryption session
   * @param masterKey Master encryption key
   * @param session Chunked encryption session metadata
   * @param context Decryption context
   * @returns Streaming decryption interface
   */
  static createDecryptionStream(
    masterKey: Uint8Array,
    session: ChunkedEncryptionSession,
    context?: DecryptionContext
  ): CryptoOperationResult<StreamingDecryption> {
    try {
      // Validate inputs
      if (masterKey.length !== 32) {
        return {
          success: false,
          error: 'Master key must be 32 bytes',
          errorCode: 'INVALID_MASTER_KEY_LENGTH',
        };
      }

      if (!this.validateSession(session)) {
        return {
          success: false,
          error: 'Invalid session metadata',
          errorCode: 'INVALID_SESSION',
        };
      }

      const stream = new ChunkedDecryptionStream(masterKey, session, context);

      return {
        success: true,
        data: stream,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create decryption stream: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'STREAM_CREATION_FAILED',
      };
    }
  }

  /**
   * Encrypts data in chunks (non-streaming)
   * @param data Data to encrypt
   * @param masterKey Master encryption key
   * @param chunkSize Chunk size to use
   * @param context Encryption context
   * @returns Encrypted chunks and session metadata
   */
  static async encryptInChunks(
    data: Uint8Array,
    masterKey: Uint8Array,
    chunkSize: number = FILE_ENCRYPTION.CHUNK_SIZE,
    context?: EncryptionContext
  ): Promise<
    CryptoOperationResult<{
      session: ChunkedEncryptionSession;
      encryptedChunks: EncryptionResult[];
    }>
  > {
    try {
      // Create encryption stream
      const streamResult = this.createEncryptionStream(masterKey, data.length, chunkSize, context);

      if (!streamResult.success || !streamResult.data) {
        return {
          success: false,
          error: streamResult.error || 'Failed to create encryption stream',
          errorCode: streamResult.errorCode || 'STREAM_CREATION_FAILED',
        };
      }

      const stream = streamResult.data;
      const encryptedChunks: EncryptionResult[] = [];

      // Process all chunks
      for (let i = 0; i < Math.ceil(data.length / chunkSize); i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, data.length);
        const chunk = data.slice(start, end);

        const chunkResult = await stream.processChunk(chunk);

        if (!chunkResult.success || !chunkResult.data) {
          return {
            success: false,
            error: chunkResult.error || `Failed to encrypt chunk ${i}`,
            errorCode: chunkResult.errorCode || 'CHUNK_ENCRYPTION_FAILED',
          };
        }

        encryptedChunks.push(chunkResult.data);
      }

      // Finalize session
      const sessionResult = await stream.finalize();

      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: sessionResult.error || 'Failed to finalize encryption',
          errorCode: sessionResult.errorCode || 'FINALIZATION_FAILED',
        };
      }

      return {
        success: true,
        data: {
          session: sessionResult.data,
          encryptedChunks,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Chunked encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'CHUNKED_ENCRYPTION_FAILED',
      };
    }
  }

  /**
   * Decrypts chunked data (non-streaming)
   * @param encryptedChunks Encrypted chunks
   * @param session Session metadata
   * @param masterKey Master encryption key
   * @param context Decryption context
   * @returns Decrypted data
   */
  static async decryptFromChunks(
    encryptedChunks: EncryptionResult[],
    session: ChunkedEncryptionSession,
    masterKey: Uint8Array,
    context?: DecryptionContext
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      // Create decryption stream
      const streamResult = this.createDecryptionStream(masterKey, session, context);

      if (!streamResult.success || !streamResult.data) {
        return {
          success: false,
          error: streamResult.error || 'Failed to create decryption stream',
          errorCode: streamResult.errorCode || 'STREAM_CREATION_FAILED',
        };
      }

      const stream = streamResult.data;
      const decryptedChunks: Uint8Array[] = [];

      // Process all chunks
      for (let i = 0; i < encryptedChunks.length; i++) {
        const encryptedChunk = encryptedChunks[i];
        const metadata = session.chunks[i];

        if (!metadata) {
          return {
            success: false,
            error: `Missing metadata for chunk ${i}`,
            errorCode: 'MISSING_CHUNK_METADATA',
          };
        }

        const chunkResult = await stream.processChunk(encryptedChunk, metadata);

        if (!chunkResult.success || !chunkResult.data) {
          return {
            success: false,
            error: chunkResult.error || `Failed to decrypt chunk ${i}`,
            errorCode: chunkResult.errorCode || 'CHUNK_DECRYPTION_FAILED',
          };
        }

        decryptedChunks.push(chunkResult.data);
      }

      // Finalize session
      const finalizeResult = await stream.finalize();

      if (!finalizeResult.success) {
        return {
          success: false,
          error: finalizeResult.error || 'Failed to finalize decryption',
          errorCode: finalizeResult.errorCode || 'FINALIZATION_FAILED',
        };
      }

      // Combine chunks
      const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);

      let offset = 0;
      for (const chunk of decryptedChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      return {
        success: true,
        data: combined,
      };
    } catch (error) {
      return {
        success: false,
        error: `Chunked decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'CHUNKED_DECRYPTION_FAILED',
      };
    }
  }

  /**
   * Generates a unique session identifier
   * @returns Session ID
   */
  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `chunk_${timestamp}_${random}`;
  }

  /**
   * Validates session metadata
   * @param session Session to validate
   * @returns True if session is valid
   */
  private static validateSession(session: ChunkedEncryptionSession): boolean {
    return (
      session &&
      typeof session.sessionId === 'string' &&
      typeof session.totalSize === 'number' &&
      session.totalSize > 0 &&
      typeof session.chunkSize === 'number' &&
      session.chunkSize > 0 &&
      typeof session.totalChunks === 'number' &&
      session.totalChunks > 0 &&
      Array.isArray(session.chunks)
    );
  }

  /**
   * Computes hash of data for integrity verification
   * @param data Data to hash
   * @returns Hash as hex string
   */
  private static async computeHash(data: Uint8Array): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      throw new Error('SHA-256 not available in this environment');
    }
  }
}

/**
 * Streaming encryption implementation
 * @responsibility Handles streaming encryption of chunks
 */
class ChunkedEncryptionStream implements StreamingEncryption {
  private currentChunk = 0;
  private processedBytes = 0;

  constructor(
    private masterKey: Uint8Array,
    private session: ChunkedEncryptionSession,
    private context?: EncryptionContext
  ) {}

  async processChunk(data: Uint8Array): Promise<CryptoOperationResult<EncryptionResult>> {
    try {
      // Derive chunk-specific key
      const chunkKeyResult = await HKDF.derive(
        this.masterKey,
        new Uint8Array(0), // No salt for simplicity
        new TextEncoder().encode(`chunk-${this.session.sessionId}-${this.currentChunk}`),
        32
      );

      if (!chunkKeyResult.success || !chunkKeyResult.data) {
        return {
          success: false,
          error: 'Failed to derive chunk key',
          errorCode: 'CHUNK_KEY_DERIVATION_FAILED',
        };
      }

      const chunkKey = chunkKeyResult.data;

      // Encrypt chunk
      const encryptResult = await AESGCMCipher.encrypt(data, chunkKey, this.context);

      if (!encryptResult.success || !encryptResult.data) {
        return {
          success: false,
          error: 'Failed to encrypt chunk',
          errorCode: 'CHUNK_ENCRYPTION_FAILED',
        };
      }

      // Compute chunk hash
      const hash = await ChunkedEncryption['computeHash'](data);

      // Update session metadata
      const metadata: ChunkMetadata = {
        index: this.currentChunk,
        originalSize: data.length,
        encryptedSize: encryptResult.data.ciphertext.length,
        hash,
        timestamp: Date.now(),
      };

      this.session.chunks.push(metadata);
      this.currentChunk++;
      this.processedBytes += data.length;

      return encryptResult;
    } catch (error) {
      return {
        success: false,
        error: `Chunk processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'CHUNK_PROCESSING_FAILED',
      };
    }
  }

  async finalize(): Promise<CryptoOperationResult<ChunkedEncryptionSession>> {
    try {
      this.session.processedChunks = this.currentChunk;

      return {
        success: true,
        data: this.session,
      };
    } catch (error) {
      return {
        success: false,
        error: `Finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'FINALIZATION_FAILED',
      };
    }
  }

  getProgress(): { processed: number; total: number; percentage: number } {
    return {
      processed: this.processedBytes,
      total: this.session.totalSize,
      percentage: (this.processedBytes / this.session.totalSize) * 100,
    };
  }
}

/**
 * Streaming decryption implementation
 * @responsibility Handles streaming decryption of chunks
 */
class ChunkedDecryptionStream implements StreamingDecryption {
  private currentChunk = 0;
  private processedBytes = 0;

  constructor(
    private masterKey: Uint8Array,
    private session: ChunkedEncryptionSession,
    private context?: DecryptionContext
  ) {}

  async processChunk(
    encryptedData: EncryptionResult,
    metadata: ChunkMetadata
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      // Verify chunk order
      if (metadata.index !== this.currentChunk) {
        return {
          success: false,
          error: `Chunk out of order. Expected ${this.currentChunk}, got ${metadata.index}`,
          errorCode: 'CHUNK_OUT_OF_ORDER',
        };
      }

      // Derive chunk-specific key
      const chunkKeyResult = await HKDF.derive(
        this.masterKey,
        new Uint8Array(0), // No salt for simplicity
        new TextEncoder().encode(`chunk-${this.session.sessionId}-${this.currentChunk}`),
        32
      );

      if (!chunkKeyResult.success || !chunkKeyResult.data) {
        return {
          success: false,
          error: 'Failed to derive chunk key',
          errorCode: 'CHUNK_KEY_DERIVATION_FAILED',
        };
      }

      const chunkKey = chunkKeyResult.data;

      // Decrypt chunk
      const decryptResult = await AESGCMCipher.decrypt(encryptedData, chunkKey, this.context);

      if (!decryptResult.success || !decryptResult.data) {
        return {
          success: false,
          error: 'Failed to decrypt chunk',
          errorCode: 'CHUNK_DECRYPTION_FAILED',
        };
      }

      const decryptedData = decryptResult.data;

      // Verify chunk integrity
      const hash = await ChunkedEncryption['computeHash'](decryptedData);
      if (hash !== metadata.hash) {
        return {
          success: false,
          error: 'Chunk integrity verification failed',
          errorCode: 'CHUNK_INTEGRITY_FAILED',
        };
      }

      this.currentChunk++;
      this.processedBytes += decryptedData.length;

      return {
        success: true,
        data: decryptedData,
      };
    } catch (error) {
      return {
        success: false,
        error: `Chunk processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'CHUNK_PROCESSING_FAILED',
      };
    }
  }

  async finalize(): Promise<CryptoOperationResult<boolean>> {
    try {
      // Verify all chunks were processed
      if (this.currentChunk !== this.session.totalChunks) {
        return {
          success: false,
          error: `Incomplete decryption. Expected ${this.session.totalChunks} chunks, processed ${this.currentChunk}`,
          errorCode: 'INCOMPLETE_DECRYPTION',
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'FINALIZATION_FAILED',
      };
    }
  }

  getProgress(): { processed: number; total: number; percentage: number } {
    return {
      processed: this.processedBytes,
      total: this.session.totalSize,
      percentage: (this.processedBytes / this.session.totalSize) * 100,
    };
  }
}
