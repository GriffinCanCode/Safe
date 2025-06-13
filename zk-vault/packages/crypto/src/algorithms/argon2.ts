/**
 * @fileoverview Argon2id Key Derivation Implementation
 * @responsibility Provides secure password-based key derivation using Argon2id
 * @principle Single Responsibility - Only Argon2id key derivation operations
 * @security OWASP 2025 compliant parameters for maximum security
 * @reference https://tools.ietf.org/html/rfc9106
 */

import {
  KeyDerivationParams,
  KeyDerivationResult,
  CryptoOperationResult,
  ARGON2_PARAMS,
} from '@zk-vault/shared';

// Dynamic imports for optional dependencies
let argon2: any = null;
let nodeCrypto: any = null;
let webCrypto: any = null;

// Initialize crypto libraries
async function initializeCrypto() {
  if (typeof window !== 'undefined') {
    // Browser environment - use Web Crypto API
    webCrypto = window.crypto || (window as any).msCrypto;
    if (!webCrypto) {
      console.warn('Web Crypto API not available');
    }
  } else {
    // Node.js environment
    try {
      argon2 = await import('argon2');
    } catch (error) {
      console.warn('Argon2 not available, will use PBKDF2 fallback');
    }

    try {
      nodeCrypto = await import('crypto');
    } catch (error) {
      console.warn('Node.js crypto not available');
    }
  }
}

/**
 * Argon2id key derivation implementation
 * @responsibility Handles secure key derivation from passwords
 * @security Uses OWASP 2025 recommended parameters for Argon2id
 * @performance Balances security and performance for production use
 */
export class Argon2idDerivation {
  /**
   * OWASP 2025 compliant default parameters for Argon2id
   * @security These parameters provide strong protection against GPU attacks
   */
  private static readonly DEFAULT_OPTIONS = {
    time: ARGON2_PARAMS.TIME, // 3 iterations (OWASP 2025)
    memory: ARGON2_PARAMS.MEMORY, // 19456 KiB (~19 MB)
    parallelism: ARGON2_PARAMS.PARALLELISM, // 1 thread
    hashLength: ARGON2_PARAMS.HASH_LENGTH, // 32 bytes
    saltLength: ARGON2_PARAMS.SALT_LENGTH, // 32 bytes
  };

  /**
   * Derives a key from password using Argon2id
   * @param password User password (never stored)
   * @param salt Cryptographic salt (32 bytes minimum)
   * @param options Optional parameters to override defaults
   * @returns Key derivation result with timing information
   */
  static async deriveKey(
    password: string,
    salt: Uint8Array,
    options: Partial<KeyDerivationParams> = {}
  ): Promise<CryptoOperationResult<KeyDerivationResult>> {
    const startTime = performance.now();

    try {
      // Initialize crypto libraries if not already done
      await initializeCrypto();

      // Validate inputs following security best practices
      this.validateInputs(password, salt);

      // Merge with secure defaults
      const finalOptions: KeyDerivationParams = {
        password,
        salt,
        time: options.time ?? this.DEFAULT_OPTIONS.time,
        memory: options.memory ?? this.DEFAULT_OPTIONS.memory,
        parallelism: options.parallelism ?? this.DEFAULT_OPTIONS.parallelism,
        outputLength: options.outputLength ?? this.DEFAULT_OPTIONS.hashLength,
      };

      // Validate parameters are within secure ranges
      this.validateParameters(finalOptions);

      let derivedKey: Uint8Array;

      // Try to use native Argon2 implementation if available
      if (await this.isNativeArgon2Available()) {
        derivedKey = await this.deriveWithNativeArgon2(finalOptions);
      } else {
        // Fallback to PBKDF2 with increased iterations
        console.warn(
          'Argon2 not available, falling back to PBKDF2 with increased security parameters'
        );
        derivedKey = await this.deriveWithPBKDF2Fallback(finalOptions);
      }

      const endTime = performance.now();
      const derivationTime = endTime - startTime;

      const result: KeyDerivationResult = {
        key: derivedKey,
        salt,
        params: finalOptions,
        derivationTime,
      };

      return {
        success: true,
        data: result,
        metrics: {
          duration: derivationTime,
          memoryUsed: finalOptions.memory! * 1024, // Convert KiB to bytes
          cpuUsage: 0, // Not measurable in browser
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Argon2id key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Derives key using native Argon2 implementation
   * @param params Key derivation parameters
   * @returns Derived key
   */
  private static async deriveWithNativeArgon2(params: KeyDerivationParams): Promise<Uint8Array> {
    if (argon2) {
      try {
        // Convert Uint8Array to Buffer-like object for Node.js
        const saltBuffer = Array.from(params.salt);

        // Use Argon2id with proper parameters
        const hash = await argon2.hash(params.password, {
          type: argon2.argon2id,
          timeCost: params.time,
          memoryCost: params.memory,
          parallelism: params.parallelism,
          hashLength: params.outputLength,
          salt: saltBuffer,
          raw: true,
        });

        return new Uint8Array(hash);
      } catch (error) {
        throw new Error(
          `Native Argon2 derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } else {
      throw new Error('Argon2 library not available');
    }
  }

  /**
   * Fallback to PBKDF2 with increased security parameters
   * @param params Key derivation parameters
   * @returns Derived key
   */
  private static async deriveWithPBKDF2Fallback(params: KeyDerivationParams): Promise<Uint8Array> {
    // Try Web Crypto API first (browser environment)
    if (webCrypto && webCrypto.subtle) {
      try {
        // Use much higher iterations to compensate for PBKDF2 being weaker than Argon2
        // OWASP recommends 600,000+ iterations for PBKDF2-SHA256 in 2025
        const iterations = Math.max(600000, params.time! * 200000);

        // Import password as key material
        const passwordKey = await webCrypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(params.password),
          'PBKDF2',
          false,
          ['deriveBits']
        );

        // Derive key using PBKDF2
        const derivedKeyBuffer = await webCrypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: params.salt,
            iterations: iterations,
            hash: 'SHA-256',
          },
          passwordKey,
          params.outputLength! * 8 // Convert bytes to bits
        );

        return new Uint8Array(derivedKeyBuffer);
      } catch (error) {
        throw new Error(
          `Web Crypto PBKDF2 failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Try Node.js crypto as fallback
    if (nodeCrypto) {
      try {
        // Use much higher iterations to compensate for PBKDF2 being weaker than Argon2
        // OWASP recommends 600,000+ iterations for PBKDF2-SHA256 in 2025
        const iterations = Math.max(600000, params.time! * 200000);

        const derivedKey = await new Promise<any>((resolve, reject) => {
          // Convert Uint8Array to Buffer-like for Node.js
          const saltBuffer = Array.from(params.salt);

          nodeCrypto.pbkdf2(
            params.password,
            saltBuffer,
            iterations,
            params.outputLength!,
            'sha256',
            (err: Error | null, derivedKey: any) => {
              if (err) reject(err);
              else resolve(derivedKey);
            }
          );
        });

        return new Uint8Array(derivedKey);
      } catch (error) {
        throw new Error(
          `Node.js PBKDF2 failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Fallback to WebCrypto PBKDF2
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(params.password);

      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Use much higher iterations to compensate for PBKDF2 being weaker than Argon2
      // OWASP recommends 600,000+ iterations for PBKDF2-SHA256 in 2025
      const iterations = Math.max(600000, params.time! * 200000);

      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: params.salt,
          iterations: iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        params.outputLength! * 8
      );

      return new Uint8Array(derivedBits);
    } else {
      throw new Error('No PBKDF2 implementation available');
    }
  }

  /**
   * Validates input parameters for security
   * @param password User password
   * @param salt Cryptographic salt
   */
  private static validateInputs(password: string, salt: Uint8Array): void {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    if (password.length > 4096) {
      throw new Error('Password too long (max 4096 characters)');
    }

    if (!salt || salt.length < 16) {
      throw new Error('Salt must be at least 16 bytes (32 bytes recommended)');
    }

    if (salt.length > 64) {
      throw new Error('Salt too long (max 64 bytes)');
    }
  }

  /**
   * Validates Argon2 parameters are within secure ranges
   * @param params Parameters to validate
   */
  private static validateParameters(params: KeyDerivationParams): void {
    if (params.time! < 1 || params.time! > 10) {
      throw new Error('Time parameter must be between 1 and 10 iterations');
    }

    if (params.memory! < 8192 || params.memory! > 1048576) {
      throw new Error('Memory parameter must be between 8MB and 1GB');
    }

    if (params.parallelism! < 1 || params.parallelism! > 16) {
      throw new Error('Parallelism must be between 1 and 16');
    }

    if (params.outputLength! < 16 || params.outputLength! > 64) {
      throw new Error('Output length must be between 16 and 64 bytes');
    }
  }

  /**
   * Checks if native Argon2 implementation is available
   * @returns True if Argon2 is available
   */
  private static async isNativeArgon2Available(): Promise<boolean> {
    return argon2 !== null;
  }

  /**
   * Generates a cryptographically secure salt
   * @param length Salt length in bytes (default: 32)
   * @returns Random salt
   */
  static generateSalt(length: number = this.DEFAULT_OPTIONS.saltLength): Uint8Array {
    if (length < 16 || length > 64) {
      throw new Error('Salt length must be between 16 and 64 bytes');
    }

    // Use Node.js crypto if available
    if (nodeCrypto) {
      const randomBytes = nodeCrypto.randomBytes(length);
      return new Uint8Array(randomBytes);
    }

    // Fallback to Web Crypto API
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Estimates key derivation time for given parameters
   * @param params Parameters to estimate
   * @returns Estimated time in milliseconds
   */
  static estimateDerivationTime(params: Partial<KeyDerivationParams>): number {
    const time = params.time ?? this.DEFAULT_OPTIONS.time;
    const memory = params.memory ?? this.DEFAULT_OPTIONS.memory;

    // Rough estimation based on typical hardware
    // Actual time varies significantly based on hardware
    const baseTime = 100; // Base time in ms
    const timeMultiplier = time * 50;
    const memoryMultiplier = (memory / 1024) * 2;

    return baseTime + timeMultiplier + memoryMultiplier;
  }

  /**
   * Gets recommended parameters for different security levels
   * @param level Security level: 'interactive', 'sensitive', 'paranoid'
   * @returns Recommended parameters
   */
  static getRecommendedParams(
    level: 'interactive' | 'sensitive' | 'paranoid'
  ): Partial<KeyDerivationParams> {
    switch (level) {
      case 'interactive':
        return {
          time: 2,
          memory: 9728, // ~9.5 MB
          parallelism: 1,
        };
      case 'sensitive':
        return this.DEFAULT_OPTIONS;
      case 'paranoid':
        return {
          time: 5,
          memory: 38912, // ~38 MB
          parallelism: 2,
        };
      default:
        return this.DEFAULT_OPTIONS;
    }
  }

  /**
   * Validates that derived key meets security requirements
   * @param key Derived key to validate
   * @returns True if key is valid
   */
  static validateDerivedKey(key: Uint8Array): boolean {
    if (key.length < 16) {
      return false;
    }

    // Check for obvious patterns (all zeros, all same byte)
    const firstByte = key[0];
    const allSame = key.every(byte => byte === firstByte);

    return !allSame;
  }
}
