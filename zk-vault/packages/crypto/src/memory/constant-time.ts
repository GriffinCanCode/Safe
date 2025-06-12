/**
 * @fileoverview Constant-Time Operations
 * @responsibility Provides constant-time operations to prevent timing attacks
 * @principle Single Responsibility - Only timing-safe operations
 * @security Prevents timing side-channel attacks on sensitive data
 */

/**
 * Constant-time operations for cryptographic security
 * @responsibility Handles timing-safe operations on sensitive data
 * @security Prevents timing attacks by ensuring operations take constant time
 */
export class ConstantTime {

  /**
   * Performs constant-time comparison of two byte arrays
   * @param a First byte array
   * @param b Second byte array
   * @returns True if arrays are equal, false otherwise
   * @security Takes constant time regardless of where differences occur
   */
  static compare(a: Uint8Array, b: Uint8Array): boolean {
    // Different lengths are not equal, but still take constant time
    let result = a.length ^ b.length;
    
    // Compare all bytes, even if lengths differ
    const maxLength = Math.max(a.length, b.length);
    
    for (let i = 0; i < maxLength; i++) {
      const byteA = i < a.length ? a[i] : 0;
      const byteB = i < b.length ? b[i] : 0;
      result |= byteA ^ byteB;
    }
    
    return result === 0;
  }

  /**
   * Performs constant-time comparison of two strings
   * @param a First string
   * @param b Second string
   * @returns True if strings are equal, false otherwise
   * @security Takes constant time regardless of where differences occur
   */
  static compareStrings(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const bytesA = encoder.encode(a);
    const bytesB = encoder.encode(b);
    
    return this.compare(bytesA, bytesB);
  }

  /**
   * Selects one of two values based on a condition in constant time
   * @param condition Selection condition (0 or 1)
   * @param valueIfTrue Value to return if condition is true
   * @param valueIfFalse Value to return if condition is false
   * @returns Selected value
   * @security Selection takes constant time regardless of condition
   */
  static select(condition: number, valueIfTrue: number, valueIfFalse: number): number {
    // Ensure condition is 0 or 1
    const mask = (condition & 1) - 1; // 0 becomes -1 (0xFFFFFFFF), 1 becomes 0
    
    return (valueIfFalse & mask) | (valueIfTrue & ~mask);
  }

  /**
   * Selects one of two byte arrays based on a condition in constant time
   * @param condition Selection condition (0 or 1)
   * @param arrayIfTrue Array to return if condition is true
   * @param arrayIfFalse Array to return if condition is false
   * @returns Selected array (copy)
   * @security Selection takes constant time regardless of condition
   */
  static selectArray(
    condition: number,
    arrayIfTrue: Uint8Array,
    arrayIfFalse: Uint8Array
  ): Uint8Array {
    if (arrayIfTrue.length !== arrayIfFalse.length) {
      throw new Error('Arrays must have the same length for constant-time selection');
    }
    
    const result = new Uint8Array(arrayIfTrue.length);
    const mask = (condition & 1) - 1; // 0 becomes -1, 1 becomes 0
    
    for (let i = 0; i < result.length; i++) {
      result[i] = (arrayIfFalse[i] & mask) | (arrayIfTrue[i] & ~mask);
    }
    
    return result;
  }

  /**
   * Copies an array in constant time
   * @param source Source array
   * @param destination Destination array
   * @param condition Copy condition (0 or 1)
   * @security Copy operation takes constant time regardless of condition
   */
  static conditionalCopy(
    source: Uint8Array,
    destination: Uint8Array,
    condition: number
  ): void {
    if (source.length !== destination.length) {
      throw new Error('Arrays must have the same length for constant-time copy');
    }
    
    const mask = (condition & 1) - 1; // 0 becomes -1, 1 becomes 0
    
    for (let i = 0; i < source.length; i++) {
      destination[i] = (destination[i] & mask) | (source[i] & ~mask);
    }
  }

  /**
   * Finds the index of a byte in an array in constant time
   * @param array Array to search
   * @param target Byte to find
   * @returns Index of first occurrence, or -1 if not found
   * @security Search takes constant time regardless of target location
   */
  static indexOf(array: Uint8Array, target: number): number {
    let foundIndex = -1;
    let found = 0;
    
    for (let i = 0; i < array.length; i++) {
      const isMatch = (array[i] ^ target) === 0 ? 1 : 0;
      const isFirstMatch = isMatch & (found ^ 1);
      
      foundIndex = this.select(isFirstMatch, i, foundIndex);
      found |= isMatch;
    }
    
    return foundIndex;
  }

  /**
   * Checks if an array contains a specific byte in constant time
   * @param array Array to search
   * @param target Byte to find
   * @returns True if byte is found, false otherwise
   * @security Search takes constant time regardless of target location
   */
  static contains(array: Uint8Array, target: number): boolean {
    let found = 0;
    
    for (let i = 0; i < array.length; i++) {
      const isMatch = (array[i] ^ target) === 0 ? 1 : 0;
      found |= isMatch;
    }
    
    return found === 1;
  }

  /**
   * Performs constant-time modular reduction
   * @param value Value to reduce
   * @param modulus Modulus value
   * @returns Reduced value
   * @security Reduction takes constant time regardless of input values
   */
  static modReduce(value: number, modulus: number): number {
    // Simple constant-time modular reduction
    // Note: This is a simplified implementation for demonstration
    let result = value;
    
    // Perform reduction in constant time
    for (let i = 0; i < 32; i++) { // Assume 32-bit values
      const needsReduction = result >= modulus ? 1 : 0;
      result = this.select(needsReduction, result - modulus, result);
    }
    
    return result;
  }

  /**
   * Swaps two values in constant time based on a condition
   * @param a First value
   * @param b Second value
   * @param condition Swap condition (0 or 1)
   * @returns Tuple of potentially swapped values
   * @security Swap takes constant time regardless of condition
   */
  static conditionalSwap(a: number, b: number, condition: number): [number, number] {
    const mask = (condition & 1) - 1; // 0 becomes -1, 1 becomes 0
    const diff = (a ^ b) & ~mask;
    
    return [a ^ diff, b ^ diff];
  }

  /**
   * Swaps two byte arrays in constant time based on a condition
   * @param a First array
   * @param b Second array
   * @param condition Swap condition (0 or 1)
   * @security Swap takes constant time regardless of condition
   */
  static conditionalSwapArrays(
    a: Uint8Array,
    b: Uint8Array,
    condition: number
  ): void {
    if (a.length !== b.length) {
      throw new Error('Arrays must have the same length for constant-time swap');
    }
    
    const mask = (condition & 1) - 1; // 0 becomes -1, 1 becomes 0
    
    for (let i = 0; i < a.length; i++) {
      const diff = (a[i] ^ b[i]) & ~mask;
      a[i] ^= diff;
      b[i] ^= diff;
    }
  }

  /**
   * Validates that an operation completed in constant time
   * @param operation Function to validate
   * @param iterations Number of test iterations
   * @returns True if timing is consistent, false otherwise
   * @security Helps detect timing vulnerabilities in implementations
   */
  static validateConstantTime(
    operation: () => void,
    iterations: number = 1000
  ): boolean {
    const timings: number[] = [];
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      operation();
    }
    
    // Measure timings
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      operation();
      const end = performance.now();
      timings.push(end - start);
    }
    
    // Calculate statistics
    const mean = timings.reduce((sum, time) => sum + time, 0) / timings.length;
    const variance = timings.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);
    
    // Check if timing is consistent (low coefficient of variation)
    const coefficientOfVariation = stdDev / mean;
    
    // Consider timing constant if coefficient of variation is below threshold
    return coefficientOfVariation < 0.1; // 10% threshold
  }

  /**
   * Clears sensitive data from memory in constant time
   * @param data Data to clear
   * @security Ensures data is overwritten regardless of content
   */
  static secureClear(data: Uint8Array): void {
    // Multiple passes with different patterns
    const patterns = [0x00, 0xFF, 0xAA, 0x55];
    
    for (const pattern of patterns) {
      for (let i = 0; i < data.length; i++) {
        data[i] = pattern;
      }
    }
    
    // Final pass with random data
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(data);
    }
  }
}
