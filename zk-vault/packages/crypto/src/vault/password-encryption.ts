/**
 * @fileoverview Password Encryption
 * @responsibility Handles encryption of password vault items
 * @principle Single Responsibility - Only password-specific encryption
 * @security Specialized encryption for password data with additional protections
 */

import {
  EncryptionResult,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
  DEFAULT_CONTEXTS,
} from '@zk-vault/shared';

import { AESGCMCipher } from '../algorithms/aes-gcm';
import { ItemKeyDerivation } from '../key-derivation/item-key';

/**
 * Password data structure for vault items
 * @responsibility Defines the structure of password vault items
 */
export interface PasswordVaultItem {
  /** Unique item identifier */
  id: string;
  /** Website or service name */
  name: string;
  /** Website URL */
  url?: string;
  /** Username or email */
  username: string;
  /** Password (sensitive) */
  password: string;
  /** Additional notes (optional) */
  notes?: string;
  /** Custom fields */
  customFields?: Record<string, string>;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Encrypted password vault item
 * @responsibility Contains encrypted password data
 */
export interface EncryptedPasswordItem {
  /** Item metadata (not encrypted) */
  metadata: {
    id: string;
    name: string;
    url?: string;
    createdAt: number;
    modifiedAt: number;
    tags?: string[];
  };
  /** Encrypted sensitive fields */
  encryptedFields: {
    username: EncryptionResult;
    password: EncryptionResult;
    notes?: EncryptionResult;
    customFields?: Record<string, EncryptionResult>;
  };
  /** Encryption version for future upgrades */
  version: number;
}

/**
 * Password encryption for vault items
 * @responsibility Handles encryption/decryption of password vault items
 * @security Uses field-level encryption for sensitive data
 */
export class PasswordEncryption {
  /**
   * Encrypts a password vault item
   * @param item Password item to encrypt
   * @param accountKey Account-level encryption key
   * @param context Encryption context
   * @returns Encrypted password item
   */
  static async encryptPasswordItem(
    item: PasswordVaultItem,
    accountKey: Uint8Array,
    context?: EncryptionContext
  ): Promise<CryptoOperationResult<EncryptedPasswordItem>> {
    try {
      // Derive item-specific encryption key
      const itemKeyResult = await ItemKeyDerivation.deriveItemKey(accountKey, item.id, 'password');

      if (!itemKeyResult.success || !itemKeyResult.data) {
        return {
          success: false,
          error: itemKeyResult.error || 'Failed to derive item key',
          errorCode: itemKeyResult.errorCode || 'ITEM_KEY_DERIVATION_FAILED',
        };
      }

      const itemKey = itemKeyResult.data;

      // Create encryption context for password items
      const encryptionContext: EncryptionContext = {
        ...DEFAULT_CONTEXTS.VAULT_ITEM,
        ...context,
        itemId: item.id,
        purpose: 'vault-item',
      };

      // Encrypt sensitive fields individually
      const encryptedFields: EncryptedPasswordItem['encryptedFields'] = {
        username: await this.encryptField(item.username, itemKey, 'username', encryptionContext),
        password: await this.encryptField(item.password, itemKey, 'password', encryptionContext),
      };

      // Encrypt optional fields if present
      if (item.notes) {
        encryptedFields.notes = await this.encryptField(
          item.notes,
          itemKey,
          'notes',
          encryptionContext
        );
      }

      if (item.customFields) {
        encryptedFields.customFields = {};
        for (const [fieldName, fieldValue] of Object.entries(item.customFields)) {
          encryptedFields.customFields[fieldName] = await this.encryptField(
            fieldValue,
            itemKey,
            `custom_${fieldName}`,
            encryptionContext
          );
        }
      }

      // Create encrypted item with non-sensitive metadata
      const encryptedItem: EncryptedPasswordItem = {
        metadata: {
          id: item.id,
          name: item.name,
          ...(item.url && { url: item.url }),
          createdAt: item.createdAt,
          modifiedAt: item.modifiedAt,
          ...(item.tags && { tags: item.tags }),
        },
        encryptedFields,
        version: 1,
      };

      // Clear sensitive data from memory
      this.clearSensitiveData(itemKey);

      return {
        success: true,
        data: encryptedItem,
      };
    } catch (error) {
      return {
        success: false,
        error: `Password item encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'PASSWORD_ENCRYPTION_FAILED',
      };
    }
  }

  /**
   * Decrypts a password vault item
   * @param encryptedItem Encrypted password item
   * @param accountKey Account-level encryption key
   * @param context Decryption context
   * @returns Decrypted password item
   */
  static async decryptPasswordItem(
    encryptedItem: EncryptedPasswordItem,
    accountKey: Uint8Array,
    context?: DecryptionContext
  ): Promise<CryptoOperationResult<PasswordVaultItem>> {
    try {
      // Derive item-specific encryption key
      const itemKeyResult = await ItemKeyDerivation.deriveItemKey(
        accountKey,
        encryptedItem.metadata.id,
        'password'
      );

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
        expectedPurpose: 'vault-item',
        ...context,
      };

      // Decrypt sensitive fields
      const username = await this.decryptField(
        encryptedItem.encryptedFields.username,
        itemKey,
        'username',
        decryptionContext
      );

      const password = await this.decryptField(
        encryptedItem.encryptedFields.password,
        itemKey,
        'password',
        decryptionContext
      );

      // Decrypt optional fields
      let notes: string | undefined;
      if (encryptedItem.encryptedFields.notes) {
        notes = await this.decryptField(
          encryptedItem.encryptedFields.notes,
          itemKey,
          'notes',
          decryptionContext
        );
      }

      let customFields: Record<string, string> | undefined;
      if (encryptedItem.encryptedFields.customFields) {
        customFields = {};
        for (const [fieldName, encryptedValue] of Object.entries(
          encryptedItem.encryptedFields.customFields
        )) {
          customFields[fieldName] = await this.decryptField(
            encryptedValue,
            itemKey,
            `custom_${fieldName}`,
            decryptionContext
          );
        }
      }

      // Reconstruct the password item
      const item: PasswordVaultItem = {
        id: encryptedItem.metadata.id,
        name: encryptedItem.metadata.name,
        ...(encryptedItem.metadata.url && { url: encryptedItem.metadata.url }),
        username,
        password,
        ...(notes && { notes }),
        ...(customFields && { customFields }),
        createdAt: encryptedItem.metadata.createdAt,
        modifiedAt: encryptedItem.metadata.modifiedAt,
        ...(encryptedItem.metadata.tags && {
          tags: encryptedItem.metadata.tags,
        }),
      };

      // Clear sensitive data from memory
      this.clearSensitiveData(itemKey);

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      return {
        success: false,
        error: `Password item decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'PASSWORD_DECRYPTION_FAILED',
      };
    }
  }

  /**
   * Updates a password vault item
   * @param existingItem Existing encrypted item
   * @param updates Updates to apply
   * @param accountKey Account-level encryption key
   * @returns Updated encrypted item
   */
  static async updatePasswordItem(
    existingItem: EncryptedPasswordItem,
    updates: Partial<PasswordVaultItem>,
    accountKey: Uint8Array
  ): Promise<CryptoOperationResult<EncryptedPasswordItem>> {
    try {
      // First decrypt the existing item
      const decryptResult = await this.decryptPasswordItem(existingItem, accountKey);

      if (!decryptResult.success || !decryptResult.data) {
        return {
          success: false,
          error: decryptResult.error || 'Failed to decrypt existing item',
          errorCode: decryptResult.errorCode || 'DECRYPTION_FAILED',
        };
      }

      // Apply updates
      const updatedItem: PasswordVaultItem = {
        ...decryptResult.data,
        ...updates,
        modifiedAt: Date.now(),
      };

      // Re-encrypt the updated item
      return await this.encryptPasswordItem(updatedItem, accountKey);
    } catch (error) {
      return {
        success: false,
        error: `Password item update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'PASSWORD_UPDATE_FAILED',
      };
    }
  }

  /**
   * Encrypts a single field with field-specific key derivation
   * @param value Field value to encrypt
   * @param itemKey Item encryption key
   * @param fieldName Field name for key derivation
   * @param context Encryption context
   * @returns Encrypted field data
   */
  private static async encryptField(
    value: string,
    itemKey: Uint8Array,
    fieldName: string,
    context: EncryptionContext
  ): Promise<EncryptionResult> {
    // Derive field-specific key
    const fieldKeyResult = await ItemKeyDerivation.deriveFieldKey(itemKey, fieldName);

    if (!fieldKeyResult.success || !fieldKeyResult.data) {
      throw new Error(`Failed to derive key for field: ${fieldName}`);
    }

    const fieldKey = fieldKeyResult.data;

    // Convert string to bytes
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);

    // Encrypt the field
    const encryptResult = await AESGCMCipher.encrypt(valueBytes, fieldKey, context);

    if (!encryptResult.success || !encryptResult.data) {
      throw new Error(`Failed to encrypt field: ${fieldName}`);
    }

    // Clear field key from memory
    this.clearSensitiveData(fieldKey);

    return encryptResult.data;
  }

  /**
   * Decrypts a single field with field-specific key derivation
   * @param encryptedValue Encrypted field data
   * @param itemKey Item encryption key
   * @param fieldName Field name for key derivation
   * @param context Decryption context
   * @returns Decrypted field value
   */
  private static async decryptField(
    encryptedValue: EncryptionResult,
    itemKey: Uint8Array,
    fieldName: string,
    context: DecryptionContext
  ): Promise<string> {
    // Derive field-specific key
    const fieldKeyResult = await ItemKeyDerivation.deriveFieldKey(itemKey, fieldName);

    if (!fieldKeyResult.success || !fieldKeyResult.data) {
      throw new Error(`Failed to derive key for field: ${fieldName}`);
    }

    const fieldKey = fieldKeyResult.data;

    // Decrypt the field
    const decryptResult = await AESGCMCipher.decrypt(encryptedValue, fieldKey, context);

    if (!decryptResult.success || !decryptResult.data) {
      throw new Error(`Failed to decrypt field: ${fieldName}`);
    }

    // Convert bytes to string
    const decoder = new TextDecoder();
    const value = decoder.decode(decryptResult.data);

    // Clear field key from memory
    this.clearSensitiveData(fieldKey);

    return value;
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
   * Validates password item structure
   * @param item Password item to validate
   * @returns True if item is valid
   */
  static validatePasswordItem(item: PasswordVaultItem): boolean {
    return (
      typeof item.id === 'string' &&
      item.id.length > 0 &&
      typeof item.name === 'string' &&
      item.name.length > 0 &&
      typeof item.username === 'string' &&
      typeof item.password === 'string' &&
      item.password.length > 0 &&
      typeof item.createdAt === 'number' &&
      typeof item.modifiedAt === 'number'
    );
  }

  /**
   * Validates encrypted password item structure
   * @param item Encrypted password item to validate
   * @returns True if item is valid
   */
  static validateEncryptedPasswordItem(item: EncryptedPasswordItem): boolean {
    return (
      item.metadata &&
      typeof item.metadata.id === 'string' &&
      item.metadata.id.length > 0 &&
      typeof item.metadata.name === 'string' &&
      item.metadata.name.length > 0 &&
      item.encryptedFields &&
      item.encryptedFields.username &&
      item.encryptedFields.password &&
      typeof item.version === 'number'
    );
  }

  /**
   * Estimates the storage size of an encrypted password item
   * @param item Encrypted password item
   * @returns Estimated size in bytes
   */
  static estimateStorageSize(item: EncryptedPasswordItem): number {
    let size = 0;

    // Metadata size (approximate)
    size += JSON.stringify(item.metadata).length;

    // Encrypted fields size
    size += item.encryptedFields.username.ciphertext.length;
    size += item.encryptedFields.password.ciphertext.length;

    if (item.encryptedFields.notes) {
      size += item.encryptedFields.notes.ciphertext.length;
    }

    if (item.encryptedFields.customFields) {
      for (const encryptedValue of Object.values(item.encryptedFields.customFields)) {
        size += encryptedValue.ciphertext.length;
      }
    }

    // Add overhead for nonces, auth tags, etc.
    const fieldCount = Object.keys(item.encryptedFields).length;
    size += fieldCount * (12 + 16); // IV + auth tag per field

    return size;
  }
}
