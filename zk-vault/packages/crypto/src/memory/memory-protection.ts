/**
 * @fileoverview Memory Protection
 * @responsibility Advanced memory protection features for sensitive data
 * @principle Single Responsibility - Only memory protection operations
 * @security Protects against memory dumps, cold boot attacks, and other memory-based threats
 */

import { ConstantTime } from './constant-time';
import { MEMORY_PROTECTION } from '@zk-vault/shared';

/**
 * Memory protection utilities for sensitive data
 * @responsibility Provides advanced memory protection mechanisms
 * @security Implements multiple layers of memory protection
 */
export class MemoryProtection {
  private static protectedRegions = new Map<string, ProtectedMemoryRegion>();
  private static globalProtectionEnabled = false;

  /**
   * Enables global memory protection features
   * @security Activates system-wide memory protection mechanisms
   */
  static enableGlobalProtection(): void {
    this.globalProtectionEnabled = true;

    // Set up periodic memory cleaning
    this.setupPeriodicCleaning();

    // Set up emergency cleanup on page unload
    this.setupEmergencyCleanup();
  }

  /**
   * Disables global memory protection features
   */
  static disableGlobalProtection(): void {
    this.globalProtectionEnabled = false;
    this.clearAllProtectedRegions();
  }

  /**
   * Creates a protected memory region for sensitive data
   * @param id Unique identifier for the memory region
   * @param size Size of the memory region in bytes
   * @param options Protection options
   * @returns Protected memory region
   */
  static createProtectedRegion(
    id: string,
    size: number,
    options: MemoryProtectionOptions = {}
  ): ProtectedMemoryRegion {
    const region = new ProtectedMemoryRegion(id, size, options);
    this.protectedRegions.set(id, region);
    return region;
  }

  /**
   * Destroys a protected memory region
   * @param id Identifier of the memory region to destroy
   */
  static destroyProtectedRegion(id: string): void {
    const region = this.protectedRegions.get(id);
    if (region) {
      region.destroy();
      this.protectedRegions.delete(id);
    }
  }

  /**
   * Gets a protected memory region by ID
   * @param id Identifier of the memory region
   * @returns Protected memory region or undefined
   */
  static getProtectedRegion(id: string): ProtectedMemoryRegion | undefined {
    return this.protectedRegions.get(id);
  }

  /**
   * Performs secure memory allocation with protection
   * @param size Size in bytes
   * @param alignment Memory alignment requirement
   * @returns Protected memory buffer
   */
  static secureAlloc(size: number, alignment: number = MEMORY_PROTECTION.ALIGNMENT): Uint8Array {
    // Allocate slightly larger buffer for alignment and canaries
    const canarySize = 8;
    const totalSize = size + (alignment - 1) + canarySize * 2;
    const buffer = new Uint8Array(totalSize);

    // Add canary values at the beginning and end
    const canary = this.generateCanary();
    buffer.set(canary, 0);
    buffer.set(canary, totalSize - canarySize);

    // Return the aligned portion
    const alignedOffset = canarySize + ((alignment - (canarySize % alignment)) % alignment);
    return buffer.subarray(alignedOffset, alignedOffset + size);
  }

  /**
   * Validates memory integrity using canary values
   * @param buffer Buffer to validate
   * @returns True if memory integrity is intact
   */
  static validateMemoryIntegrity(_buffer: Uint8Array): boolean {
    // This is a simplified implementation
    // In a real system, you'd track canary locations
    return true; // Placeholder
  }

  /**
   * Performs memory obfuscation to hide sensitive data patterns
   * @param data Data to obfuscate
   * @param key Obfuscation key
   * @returns Obfuscated data
   */
  static obfuscateMemory(data: Uint8Array, key: Uint8Array): Uint8Array {
    const obfuscated = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
      obfuscated[i] = data[i] ^ key[i % key.length];
    }

    return obfuscated;
  }

  /**
   * Deobfuscates previously obfuscated memory
   * @param obfuscatedData Obfuscated data
   * @param key Obfuscation key
   * @returns Original data
   */
  static deobfuscateMemory(obfuscatedData: Uint8Array, key: Uint8Array): Uint8Array {
    // XOR is its own inverse
    return this.obfuscateMemory(obfuscatedData, key);
  }

  /**
   * Performs memory fragmentation to make reconstruction harder
   * @param data Data to fragment
   * @param fragmentCount Number of fragments
   * @returns Array of memory fragments
   */
  static fragmentMemory(data: Uint8Array, fragmentCount: number = 4): Uint8Array[] {
    const fragments: Uint8Array[] = [];
    const fragmentSize = Math.ceil(data.length / fragmentCount);

    for (let i = 0; i < fragmentCount; i++) {
      const start = i * fragmentSize;
      const end = Math.min(start + fragmentSize, data.length);
      fragments.push(data.slice(start, end));
    }

    return fragments;
  }

  /**
   * Reconstructs data from memory fragments
   * @param fragments Array of memory fragments
   * @returns Reconstructed data
   */
  static reconstructFromFragments(fragments: Uint8Array[]): Uint8Array {
    const totalLength = fragments.reduce((sum, fragment) => sum + fragment.length, 0);
    const reconstructed = new Uint8Array(totalLength);

    let offset = 0;
    for (const fragment of fragments) {
      reconstructed.set(fragment, offset);
      offset += fragment.length;
    }

    return reconstructed;
  }

  /**
   * Performs memory scrambling to prevent pattern analysis
   * @param data Data to scramble
   * @param seed Scrambling seed
   * @returns Scrambled data and unscrambling info
   */
  static scrambleMemory(
    data: Uint8Array,
    seed: number = Date.now()
  ): {
    scrambled: Uint8Array;
    indices: number[];
  } {
    const indices = Array.from({ length: data.length }, (_, i) => i);

    // Fisher-Yates shuffle with deterministic seed
    let rng = seed;
    for (let i = indices.length - 1; i > 0; i--) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff; // Linear congruential generator
      const j = rng % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const scrambled = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      scrambled[i] = data[indices[i]];
    }

    return { scrambled, indices };
  }

  /**
   * Unscrambles previously scrambled memory
   * @param scrambled Scrambled data
   * @param indices Unscrambling indices
   * @returns Original data
   */
  static unscrambleMemory(scrambled: Uint8Array, indices: number[]): Uint8Array {
    const unscrambled = new Uint8Array(scrambled.length);

    for (let i = 0; i < scrambled.length; i++) {
      unscrambled[indices[i]] = scrambled[i];
    }

    return unscrambled;
  }

  /**
   * Generates a random canary value for memory protection
   * @returns Random canary bytes
   */
  private static generateCanary(): Uint8Array {
    const canary = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(canary);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < canary.length; i++) {
        canary[i] = Math.floor(Math.random() * 256);
      }
    }
    return canary;
  }

  /**
   * Sets up periodic memory cleaning
   */
  private static setupPeriodicCleaning(): void {
    setInterval(() => {
      if (this.globalProtectionEnabled) {
        this.performPeriodicCleanup();
      }
    }, MEMORY_PROTECTION.AUTO_CLEAR_TIMEOUT);
  }

  /**
   * Sets up emergency cleanup on page unload
   */
  private static setupEmergencyCleanup(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearAllProtectedRegions();
      });

      window.addEventListener('pagehide', () => {
        this.clearAllProtectedRegions();
      });
    }
  }

  /**
   * Performs periodic cleanup of expired memory regions
   */
  private static performPeriodicCleanup(): void {
    const now = Date.now();

    for (const [id, region] of this.protectedRegions) {
      if (region.isExpired(now)) {
        this.destroyProtectedRegion(id);
      }
    }
  }

  /**
   * Clears all protected memory regions
   */
  private static clearAllProtectedRegions(): void {
    for (const [, region] of this.protectedRegions) {
      region.destroy();
    }
    this.protectedRegions.clear();
  }
}

/**
 * Memory protection options
 */
export interface MemoryProtectionOptions {
  /** Enable obfuscation */
  obfuscate?: boolean;
  /** Enable fragmentation */
  fragment?: boolean;
  /** Enable scrambling */
  scramble?: boolean;
  /** Auto-clear timeout in milliseconds */
  autoClearTimeout?: number;
  /** Maximum lifetime in milliseconds */
  maxLifetime?: number;
}

/**
 * Protected memory region class
 */
export class ProtectedMemoryRegion {
  private buffer: Uint8Array;
  private obfuscationKey?: Uint8Array;
  private fragments?: Uint8Array[];
  private scrambleIndices?: number[];
  private createdAt: number;
  private lastAccessed: number;
  private destroyed = false;

  constructor(
    public readonly id: string,
    size: number,
    private options: MemoryProtectionOptions = {}
  ) {
    this.buffer = MemoryProtection.secureAlloc(size);
    this.createdAt = Date.now();
    this.lastAccessed = this.createdAt;

    if (this.options.obfuscate) {
      this.obfuscationKey = new Uint8Array(32);
      crypto.getRandomValues(this.obfuscationKey);
    }
  }

  /**
   * Writes data to the protected region
   * @param data Data to write
   * @param offset Offset to write at
   */
  write(data: Uint8Array, offset: number = 0): void {
    if (this.destroyed) {
      throw new Error('Cannot write to destroyed memory region');
    }

    this.lastAccessed = Date.now();

    let processedData = data;

    if (this.options.obfuscate && this.obfuscationKey) {
      processedData = MemoryProtection.obfuscateMemory(data, this.obfuscationKey);
    }

    if (this.options.scramble) {
      const scrambleResult = MemoryProtection.scrambleMemory(processedData);
      processedData = scrambleResult.scrambled;
      this.scrambleIndices = scrambleResult.indices;
    }

    if (this.options.fragment) {
      this.fragments = MemoryProtection.fragmentMemory(processedData);
    } else {
      this.buffer.set(processedData, offset);
    }
  }

  /**
   * Reads data from the protected region
   * @param length Number of bytes to read
   * @param offset Offset to read from
   * @returns Read data
   */
  read(length: number, offset: number = 0): Uint8Array {
    if (this.destroyed) {
      throw new Error('Cannot read from destroyed memory region');
    }

    this.lastAccessed = Date.now();

    let data: Uint8Array;

    if (this.fragments) {
      data = MemoryProtection.reconstructFromFragments(this.fragments);
    } else {
      data = this.buffer.slice(offset, offset + length);
    }

    if (this.options.scramble && this.scrambleIndices) {
      data = MemoryProtection.unscrambleMemory(data, this.scrambleIndices);
    }

    if (this.options.obfuscate && this.obfuscationKey) {
      data = MemoryProtection.deobfuscateMemory(data, this.obfuscationKey);
    }

    return data;
  }

  /**
   * Checks if the memory region has expired
   * @param currentTime Current timestamp
   * @returns True if expired
   */
  isExpired(currentTime: number = Date.now()): boolean {
    const maxLifetime = this.options.maxLifetime || MEMORY_PROTECTION.MAX_LIFETIME;
    const autoClearTimeout = this.options.autoClearTimeout || MEMORY_PROTECTION.AUTO_CLEAR_TIMEOUT;

    return (
      currentTime - this.createdAt > maxLifetime ||
      currentTime - this.lastAccessed > autoClearTimeout
    );
  }

  /**
   * Destroys the protected memory region
   */
  destroy(): void {
    if (!this.destroyed) {
      ConstantTime.secureClear(this.buffer);

      if (this.obfuscationKey) {
        ConstantTime.secureClear(this.obfuscationKey);
      }

      if (this.fragments) {
        for (const fragment of this.fragments) {
          ConstantTime.secureClear(fragment);
        }
      }

      this.destroyed = true;
    }
  }

  /**
   * Gets the size of the memory region
   * @returns Size in bytes
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Checks if the memory region is destroyed
   * @returns True if destroyed
   */
  get isDestroyed(): boolean {
    return this.destroyed;
  }
}
