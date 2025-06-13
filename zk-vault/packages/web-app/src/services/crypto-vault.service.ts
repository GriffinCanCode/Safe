/**
 * @fileoverview Crypto Vault Service
 * @description Integration layer between web-app and ZK crypto package
 */

import { ZeroKnowledgeVault } from '@zk-vault/crypto';
import { workerManager } from './worker-manager.service';
import type {
  EncryptionResult,
  EncryptionContext,
  DecryptionContext,
  MasterKeyStructure,
} from '@zk-vault/shared';

interface WorkerEncryptionResult {
  success: boolean;
  data?: EncryptionResult;
  error?: string;
}

interface WorkerDecryptionResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
}

interface WorkerKeyDerivationResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
}

interface WorkerMasterKeyResult {
  success: boolean;
  data?: MasterKeyStructure;
  error?: string;
}

export class CryptoVaultService {
  private zkVault = new ZeroKnowledgeVault();
  private isVaultInitialized = false;
  private static readonly WORKER_THRESHOLD = 1024; // Use worker for data larger than 1KB

  /**
   * Initialize zero-knowledge vault with master password
   */
  async initialize(masterPassword: string, email: string): Promise<boolean> {
    try {
      // Use worker for master key derivation (always heavy operation)
      let result: any;

      if (workerManager.isWorkerHealthy('encryption')) {
        try {
          const workerResult = await workerManager.sendMessage<WorkerMasterKeyResult>(
            'encryption',
            'deriveMasterKey',
            {
              password: masterPassword,
              email,
            },
            { priority: 'high' }
          );

          if (workerResult.success && workerResult.data) {
            result = await this.zkVault.restoreFromMasterKey(workerResult.data);
          } else {
            throw new Error(workerResult.error || 'Worker master key derivation failed');
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker master key derivation failed, falling back to main thread:', error);
          result = await this.zkVault.initialize(masterPassword, email);
        }
      } else {
        result = await this.zkVault.initialize(masterPassword, email);
      }

      if (result.success) {
        this.isVaultInitialized = true;
        return true;
      } else {
        // eslint-disable-next-line no-console
        console.error('Vault initialization failed:', result.error);
        this.isVaultInitialized = false;
        return false;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Vault initialization error:', error);
      this.isVaultInitialized = false;
      return false;
    }
  }

  /**
   * Encrypt vault item data with proper context
   */
  async encryptItemData(
    data: string,
    context?: EncryptionContext
  ): Promise<{ success: boolean; encryptedData?: EncryptionResult; error?: string }> {
    if (!this.isVaultInitialized) {
      return { success: false, error: 'Vault not initialized' };
    }

    try {
      const dataSize = data.length * 2; // Rough UTF-16 estimate

      // Use worker for large data or when available
      if (
        (dataSize > CryptoVaultService.WORKER_THRESHOLD || context?.purpose === 'file-chunk') &&
        workerManager.isWorkerHealthy('encryption')
      ) {
        try {
          // For now, use main thread encryption with worker for key operations
          // TODO: Implement getAccountKey method in ZeroKnowledgeVault
          const result = await this.zkVault.encrypt(data, context);
          if (result.success && result.data) {
            return { success: true, encryptedData: result.data };
          } else {
            return { success: false, error: result.error || 'Encryption failed' };
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker encryption failed, falling back to main thread:', error);
          // Fallback to main thread
          const result = await this.zkVault.encrypt(data, context);
          if (result.success && result.data) {
            return { success: true, encryptedData: result.data };
          } else {
            return { success: false, error: result.error || 'Encryption failed' };
          }
        }
      } else {
        // Use main thread for smaller data
        const result = await this.zkVault.encrypt(data, context);
        if (result.success && result.data) {
          return { success: true, encryptedData: result.data };
        } else {
          return { success: false, error: result.error || 'Encryption failed' };
        }
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Encryption failed',
      };
    }
  }

  /**
   * Decrypt vault item data with proper context
   */
  async decryptItemData(
    encryptedData: EncryptionResult,
    context?: DecryptionContext
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    if (!this.isVaultInitialized) {
      return { success: false, error: 'Vault not initialized' };
    }

    try {
      const dataSize = encryptedData.ciphertext?.length || 0;

      // Use worker for large data or when available
      if (
        (dataSize > CryptoVaultService.WORKER_THRESHOLD ||
          context?.expectedPurpose === 'file-chunk') &&
        workerManager.isWorkerHealthy('encryption')
      ) {
        try {
          // For now, use main thread decryption
          // TODO: Implement worker-based decryption when getAccountKey is available
          const result = await this.zkVault.decrypt(encryptedData, context);
          if (result.success && result.data) {
            return { success: true, data: result.data };
          } else {
            return { success: false, error: result.error || 'Decryption failed' };
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker decryption failed, falling back to main thread:', error);
          // Fallback to main thread
          const result = await this.zkVault.decrypt(encryptedData, context);
          if (result.success && result.data) {
            return { success: true, data: result.data };
          } else {
            return { success: false, error: result.error || 'Decryption failed' };
          }
        }
      } else {
        // Use main thread for smaller data
        const result = await this.zkVault.decrypt(encryptedData, context);
        if (result.success && result.data) {
          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error || 'Decryption failed' };
        }
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed',
      };
    }
  }

  /**
   * Derive item-specific key
   */
  async deriveItemKey(
    itemId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    itemType?: 'password' | 'note' | 'card' | 'identity' | 'file'
  ): Promise<{ success: boolean; key?: Uint8Array; error?: string }> {
    if (!this.isVaultInitialized) {
      return { success: false, error: 'Vault not initialized' };
    }

    try {
      // Use worker for key derivation when available
      if (workerManager.isWorkerHealthy('encryption')) {
        try {
          // For now, use main thread key derivation
          // TODO: Implement worker-based key derivation when getAccountKey is available
          const result = await this.zkVault.deriveItemKey(itemId);
          if (result.success && result.data) {
            return { success: true, key: result.data };
          } else {
            return { success: false, error: result.error || 'Key derivation failed' };
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker key derivation failed, falling back to main thread:', error);
          // Fallback to main thread
          const result = await this.zkVault.deriveItemKey(itemId);
          if (result.success && result.data) {
            return { success: true, key: result.data };
          } else {
            return { success: false, error: result.error || 'Key derivation failed' };
          }
        }
      } else {
        // Use main thread
        const result = await this.zkVault.deriveItemKey(itemId);
        if (result.success && result.data) {
          return { success: true, key: result.data };
        } else {
          return { success: false, error: result.error || 'Key derivation failed' };
        }
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Key derivation failed',
      };
    }
  }

  /**
   * Batch encrypt multiple items efficiently
   */
  async batchEncrypt(
    items: Array<{ id: string; data: string; context?: EncryptionContext }>
  ): Promise<
    Array<{
      id: string;
      success: boolean;
      encryptedData?: EncryptionResult;
      error?: string;
    }>
  > {
    if (!this.isVaultInitialized) {
      return items.map(item => ({
        id: item.id,
        success: false,
        error: 'Vault not initialized',
      }));
    }

    const results: Array<{
      id: string;
      success: boolean;
      encryptedData?: EncryptionResult;
      error?: string;
    }> = [];

    // Process in batches to avoid overwhelming the worker
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async item => {
        const result = await this.encryptItemData(item.data, item.context);
        return {
          id: item.id,
          success: result.success,
          ...(result.encryptedData ? { encryptedData: result.encryptedData } : {}),
          ...(result.error ? { error: result.error } : {}),
        };
      });

      // eslint-disable-next-line no-await-in-loop
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Batch decrypt multiple items efficiently
   */
  async batchDecrypt(
    items: Array<{ id: string; encryptedData: EncryptionResult; context?: DecryptionContext }>
  ): Promise<
    Array<{
      id: string;
      success: boolean;
      data?: string;
      error?: string;
    }>
  > {
    if (!this.isVaultInitialized) {
      return items.map(item => ({
        id: item.id,
        success: false,
        error: 'Vault not initialized',
      }));
    }

    const results: Array<{
      id: string;
      success: boolean;
      data?: string;
      error?: string;
    }> = [];

    // Process in batches to avoid overwhelming the worker
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async item => {
        const result = await this.decryptItemData(item.encryptedData, item.context);
        return {
          id: item.id,
          success: result.success,
          ...(result.data ? { data: result.data } : {}),
          ...(result.error ? { error: result.error } : {}),
        };
      });

      // eslint-disable-next-line no-await-in-loop
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Clear sensitive memory using worker when available
   */
  async clearMemory(keys?: object[]): Promise<void> {
    try {
      // Clear main thread memory
      this.zkVault.lock();

      // Clear worker memory if available
      if (workerManager.isWorkerHealthy('encryption')) {
        try {
          await workerManager.sendMessage(
            'encryption',
            'clearMemory',
            { keys },
            { priority: 'high' }
          );
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Worker memory clear failed:', error);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Memory clear error:', error);
    }
  }

  /**
   * Check if vault is initialized
   */
  isInitialized(): boolean {
    return this.isVaultInitialized && this.zkVault.isInitialized();
  }

  /**
   * Get vault status with enhanced information
   */
  getStatus(): {
    initialized: boolean;
    isServiceInitialized: boolean;
    algorithm?: string;
    hardwareAccelerated?: boolean;
    performanceScore?: number;
    reason?: string;
    workers: {
      encryption: {
        available: boolean;
        stats: any;
      };
      search: {
        available: boolean;
        stats: any;
      };
      fileProcessing: {
        available: boolean;
        stats: any;
      };
    };
    error?: string;
  } {
    try {
      const zkStatus = this.zkVault.getStatus();
      const algorithmSelection = this.zkVault.getAlgorithmSelection();
      const workerStats = workerManager.getAllWorkerStats();

      const result: any = {
        ...zkStatus,
        isServiceInitialized: this.isVaultInitialized,
        workers: {
          encryption: {
            available: workerManager.isWorkerHealthy('encryption'),
            stats: workerStats.encryption,
          },
          search: {
            available: workerManager.isWorkerHealthy('search'),
            stats: workerStats.search,
          },
          fileProcessing: {
            available: workerManager.isWorkerHealthy('fileProcessing'),
            stats: workerStats.fileProcessing,
          },
        },
      };

      if (algorithmSelection?.algorithm) {
        result.algorithm = algorithmSelection.algorithm;
      }
      if (algorithmSelection?.hardwareAccelerated !== undefined) {
        result.hardwareAccelerated = algorithmSelection.hardwareAccelerated;
      }
      if (algorithmSelection?.performanceScore !== undefined) {
        result.performanceScore = algorithmSelection.performanceScore;
      }
      if (algorithmSelection?.reason) {
        result.reason = algorithmSelection.reason;
      }

      return result;
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error getting vault status:', error);
      return {
        initialized: false,
        isServiceInitialized: this.isVaultInitialized,
        error: error instanceof Error ? error.message : 'Unknown error',
        workers: {
          encryption: { available: false, stats: null },
          search: { available: false, stats: null },
          fileProcessing: { available: false, stats: null },
        },
      };
    }
  }

  /**
   * Lock vault (clear memory)
   */
  async lock(): Promise<void> {
    try {
      await this.clearMemory();
      this.isVaultInitialized = false;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error locking vault:', error);
      // Force reset state even if lock fails
      this.isVaultInitialized = false;
    }
  }

  /**
   * Restore vault from existing master key structure
   */
  async restoreFromMasterKey(masterKeyStructure: MasterKeyStructure): Promise<boolean> {
    try {
      const result = await this.zkVault.restoreFromMasterKey(masterKeyStructure);

      if (result.success) {
        this.isVaultInitialized = true;
        return true;
      } else {
        // eslint-disable-next-line no-console
        console.error('Vault restoration failed:', result.error);
        this.isVaultInitialized = false;
        return false;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Vault restoration error:', error);
      this.isVaultInitialized = false;
      return false;
    }
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
    // eslint-disable-next-line no-restricted-globals
    crypto.getRandomValues(array);

    for (let i = 0; i < options.length; i += 1) {
      password += charset[array[i] % charset.length];
    }

    return password;
  }

  /**
   * Get the underlying ZK vault instance for advanced operations
   */
  getZKVault(): ZeroKnowledgeVault {
    return this.zkVault;
  }

  /**
   * Benchmark encryption performance
   */
  async benchmarkPerformance(): Promise<{
    mainThread: number;
    worker: number;
    recommendation: 'main-thread' | 'worker' | 'hybrid';
  }> {
    const testData = 'x'.repeat(10000); // 10KB test data
    const iterations = 5;

    // Benchmark main thread
    const mainThreadTimes: number[] = [];
    for (let i = 0; i < iterations; i += 1) {
      const start = performance.now();
      // eslint-disable-next-line no-await-in-loop
      await this.zkVault.encrypt(testData);
      mainThreadTimes.push(performance.now() - start);
    }
    const mainThreadAvg = mainThreadTimes.reduce((a, b) => a + b, 0) / iterations;

    // Benchmark worker if available
    let workerAvg = Infinity;
    if (workerManager.isWorkerHealthy('encryption')) {
      try {
        const workerResult = await workerManager.sendMessage<{
          success: boolean;
          data?: Record<string, number>;
        }>('encryption', 'benchmark', {
          algorithms: ['AES-256-GCM'],
          dataSize: testData.length,
          iterations,
        });

        if (workerResult.success && workerResult.data && workerResult.data['AES-256-GCM']) {
          workerAvg = 1000 / workerResult.data['AES-256-GCM']; // Convert ops/sec to ms
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Worker benchmark failed:', error);
      }
    }

    // Determine recommendation
    let recommendation: 'main-thread' | 'worker' | 'hybrid';
    if (workerAvg < mainThreadAvg * 0.8) {
      recommendation = 'worker';
    } else if (workerAvg > mainThreadAvg * 1.2) {
      recommendation = 'main-thread';
    } else {
      recommendation = 'hybrid';
    }

    return {
      mainThread: mainThreadAvg,
      worker: workerAvg,
      recommendation,
    };
  }
}

export const cryptoVaultService = new CryptoVaultService();
