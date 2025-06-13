/**
 * @fileoverview Encryption Composable
 * @description Provides encryption/decryption functionality and vault status management
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { cryptoVaultService } from '@/services/crypto-vault.service';
import { authService } from '@/services/auth.service';

export interface UseEncryptionOptions {
  autoInitialize?: boolean;
  lockTimeout?: number; // minutes
}

export interface EncryptionResult {
  success: boolean;
  data?: any | undefined;
  error?: string | undefined;
}

export interface DecryptionResult {
  success: boolean;
  data?: string | undefined;
  error?: string | undefined;
}

export interface KeyDerivationResult {
  success: boolean;
  key?: Uint8Array | undefined;
  error?: string | undefined;
}

export interface VaultStatus {
  isInitialized: boolean;
  isLocked: boolean;
  lastActivity: Date | null;
  autoLockEnabled: boolean;
  autoLockTimeout: number;
}

export function useEncryption(options: UseEncryptionOptions = {}) {
  // Local state
  const isInitializing = ref(false);
  const encryptionError = ref<string | null>(null);
  const lastActivity = ref<Date | null>(null);
  const autoLockTimeout = ref(options.lockTimeout || 15); // 15 minutes default
  const autoLockEnabled = ref(true);

  // Auto-lock timer
  let lockTimer: number | null = null;

  // Computed properties
  const isInitialized = computed(() => cryptoVaultService.isInitialized());
  const isLocked = computed(() => !isInitialized.value);

  const vaultStatus = computed(
    (): VaultStatus => ({
      isInitialized: isInitialized.value,
      isLocked: isLocked.value,
      lastActivity: lastActivity.value,
      autoLockEnabled: autoLockEnabled.value,
      autoLockTimeout: autoLockTimeout.value,
    })
  );

  // Core encryption methods
  const initializeVault = async (masterPassword: string, email?: string): Promise<boolean> => {
    try {
      isInitializing.value = true;
      encryptionError.value = null;

      const userEmail = email || authService.getCurrentUser()?.email;
      if (!userEmail) {
        throw new Error('User email is required for vault initialization');
      }

      const success = await cryptoVaultService.initialize(masterPassword, userEmail);

      if (success) {
        updateActivity();
        startAutoLockTimer();
      }

      return success;
    } catch (error: any) {
      encryptionError.value = error.message;
      return false;
    } finally {
      isInitializing.value = false;
    }
  };

  const encryptData = async (data: string): Promise<EncryptionResult> => {
    try {
      encryptionError.value = null;

      if (!isInitialized.value) {
        throw new Error('Vault not initialized');
      }

      updateActivity();
      const result = await cryptoVaultService.encryptItemData(data);

      return {
        success: result.success,
        data: result.encryptedData,
        error: result.error,
      };
    } catch (error: any) {
      encryptionError.value = error.message;
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const decryptData = async (encryptedData: any): Promise<DecryptionResult> => {
    try {
      encryptionError.value = null;

      if (!isInitialized.value) {
        throw new Error('Vault not initialized');
      }

      updateActivity();
      const result = await cryptoVaultService.decryptItemData(encryptedData);

      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error: any) {
      encryptionError.value = error.message;
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const deriveItemKey = async (itemId: string): Promise<KeyDerivationResult> => {
    try {
      encryptionError.value = null;

      if (!isInitialized.value) {
        throw new Error('Vault not initialized');
      }

      updateActivity();
      const result = await cryptoVaultService.deriveItemKey(itemId);

      return {
        success: result.success,
        key: result.key,
        error: result.error,
      };
    } catch (error: any) {
      encryptionError.value = error.message;
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Vault management
  const lockVault = (): void => {
    try {
      cryptoVaultService.lock();
      lastActivity.value = null;
      stopAutoLockTimer();
      encryptionError.value = null;
    } catch (error: any) {
      encryptionError.value = error.message;
    }
  };

  const getVaultStatus = () => {
    try {
      return cryptoVaultService.getStatus();
    } catch (error: any) {
      encryptionError.value = error.message;
      return null;
    }
  };

  // Activity tracking and auto-lock
  const updateActivity = (): void => {
    lastActivity.value = new Date();

    if (autoLockEnabled.value && isInitialized.value) {
      resetAutoLockTimer();
    }
  };

  const startAutoLockTimer = (): void => {
    if (!autoLockEnabled.value || autoLockTimeout.value <= 0) {
      return;
    }

    stopAutoLockTimer();

    lockTimer = window.setTimeout(
      () => {
        lockVault();
      },
      autoLockTimeout.value * 60 * 1000
    ); // Convert minutes to milliseconds
  };

  const resetAutoLockTimer = (): void => {
    if (autoLockEnabled.value) {
      startAutoLockTimer();
    }
  };

  const stopAutoLockTimer = (): void => {
    if (lockTimer) {
      clearTimeout(lockTimer);
      lockTimer = null;
    }
  };

  const setAutoLockTimeout = (minutes: number): void => {
    autoLockTimeout.value = minutes;

    if (isInitialized.value && autoLockEnabled.value) {
      resetAutoLockTimer();
    }
  };

  const enableAutoLock = (enabled: boolean): void => {
    autoLockEnabled.value = enabled;

    if (enabled && isInitialized.value) {
      startAutoLockTimer();
    } else {
      stopAutoLockTimer();
    }
  };

  // Password generation using crypto random
  const generateSecurePassword = (options: {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
  }): string => {
    try {
      return cryptoVaultService.generatePassword(options);
    } catch (error: any) {
      encryptionError.value = error.message;
      return '';
    }
  };

  // Utility methods
  const clearError = (): void => {
    encryptionError.value = null;
  };

  const requireUnlocked = (): boolean => {
    if (!isInitialized.value) {
      encryptionError.value = 'Vault is locked. Please unlock to continue.';
      return false;
    }
    return true;
  };

  // Batch operations
  const encryptMultiple = async (dataArray: string[]): Promise<EncryptionResult[]> => {
    if (!requireUnlocked()) {
      return dataArray.map(() => ({
        success: false,
        error: 'Vault is locked',
      }));
    }

    const results: EncryptionResult[] = [];

    for (const data of dataArray) {
      const result = await encryptData(data);
      results.push(result);
    }

    return results;
  };

  const decryptMultiple = async (encryptedDataArray: any[]): Promise<DecryptionResult[]> => {
    if (!requireUnlocked()) {
      return encryptedDataArray.map(() => ({
        success: false,
        error: 'Vault is locked',
      }));
    }

    const results: DecryptionResult[] = [];

    for (const encryptedData of encryptedDataArray) {
      const result = await decryptData(encryptedData);
      results.push(result);
    }

    return results;
  };

  // Memory management
  const secureWipe = (data: string | Uint8Array): void => {
    try {
      if (typeof data === 'string') {
        // For strings, we can't directly wipe memory in JavaScript
        // but we can at least clear the reference
        data = '';
      } else if (data instanceof Uint8Array) {
        // Zero out the array
        data.fill(0);
      }
    } catch (error: any) {
      console.warn('Failed to securely wipe data:', error);
    }
  };

  // Activity event listeners
  const setupActivityListeners = (): (() => void) => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      if (isInitialized.value) {
        updateActivity();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Store cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  };

  let cleanupActivityListeners: (() => void) | null = null;

  // Lifecycle management
  const initialize = async (): Promise<void> => {
    try {
      if (options.autoInitialize !== false) {
        // Set up activity listeners
        cleanupActivityListeners = setupActivityListeners();
      }
    } catch (error: any) {
      console.error('Failed to initialize encryption composable:', error);
      encryptionError.value = error.message;
    }
  };

  const cleanup = (): void => {
    stopAutoLockTimer();

    if (cleanupActivityListeners) {
      cleanupActivityListeners();
      cleanupActivityListeners = null;
    }
  };

  // Lifecycle hooks
  onMounted(() => {
    initialize();
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    // State
    isInitialized,
    isLocked,
    isInitializing,
    vaultStatus,
    lastActivity,
    autoLockEnabled,
    autoLockTimeout,
    encryptionError,

    // Core methods
    initializeVault,
    encryptData,
    decryptData,
    deriveItemKey,
    lockVault,
    getVaultStatus,

    // Activity and auto-lock
    updateActivity,
    setAutoLockTimeout,
    enableAutoLock,

    // Password generation
    generateSecurePassword,

    // Batch operations
    encryptMultiple,
    decryptMultiple,

    // Utility methods
    clearError,
    requireUnlocked,
    secureWipe,
  };
}
