/**
 * @fileoverview XChaCha20-Poly1305 Implementation
 * @responsibility Provides XChaCha20-Poly1305 encryption and decryption operations
 * @principle Single Responsibility - Only XChaCha20-Poly1305 cryptographic operations
 * @security Software-optimized AEAD cipher with 256-bit keys and extended nonces
 * @reference https://tools.ietf.org/html/draft-irtf-cfrg-xchacha-03
 */

import {
  EncryptionResult,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
  XCHACHA20_PARAMS,
} from '@zk-vault/shared';

// Dynamic imports for crypto libraries
let libsodium: any = null;
let stableLibXChaCha20: any = null;

// Initialize crypto libraries
async function initializeCrypto() {
  // Try libsodium-wrappers first (most comprehensive)
  try {
    libsodium = await import('libsodium-wrappers');
    await libsodium.ready();
    console.log('Libsodium initialized successfully');
  } catch (error) {
    console.warn('Libsodium not available, trying StableLib fallback');
  }

  // Try StableLib as fallback
  if (!libsodium) {
    try {
      const stableLib = await import('@stablelib/xchacha20poly1305');
      stableLibXChaCha20 = stableLib.XChaCha20Poly1305;
      console.log('StableLib XChaCha20-Poly1305 initialized successfully');
    } catch (error) {
      console.warn('StableLib XChaCha20-Poly1305 not available');
    }
  }
}

/**
 * XChaCha20-Poly1305 encryption implementation
 * @responsibility Handles XChaCha20-Poly1305 encryption and decryption
 * @security Uses libsodium or StableLib for production-grade implementation
 */
export class XChaCha20Poly1305Cipher {
  /**
   * Encrypts data using XChaCha20-Poly1305
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
      // Initialize crypto libraries if not already done
      await initializeCrypto();

      // Validate inputs following best practices
      if (key.length !== 32) {
        return {
          success: false,
          error: 'Invalid key length. XChaCha20-Poly1305 requires 32-byte key',
          errorCode: 'INVALID_KEY_LENGTH',
        };
      }

      if (plaintext.length === 0) {
        return {
          success: false,
          error: 'Cannot encrypt empty data',
          errorCode: 'INVALID_DATA_SIZE',
        };
      }

      // Generate random 24-byte nonce (XChaCha20 extended nonce)
      const nonce = this.generateNonce();

      // Prepare additional authenticated data if provided
      const additionalData = context?.additionalData;

      let encryptedData: Uint8Array;

      // Use libsodium if available (best implementation)
      if (libsodium) {
        encryptedData = await this.encryptWithLibsodium(plaintext, key, nonce, additionalData);
      } else if (stableLibXChaCha20) {
        // Use StableLib as fallback
        encryptedData = await this.encryptWithStableLib(plaintext, key, nonce, additionalData);
      } else {
        return {
          success: false,
          error: 'No XChaCha20-Poly1305 implementation available',
          errorCode: 'ALGORITHM_NOT_SUPPORTED',
        };
      }

      // Extract ciphertext and auth tag
      const ciphertext = encryptedData.slice(0, -XCHACHA20_PARAMS.TAG_LENGTH);
      const authTag = encryptedData.slice(-XCHACHA20_PARAMS.TAG_LENGTH);

      const result: EncryptionResult = {
        ciphertext,
        nonce,
        authTag,
        algorithm: 'XChaCha20-Poly1305',
        timestamp: Date.now(),
      };

      const endTime = performance.now();

      return {
        success: true,
        data: result,
        metrics: {
          duration: endTime - startTime,
          memoryUsed: plaintext.length + encryptedData.length,
          cpuUsage: 0, // Not measurable in browser
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `XChaCha20-Poly1305 encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'ENCRYPTION_FAILED',
      };
    }
  }

  /**
   * Decrypts data using XChaCha20-Poly1305
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
      // Initialize crypto libraries if not already done
      await initializeCrypto();

      // Validate inputs
      if (key.length !== 32) {
        return {
          success: false,
          error: 'Invalid key length. XChaCha20-Poly1305 requires 32-byte key',
          errorCode: 'INVALID_KEY_LENGTH',
        };
      }

      if (encryptedData.algorithm !== 'XChaCha20-Poly1305') {
        return {
          success: false,
          error: 'Invalid algorithm. Expected XChaCha20-Poly1305',
          errorCode: 'ALGORITHM_NOT_SUPPORTED',
        };
      }

      // Check data age if specified
      if (context?.maxAge) {
        const age = Date.now() - encryptedData.timestamp;
        if (age > context.maxAge) {
          return {
            success: false,
            error: 'Encrypted data is too old',
            errorCode: 'DATA_EXPIRED',
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

      let decryptedData: Uint8Array;

      // Use libsodium if available
      if (libsodium) {
        decryptedData = await this.decryptWithLibsodium(
          combinedData,
          key,
          encryptedData.nonce,
          context?.verifyAdditionalData
        );
      } else if (stableLibXChaCha20) {
        // Use StableLib as fallback
        decryptedData = await this.decryptWithStableLib(
          combinedData,
          key,
          encryptedData.nonce,
          context?.verifyAdditionalData
        );
      } else {
        return {
          success: false,
          error: 'No XChaCha20-Poly1305 implementation available',
          errorCode: 'ALGORITHM_NOT_SUPPORTED',
        };
      }

      const endTime = performance.now();

      return {
        success: true,
        data: decryptedData,
        metrics: {
          duration: endTime - startTime,
          memoryUsed: combinedData.length + decryptedData.length,
          cpuUsage: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `XChaCha20-Poly1305 decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'DECRYPTION_FAILED',
      };
    }
  }

  /**
   * Encrypts using libsodium implementation
   * @param plaintext Data to encrypt
   * @param key Encryption key
   * @param nonce Nonce
   * @param additionalData Additional authenticated data
   * @returns Encrypted data with auth tag
   */
  private static async encryptWithLibsodium(
    plaintext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
    additionalData?: Uint8Array
  ): Promise<Uint8Array> {
    try {
      if (additionalData) {
        return libsodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
          plaintext,
          additionalData,
          null,
          nonce,
          key
        );
      } else {
        return libsodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
          plaintext,
          null,
          null,
          nonce,
          key
        );
      }
    } catch (error) {
      throw new Error(
        `Libsodium encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypts using libsodium implementation
   * @param ciphertext Encrypted data with auth tag
   * @param key Decryption key
   * @param nonce Nonce
   * @param additionalData Additional authenticated data
   * @returns Decrypted plaintext
   */
  private static async decryptWithLibsodium(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
    additionalData?: Uint8Array
  ): Promise<Uint8Array> {
    try {
      if (additionalData) {
        return libsodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
          null,
          ciphertext,
          additionalData,
          nonce,
          key
        );
      } else {
        return libsodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
          null,
          ciphertext,
          null,
          nonce,
          key
        );
      }
    } catch (error) {
      throw new Error(
        `Libsodium decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Encrypts using StableLib implementation
   * @param plaintext Data to encrypt
   * @param key Encryption key
   * @param nonce Nonce
   * @param additionalData Additional authenticated data
   * @returns Encrypted data with auth tag
   */
  private static async encryptWithStableLib(
    plaintext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
    additionalData?: Uint8Array
  ): Promise<Uint8Array> {
    try {
      const cipher = new stableLibXChaCha20(key);
      return cipher.seal(nonce, plaintext, additionalData);
    } catch (error) {
      throw new Error(
        `StableLib encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypts using StableLib implementation
   * @param ciphertext Encrypted data with auth tag
   * @param key Decryption key
   * @param nonce Nonce
   * @param additionalData Additional authenticated data
   * @returns Decrypted plaintext
   */
  private static async decryptWithStableLib(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array,
    additionalData?: Uint8Array
  ): Promise<Uint8Array> {
    try {
      const cipher = new stableLibXChaCha20(key);
      const result = cipher.open(nonce, ciphertext, additionalData);

      if (result === null) {
        throw new Error('Authentication failed');
      }

      return result;
    } catch (error) {
      throw new Error(
        `StableLib decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generates a random 256-bit key for XChaCha20-Poly1305
   * @returns Random 32-byte key
   */
  static generateKey(): Uint8Array {
    if (libsodium) {
      return libsodium.randombytes_buf(32);
    }
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Generates a random 24-byte nonce for XChaCha20
   * @returns Random 24-byte nonce
   */
  private static generateNonce(): Uint8Array {
    if (libsodium) {
      return libsodium.randombytes_buf(XCHACHA20_PARAMS.NONCE_LENGTH);
    }
    return crypto.getRandomValues(new Uint8Array(XCHACHA20_PARAMS.NONCE_LENGTH));
  }

  /**
   * Validates an XChaCha20-Poly1305 key
   * @param key Key to validate
   * @returns True if key is valid
   */
  static validateKey(key: Uint8Array): boolean {
    return key.length === 32;
  }

  /**
   * Validates an XChaCha20 nonce
   * @param nonce Nonce to validate
   * @returns True if nonce is valid
   */
  static validateNonce(nonce: Uint8Array): boolean {
    return nonce.length === XCHACHA20_PARAMS.NONCE_LENGTH;
  }

  /**
   * Checks if libsodium is available for optimal implementation
   * @returns True if libsodium is available
   */
  static isLibsodiumAvailable(): boolean {
    return libsodium !== null;
  }

  /**
   * Checks if StableLib is available as fallback
   * @returns True if StableLib is available
   */
  static isStableLibAvailable(): boolean {
    return stableLibXChaCha20 !== null;
  }

  /**
   * Gets the available implementation
   * @returns Implementation name
   */
  static getImplementation(): string {
    if (libsodium) return 'libsodium-wrappers';
    if (stableLibXChaCha20) return '@stablelib/xchacha20poly1305';
    return 'none';
  }

  /**
   * Gets algorithm parameters
   * @returns Algorithm parameters
   */
  static getParameters(): typeof XCHACHA20_PARAMS {
    return XCHACHA20_PARAMS;
  }
}
