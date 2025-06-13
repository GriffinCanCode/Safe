/**
 * @fileoverview Crypto Vault Service
 * @description Integration layer between web-app and ZK crypto package
 */

import { ZeroKnowledgeVault } from '@zk-vault/crypto';

export class CryptoVaultService {
  private zkVault: ZeroKnowledgeVault = new ZeroKnowledgeVault();

  /**
   * Initialize zero-knowledge vault with master password
   */
  async initialize(masterPassword: string, email: string): Promise<boolean> {
    const result = await this.zkVault.initialize(masterPassword, email);
    return result.success;
  }

  /**
   * Encrypt vault item data
   */
  async encryptItemData(
    data: string
  ): Promise<{ success: boolean; encryptedData?: any; error?: string }> {
    const result = await this.zkVault.encrypt(data);

    if (result.success && result.data) {
      return { success: true, encryptedData: result.data };
    } else {
      return { success: false, error: result.error || 'Encryption failed' };
    }
  }

  /**
   * Decrypt vault item data
   */
  async decryptItemData(
    encryptedData: any
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    const result = await this.zkVault.decrypt(encryptedData);

    if (result.success && result.data) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error || 'Decryption failed' };
    }
  }

  /**
   * Derive item-specific key
   */
  async deriveItemKey(
    itemId: string
  ): Promise<{ success: boolean; key?: Uint8Array; error?: string }> {
    const result = await this.zkVault.deriveItemKey(itemId);

    if (result.success && result.data) {
      return { success: true, key: result.data };
    } else {
      return { success: false, error: result.error || 'Key derivation failed' };
    }
  }

  /**
   * Check if vault is initialized
   */
  isInitialized(): boolean {
    return this.zkVault.isInitialized();
  }

  /**
   * Get vault status
   */
  getStatus() {
    return this.zkVault.getStatus();
  }

  /**
   * Lock vault (clear memory)
   */
  lock(): void {
    this.zkVault.lock();
  }

  /**
   * Generate secure password using crypto random
   */
  generatePassword(options: {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
  }): string {
    let charset = '';

    if (options.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (options.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.includeNumbers) charset += '0123456789';
    if (options.includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) return '';

    let password = '';
    const array = new Uint8Array(options.length);
    crypto.getRandomValues(array);

    for (let i = 0; i < options.length; i++) {
      password += charset[array[i] % charset.length];
    }

    return password;
  }
}

export const cryptoVaultService = new CryptoVaultService();
