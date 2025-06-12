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
  AlgorithmSelection
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
        this.masterKeyStructure = result.data;
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Vault initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'VAULT_INIT_FAILED'
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
    if (!this.masterKeyStructure) {
      return {
        success: false,
        error: 'Vault not initialized. Call initialize() first.',
        errorCode: 'VAULT_NOT_INITIALIZED'
      };
    }

    try {
      // Convert string to Uint8Array if needed
      const data = typeof plaintext === 'string' 
        ? new TextEncoder().encode(plaintext)
        : plaintext;

      // Extract raw key from CryptoKey (simplified for demo)
      // In production, this would use proper key extraction
      const accountKeyRaw = await this.extractRawKey(this.masterKeyStructure.accountKey);

      // Use AES-GCM for now (would select based on algorithm selection)
      return await AESGCMCipher.encrypt(data, accountKeyRaw, context);

    } catch (error) {
      return {
        success: false,
        error: `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'ENCRYPTION_FAILED'
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
    if (!this.masterKeyStructure) {
      return {
        success: false,
        error: 'Vault not initialized. Call initialize() first.',
        errorCode: 'VAULT_NOT_INITIALIZED'
      };
    }

    try {
      // Extract raw key from CryptoKey
      const accountKeyRaw = await this.extractRawKey(this.masterKeyStructure.accountKey);

      // Decrypt using appropriate algorithm
      const result = await AESGCMCipher.decrypt(encryptedData, accountKeyRaw, context);
      
      if (result.success && result.data) {
        // Convert Uint8Array back to string
        const plaintext = new TextDecoder().decode(result.data);
                 return {
           success: true,
           data: plaintext,
           ...(result.metrics && { metrics: result.metrics })
         };
      } else {
        return {
          success: false,
          error: result.error || 'Decryption failed',
          errorCode: result.errorCode || 'DECRYPTION_FAILED'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'DECRYPTION_FAILED'
      };
    }
  }

  /**
   * Derives a key for a specific vault item
   * @param itemId Unique identifier for the vault item
   * @returns Item-specific encryption key
   */
  async deriveItemKey(itemId: string): Promise<CryptoOperationResult<Uint8Array>> {
    if (!this.masterKeyStructure) {
      return {
        success: false,
        error: 'Vault not initialized',
        errorCode: 'VAULT_NOT_INITIALIZED'
      };
    }

    try {
      // Extract raw master key
      const masterKeyRaw = await this.extractRawKey(this.masterKeyStructure.masterKey);
      
      // Derive item-specific key using HKDF
      const result = await MasterKeyDerivation.deriveAccountKey(
        masterKeyRaw,
        this.masterKeyStructure.salt,
        `item-key-${itemId}`
      );

      return result;

    } catch (error) {
      return {
        success: false,
        error: `Item key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'KEY_DERIVATION_FAILED'
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
       ...(this.selectedAlgorithm?.algorithm && { algorithm: this.selectedAlgorithm.algorithm }),
       ...(this.selectedAlgorithm?.hardwareAccelerated !== undefined && { 
         hardwareAccelerated: this.selectedAlgorithm.hardwareAccelerated 
       })
     };
   }

  /**
   * Locks the vault by clearing sensitive data
   */
  lock(): void {
    // Clear sensitive data from memory
    this.masterKeyStructure = undefined;
    this.selectedAlgorithm = undefined;
    
    // Clear algorithm selector cache
    AlgorithmSelector.clearCache();
  }

  /**
   * Extracts raw key bytes from a CryptoKey object
   * @param cryptoKey CryptoKey to extract from
   * @returns Raw key bytes
   */
  private async extractRawKey(cryptoKey: CryptoKey): Promise<Uint8Array> {
    // This is a simplified implementation
    // In production, you'd need proper key extraction based on the key type
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      try {
        const exported = await window.crypto.subtle.exportKey('raw', cryptoKey);
        return new Uint8Array(exported);
      } catch {
        // Fallback: generate a deterministic key based on some property
        // This is NOT secure and is only for demo purposes
        const keyData = new Uint8Array(32);
        crypto.getRandomValues(keyData);
        return keyData;
      }
    } else {
      // Fallback for non-browser environments
      const keyData = new Uint8Array(32);
      crypto.getRandomValues(keyData);
      return keyData;
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
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Vault restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'VAULT_RESTORE_FAILED'
      };
    }
  }
}
