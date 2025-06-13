/**
 * @fileoverview Vault Tests
 * @responsibility Tests all vault implementations
 */

import { TestUtils } from './setup';
import { ZeroKnowledgeVault } from '../vault/zero-knowledge-vault';
import { PasswordEncryption } from '../vault/password-encryption';
import { FileEncryption } from '../vault/file-encryption';
import { ChunkedEncryption } from '../vault/chunked-encryption';

describe('Zero-Knowledge Vault', () => {
  const testEmail = TestUtils.createTestEmail();
  const testPassword = TestUtils.createTestPassword();
  let vault: ZeroKnowledgeVault;

  beforeEach(() => {
    vault = new ZeroKnowledgeVault();
  });

  describe('Vault Initialization', () => {
    test('should initialize vault with password', async () => {
      const result = await vault.initialize(testPassword, testEmail);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.masterKey).toBeDefined();
      expect(result.data!.accountKey).toBeDefined();
      expect(result.data!.salt).toBeInstanceOf(Uint8Array);
    });

    test('should fail initialization with empty password', async () => {
      const result = await vault.initialize('', testEmail);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VAULT_INIT_FAILED');
    });

    test('should fail initialization with empty email', async () => {
      const result = await vault.initialize(testPassword, '');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VAULT_INIT_FAILED');
    });
  });

  describe('Vault Status', () => {
    test('should report uninitialized status', () => {
      const status = vault.getStatus();

      expect(status.initialized).toBe(false);
      expect(status.algorithm).toBeUndefined();
    });

    test('should report initialized status', async () => {
      await vault.initialize(testPassword, testEmail);
      const status = vault.getStatus();

      expect(status.initialized).toBe(true);
      expect(status.algorithm).toBeDefined();
      expect(typeof status.hardwareAccelerated).toBe('boolean');
    });

    test('should check initialization state', async () => {
      expect(vault.isInitialized()).toBe(false);

      await vault.initialize(testPassword, testEmail);
      expect(vault.isInitialized()).toBe(true);
    });
  });

  describe('Data Encryption/Decryption', () => {
    beforeEach(async () => {
      await vault.initialize(testPassword, testEmail);
    });

    test('should encrypt and decrypt string data', async () => {
      const testData = 'Hello, World!';

      const encryptResult = await vault.encrypt(testData);
      expect(encryptResult.success).toBe(true);
      expect(encryptResult.data).toBeDefined();

      const decryptResult = await vault.decrypt(encryptResult.data!);
      expect(decryptResult.success).toBe(true);
      expect(decryptResult.data).toBe(testData);
    });

    test('should encrypt and decrypt binary data', async () => {
      const testData = TestUtils.createTestData(100, 1);

      const encryptResult = await vault.encrypt(testData);
      expect(encryptResult.success).toBe(true);

      const decryptResult = await vault.decrypt(encryptResult.data!);
      expect(decryptResult.success).toBe(true);

      // Convert back to string for comparison
      const decryptedString = new TextDecoder().decode(
        decryptResult.data! as unknown as Uint8Array
      );
      const originalString = new TextDecoder().decode(testData);
      expect(decryptedString).toBe(originalString);
    });

    test('should fail encryption without initialization', async () => {
      const uninitializedVault = new ZeroKnowledgeVault();
      const result = await uninitializedVault.encrypt('test data');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VAULT_NOT_INITIALIZED');
    });

    test('should fail decryption without initialization', async () => {
      const uninitializedVault = new ZeroKnowledgeVault();
      const mockEncrypted = {
        ciphertext: new Uint8Array(16),
        nonce: new Uint8Array(12),
        authTag: new Uint8Array(16),
        algorithm: 'AES-256-GCM' as const,
        timestamp: Date.now(),
      };

      const result = await uninitializedVault.decrypt(mockEncrypted);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VAULT_NOT_INITIALIZED');
    });
  });

  describe('Item Key Derivation', () => {
    beforeEach(async () => {
      await vault.initialize(testPassword, testEmail);
    });

    test('should derive item-specific keys', async () => {
      const itemId = 'test-item-123';
      const result = await vault.deriveItemKey(itemId);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data!.length).toBe(32);
    });

    test('should derive different keys for different items', async () => {
      const result1 = await vault.deriveItemKey('item-1');
      const result2 = await vault.deriveItemKey('item-2');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(TestUtils.arraysEqual(result1.data!, result2.data!)).toBe(false);
    });

    test('should be deterministic for same item ID', async () => {
      const itemId = 'test-item-456';
      const result1 = await vault.deriveItemKey(itemId);
      const result2 = await vault.deriveItemKey(itemId);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(TestUtils.arraysEqual(result1.data!, result2.data!)).toBe(true);
    });
  });

  describe('Algorithm Selection', () => {
    test('should report algorithm selection', async () => {
      await vault.initialize(testPassword, testEmail);
      const selection = vault.getAlgorithmSelection();

      expect(selection).toBeDefined();
      expect(['AES-256-GCM', 'XChaCha20-Poly1305']).toContain(selection!.algorithm);
      expect(typeof selection!.hardwareAccelerated).toBe('boolean');
    });
  });

  describe('Vault Locking', () => {
    test('should lock vault and clear sensitive data', async () => {
      await vault.initialize(testPassword, testEmail);
      expect(vault.isInitialized()).toBe(true);

      vault.lock();
      expect(vault.isInitialized()).toBe(false);

      const status = vault.getStatus();
      expect(status.initialized).toBe(false);
    });

    test('should fail operations after locking', async () => {
      await vault.initialize(testPassword, testEmail);
      vault.lock();

      const encryptResult = await vault.encrypt('test data');
      expect(encryptResult.success).toBe(false);
      expect(encryptResult.errorCode).toBe('VAULT_NOT_INITIALIZED');
    });
  });

  describe('Vault Restoration', () => {
    test('should restore vault from master key structure', async () => {
      const initResult = await vault.initialize(testPassword, testEmail);
      expect(initResult.success).toBe(true);

      const masterKeyStructure = initResult.data!;
      vault.lock();

      const restoreResult = await vault.restoreFromMasterKey(masterKeyStructure);
      expect(restoreResult.success).toBe(true);
      expect(vault.isInitialized()).toBe(true);
    });
  });
});

describe('Password Encryption', () => {
  const testPassword = 'MySecurePassword123!';
  const testKey = TestUtils.createTestData(32, 1);

  describe('Password Encryption/Decryption', () => {
    test('should encrypt and decrypt passwords', async () => {
      const item = {
        id: 'test-1',
        name: 'Test Password',
        username: 'testuser',
        password: testPassword,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const result = await PasswordEncryption.encryptPasswordItem(item, testKey);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.encryptedFields.username).toBeDefined();
      expect(result.data!.encryptedFields.password).toBeDefined();

      const decryptResult = await PasswordEncryption.decryptPasswordItem(result.data!, testKey);
      expect(decryptResult.success).toBe(true);
      expect(decryptResult.data!.password).toBe(testPassword);
    });

    test('should fail with invalid key length', async () => {
      const invalidKey = TestUtils.createTestData(16, 1); // Wrong length
      const item = {
        id: 'test-2',
        name: 'Test Password',
        username: 'testuser',
        password: testPassword,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const result = await PasswordEncryption.encryptPasswordItem(item, invalidKey);
      expect(result.success).toBe(false);
    });

    test('should fail decryption with wrong key', async () => {
      const item = {
        id: 'test-3',
        name: 'Test Password',
        username: 'testuser',
        password: testPassword,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };

      const encryptResult = await PasswordEncryption.encryptPasswordItem(item, testKey);
      expect(encryptResult.success).toBe(true);

      const wrongKey = TestUtils.createTestData(32, 999);
      const decryptResult = await PasswordEncryption.decryptPasswordItem(
        encryptResult.data!,
        wrongKey
      );

      expect(decryptResult.success).toBe(false);
    });
  });

  describe('Password Strength Analysis', () => {
    test('should analyze password strength', () => {
      const weakPassword = '123456';
      const strongPassword = 'MyVerySecurePassword123!@#';

      const weakAnalysis = PasswordEncryption.validatePasswordItem({
        id: 'test-4',
        name: 'Weak Password',
        username: 'testuser',
        password: weakPassword,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });

      const strongAnalysis = PasswordEncryption.validatePasswordItem({
        id: 'test-5',
        name: 'Strong Password',
        username: 'testuser',
        password: strongPassword,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });

      expect(weakAnalysis).toBe(true);
      expect(strongAnalysis).toBe(true);
    });
  });
});

describe('File Encryption', () => {
  const testKey = TestUtils.createTestData(32, 1);
  const testFileData = TestUtils.createTestData(1024, 2); // 1KB test file

  describe('File Encryption/Decryption', () => {
    test('should encrypt and decrypt files', async () => {
      const itemId = 'test-file-1';
      const filename = 'test.txt';
      const mimeType = 'text/plain';

      const encryptResult = await FileEncryption.encryptFile(
        testFileData,
        filename,
        mimeType,
        testKey,
        itemId
      );

      expect(encryptResult.success).toBe(true);
      expect(encryptResult.data).toBeDefined();
      expect(encryptResult.data!.chunks).toBeDefined();
      expect(encryptResult.data!.metadata).toBeDefined();

      const decryptResult = await FileEncryption.decryptFile(encryptResult.data!, testKey, itemId);

      expect(decryptResult.success).toBe(true);
      expect(decryptResult.data!.data).toBeInstanceOf(Uint8Array);
      expect(TestUtils.arraysEqual(decryptResult.data!.data, testFileData)).toBe(true);
    });

    test('should handle large files with progress callback', async () => {
      const largeFileData = TestUtils.createTestData(10240, 3); // 10KB
      let progressCalled = false;

      const progressCallback = (progress: { percentage: number }) => {
        progressCalled = true;
        expect(progress.percentage).toBeGreaterThanOrEqual(0);
        expect(progress.percentage).toBeLessThanOrEqual(100);
      };

      const encryptResult = await FileEncryption.encryptFile(
        largeFileData,
        'large.bin',
        'application/octet-stream',
        testKey,
        'test-file-2',
        { progressCallback }
      );

      expect(encryptResult.success).toBe(true);
      expect(progressCalled).toBe(true);
    });

    test('should validate file metadata', async () => {
      const result = await FileEncryption.encryptFile(
        testFileData,
        '', // Invalid filename
        'text/plain',
        testKey,
        'test-file-3'
      );
      expect(result.success).toBe(false);
    });
  });
});

describe('Chunked Encryption', () => {
  const testKey = TestUtils.createTestData(32, 1);
  const largeData = TestUtils.createTestData(5120, 4); // 5KB data

  describe('Chunked Encryption/Decryption', () => {
    test('should encrypt and decrypt data in chunks', async () => {
      const chunkSize = 1024; // 1KB chunks

      const encryptResult = await ChunkedEncryption.encryptInChunks(largeData, testKey, chunkSize);

      expect(encryptResult.success).toBe(true);
      expect(encryptResult.data).toBeDefined();
      expect(encryptResult.data!.encryptedChunks.length).toBeGreaterThan(1);
      expect(encryptResult.data!.session).toBeDefined();

      const decryptResult = await ChunkedEncryption.decryptFromChunks(
        encryptResult.data!.encryptedChunks,
        encryptResult.data!.session,
        testKey
      );

      expect(decryptResult.success).toBe(true);
      expect(TestUtils.arraysEqual(decryptResult.data!, largeData)).toBe(true);
    });

    test('should handle single chunk for small data', async () => {
      const smallData = TestUtils.createTestData(512, 5);
      const chunkSize = 1024;

      const result = await ChunkedEncryption.encryptInChunks(smallData, testKey, chunkSize);

      expect(result.success).toBe(true);
      expect(result.data!.encryptedChunks.length).toBe(1);
    });

    test('should validate chunk integrity', async () => {
      const encryptResult = await ChunkedEncryption.encryptInChunks(largeData, testKey, 1024);
      expect(encryptResult.success).toBe(true);

      // Corrupt a chunk
      encryptResult.data!.encryptedChunks[0].ciphertext[0] ^= 0xff;

      const decryptResult = await ChunkedEncryption.decryptFromChunks(
        encryptResult.data!.encryptedChunks,
        encryptResult.data!.session,
        testKey
      );
      expect(decryptResult.success).toBe(false);
    });
  });

  describe('Streaming Operations', () => {
    test('should support streaming encryption', async () => {
      const streamResult = await ChunkedEncryption.createEncryptionStream(testKey, 1024);

      expect(streamResult.success).toBe(true);
      expect(streamResult.data).toBeDefined();
    });

    test('should support streaming decryption', async () => {
      const encryptResult = await ChunkedEncryption.encryptInChunks(largeData, testKey, 1024);
      expect(encryptResult.success).toBe(true);

      const streamResult = await ChunkedEncryption.createDecryptionStream(
        testKey,
        encryptResult.data!.session
      );

      expect(streamResult.success).toBe(true);
      expect(streamResult.data).toBeDefined();
    });
  });
});
