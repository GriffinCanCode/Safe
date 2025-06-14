/**
 * @fileoverview HKDF Implementation
 * @responsibility Provides HKDF key derivation for expanding keys
 * @principle Single Responsibility - Only HKDF operations
 * @security RFC 5869 compliant HKDF implementation for key expansion
 * @reference https://tools.ietf.org/html/rfc5869
 */

import { CryptoOperationResult, HKDF_PARAMS } from '@zk-vault/shared';

// Dynamic imports for crypto libraries
let nodeCrypto: any = null;
let stableLibHKDF: any = null;
let stableLibSHA256: any = null;
let stableLibHMAC: any = null;

// Initialize crypto libraries
async function initializeCrypto() {
  if (typeof window === 'undefined') {
    // Node.js environment
    try {
      nodeCrypto = await import('crypto');
    } catch (error) {
      console.warn('Node.js crypto not available');
    }
  }

  // Try StableLib as fallback
  try {
    const hkdfLib = await import('@stablelib/hkdf');
    const sha256Lib = await import('@stablelib/sha256');
    const hmacLib = await import('@stablelib/hmac');

    // Use the default export (HKDF class)
    stableLibHKDF = hkdfLib.default;
    stableLibSHA256 = sha256Lib.SHA256;
    stableLibHMAC = hmacLib.HMAC;
  } catch (error) {
    console.warn('StableLib HKDF not available');
  }
}

/**
 * HKDF (HMAC-based Key Derivation Function) implementation
 * @responsibility Handles secure key expansion and derivation
 * @security Uses RFC 5869 compliant HKDF for key derivation
 */
export class HKDF {
  /**
   * Derives a key using HKDF
   * @param inputKeyMaterial Input key material (IKM)
   * @param salt Optional salt value (recommended)
   * @param info Optional context and application specific information
   * @param outputLength Desired output length in bytes
   * @param hash Hash algorithm to use (default: SHA-256)
   * @returns Derived key material
   */
  static async derive(
    inputKeyMaterial: Uint8Array,
    salt?: Uint8Array,
    info?: Uint8Array,
    outputLength: number = HKDF_PARAMS.OUTPUT_LENGTH,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      // Initialize crypto libraries if not already done
      await initializeCrypto();

      // Validate inputs
      if (inputKeyMaterial.length === 0) {
        return {
          success: false,
          error: 'Input key material cannot be empty',
          errorCode: 'INVALID_INPUT_KEY_MATERIAL',
        };
      }

      if (outputLength <= 0 || outputLength > 255 * 32) {
        return {
          success: false,
          error: 'Invalid output length. Must be between 1 and 8160 bytes',
          errorCode: 'INVALID_OUTPUT_LENGTH',
        };
      }

      let derivedKey: Uint8Array;

      // Try WebCrypto HKDF first (most efficient)
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        derivedKey = await this.deriveWithWebCrypto(
          inputKeyMaterial,
          salt,
          info,
          outputLength,
          hash
        );
      } else if (nodeCrypto) {
        // Use Node.js crypto
        derivedKey = await this.deriveWithNodeCrypto(
          inputKeyMaterial,
          salt,
          info,
          outputLength,
          hash
        );
      } else if (stableLibHKDF && stableLibSHA256) {
        // Use StableLib as fallback
        derivedKey = await this.deriveWithStableLib(inputKeyMaterial, salt, info, outputLength);
      } else {
        // Manual implementation as last resort
        derivedKey = await this.deriveManual(inputKeyMaterial, salt, info, outputLength, hash);
      }

      return {
        success: true,
        data: derivedKey,
      };
    } catch (error) {
      return {
        success: false,
        error: `HKDF derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'HKDF_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Derives key using WebCrypto HKDF
   * @param inputKeyMaterial Input key material
   * @param salt Salt value
   * @param info Context information
   * @param outputLength Output length
   * @param hash Hash algorithm
   * @returns Derived key
   */
  private static async deriveWithWebCrypto(
    inputKeyMaterial: Uint8Array,
    salt?: Uint8Array,
    info?: Uint8Array,
    outputLength: number = HKDF_PARAMS.OUTPUT_LENGTH,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    try {
      // Import the input key material
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        inputKeyMaterial,
        'HKDF',
        false,
        ['deriveBits']
      );

      // Derive bits using HKDF
      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: hash,
          salt: salt || new Uint8Array(0),
          info: info || new Uint8Array(0),
        },
        keyMaterial,
        outputLength * 8 // Convert bytes to bits
      );

      return new Uint8Array(derivedBits);
    } catch (error) {
      throw new Error(
        `WebCrypto HKDF failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Derives key using Node.js crypto HKDF
   * @param inputKeyMaterial Input key material
   * @param salt Salt value
   * @param info Context information
   * @param outputLength Output length
   * @param hash Hash algorithm
   * @returns Derived key
   */
  private static async deriveWithNodeCrypto(
    inputKeyMaterial: Uint8Array,
    salt?: Uint8Array,
    info?: Uint8Array,
    outputLength: number = HKDF_PARAMS.OUTPUT_LENGTH,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    try {
      // Node.js crypto.hkdf is available in Node.js 15+
      if (nodeCrypto.hkdf) {
        const derivedKey = await new Promise<any>((resolve, reject) => {
          nodeCrypto.hkdf(
            hash.toLowerCase().replace('-', ''), // 'SHA-256' -> 'sha256'
            inputKeyMaterial,
            salt || new Uint8Array(0),
            info || new Uint8Array(0),
            outputLength,
            (err: Error | null, derivedKey: any) => {
              if (err) reject(err);
              else resolve(derivedKey);
            }
          );
        });
        return new Uint8Array(derivedKey);
      } else {
        // Fallback to manual HKDF with Node.js HMAC
        return await this.deriveManualWithNodeCrypto(
          inputKeyMaterial,
          salt,
          info,
          outputLength,
          hash
        );
      }
    } catch (error) {
      throw new Error(
        `Node.js HKDF failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Derives key using StableLib HKDF
   * @param inputKeyMaterial Input key material
   * @param salt Salt value
   * @param info Context information
   * @param outputLength Output length
   * @returns Derived key
   */
  private static async deriveWithStableLib(
    inputKeyMaterial: Uint8Array,
    salt?: Uint8Array,
    info?: Uint8Array,
    outputLength: number = HKDF_PARAMS.OUTPUT_LENGTH
  ): Promise<Uint8Array> {
    try {
      // Use StableLib HKDF class
      const hkdf = new stableLibHKDF(stableLibSHA256, inputKeyMaterial, salt, info);
      const result = hkdf.expand(outputLength);
      hkdf.clean();
      return result;
    } catch (error) {
      throw new Error(
        `StableLib HKDF failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Manual HKDF implementation using Node.js crypto primitives
   * @param inputKeyMaterial Input key material
   * @param salt Salt value
   * @param info Context information
   * @param outputLength Output length
   * @param hash Hash algorithm
   * @returns Derived key
   */
  private static async deriveManualWithNodeCrypto(
    inputKeyMaterial: Uint8Array,
    salt?: Uint8Array,
    info?: Uint8Array,
    outputLength: number = HKDF_PARAMS.OUTPUT_LENGTH,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    // Step 1: Extract (HKDF-Extract)
    const prk = await this.hkdfExtractWithNodeCrypto(inputKeyMaterial, salt, hash);

    // Step 2: Expand (HKDF-Expand)
    const okm = await this.hkdfExpandWithNodeCrypto(prk, info, outputLength, hash);

    return okm;
  }

  /**
   * HKDF-Extract using Node.js crypto
   * @param ikm Input key material
   * @param salt Salt value
   * @param hash Hash algorithm
   * @returns Pseudo-random key
   */
  private static async hkdfExtractWithNodeCrypto(
    ikm: Uint8Array,
    salt?: Uint8Array,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    const actualSalt = salt || new Uint8Array(32); // SHA-256 hash length

    const hmac = nodeCrypto.createHmac(hash.toLowerCase().replace('-', ''), actualSalt);
    hmac.update(ikm);
    return new Uint8Array(hmac.digest());
  }

  /**
   * HKDF-Expand using Node.js crypto
   * @param prk Pseudo-random key from extract step
   * @param info Context information
   * @param length Output length
   * @param hash Hash algorithm
   * @returns Output key material
   */
  private static async hkdfExpandWithNodeCrypto(
    prk: Uint8Array,
    info?: Uint8Array,
    length: number = HKDF_PARAMS.OUTPUT_LENGTH,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    const hashLength = 32; // SHA-256 output length
    const n = Math.ceil(length / hashLength);

    if (n > 255) {
      throw new Error('Output length too large for HKDF');
    }

    const okm = new Uint8Array(length);
    let t = new Uint8Array(0);

    for (let i = 1; i <= n; i++) {
      // T(i) = HMAC(PRK, T(i-1) | info | i)
      const hmac = nodeCrypto.createHmac(hash.toLowerCase().replace('-', ''), prk);
      hmac.update(t);
      if (info) {
        hmac.update(info);
      }
      hmac.update(new Uint8Array([i]));

      t = new Uint8Array(hmac.digest());

      // Copy the appropriate portion to output
      const copyLength = Math.min(hashLength, length - (i - 1) * hashLength);
      okm.set(t.slice(0, copyLength), (i - 1) * hashLength);
    }

    return okm;
  }

  /**
   * Manual HKDF implementation for environments without native support
   * @param inputKeyMaterial Input key material
   * @param salt Salt value
   * @param info Context information
   * @param outputLength Output length
   * @param hash Hash algorithm
   * @returns Derived key
   */
  private static async deriveManual(
    inputKeyMaterial: Uint8Array,
    salt?: Uint8Array,
    info?: Uint8Array,
    outputLength: number = HKDF_PARAMS.OUTPUT_LENGTH,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    try {
      // Step 1: Extract (HKDF-Extract)
      const prk = await this.hkdfExtract(inputKeyMaterial, salt, hash);

      // Step 2: Expand (HKDF-Expand)
      const okm = await this.hkdfExpand(prk, info, outputLength, hash);

      return okm;
    } catch (error) {
      throw new Error(
        `Manual HKDF failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * HKDF-Extract step
   * @param ikm Input key material
   * @param salt Salt value
   * @param hash Hash algorithm
   * @returns Pseudo-random key
   */
  private static async hkdfExtract(
    ikm: Uint8Array,
    salt?: Uint8Array,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    // Use salt or zero-filled array of hash length
    const actualSalt = salt || new Uint8Array(32); // SHA-256 hash length

    // HMAC(salt, ikm)
    return await this.hmac(actualSalt, ikm, hash);
  }

  /**
   * HKDF-Expand step
   * @param prk Pseudo-random key from extract step
   * @param info Context information
   * @param length Output length
   * @param hash Hash algorithm
   * @returns Output key material
   */
  private static async hkdfExpand(
    prk: Uint8Array,
    info?: Uint8Array,
    length: number = HKDF_PARAMS.OUTPUT_LENGTH,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    const hashLength = 32; // SHA-256 output length
    const n = Math.ceil(length / hashLength);

    if (n > 255) {
      throw new Error('Output length too large for HKDF');
    }

    const okm = new Uint8Array(length);
    let t = new Uint8Array(0);

    for (let i = 1; i <= n; i++) {
      // T(i) = HMAC(PRK, T(i-1) | info | i)
      const input = new Uint8Array(t.length + (info?.length || 0) + 1);
      input.set(t, 0);
      if (info) {
        input.set(info, t.length);
      }
      input[input.length - 1] = i;

      t = await this.hmac(prk, input, hash);

      // Copy the appropriate portion to output
      const copyLength = Math.min(hashLength, length - (i - 1) * hashLength);
      okm.set(t.slice(0, copyLength), (i - 1) * hashLength);
    }

    return okm;
  }

  /**
   * HMAC implementation with fallbacks
   * @param key HMAC key
   * @param data Data to authenticate
   * @param hash Hash algorithm
   * @returns HMAC result
   */
  private static async hmac(
    key: Uint8Array,
    data: Uint8Array,
    hash: string = HKDF_PARAMS.HASH
  ): Promise<Uint8Array> {
    // Try WebCrypto first
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: hash },
        false,
        ['sign']
      );

      const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, data);
      return new Uint8Array(signature);
    }

    // Try StableLib HMAC
    if (stableLibHMAC && stableLibSHA256) {
      const hmac = new stableLibHMAC(stableLibSHA256, key);
      hmac.update(data);
      return hmac.digest();
    }

    throw new Error('No HMAC implementation available');
  }

  /**
   * Derives multiple keys from a single input
   * @param inputKeyMaterial Input key material
   * @param salt Salt value
   * @param keySpecs Array of key specifications
   * @returns Object with derived keys
   */
  static async deriveMultiple(
    inputKeyMaterial: Uint8Array,
    salt?: Uint8Array,
    keySpecs: Array<{ name: string; info: string; length?: number }> = []
  ): Promise<CryptoOperationResult<Record<string, Uint8Array>>> {
    try {
      const results: Record<string, Uint8Array> = {};

      for (const spec of keySpecs) {
        const info = new TextEncoder().encode(spec.info);
        const result = await this.derive(
          inputKeyMaterial,
          salt,
          info,
          spec.length || HKDF_PARAMS.OUTPUT_LENGTH
        );

        if (!result.success || !result.data) {
          return {
            success: false,
            error: `Failed to derive key '${spec.name}': ${result.error}`,
            errorCode: result.errorCode || 'KEY_DERIVATION_FAILED',
          };
        }

        results[spec.name] = result.data;
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: `Multiple key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'MULTIPLE_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Validates HKDF parameters
   * @param inputKeyMaterial Input key material
   * @param outputLength Output length
   * @returns True if parameters are valid
   */
  static validateParameters(inputKeyMaterial: Uint8Array, outputLength: number): boolean {
    return inputKeyMaterial.length > 0 && outputLength > 0 && outputLength <= 255 * 32;
  }

  /**
   * Gets available HKDF implementation
   * @returns Implementation name
   */
  static getImplementation(): string {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      return 'WebCrypto';
    }
    if (nodeCrypto?.hkdf) {
      return 'Node.js crypto.hkdf';
    }
    if (nodeCrypto) {
      return 'Node.js crypto (manual)';
    }
    if (stableLibHKDF) {
      return 'StableLib';
    }
    return 'Manual implementation';
  }
}
