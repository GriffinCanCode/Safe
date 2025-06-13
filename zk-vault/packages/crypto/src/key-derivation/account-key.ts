/**
 * @fileoverview Account Key Derivation
 * @responsibility Derives account-level encryption keys from master keys
 * @principle Single Responsibility - Only account key operations
 * @security Uses HKDF to derive account keys with proper context separation
 */

import { CryptoOperationResult, HKDF_PARAMS } from '@zk-vault/shared';
import { HKDF } from './hkdf';

/**
 * Account key derivation for user-level encryption
 * @responsibility Handles derivation of account-specific encryption keys
 * @security Ensures proper key separation between different accounts
 */
export class AccountKeyDerivation {
  /**
   * Derives an account encryption key from master key
   * @param masterKey Master key derived from password
   * @param accountId Unique account identifier
   * @param salt Salt used in master key derivation
   * @param keyType Type of account key to derive
   * @returns Account-specific encryption key
   */
  static async deriveAccountKey(
    masterKey: Uint8Array,
    accountId: string,
    salt: Uint8Array,
    keyType: 'encryption' | 'authentication' | 'signing' = 'encryption'
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      // Validate inputs
      if (masterKey.length !== 32) {
        return {
          success: false,
          error: 'Master key must be 32 bytes',
          errorCode: 'INVALID_MASTER_KEY_LENGTH',
        };
      }

      if (!accountId || accountId.length === 0) {
        return {
          success: false,
          error: 'Account ID cannot be empty',
          errorCode: 'INVALID_ACCOUNT_ID',
        };
      }

      if (salt.length < 16) {
        return {
          success: false,
          error: 'Salt must be at least 16 bytes',
          errorCode: 'INVALID_SALT_LENGTH',
        };
      }

      // Create context-specific info parameter
      const info = this.createAccountKeyInfo(accountId, keyType);

      // Derive account key using HKDF
      const result = await HKDF.derive(masterKey, salt, info, HKDF_PARAMS.OUTPUT_LENGTH);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Account key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'ACCOUNT_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Derives multiple account keys at once
   * @param masterKey Master key derived from password
   * @param accountId Unique account identifier
   * @param salt Salt used in master key derivation
   * @param keyTypes Array of key types to derive
   * @returns Object containing all derived keys
   */
  static async deriveMultipleAccountKeys(
    masterKey: Uint8Array,
    accountId: string,
    salt: Uint8Array,
    keyTypes: Array<'encryption' | 'authentication' | 'signing'> = ['encryption']
  ): Promise<CryptoOperationResult<Record<string, Uint8Array>>> {
    try {
      const keySpecs = keyTypes.map(keyType => ({
        name: keyType,
        info: this.createAccountKeyInfoString(accountId, keyType),
        length: HKDF_PARAMS.OUTPUT_LENGTH,
      }));

      const result = await HKDF.deriveMultiple(masterKey, salt, keySpecs);
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Multiple account key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'MULTIPLE_ACCOUNT_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Derives a vault-specific encryption key
   * @param accountKey Account encryption key
   * @param vaultId Unique vault identifier
   * @param purpose Purpose of the vault key
   * @returns Vault-specific encryption key
   */
  static async deriveVaultKey(
    accountKey: Uint8Array,
    vaultId: string,
    purpose: 'items' | 'metadata' | 'sharing' = 'items'
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

      if (!vaultId || vaultId.length === 0) {
        return {
          success: false,
          error: 'Vault ID cannot be empty',
          errorCode: 'INVALID_VAULT_ID',
        };
      }

      // Create vault-specific info parameter
      const info = this.createVaultKeyInfo(vaultId, purpose);

      // Use a deterministic salt based on vault ID
      const vaultSalt = await this.createVaultSalt(vaultId);

      // Derive vault key using HKDF
      const result = await HKDF.derive(accountKey, vaultSalt, info, HKDF_PARAMS.OUTPUT_LENGTH);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Vault key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'VAULT_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Derives a sharing key for secure data sharing
   * @param accountKey Account encryption key
   * @param recipientId Recipient's account ID
   * @param sharedItemId ID of the item being shared
   * @returns Sharing-specific encryption key
   */
  static async deriveSharingKey(
    accountKey: Uint8Array,
    recipientId: string,
    sharedItemId: string
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

      if (!recipientId || !sharedItemId) {
        return {
          success: false,
          error: 'Recipient ID and shared item ID cannot be empty',
          errorCode: 'INVALID_SHARING_PARAMETERS',
        };
      }

      // Create sharing-specific info parameter
      const info = this.createSharingKeyInfo(recipientId, sharedItemId);

      // Create sharing salt
      const sharingSalt = await this.createSharingSalt(recipientId, sharedItemId);

      // Derive sharing key using HKDF
      const result = await HKDF.derive(accountKey, sharingSalt, info, HKDF_PARAMS.OUTPUT_LENGTH);

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Sharing key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'SHARING_KEY_DERIVATION_FAILED',
      };
    }
  }

  /**
   * Creates account key info parameter for HKDF
   * @param accountId Account identifier
   * @param keyType Type of key being derived
   * @returns Info parameter as Uint8Array
   */
  private static createAccountKeyInfo(
    accountId: string,
    keyType: 'encryption' | 'authentication' | 'signing'
  ): Uint8Array {
    const infoString = this.createAccountKeyInfoString(accountId, keyType);
    return new TextEncoder().encode(infoString);
  }

  /**
   * Creates account key info string
   * @param accountId Account identifier
   * @param keyType Type of key being derived
   * @returns Info string
   */
  private static createAccountKeyInfoString(
    accountId: string,
    keyType: 'encryption' | 'authentication' | 'signing'
  ): string {
    return `${HKDF_PARAMS.INFO.ACCOUNT_KEY}:${keyType}:${accountId}`;
  }

  /**
   * Creates vault key info parameter for HKDF
   * @param vaultId Vault identifier
   * @param purpose Purpose of the vault key
   * @returns Info parameter as Uint8Array
   */
  private static createVaultKeyInfo(
    vaultId: string,
    purpose: 'items' | 'metadata' | 'sharing'
  ): Uint8Array {
    const infoString = `zk-vault-vault-key:${purpose}:${vaultId}`;
    return new TextEncoder().encode(infoString);
  }

  /**
   * Creates sharing key info parameter for HKDF
   * @param recipientId Recipient identifier
   * @param sharedItemId Shared item identifier
   * @returns Info parameter as Uint8Array
   */
  private static createSharingKeyInfo(recipientId: string, sharedItemId: string): Uint8Array {
    const infoString = `${HKDF_PARAMS.INFO.SHARING_KEY}:${recipientId}:${sharedItemId}`;
    return new TextEncoder().encode(infoString);
  }

  /**
   * Creates a deterministic salt for vault keys
   * @param vaultId Vault identifier
   * @returns Vault salt
   */
  private static async createVaultSalt(vaultId: string): Promise<Uint8Array> {
    // Create deterministic salt from vault ID
    const encoder = new TextEncoder();
    const vaultIdBytes = encoder.encode(`vault-salt:${vaultId}`);

    // Hash to create consistent salt
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', vaultIdBytes);
      return new Uint8Array(hashBuffer);
    } else {
      // Fallback: simple deterministic salt
      const salt = new Uint8Array(32);
      for (let i = 0; i < salt.length; i++) {
        salt[i] = vaultIdBytes[i % vaultIdBytes.length] ^ (i + 1);
      }
      return salt;
    }
  }

  /**
   * Creates a deterministic salt for sharing keys
   * @param recipientId Recipient identifier
   * @param sharedItemId Shared item identifier
   * @returns Sharing salt
   */
  private static async createSharingSalt(
    recipientId: string,
    sharedItemId: string
  ): Promise<Uint8Array> {
    // Create deterministic salt from sharing parameters
    const encoder = new TextEncoder();
    const sharingBytes = encoder.encode(`sharing-salt:${recipientId}:${sharedItemId}`);

    // Hash to create consistent salt
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', sharingBytes);
      return new Uint8Array(hashBuffer);
    } else {
      // Fallback: simple deterministic salt
      const salt = new Uint8Array(32);
      for (let i = 0; i < salt.length; i++) {
        salt[i] = sharingBytes[i % sharingBytes.length] ^ (i + 1);
      }
      return salt;
    }
  }

  /**
   * Validates account key derivation parameters
   * @param masterKey Master key
   * @param accountId Account identifier
   * @param salt Salt value
   * @returns True if parameters are valid
   */
  static validateParameters(masterKey: Uint8Array, accountId: string, salt: Uint8Array): boolean {
    return masterKey.length === 32 && accountId.length > 0 && salt.length >= 16;
  }
}
