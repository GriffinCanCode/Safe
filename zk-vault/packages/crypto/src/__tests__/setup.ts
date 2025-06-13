/**
 * Test setup file for crypto package
 * Provides mocks and utilities for testing cryptographic operations
 */

// Polyfill TextEncoder and TextDecoder for Node.js test environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock WebCrypto API for testing
const mockCrypto = {
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    digest: async (_algorithm: string, data: ArrayBuffer) => {
      // Simple mock hash - not cryptographically secure
      const view = new Uint8Array(data);
      const hash = new Uint8Array(32);
      for (let i = 0; i < hash.length; i++) {
        hash[i] = view[i % view.length] ^ (i + 1);
      }
      return hash.buffer;
    },
    importKey: async (
      _format: string,
      _keyData: ArrayBuffer,
      algorithm: any,
      extractable: boolean,
      keyUsages: string[]
    ) => {
      return {
        type: 'secret',
        extractable,
        algorithm,
        usages: keyUsages,
      } as CryptoKey;
    },
    exportKey: async (_format: string, _key: CryptoKey) => {
      // Return mock key data
      const mockKey = new Uint8Array(32);
      crypto.getRandomValues(mockKey);
      return mockKey.buffer;
    },
    encrypt: async (_algorithm: any, _key: CryptoKey, data: ArrayBuffer) => {
      const input = new Uint8Array(data);
      const output = new Uint8Array(input.length + 16); // Add 16 bytes for auth tag
      output.set(input);
      // Mock auth tag
      for (let i = input.length; i < output.length; i++) {
        output[i] = i % 256;
      }
      return output.buffer;
    },
    decrypt: async (_algorithm: any, _key: CryptoKey, data: ArrayBuffer) => {
      const input = new Uint8Array(data);
      // Remove mock auth tag
      const output = input.slice(0, -16);
      return output.buffer;
    },
    deriveBits: async (_algorithm: any, _baseKey: CryptoKey, length: number) => {
      const bits = new Uint8Array(length / 8);
      crypto.getRandomValues(bits);
      return bits.buffer;
    },
    generateKey: async (algorithm: any, extractable: boolean, keyUsages: string[]) => {
      return {
        type: 'secret',
        extractable,
        algorithm,
        usages: keyUsages,
      } as CryptoKey;
    },
  },
};

// Setup global crypto mock
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock performance.now for consistent timing
Object.defineProperty(global, 'performance', {
  value: {
    now: () => Date.now(),
  },
  writable: true,
});

// Mock window.crypto for browser environment tests
Object.defineProperty(global, 'window', {
  value: {
    crypto: mockCrypto,
  },
  writable: true,
});

// Test utilities
export const TestUtils = {
  /**
   * Creates a deterministic Uint8Array for testing
   */
  createTestData(length: number, seed: number = 0): Uint8Array {
    const data = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      data[i] = (seed + i) % 256;
    }
    return data;
  },

  /**
   * Creates a test password
   */
  createTestPassword(): string {
    return 'test-password-123!@#';
  },

  /**
   * Creates a test email
   */
  createTestEmail(): string {
    return 'test@example.com';
  },

  /**
   * Creates a test salt
   */
  createTestSalt(): Uint8Array {
    return this.createTestData(32, 42);
  },

  /**
   * Compares two Uint8Arrays for equality
   */
  arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  },

  /**
   * Creates a mock CryptoOperationResult
   */
  createMockResult<T>(data: T, success: boolean = true): any {
    return {
      success,
      data: success ? data : undefined,
      error: success ? undefined : 'Mock error',
      errorCode: success ? undefined : 'MOCK_ERROR',
      metrics: {
        duration: 100,
        memoryUsed: 1024,
        cpuUsage: 0,
      },
    };
  },
};

// Global test timeout
jest.setTimeout(30000);
