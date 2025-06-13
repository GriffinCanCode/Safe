/**
 * @fileoverview Algorithm Tests
 * @responsibility Tests all cryptographic algorithm implementations
 */

import { TestUtils } from './setup';
import { AESGCMCipher } from '../algorithms/aes-gcm';
import { XChaCha20Poly1305Cipher } from '../algorithms/xchacha20-poly1305';
import { AlgorithmSelector } from '../algorithms/algorithm-selector';
import { Argon2idDerivation } from '../algorithms/argon2';

describe('AES-GCM Cipher', () => {
  const testKey = TestUtils.createTestData(32, 1);
  const testData = TestUtils.createTestData(100, 2);

  describe('Key Generation and Validation', () => {
    test('should generate valid 32-byte keys', () => {
      const key = AESGCMCipher.generateKey();
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    test('should validate correct key lengths', () => {
      expect(AESGCMCipher.validateKey(testKey)).toBe(true);
      expect(AESGCMCipher.validateKey(new Uint8Array(16))).toBe(false);
      expect(AESGCMCipher.validateKey(new Uint8Array(64))).toBe(false);
    });
  });

  describe('Encryption', () => {
    test('should encrypt data successfully', async () => {
      const result = await AESGCMCipher.encrypt(testData, testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.algorithm).toBe('AES-256-GCM');
      expect(result.data!.ciphertext).toBeInstanceOf(Uint8Array);
      expect(result.data!.nonce).toBeInstanceOf(Uint8Array);
      expect(result.data!.nonce.length).toBe(12);
      expect(result.data!.authTag).toBeInstanceOf(Uint8Array);
      expect(result.data!.authTag!.length).toBe(16);
      expect(result.metrics).toBeDefined();
    });

    test('should fail with invalid key length', async () => {
      const invalidKey = new Uint8Array(16);
      const result = await AESGCMCipher.encrypt(testData, invalidKey);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_KEY_LENGTH');
    });

    test('should fail with empty data', async () => {
      const emptyData = new Uint8Array(0);
      const result = await AESGCMCipher.encrypt(emptyData, testKey);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_DATA_SIZE');
    });

    test('should include additional data in encryption', async () => {
      const additionalData = new TextEncoder().encode('test-context');
      const result = await AESGCMCipher.encrypt(testData, testKey, {
        purpose: 'vault-item',
        additionalData,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Decryption', () => {
    test('should decrypt data successfully', async () => {
      const encryptResult = await AESGCMCipher.encrypt(testData, testKey);
      expect(encryptResult.success).toBe(true);

      const decryptResult = await AESGCMCipher.decrypt(encryptResult.data!, testKey);

      expect(decryptResult.success).toBe(true);
      expect(TestUtils.arraysEqual(decryptResult.data!, testData)).toBe(true);
    });

    test('should fail with wrong algorithm', async () => {
      const fakeEncrypted = {
        ciphertext: testData,
        nonce: new Uint8Array(12),
        authTag: new Uint8Array(16),
        algorithm: 'WRONG-ALGORITHM' as any,
        timestamp: Date.now(),
      };

      const result = await AESGCMCipher.decrypt(fakeEncrypted, testKey);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ALGORITHM_NOT_SUPPORTED');
    });

    test('should respect maxAge context', async () => {
      const encryptResult = await AESGCMCipher.encrypt(testData, testKey);
      expect(encryptResult.success).toBe(true);

      // Modify timestamp to be old
      encryptResult.data!.timestamp = Date.now() - 10000;

      const decryptResult = await AESGCMCipher.decrypt(encryptResult.data!, testKey, {
        expectedPurpose: 'vault-item',
        maxAge: 5000,
      });

      expect(decryptResult.success).toBe(false);
      expect(decryptResult.errorCode).toBe('DATA_EXPIRED');
    });
  });

  describe('Round-trip Encryption/Decryption', () => {
    test('should maintain data integrity through encryption/decryption cycle', async () => {
      const testCases = [
        TestUtils.createTestData(1, 1),
        TestUtils.createTestData(100, 2),
        TestUtils.createTestData(1000, 3),
        TestUtils.createTestData(10000, 4),
      ];

      for (const testCase of testCases) {
        const encryptResult = await AESGCMCipher.encrypt(testCase, testKey);
        expect(encryptResult.success).toBe(true);

        const decryptResult = await AESGCMCipher.decrypt(encryptResult.data!, testKey);
        expect(decryptResult.success).toBe(true);
        expect(TestUtils.arraysEqual(decryptResult.data!, testCase)).toBe(true);
      }
    });
  });
});

describe('XChaCha20-Poly1305 Cipher', () => {
  const testKey = TestUtils.createTestData(32, 5);
  const testData = TestUtils.createTestData(100, 6);

  describe('Key Generation and Validation', () => {
    test('should generate valid 32-byte keys', () => {
      const key = XChaCha20Poly1305Cipher.generateKey();
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    test('should validate correct key lengths', () => {
      expect(XChaCha20Poly1305Cipher.validateKey(testKey)).toBe(true);
      expect(XChaCha20Poly1305Cipher.validateKey(new Uint8Array(16))).toBe(false);
    });

    test('should validate nonce lengths', () => {
      const validNonce = new Uint8Array(24);
      const invalidNonce = new Uint8Array(12);

      expect(XChaCha20Poly1305Cipher.validateNonce(validNonce)).toBe(true);
      expect(XChaCha20Poly1305Cipher.validateNonce(invalidNonce)).toBe(false);
    });
  });

  describe('Implementation Detection', () => {
    test('should report implementation availability', () => {
      const libsodiumAvailable = XChaCha20Poly1305Cipher.isLibsodiumAvailable();
      const stableLibAvailable = XChaCha20Poly1305Cipher.isStableLibAvailable();
      const implementation = XChaCha20Poly1305Cipher.getImplementation();

      expect(typeof libsodiumAvailable).toBe('boolean');
      expect(typeof stableLibAvailable).toBe('boolean');
      expect(typeof implementation).toBe('string');
    });

    test('should return algorithm parameters', () => {
      const params = XChaCha20Poly1305Cipher.getParameters();
      expect(params.KEY_LENGTH).toBe(32);
      expect(params.NONCE_LENGTH).toBe(24);
      expect(params.TAG_LENGTH).toBe(16);
    });
  });

  describe('Encryption (Mock)', () => {
    test('should handle encryption when no implementation available', async () => {
      const result = await XChaCha20Poly1305Cipher.encrypt(testData, testKey);

      // Since we don't have real implementations in test environment,
      // this should fail gracefully
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ALGORITHM_NOT_SUPPORTED');
    });
  });
});

describe('Algorithm Selector', () => {
  beforeEach(() => {
    AlgorithmSelector.clearCache();
  });

  describe('Hardware Detection', () => {
    test('should detect hardware acceleration capabilities', async () => {
      const hasAcceleration = await AlgorithmSelector.detectHardwareAcceleration();
      expect(typeof hasAcceleration).toBe('boolean');
    });

    test('should cache hardware detection results', async () => {
      const first = await AlgorithmSelector.detectHardwareAcceleration();
      const second = await AlgorithmSelector.detectHardwareAcceleration();
      expect(first).toBe(second);
    });
  });

  describe('Algorithm Selection', () => {
    test('should select optimal algorithm', async () => {
      const selection = await AlgorithmSelector.selectOptimalAlgorithm();

      expect(selection).toBeDefined();
      expect(['AES-256-GCM', 'XChaCha20-Poly1305']).toContain(selection.algorithm);
      expect(['hardware-acceleration', 'software-fallback']).toContain(selection.reason);
      expect(typeof selection.hardwareAccelerated).toBe('boolean');
      expect(typeof selection.performanceScore).toBe('number');
    });

    test('should allow forced algorithm selection', () => {
      const aesSelection = AlgorithmSelector.forceAlgorithm('AES-256-GCM');
      expect(aesSelection.algorithm).toBe('AES-256-GCM');
      expect(aesSelection.reason).toBe('user-preference');

      const chachaSelection = AlgorithmSelector.forceAlgorithm('XChaCha20-Poly1305');
      expect(chachaSelection.algorithm).toBe('XChaCha20-Poly1305');
      expect(chachaSelection.reason).toBe('user-preference');
    });
  });

  describe('Cache Management', () => {
    test('should clear cache properly', async () => {
      await AlgorithmSelector.selectOptimalAlgorithm();
      AlgorithmSelector.clearCache();

      // Should work without errors after cache clear
      const selection = await AlgorithmSelector.selectOptimalAlgorithm();
      expect(selection).toBeDefined();
    });
  });
});

describe('Argon2id Derivation', () => {
  const testPassword = TestUtils.createTestPassword();
  const testSalt = TestUtils.createTestSalt();

  describe('Salt Generation', () => {
    test('should generate valid salts', () => {
      const salt = Argon2idDerivation.generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(32);
    });

    test('should generate salts of custom length', () => {
      const salt16 = Argon2idDerivation.generateSalt(16);
      const salt64 = Argon2idDerivation.generateSalt(64);

      expect(salt16.length).toBe(16);
      expect(salt64.length).toBe(64);
    });

    test('should reject invalid salt lengths', () => {
      expect(() => Argon2idDerivation.generateSalt(8)).toThrow();
      expect(() => Argon2idDerivation.generateSalt(128)).toThrow();
    });
  });

  describe('Key Derivation', () => {
    test('should derive keys with default parameters', async () => {
      const result = await Argon2idDerivation.deriveKey(testPassword, testSalt);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.key).toBeInstanceOf(Uint8Array);
      expect(result.data!.key.length).toBe(32);
      expect(result.data!.salt).toBe(testSalt);
      expect(result.data!.derivationTime).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
    });

    test('should derive keys with custom parameters', async () => {
      const customParams = {
        time: 2,
        memory: 16384,
        parallelism: 1,
        outputLength: 64,
      };

      const result = await Argon2idDerivation.deriveKey(testPassword, testSalt, customParams);

      expect(result.success).toBe(true);
      expect(result.data!.key.length).toBe(64);
      expect(result.data!.params.time).toBe(2);
      expect(result.data!.params.memory).toBe(16384);
    });

    test('should validate input parameters', async () => {
      // Empty password
      const emptyPasswordResult = await Argon2idDerivation.deriveKey('', testSalt);
      expect(emptyPasswordResult.success).toBe(false);

      // Short salt
      const shortSalt = new Uint8Array(8);
      const shortSaltResult = await Argon2idDerivation.deriveKey(testPassword, shortSalt);
      expect(shortSaltResult.success).toBe(false);
    });

    test('should produce consistent results for same inputs', async () => {
      const result1 = await Argon2idDerivation.deriveKey(testPassword, testSalt);
      const result2 = await Argon2idDerivation.deriveKey(testPassword, testSalt);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(TestUtils.arraysEqual(result1.data!.key, result2.data!.key)).toBe(true);
    });
  });

  describe('Parameter Recommendations', () => {
    test('should provide security level recommendations', () => {
      const interactive = Argon2idDerivation.getRecommendedParams('interactive');
      const sensitive = Argon2idDerivation.getRecommendedParams('sensitive');
      const paranoid = Argon2idDerivation.getRecommendedParams('paranoid');

      expect(interactive.time).toBeLessThan(sensitive.time!);
      expect(sensitive.time).toBeLessThan(paranoid.time!);
      expect(interactive.memory).toBeLessThan(paranoid.memory!);
    });

    test('should estimate derivation time', () => {
      const estimate = Argon2idDerivation.estimateDerivationTime({
        time: 3,
        memory: 19456,
      });

      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThan(0);
    });
  });

  describe('Key Validation', () => {
    test('should validate derived keys', () => {
      const validKey = new Uint8Array(32);
      validKey.fill(1);
      validKey[0] = 2; // Make it non-uniform

      const invalidKey = new Uint8Array(8);
      const uniformKey = new Uint8Array(32);
      uniformKey.fill(42);

      expect(Argon2idDerivation.validateDerivedKey(validKey)).toBe(true);
      expect(Argon2idDerivation.validateDerivedKey(invalidKey)).toBe(false);
      expect(Argon2idDerivation.validateDerivedKey(uniformKey)).toBe(false);
    });
  });
});
