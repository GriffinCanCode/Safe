/**
 * @fileoverview Algorithm Selector
 * @responsibility Detects hardware capabilities and selects optimal encryption algorithm
 * @principle Single Responsibility - Only algorithm selection logic
 * @security Chooses between AES-256-GCM (hardware accelerated) and ChaCha20-Poly1305 (software optimized)
 */

import { AlgorithmSelection } from '@zk-vault/shared';

/**
 * Algorithm selector for optimal performance based on hardware capabilities
 * @responsibility Determines the best encryption algorithm for the current environment
 */
export class AlgorithmSelector {
  private static hasAESNI?: boolean | undefined;
  private static performanceCache = new Map<string, number>();

  /**
   * Detects if AES hardware acceleration is available
   * @security Uses timing-based detection to identify AES-NI support
   */
  static async detectHardwareAcceleration(): Promise<boolean> {
    if (this.hasAESNI !== undefined) return this.hasAESNI;

    try {
      // Check if we're in a browser environment with WebCrypto
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // Test AES performance to detect hardware acceleration
        const testData = new Uint8Array(1024);
        crypto.getRandomValues(testData);
        
        const key = await window.crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );

        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Benchmark AES-GCM performance
        const start = performance.now();
        for (let i = 0; i < 100; i++) {
          await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            testData
          );
        }
        const duration = performance.now() - start;
        
        // If AES is very fast, likely hardware accelerated
        this.hasAESNI = duration < 50; // Less than 50ms for 100 operations
        
             } else {
         // Non-browser environment - assume no hardware acceleration
         this.hasAESNI = false;
       }
    } catch (error) {
      console.warn('Hardware acceleration detection failed:', error);
      this.hasAESNI = false;
    }

    return this.hasAESNI;
  }

  /**
   * Selects the optimal encryption algorithm based on hardware capabilities
   * @returns Algorithm selection with reasoning
   */
  static async selectOptimalAlgorithm(): Promise<AlgorithmSelection> {
    const hasHardwareAcceleration = await this.detectHardwareAcceleration();
    
    if (hasHardwareAcceleration) {
      return {
        algorithm: 'AES-256-GCM',
        reason: 'hardware-acceleration',
        hardwareAccelerated: true,
        performanceScore: await this.benchmarkAlgorithm('AES-256-GCM')
      };
    } else {
      return {
        algorithm: 'XChaCha20-Poly1305',
        reason: 'software-fallback',
        hardwareAccelerated: false,
        performanceScore: await this.benchmarkAlgorithm('XChaCha20-Poly1305')
      };
    }
  }

  /**
   * Benchmarks an encryption algorithm's performance
   * @param algorithm Algorithm to benchmark
   * @returns Performance score (operations per second)
   */
  private static async benchmarkAlgorithm(algorithm: 'AES-256-GCM' | 'XChaCha20-Poly1305'): Promise<number> {
    const cacheKey = algorithm;
    if (this.performanceCache.has(cacheKey)) {
      return this.performanceCache.get(cacheKey)!;
    }

    try {
      const testData = new Uint8Array(1024);
      crypto.getRandomValues(testData);
      
      const iterations = 100;
      let totalTime = 0;

      if (algorithm === 'AES-256-GCM') {
        if (typeof window !== 'undefined' && window.crypto?.subtle) {
          // Browser WebCrypto benchmark
          const key = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
          );
          const iv = crypto.getRandomValues(new Uint8Array(12));
          
          const start = performance.now();
          for (let i = 0; i < iterations; i++) {
            await window.crypto.subtle.encrypt(
              { name: 'AES-GCM', iv },
              key,
              testData
            );
          }
          totalTime = performance.now() - start;
                 } else {
           // Non-browser environment - use estimated performance
           totalTime = 60; // Estimated time for AES-256-GCM without hardware acceleration
         }
      } else {
        // ChaCha20-Poly1305 would require a library like libsodium
        // For now, estimate based on typical performance characteristics
        totalTime = 80; // Estimated time for ChaCha20-Poly1305
      }

      const score = Math.round((iterations / totalTime) * 1000); // Operations per second
      this.performanceCache.set(cacheKey, score);
      return score;
      
    } catch (error) {
      console.warn(`Benchmark failed for ${algorithm}:`, error);
      return 0;
    }
  }

  /**
   * Forces a specific algorithm selection (for testing or user preference)
   * @param algorithm Algorithm to force
   * @returns Algorithm selection
   */
  static forceAlgorithm(algorithm: 'AES-256-GCM' | 'XChaCha20-Poly1305'): AlgorithmSelection {
    return {
      algorithm,
      reason: 'user-preference',
      hardwareAccelerated: algorithm === 'AES-256-GCM',
      performanceScore: 0
    };
  }

  /**
   * Clears the performance cache (useful for testing)
   */
  static clearCache(): void {
    this.performanceCache.clear();
    this.hasAESNI = undefined;
  }
}
