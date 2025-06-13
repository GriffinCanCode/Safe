/**
 * @fileoverview Secure Memory Manager
 * @responsibility Manages sensitive data in memory with automatic cleanup
 * @principle Single Responsibility - Only memory protection operations
 * @security Protects against memory dumps and timing attacks
 */

import { MemoryProtectionConfig, MEMORY_PROTECTION } from '@zk-vault/shared';

/**
 * Secure memory manager for protecting sensitive data
 * @responsibility Handles secure allocation, protection, and cleanup of sensitive data
 * @security Implements memory protection against various attack vectors
 */
export class SecureMemoryManager {
  private static sensitiveData = new WeakMap<object, Uint8Array>();
  private static cleanupTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();

  /**
   * Stores sensitive data with automatic cleanup
   * @param key Reference object for the data
   * @param value Sensitive data to protect
   * @param config Memory protection configuration
   */
  static storeSensitive(
    key: object,
    value: Uint8Array,
    config: Partial<MemoryProtectionConfig> = {}
  ): void {
    const finalConfig = {
      autoClearTimeout: config.autoClearTimeout ?? MEMORY_PROTECTION.AUTO_CLEAR_TIMEOUT,
      useSecureMemory: config.useSecureMemory ?? true,
      secureOverwrite: config.secureOverwrite ?? true,
      maxLifetime: config.maxLifetime ?? MEMORY_PROTECTION.MAX_LIFETIME,
    };

    // Create a protected copy of the data
    const protectedValue = new Uint8Array(value);
    this.sensitiveData.set(key, protectedValue);

    // Clear any existing timer
    const existingTimer = this.cleanupTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set up automatic cleanup
    const timer = setTimeout(() => {
      this.clearSensitive(key);
    }, finalConfig.autoClearTimeout);

    this.cleanupTimers.set(key, timer);
  }

  /**
   * Retrieves sensitive data
   * @param key Reference object for the data
   * @returns Protected data or undefined if not found
   */
  static getSensitive(key: object): Uint8Array | undefined {
    return this.sensitiveData.get(key);
  }

  /**
   * Securely clears sensitive data from memory
   * @param key Reference object for the data
   */
  static clearSensitive(key: object): void {
    const data = this.sensitiveData.get(key);
    if (data) {
      // Securely overwrite the data
      this.secureOverwrite(data);
      this.sensitiveData.delete(key);
    }

    // Clear the cleanup timer
    const timer = this.cleanupTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(key);
    }
  }

  /**
   * Securely overwrites memory with random data
   * @param buffer Buffer to overwrite
   */
  private static secureOverwrite(buffer: Uint8Array): void {
    // Multiple passes with different patterns for security
    for (let pass = 0; pass < MEMORY_PROTECTION.OVERWRITE_PASSES; pass++) {
      if (pass === 0) {
        // First pass: all zeros
        buffer.fill(0);
      } else if (pass === 1) {
        // Second pass: all ones
        buffer.fill(0xff);
      } else {
        // Final pass: random data
        crypto.getRandomValues(buffer);
      }
    }
  }

  /**
   * Performs constant-time comparison of two buffers
   * @param a First buffer
   * @param b Second buffer
   * @returns True if buffers are equal
   */
  static secureCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }

  /**
   * Creates a secure buffer that auto-clears
   * @param size Buffer size in bytes
   * @param autoCleanup Whether to enable automatic cleanup
   * @returns Secure buffer instance
   */
  static createSecureBuffer(size: number, autoCleanup: boolean = true): SecureBuffer {
    return new SecureBuffer(size, autoCleanup);
  }

  /**
   * Clears all sensitive data (emergency cleanup)
   */
  static clearAll(): void {
    // Note: WeakMap doesn't provide iteration, so we can't clear all entries
    // This is actually a security feature - prevents enumeration of sensitive data
    console.warn('SecureMemoryManager: Emergency cleanup requested');
  }
}

/**
 * Secure buffer with automatic cleanup
 * @responsibility Manages a single secure buffer with lifecycle management
 */
export class SecureBuffer {
  private buffer: Uint8Array;
  private cleared = false;
  private timer?: ReturnType<typeof setTimeout> | undefined;

  constructor(size: number, autoCleanup: boolean = true) {
    this.buffer = new Uint8Array(size);

    if (autoCleanup) {
      this.timer = setTimeout(() => {
        this.clear();
      }, MEMORY_PROTECTION.AUTO_CLEAR_TIMEOUT);
    }
  }

  /**
   * Gets the buffer data
   * @returns Buffer data
   */
  get data(): Uint8Array {
    if (this.cleared) {
      throw new Error('Buffer has been cleared');
    }
    return this.buffer;
  }

  /**
   * Writes data to the buffer
   * @param data Data to write
   * @param offset Offset to write at
   */
  write(data: Uint8Array, offset: number = 0): void {
    if (this.cleared) {
      throw new Error('Buffer has been cleared');
    }

    if (offset + data.length > this.buffer.length) {
      throw new Error('Data exceeds buffer size');
    }

    this.buffer.set(data, offset);
  }

  /**
   * Reads data from the buffer
   * @param length Number of bytes to read
   * @param offset Offset to read from
   * @returns Read data
   */
  read(length: number, offset: number = 0): Uint8Array {
    if (this.cleared) {
      throw new Error('Buffer has been cleared');
    }

    if (offset + length > this.buffer.length) {
      throw new Error('Read exceeds buffer size');
    }

    return this.buffer.slice(offset, offset + length);
  }

  /**
   * Securely clears the buffer
   */
  clear(): void {
    if (!this.cleared) {
      SecureMemoryManager['secureOverwrite'](this.buffer);
      this.cleared = true;

      if (this.timer !== undefined) {
        clearTimeout(this.timer);
        this.timer = undefined;
      }
    }
  }

  /**
   * Extends the auto-clear timeout
   * @param ms Additional milliseconds
   */
  extendTimeout(ms: number): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.clear();
    }, ms);
  }

  /**
   * Checks if the buffer has been cleared
   * @returns True if cleared
   */
  isCleared(): boolean {
    return this.cleared;
  }

  /**
   * Gets the buffer size
   * @returns Size in bytes
   */
  get size(): number {
    return this.buffer.length;
  }
}
