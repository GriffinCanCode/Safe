/**
 * @fileoverview AES-256-GCM Implementation
 * @responsibility Provides AES-256-GCM encryption and decryption operations
 * @principle Single Responsibility - Only AES-GCM cryptographic operations
 * @security Hardware-accelerated AEAD cipher with 256-bit keys
 */

import { 
  EncryptionResult, 
  EncryptionContext, 
  DecryptionContext,
  CryptoOperationResult,
  AES_GCM_PARAMS 
} from '@zk-vault/shared';

/**
 * AES-256-GCM encryption implementation
 * @responsibility Handles AES-256-GCM encryption and decryption
 * @security Uses WebCrypto API for hardware acceleration when available
 */
export class AESGCMCipher {
  
  /**
   * Encrypts data using AES-256-GCM
   * @param plaintext Data to encrypt
   * @param key 256-bit encryption key
   * @param context Encryption context
   * @returns Encryption result with ciphertext and metadata
   */
  static async encrypt(
    plaintext: Uint8Array,
    key: Uint8Array,
    context?: EncryptionContext
  ): Promise<CryptoOperationResult<EncryptionResult>> {
    const startTime = performance.now();
    
    try {
      // Validate inputs
      if (key.length !== 32) {
        return {
          success: false,
          error: 'Invalid key length. AES-256-GCM requires 32-byte key',
          errorCode: 'INVALID_KEY_LENGTH'
        };
      }

      if (plaintext.length === 0) {
        return {
          success: false,
          error: 'Cannot encrypt empty data',
          errorCode: 'INVALID_DATA_SIZE'
        };
      }

      // Generate random IV (12 bytes for GCM)
      const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_PARAMS.IV_LENGTH));
      
      // Prepare additional authenticated data if provided
      const additionalData = context?.additionalData;

      let encryptedData: ArrayBuffer;
      
      // Use WebCrypto API if available (browser environment)
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          key,
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );

        const algorithm: AesGcmParams = {
          name: 'AES-GCM',
          iv: iv,
          ...(additionalData && { additionalData })
        };

        encryptedData = await window.crypto.subtle.encrypt(
          algorithm,
          cryptoKey,
          plaintext
        );
      } else {
        // Fallback for Node.js environment
        return {
          success: false,
          error: 'AES-GCM not available in this environment',
          errorCode: 'ALGORITHM_NOT_SUPPORTED'
        };
      }

      // Extract ciphertext and auth tag
      const encrypted = new Uint8Array(encryptedData);
      const ciphertext = encrypted.slice(0, -AES_GCM_PARAMS.TAG_LENGTH);
      const authTag = encrypted.slice(-AES_GCM_PARAMS.TAG_LENGTH);

      const result: EncryptionResult = {
        ciphertext,
        nonce: iv,
        authTag,
        algorithm: 'AES-256-GCM',
        timestamp: Date.now()
      };

      const endTime = performance.now();

      return {
        success: true,
        data: result,
        metrics: {
          duration: endTime - startTime,
          memoryUsed: plaintext.length + encrypted.length,
          cpuUsage: 0 // Not measurable in browser
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `AES-GCM encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'ENCRYPTION_FAILED'
      };
    }
  }

  /**
   * Decrypts data using AES-256-GCM
   * @param encryptedData Encryption result to decrypt
   * @param key 256-bit decryption key
   * @param context Decryption context
   * @returns Decrypted plaintext
   */
  static async decrypt(
    encryptedData: EncryptionResult,
    key: Uint8Array,
    context?: DecryptionContext
  ): Promise<CryptoOperationResult<Uint8Array>> {
    const startTime = performance.now();

    try {
      // Validate inputs
      if (key.length !== 32) {
        return {
          success: false,
          error: 'Invalid key length. AES-256-GCM requires 32-byte key',
          errorCode: 'INVALID_KEY_LENGTH'
        };
      }

      if (encryptedData.algorithm !== 'AES-256-GCM') {
        return {
          success: false,
          error: 'Invalid algorithm. Expected AES-256-GCM',
          errorCode: 'ALGORITHM_NOT_SUPPORTED'
        };
      }

      // Check data age if specified
      if (context?.maxAge) {
        const age = Date.now() - encryptedData.timestamp;
        if (age > context.maxAge) {
          return {
            success: false,
            error: 'Encrypted data is too old',
            errorCode: 'DATA_EXPIRED'
          };
        }
      }

      // Reconstruct the encrypted data with auth tag
      const combinedData = new Uint8Array(
        encryptedData.ciphertext.length + (encryptedData.authTag?.length || 0)
      );
      combinedData.set(encryptedData.ciphertext);
      if (encryptedData.authTag) {
        combinedData.set(encryptedData.authTag, encryptedData.ciphertext.length);
      }

      let decryptedData: ArrayBuffer;

      // Use WebCrypto API if available
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          key,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );

        const algorithm: AesGcmParams = {
          name: 'AES-GCM',
          iv: encryptedData.nonce,
          ...(context?.verifyAdditionalData && { additionalData: context.verifyAdditionalData })
        };

        decryptedData = await window.crypto.subtle.decrypt(
          algorithm,
          cryptoKey,
          combinedData
        );
      } else {
        // Fallback for Node.js environment
        return {
          success: false,
          error: 'AES-GCM not available in this environment',
          errorCode: 'ALGORITHM_NOT_SUPPORTED'
        };
      }

      const plaintext = new Uint8Array(decryptedData);
      const endTime = performance.now();

      return {
        success: true,
        data: plaintext,
        metrics: {
          duration: endTime - startTime,
          memoryUsed: combinedData.length + plaintext.length,
          cpuUsage: 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `AES-GCM decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'DECRYPTION_FAILED'
      };
    }
  }

  /**
   * Generates a random 256-bit key for AES-GCM
   * @returns Random 32-byte key
   */
  static generateKey(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Validates an AES-256-GCM key
   * @param key Key to validate
   * @returns True if key is valid
   */
  static validateKey(key: Uint8Array): boolean {
    return key.length === 32;
  }
}
