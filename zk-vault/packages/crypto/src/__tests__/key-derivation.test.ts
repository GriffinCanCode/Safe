/**
 * @fileoverview Key Derivation Tests
 * @responsibility Tests all key derivation implementations
 */

import { TestUtils } from './setup';
import { MasterKeyDerivation } from '../key-derivation/master-key';
import { HKDF } from '../key-derivation/hkdf';

describe('Master Key Derivation', () => {
  const testPassword = TestUtils.createTestPassword();
  const testEmail = TestUtils.createTestEmail();
  const testSalt = TestUtils.createTestSalt();

  describe('Salt Generation', () => {
    test('should generate valid salts', () => {
      const salt = MasterKeyDerivation.generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(32);
    });

    test('should generate different salts each time', () => {
      const salt1 = MasterKeyDerivation.generateSalt();
      const salt2 = MasterKeyDerivation.generateSalt();
      expect(TestUtils.arraysEqual(salt1, salt2)).toBe(false);
    });

    test('should generate salts of custom length', () => {
      const salt16 = MasterKeyDerivation.generateSalt(16);
      const salt64 = MasterKeyDerivation.generateSalt(64);
      
      expect(salt16.length).toBe(16);
      expect(salt64.length).toBe(64);
    });
  });

  describe('Key Derivation', () => {
    test('should derive keys with default parameters', async () => {
      const result = await MasterKeyDerivation.deriveKey(testPassword, testSalt);
      
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
        outputLength: 64
      };
      
      const result = await MasterKeyDerivation.deriveKey(testPassword, testSalt, customParams);
      
      expect(result.success).toBe(true);
      expect(result.data!.key.length).toBe(64);
      expect(result.data!.params.time).toBe(2);
      expect(result.data!.params.memory).toBe(16384);
    });

    test('should validate input parameters', async () => {
      // Empty password
      const emptyPasswordResult = await MasterKeyDerivation.deriveKey('', testSalt);
      expect(emptyPasswordResult.success).toBe(false);
      expect(emptyPasswordResult.errorCode).toBe('INVALID_PASSWORD');
      
      // Short salt
      const shortSalt = new Uint8Array(8);
      const shortSaltResult = await MasterKeyDerivation.deriveKey(testPassword, shortSalt);
      expect(shortSaltResult.success).toBe(false);
      expect(shortSaltResult.errorCode).toBe('INVALID_SALT');
    });

    test('should produce consistent results for same inputs', async () => {
      const result1 = await MasterKeyDerivation.deriveKey(testPassword, testSalt);
      const result2 = await MasterKeyDerivation.deriveKey(testPassword, testSalt);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(TestUtils.arraysEqual(result1.data!.key, result2.data!.key)).toBe(true);
    });

    test('should reject invalid parameters', async () => {
      const invalidTimeResult = await MasterKeyDerivation.deriveKey(testPassword, testSalt, {
        time: 15 // Too high
      });
      expect(invalidTimeResult.success).toBe(false);
      expect(invalidTimeResult.errorCode).toBe('INVALID_PARAMS');

      const invalidMemoryResult = await MasterKeyDerivation.deriveKey(testPassword, testSalt, {
        memory: 1000000 // Too high
      });
      expect(invalidMemoryResult.success).toBe(false);
      expect(invalidMemoryResult.errorCode).toBe('INVALID_PARAMS');
    });
  });

  describe('Account Key Derivation', () => {
    test('should derive account keys from master key', async () => {
      const masterKeyResult = await MasterKeyDerivation.deriveKey(testPassword, testSalt);
      expect(masterKeyResult.success).toBe(true);

      const accountKeyResult = await MasterKeyDerivation.deriveAccountKey(
        masterKeyResult.data!.key,
        testSalt
      );

      expect(accountKeyResult.success).toBe(true);
      expect(accountKeyResult.data).toBeInstanceOf(Uint8Array);
      expect(accountKeyResult.data!.length).toBe(32);
    });

    test('should derive different account keys with different info', async () => {
      const masterKeyResult = await MasterKeyDerivation.deriveKey(testPassword, testSalt);
      expect(masterKeyResult.success).toBe(true);

      const accountKey1 = await MasterKeyDerivation.deriveAccountKey(
        masterKeyResult.data!.key,
        testSalt,
        'account-key-1'
      );

      const accountKey2 = await MasterKeyDerivation.deriveAccountKey(
        masterKeyResult.data!.key,
        testSalt,
        'account-key-2'
      );

      expect(accountKey1.success).toBe(true);
      expect(accountKey2.success).toBe(true);
      expect(TestUtils.arraysEqual(accountKey1.data!, accountKey2.data!)).toBe(false);
    });
  });

  describe('Master Key Structure Creation', () => {
    test('should create complete master key structure', async () => {
      const result = await MasterKeyDerivation.createMasterKeyStructure(testPassword, testEmail);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.masterKey).toBeDefined();
      expect(result.data!.accountKey).toBeDefined();
      expect(result.data!.salt).toBeInstanceOf(Uint8Array);
      expect(result.data!.authProof).toBeDefined();
      expect(result.data!.derivationParams).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    test('should validate key derivation parameters', () => {
      const validParams = {
        password: testPassword,
        salt: testSalt,
        time: 3,
        memory: 19456,
        parallelism: 1,
        outputLength: 32
      };

      const invalidParams = {
        password: testPassword,
        salt: testSalt,
        time: 15, // Too high
        memory: 19456,
        parallelism: 1,
        outputLength: 32
      };

      expect(MasterKeyDerivation.validateParams(validParams)).toBe(true);
      expect(MasterKeyDerivation.validateParams(invalidParams)).toBe(false);
    });
  });
});

describe('HKDF Derivation', () => {
  const testKey = TestUtils.createTestData(32, 1);
  const testSalt = TestUtils.createTestSalt();
  const testInfo = new TextEncoder().encode('test-context');

  describe('Key Expansion', () => {
    test('should expand keys using HKDF', async () => {
      const result = await HKDF.derive(testKey, testSalt, testInfo);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data!.length).toBe(32);
    });

    test('should produce different outputs for different info', async () => {
      const info1 = new TextEncoder().encode('info-1');
      const info2 = new TextEncoder().encode('info-2');
      
      const result1 = await HKDF.derive(testKey, testSalt, info1);
      const result2 = await HKDF.derive(testKey, testSalt, info2);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(TestUtils.arraysEqual(result1.data!, result2.data!)).toBe(false);
    });

    test('should support custom output lengths', async () => {
      const result64 = await HKDF.derive(testKey, testSalt, testInfo, 64);
      const result16 = await HKDF.derive(testKey, testSalt, testInfo, 16);
      
      expect(result64.success).toBe(true);
      expect(result16.success).toBe(true);
      expect(result64.data!.length).toBe(64);
      expect(result16.data!.length).toBe(16);
    });

    test('should validate input parameters', async () => {
      // Empty input key material
      const emptyKeyResult = await HKDF.derive(new Uint8Array(0), testSalt, testInfo);
      expect(emptyKeyResult.success).toBe(false);
      expect(emptyKeyResult.errorCode).toBe('INVALID_INPUT_KEY_MATERIAL');

      // Invalid output length
      const invalidLengthResult = await HKDF.derive(testKey, testSalt, testInfo, 0);
      expect(invalidLengthResult.success).toBe(false);
      expect(invalidLengthResult.errorCode).toBe('INVALID_OUTPUT_LENGTH');
    });
  });

  describe('Multiple Key Derivation', () => {
    test('should derive multiple keys from single input', async () => {
      const keySpecs = [
        { name: 'encryption', info: 'encryption-key', length: 32 },
        { name: 'authentication', info: 'auth-key', length: 32 },
        { name: 'signing', info: 'signing-key', length: 64 }
      ];

      const result = await HKDF.deriveMultiple(testKey, testSalt, keySpecs);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.encryption).toBeInstanceOf(Uint8Array);
      expect(result.data!.authentication).toBeInstanceOf(Uint8Array);
      expect(result.data!.signing).toBeInstanceOf(Uint8Array);
      expect(result.data!.encryption.length).toBe(32);
      expect(result.data!.signing.length).toBe(64);
    });
  });

  describe('Parameter Validation', () => {
    test('should validate HKDF parameters', () => {
      expect(HKDF.validateParameters(testKey, 32)).toBe(true);
      expect(HKDF.validateParameters(new Uint8Array(0), 32)).toBe(false);
      expect(HKDF.validateParameters(testKey, 0)).toBe(false);
    });
  });

  describe('Implementation Detection', () => {
    test('should report available implementation', () => {
      const implementation = HKDF.getImplementation();
      expect(typeof implementation).toBe('string');
      expect(implementation.length).toBeGreaterThan(0);
    });
  });
});
