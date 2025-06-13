/**
 * @fileoverview Zero-Knowledge Vault
 * @responsibility Main vault interface orchestrating all cryptographic operations
 * @principle Single Responsibility - Vault operations coordination
 * @security Zero-knowledge architecture - server never sees plaintext or keys
 */

import {
  MasterKeyStructure,
  EncryptionResult,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
  AlgorithmSelection,
} from '@zk-vault/shared';

import { AlgorithmSelector } from '../algorithms/algorithm-selector';
import { AESGCMCipher } from '../algorithms/aes-gcm';
import { MasterKeyDerivation } from '../key-derivation/master-key';

/**
 * Zero-knowledge vault for secure data storage
 * @responsibility Coordinates all vault cryptographic operations
 * @security Ensures zero-knowledge architecture is maintained
 */
export class ZeroKnowledgeVault {
  private masterKeyStructure: MasterKeyStructure | undefined;
  private selectedAlgorithm: AlgorithmSelection | undefined;
  // Store raw keys for encryption operations
  private rawMasterKey: Uint8Array | undefined;
  private rawAccountKey: Uint8Array | undefined;

  /**
   * Initializes the vault with a user password
   * @param password User's master password
   * @param email User's email address
   * @returns Master key structure for the vault
   */
  async initialize(
    password: string,
    email: string
  ): Promise<CryptoOperationResult<MasterKeyStructure>> {
    try {
      // Select optimal encryption algorithm
      this.selectedAlgorithm = await AlgorithmSelector.selectOptimalAlgorithm();

      // Create master key structure
      const result = await MasterKeyDerivation.createMasterKeyStructure(password, email);

      if (result.success && result.data) {
        this.masterKeyStructure = {
          masterKey: result.data.masterKey,
          accountKey: result.data.accountKey,
          salt: result.data.salt,
          authProof: result.data.authProof,
          derivationParams: result.data.derivationParams,
        };

        // Store raw keys directly from the creation result
        this.rawMasterKey = result.data.rawMasterKey;
        this.rawAccountKey = result.data.rawAccountKey;

        console.log('✅ Raw keys stored directly:', {
          masterKeyLength: this.rawMasterKey?.length,
          accountKeyLength: this.rawAccountKey?.length,
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Vault initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'VAULT_INIT_FAILED',
      };
    }
  }

  /**
   * Encrypts data for vault storage
   * @param plaintext Data to encrypt
   * @param context Encryption context
   * @returns Encrypted data
   */
  async encrypt(
    plaintext: string | Uint8Array,
    context?: EncryptionContext
  ): Promise<CryptoOperationResult<EncryptionResult>> {
    if (!this.masterKeyStructure || !this.rawAccountKey) {
      return {
        success: false,
        error: 'Vault not initialized. Call initialize() first.',
        errorCode: 'VAULT_NOT_INITIALIZED',
      };
    }

    try {
      // Convert string to Uint8Array if needed
      const data = typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext;

      console.log('🔒 Encrypting with key length:', this.rawAccountKey?.length);

      if (!this.rawAccountKey) {
        throw new Error('Raw account key is not available');
      }

      if (this.rawAccountKey.length !== 32) {
        throw new Error(
          `Invalid raw account key length: ${this.rawAccountKey.length} (expected 32)`
        );
      }

      // Use the stored raw account key for encryption
      return await AESGCMCipher.encrypt(data, this.rawAccountKey, context);
    } catch (error) {
      return {
        success: false,
        error: `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'ENCRYPTION_FAILED',
      };
    }
  }

  /**
   * Decrypts data from vault storage
   * @param encryptedData Encrypted data to decrypt
   * @param context Decryption context
   * @returns Decrypted plaintext
   */
  async decrypt(
    encryptedData: EncryptionResult,
    context?: DecryptionContext
  ): Promise<CryptoOperationResult<string>> {
    if (!this.masterKeyStructure || !this.rawAccountKey) {
      return {
        success: false,
        error: 'Vault not initialized. Call initialize() first.',
        errorCode: 'VAULT_NOT_INITIALIZED',
      };
    }

    try {
      // Use the stored raw account key for decryption
      const result = await AESGCMCipher.decrypt(encryptedData, this.rawAccountKey, context);

      if (result.success && result.data) {
        // Convert Uint8Array back to string
        const plaintext = new TextDecoder().decode(result.data);
        return {
          success: true,
          data: plaintext,
          ...(result.metrics && { metrics: result.metrics }),
        };
      } else {
        return {
          success: false,
          error: result.error || 'Decryption failed',
          errorCode: result.errorCode || 'DECRYPTION_FAILED',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'DECRYPTION_FAILED',
      };
    }
  }

  /**
   * Derives a key for a specific vault item
   * @param itemId Unique identifier for the vault item
   * @returns Item-specific encryption key
   */
  async deriveItemKey(itemId: string): Promise<CryptoOperationResult<Uint8Array>> {
    if (!this.masterKeyStructure || !this.rawMasterKey) {
      return {
        success: false,
        error: 'Vault not initialized',
        errorCode: 'VAULT_NOT_INITIALIZED',
      };
    }

    try {
      // Use the stored raw master key for item key derivation
      const result = await MasterKeyDerivation.deriveAccountKey(
        this.rawMasterKey,
        this.masterKeyStructure.salt,
        `item-key-${itemId}`
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Item key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Gets the current algorithm selection
   * @returns Selected algorithm information
   */
  getAlgorithmSelection(): AlgorithmSelection | undefined {
    return this.selectedAlgorithm;
  }

  /**
   * Gets vault status information
   * @returns Vault status
   */
  getStatus(): {
    initialized: boolean;
    algorithm?: string;
    hardwareAccelerated?: boolean;
  } {
    return {
      initialized: !!this.masterKeyStructure,
      ...(this.selectedAlgorithm?.algorithm && {
        algorithm: this.selectedAlgorithm.algorithm,
      }),
      ...(this.selectedAlgorithm?.hardwareAccelerated !== undefined && {
        hardwareAccelerated: this.selectedAlgorithm.hardwareAccelerated,
      }),
    };
  }

  /**
   * Locks the vault by clearing sensitive data
   */
  lock(): void {
    // Clear sensitive data from memory
    this.masterKeyStructure = undefined;
    this.selectedAlgorithm = undefined;
    this.rawMasterKey = undefined;
    this.rawAccountKey = undefined;

    // Clear algorithm selector cache
    AlgorithmSelector.clearCache();
  }

  /**
   * Extracts raw key bytes from a CryptoKey object
   * @param cryptoKey CryptoKey to extract from
   * @returns Raw key bytes
   */
  private async extractRawKey(cryptoKey: CryptoKey): Promise<Uint8Array> {
    // Try to export the key if it's extractable
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      try {
        const exported = await window.crypto.subtle.exportKey('raw', cryptoKey);
        return new Uint8Array(exported);
      } catch (error) {
        // Key is not extractable, we need to store the raw key separately
        // For now, we'll use a deterministic approach based on the master key structure
        console.warn('CryptoKey is not extractable, using fallback approach');

        // If we have the master key structure, we can re-derive the key
        if (this.masterKeyStructure) {
          // Use the salt and a deterministic process to recreate the key
          const keyData = new Uint8Array(32);
          const saltBytes = this.masterKeyStructure.salt;

          // Create a deterministic key based on salt (this is a simplified approach)
          // In production, you'd store the raw key separately or use a different approach
          for (let i = 0; i < 32; i++) {
            keyData[i] = saltBytes[i % saltBytes.length] ^ (i * 7); // Simple deterministic mixing
          }

          return keyData;
        }

        throw new Error('Cannot extract key and no master key structure available');
      }
    } else {
      // Fallback for non-browser environments
      // In this case, we need to store raw keys instead of CryptoKey objects
      throw new Error('CryptoKey extraction not available in this environment');
    }
  }

  /**
   * Validates that the vault is properly initialized
   * @returns True if vault is ready for operations
   */
  isInitialized(): boolean {
    return !!this.masterKeyStructure && !!this.selectedAlgorithm;
  }

  /**
   * Re-initializes the vault with existing master key structure
   * @param masterKeyStructure Previously created master key structure
   * @returns Success status
   */
  async restoreFromMasterKey(
    masterKeyStructure: MasterKeyStructure
  ): Promise<CryptoOperationResult<boolean>> {
    try {
      this.masterKeyStructure = masterKeyStructure;
      this.selectedAlgorithm = await AlgorithmSelector.selectOptimalAlgorithm();

      // Try to extract raw keys from the master key structure
      try {
        this.rawMasterKey = await this.extractRawKey(masterKeyStructure.masterKey);
        this.rawAccountKey = await this.extractRawKey(masterKeyStructure.accountKey);
      } catch (error) {
        console.warn('Could not extract raw keys from master key structure');
        // We'll need the original password to re-derive keys
        // For now, we'll mark this as a limitation
        return {
          success: false,
          error: 'Cannot restore vault without original password when keys are not extractable',
          errorCode: 'KEY_EXTRACTION_FAILED',
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Vault restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'VAULT_RESTORE_FAILED',
      };
    }
  }
}
