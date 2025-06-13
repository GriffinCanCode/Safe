/**
 * @fileoverview Item Key Derivation
 * @responsibility Derives per-item encryption keys for vault items
 * @principle Single Responsibility - Only item-level key operations
 * @security Ensures each vault item has a unique encryption key
 */

import { CryptoOperationResult, HKDF_PARAMS } from '@zk-vault/shared';
import { HKDF } from './hkdf';

/**
 * Item key derivation for per-item encryption
 * @responsibility Handles derivation of item-specific encryption keys
 * @security Ensures proper key isolation between vault items
 */
export class ItemKeyDerivation {
  /**
   * Derives an encryption key for a specific vault item
   * @param accountKey Account-level encryption key
   * @param itemId Unique item identifier
   * @param itemType Type of vault item
   * @param version Key version for rotation support
   * @returns Item-specific encryption key
   */
  static async deriveItemKey(
    accountKey: Uint8Array,
    itemId: string,
    itemType: 'password' | 'note' | 'card' | 'identity' | 'file' = 'password',
    version: number = 1
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      // Validate inputs
      if (accountKey.length !== 32) {
        return {
          success: false,
          error: 'Account key must be 32 bytes',
          errorCode: 'INVALID_ACCOUNT_KEY_LENGTH',
        };
      }

      if (!itemId || itemId.length === 0) {
        return {
          success: false,
          error: 'Item ID cannot be empty',
          errorCode: 'INVALID_ITEM_ID',
        };
      }

      if (version < 1 || version > 999) {
        return {
          success: false,
          error: 'Version must be between 1 and 999',
          errorCode: 'INVALID_VERSION',
        };
      }

      // Create item-specific info parameter
      const info = this.createItemKeyInfo(itemId, itemType, version);

      // Create item-specific salt
      const itemSalt = await this.createItemSalt(itemId, itemType);

      // Derive item key using HKDF
      const result = await HKDF.derive(accountKey, itemSalt, info, HKDF_PARAMS.OUTPUT_LENGTH);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Item key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'ITEM_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Derives multiple keys for an item (e.g., encryption + MAC)
   * @param accountKey Account-level encryption key
   * @param itemId Unique item identifier
   * @param itemType Type of vault item
   * @param keyPurposes Array of key purposes
   * @param version Key version for rotation support
   * @returns Object containing all derived keys
   */
  static async deriveMultipleItemKeys(
    accountKey: Uint8Array,
    itemId: string,
    itemType: 'password' | 'note' | 'card' | 'identity' | 'file' = 'password',
    keyPurposes: Array<'encryption' | 'authentication' | 'metadata'> = ['encryption'],
    version: number = 1
  ): Promise<CryptoOperationResult<Record<string, Uint8Array>>> {
    try {
      const keySpecs = keyPurposes.map(purpose => ({
        name: purpose,
        info: this.createItemKeyInfoString(itemId, itemType, purpose, version),
        length: HKDF_PARAMS.OUTPUT_LENGTH,
      }));

      // Create item-specific salt
      const itemSalt = await this.createItemSalt(itemId, itemType);

      const result = await HKDF.deriveMultiple(accountKey, itemSalt, keySpecs);
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Multiple item key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'MULTIPLE_ITEM_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Derives a field-specific encryption key for sensitive item fields
   * @param itemKey Item encryption key
   * @param fieldName Name of the field (e.g., 'password', 'notes')
   * @param fieldType Type of field data
   * @returns Field-specific encryption key
   */
  static async deriveFieldKey(
    itemKey: Uint8Array,
    fieldName: string,
    fieldType: 'text' | 'binary' | 'json' = 'text'
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      // Validate inputs
      if (itemKey.length !== 32) {
        return {
          success: false,
          error: 'Item key must be 32 bytes',
          errorCode: 'INVALID_ITEM_KEY_LENGTH',
        };
      }

      if (!fieldName || fieldName.length === 0) {
        return {
          success: false,
          error: 'Field name cannot be empty',
          errorCode: 'INVALID_FIELD_NAME',
        };
      }

      // Create field-specific info parameter
      const info = this.createFieldKeyInfo(fieldName, fieldType);

      // Create field-specific salt
      const fieldSalt = await this.createFieldSalt(fieldName, fieldType);

      // Derive field key using HKDF
      const result = await HKDF.derive(itemKey, fieldSalt, info, HKDF_PARAMS.OUTPUT_LENGTH);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Field key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'FIELD_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Derives a file chunk key for large file encryption
   * @param itemKey Item encryption key
   * @param chunkIndex Index of the file chunk
   * @param totalChunks Total number of chunks
   * @returns Chunk-specific encryption key
   */
  static async deriveChunkKey(
    itemKey: Uint8Array,
    chunkIndex: number,
    totalChunks: number
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      // Validate inputs
      if (itemKey.length !== 32) {
        return {
          success: false,
          error: 'Item key must be 32 bytes',
          errorCode: 'INVALID_ITEM_KEY_LENGTH',
        };
      }

      if (chunkIndex < 0 || chunkIndex >= totalChunks) {
        return {
          success: false,
          error: 'Invalid chunk index',
          errorCode: 'INVALID_CHUNK_INDEX',
        };
      }

      // Create chunk-specific info parameter
      const info = this.createChunkKeyInfo(chunkIndex, totalChunks);

      // Create chunk-specific salt
      const chunkSalt = await this.createChunkSalt(chunkIndex);

      // Derive chunk key using HKDF
      const result = await HKDF.derive(itemKey, chunkSalt, info, HKDF_PARAMS.OUTPUT_LENGTH);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Chunk key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'CHUNK_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Rotates an item key to a new version
   * @param accountKey Account-level encryption key
   * @param itemId Unique item identifier
   * @param itemType Type of vault item
   * @param newVersion New key version
   * @returns New item encryption key
   */
  static async rotateItemKey(
    accountKey: Uint8Array,
    itemId: string,
    itemType: 'password' | 'note' | 'card' | 'identity' | 'file' = 'password',
    newVersion: number
  ): Promise<CryptoOperationResult<Uint8Array>> {
    // Key rotation is just deriving with a new version
    return await this.deriveItemKey(accountKey, itemId, itemType, newVersion);
  }

  /**
   * Creates item key info parameter for HKDF
   * @param itemId Item identifier
   * @param itemType Type of item
   * @param version Key version
   * @returns Info parameter as Uint8Array
   */
  private static createItemKeyInfo(itemId: string, itemType: string, version: number): Uint8Array {
    const infoString = this.createItemKeyInfoString(itemId, itemType, 'encryption', version);
    return new TextEncoder().encode(infoString);
  }

  /**
   * Creates item key info string
   * @param itemId Item identifier
   * @param itemType Type of item
   * @param purpose Purpose of the key
   * @param version Key version
   * @returns Info string
   */
  private static createItemKeyInfoString(
    itemId: string,
    itemType: string,
    purpose: string,
    version: number
  ): string {
    return `${HKDF_PARAMS.INFO.ITEM_KEY}:${itemType}:${purpose}:${itemId}:v${version}`;
  }

  /**
   * Creates field key info parameter for HKDF
   * @param fieldName Field name
   * @param fieldType Field type
   * @returns Info parameter as Uint8Array
   */
  private static createFieldKeyInfo(fieldName: string, fieldType: string): Uint8Array {
    const infoString = `zk-vault-field-key:${fieldType}:${fieldName}`;
    return new TextEncoder().encode(infoString);
  }

  /**
   * Creates chunk key info parameter for HKDF
   * @param chunkIndex Chunk index
   * @param totalChunks Total chunks
   * @returns Info parameter as Uint8Array
   */
  private static createChunkKeyInfo(chunkIndex: number, totalChunks: number): Uint8Array {
    const infoString = `zk-vault-chunk-key:${chunkIndex}:${totalChunks}`;
    return new TextEncoder().encode(infoString);
  }

  /**
   * Creates a deterministic salt for item keys
   * @param itemId Item identifier
   * @param itemType Item type
   * @returns Item salt
   */
  private static async createItemSalt(itemId: string, itemType: string): Promise<Uint8Array> {
    // Create deterministic salt from item parameters
    const encoder = new TextEncoder();
    const itemBytes = encoder.encode(`item-salt:${itemType}:${itemId}`);

    // Hash to create consistent salt
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', itemBytes);
      return new Uint8Array(hashBuffer);
    } else {
      // Fallback: simple deterministic salt
      const salt = new Uint8Array(32);
      for (let i = 0; i < salt.length; i++) {
        salt[i] = itemBytes[i % itemBytes.length] ^ (i + 1);
      }
      return salt;
    }
  }

  /**
   * Creates a deterministic salt for field keys
   * @param fieldName Field name
   * @param fieldType Field type
   * @returns Field salt
   */
  private static async createFieldSalt(fieldName: string, fieldType: string): Promise<Uint8Array> {
    // Create deterministic salt from field parameters
    const encoder = new TextEncoder();
    const fieldBytes = encoder.encode(`field-salt:${fieldType}:${fieldName}`);

    // Hash to create consistent salt
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', fieldBytes);
      return new Uint8Array(hashBuffer);
    } else {
      // Fallback: simple deterministic salt
      const salt = new Uint8Array(32);
      for (let i = 0; i < salt.length; i++) {
        salt[i] = fieldBytes[i % fieldBytes.length] ^ (i + 1);
      }
      return salt;
    }
  }

  /**
   * Creates a deterministic salt for chunk keys
   * @param chunkIndex Chunk index
   * @returns Chunk salt
   */
  private static async createChunkSalt(chunkIndex: number): Promise<Uint8Array> {
    // Create deterministic salt from chunk index
    const encoder = new TextEncoder();
    const chunkBytes = encoder.encode(`chunk-salt:${chunkIndex}`);

    // Hash to create consistent salt
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', chunkBytes);
      return new Uint8Array(hashBuffer);
    } else {
      // Fallback: simple deterministic salt
      const salt = new Uint8Array(32);
      for (let i = 0; i < salt.length; i++) {
        salt[i] = chunkBytes[i % chunkBytes.length] ^ (i + 1);
      }
      return salt;
    }
  }

  /**
   * Validates item key derivation parameters
   * @param accountKey Account key
   * @param itemId Item identifier
   * @param version Key version
   * @returns True if parameters are valid
   */
  static validateParameters(accountKey: Uint8Array, itemId: string, version: number): boolean {
    return accountKey.length === 32 && itemId.length > 0 && version >= 1 && version <= 999;
  }
}
