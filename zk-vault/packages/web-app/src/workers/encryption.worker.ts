/**
 * @fileoverview Encryption Worker
 * @responsibility Handles all cryptographic operations in a dedicated worker thread
 * @principle Single Responsibility - Only encryption/decryption operations
 * @security Isolated cryptographic operations to prevent main thread blocking
 */

import {
  AESGCMCipher,
  XChaCha20Poly1305Cipher,
  MasterKeyDerivation,
  ItemKeyDerivation,
  SecureMemoryManager,
  HybridEncryption,
  QuantumResistantCrypto,
} from '@zk-vault/crypto';

import type {
  EncryptionResult,
  KeyDerivationParams,
  KeyDerivationResult,
  MasterKeyStructure,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
  PostQuantumConfig,
  AlgorithmSelection,
} from '@zk-vault/shared';

/**
 * Worker message types for encryption operations
 */
interface EncryptionWorkerMessage {
  id: string;
  type:
    | 'encrypt'
    | 'decrypt'
    | 'deriveKey'
    | 'deriveMasterKey'
    | 'deriveAccountKey'
    | 'deriveItemKey'
    | 'generateSalt'
    | 'selectAlgorithm'
    | 'hybridEncrypt'
    | 'hybridDecrypt'
    | 'quantumResistantEncrypt'
    | 'quantumResistantDecrypt'
    | 'clearMemory'
    | 'benchmark';
  data: any;
}

interface EncryptionWorkerResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string | undefined;
  errorCode?: string | undefined;
  metrics?: {
    duration: number;
    memoryUsed: number;
    cpuUsage: number;
  };
}

/**
 * Performance benchmark cache
 */
let algorithmBenchmarks: Map<string, number> = new Map();

/**
 * Main message handler for encryption operations
 */
self.onmessage = async (event: MessageEvent<EncryptionWorkerMessage>) => {
  const { id, type, data } = event.data;
  const startTime = performance.now();

  try {
    let result: CryptoOperationResult<any>;

    switch (type) {
      case 'encrypt':
        result = await handleEncrypt(data);
        break;

      case 'decrypt':
        result = await handleDecrypt(data);
        break;

      case 'deriveKey':
        result = await handleDeriveKey(data);
        break;

      case 'deriveMasterKey':
        result = await handleDeriveMasterKey(data);
        break;

      case 'deriveAccountKey':
        result = await handleDeriveAccountKey(data);
        break;

      case 'deriveItemKey':
        result = await handleDeriveItemKey(data);
        break;

      case 'generateSalt':
        result = await handleGenerateSalt(data);
        break;

      case 'selectAlgorithm':
        result = await handleSelectAlgorithm(data);
        break;

      case 'hybridEncrypt':
        result = await handleHybridEncrypt(data);
        break;

      case 'hybridDecrypt':
        result = await handleHybridDecrypt(data);
        break;

      case 'quantumResistantEncrypt':
        result = await handleQuantumResistantEncrypt(data);
        break;

      case 'quantumResistantDecrypt':
        result = await handleQuantumResistantDecrypt(data);
        break;

      case 'clearMemory':
        result = await handleClearMemory(data);
        break;

      case 'benchmark':
        result = await handleBenchmark(data);
        break;

      default:
        result = {
          success: false,
          error: `Unknown operation type: ${type}`,
          errorCode: 'UNKNOWN_OPERATION',
        };
    }

    const endTime = performance.now();
    const response: EncryptionWorkerResponse = {
      id,
      success: result.success,
      data: result.data,
      error: result.error,
      errorCode: result.errorCode,
      metrics: {
        duration: endTime - startTime,
        memoryUsed: result.metrics?.memoryUsed ?? 0,
        cpuUsage: result.metrics?.cpuUsage ?? 0,
      },
    };

    self.postMessage(response);
  } catch (error) {
    const endTime = performance.now();
    const response: EncryptionWorkerResponse = {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'WORKER_EXCEPTION',
      metrics: {
        duration: endTime - startTime,
        memoryUsed: 0,
        cpuUsage: 0,
      },
    };

    self.postMessage(response);
  }
};

/**
 * Handle encryption operations
 */
async function handleEncrypt(data: {
  plaintext: Uint8Array;
  key: Uint8Array;
  algorithm?: 'AES-256-GCM' | 'XChaCha20-Poly1305';
  context?: EncryptionContext;
}): Promise<CryptoOperationResult<EncryptionResult>> {
  const { plaintext, key, algorithm = 'AES-256-GCM', context } = data;

  if (algorithm === 'XChaCha20-Poly1305') {
    return await XChaCha20Poly1305Cipher.encrypt(plaintext, key, context);
  } else {
    return await AESGCMCipher.encrypt(plaintext, key, context);
  }
}

/**
 * Handle decryption operations
 */
async function handleDecrypt(data: {
  encryptedData: EncryptionResult;
  key: Uint8Array;
  context?: DecryptionContext;
}): Promise<CryptoOperationResult<Uint8Array>> {
  const { encryptedData, key, context } = data;

  if (encryptedData.algorithm === 'XChaCha20-Poly1305') {
    return await XChaCha20Poly1305Cipher.decrypt(encryptedData, key, context);
  } else {
    return await AESGCMCipher.decrypt(encryptedData, key, context);
  }
}

/**
 * Handle key derivation operations
 */
async function handleDeriveKey(data: {
  password: string;
  salt: Uint8Array;
  params?: Partial<KeyDerivationParams>;
}): Promise<CryptoOperationResult<KeyDerivationResult>> {
  const { password, salt, params } = data;
  return await MasterKeyDerivation.deriveKey(password, salt, params);
}

/**
 * Handle master key derivation
 */
async function handleDeriveMasterKey(data: {
  password: string;
  email: string;
}): Promise<CryptoOperationResult<MasterKeyStructure>> {
  const { password, email } = data;
  return await MasterKeyDerivation.createMasterKeyStructure(password, email);
}

/**
 * Handle account key derivation
 */
async function handleDeriveAccountKey(data: {
  masterKey: Uint8Array;
  userId: string;
  keyIndex?: number;
}): Promise<CryptoOperationResult<Uint8Array>> {
  const { masterKey, userId } = data;
  return await MasterKeyDerivation.deriveAccountKey(
    masterKey,
    MasterKeyDerivation.generateSalt(),
    userId
  );
}

/**
 * Handle item key derivation
 */
async function handleDeriveItemKey(data: {
  accountKey: Uint8Array;
  itemId: string;
  itemType: 'password' | 'note' | 'card' | 'identity' | 'file';
}): Promise<CryptoOperationResult<Uint8Array>> {
  const { accountKey, itemId, itemType } = data;
  return await ItemKeyDerivation.deriveItemKey(accountKey, itemId, itemType);
}

/**
 * Handle salt generation
 */
async function handleGenerateSalt(data: {
  length?: number;
}): Promise<CryptoOperationResult<Uint8Array>> {
  const { length = 32 } = data;

  try {
    const salt = crypto.getRandomValues(new Uint8Array(length));
    return {
      success: true,
      data: salt,
    };
  } catch (error) {
    return {
      success: false,
      error: `Salt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'SALT_GENERATION_FAILED',
    };
  }
}

/**
 * Handle algorithm selection based on performance
 */
async function handleSelectAlgorithm(data: {
  dataSize: number;
  hardwareFeatures?: string[];
}): Promise<CryptoOperationResult<AlgorithmSelection>> {
  const { hardwareFeatures = [] } = data;

  try {
    // Check for hardware acceleration
    const hasAESHardware =
      hardwareFeatures.includes('aes-ni') ||
      (typeof window !== 'undefined' && 'crypto' in window && 'subtle' in window.crypto);

    // Get benchmark scores
    const aesScore = algorithmBenchmarks.get('AES-256-GCM') || 0;
    const chachaScore = algorithmBenchmarks.get('XChaCha20-Poly1305') || 0;

    let algorithm: 'AES-256-GCM' | 'XChaCha20-Poly1305';
    let reason: 'hardware-acceleration' | 'software-fallback' | 'user-preference';

    if (hasAESHardware && (aesScore === 0 || aesScore >= chachaScore)) {
      algorithm = 'AES-256-GCM';
      reason = 'hardware-acceleration';
    } else {
      algorithm = 'XChaCha20-Poly1305';
      reason = 'software-fallback';
    }

    return {
      success: true,
      data: {
        algorithm,
        reason,
        hardwareAccelerated: hasAESHardware,
        performanceScore: algorithm === 'AES-256-GCM' ? aesScore : chachaScore,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Algorithm selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'ALGORITHM_SELECTION_FAILED',
    };
  }
}

/**
 * Handle hybrid encryption
 */
async function handleHybridEncrypt(data: {
  plaintext: Uint8Array;
  recipientPublicKey: Uint8Array;
  context?: EncryptionContext;
  config?: PostQuantumConfig;
}): Promise<CryptoOperationResult<any>> {
  const { plaintext, recipientPublicKey, context, config } = data;
  return await HybridEncryption.encryptHybrid(plaintext, recipientPublicKey, context, config);
}

/**
 * Handle hybrid decryption
 */
async function handleHybridDecrypt(data: {
  hybridData: any;
  privateKey: Uint8Array;
  context?: DecryptionContext;
}): Promise<CryptoOperationResult<Uint8Array>> {
  const { hybridData, privateKey, context } = data;
  return await HybridEncryption.decryptHybrid(hybridData, privateKey, context);
}

/**
 * Handle quantum-resistant encryption
 */
async function handleQuantumResistantEncrypt(data: {
  plaintext: Uint8Array;
  publicKey: Uint8Array;
  context?: EncryptionContext;
  config?: any;
}): Promise<CryptoOperationResult<any>> {
  const { plaintext, publicKey, context, config } = data;
  return await QuantumResistantCrypto.encrypt(plaintext, publicKey, context, config);
}

/**
 * Handle quantum-resistant decryption
 */
async function handleQuantumResistantDecrypt(data: {
  encryptedData: any;
  privateKey: Uint8Array;
  context?: DecryptionContext;
}): Promise<CryptoOperationResult<Uint8Array>> {
  const { encryptedData, privateKey, context } = data;
  return await QuantumResistantCrypto.decrypt(encryptedData, privateKey, context);
}

/**
 * Handle memory clearing operations
 */
async function handleClearMemory(data: { keys?: object[] }): Promise<CryptoOperationResult<void>> {
  try {
    const { keys } = data;

    if (keys) {
      for (const key of keys) {
        SecureMemoryManager.clearSensitive(key);
      }
    } else {
      SecureMemoryManager.clearAll();
    }

    // Force garbage collection if available
    if ('gc' in global) {
      (global as any).gc();
    }

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Memory clearing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'MEMORY_CLEAR_FAILED',
    };
  }
}

/**
 * Handle performance benchmarking
 */
async function handleBenchmark(data: {
  algorithms: string[];
  dataSize: number;
  iterations: number;
}): Promise<CryptoOperationResult<Record<string, number>>> {
  const {
    algorithms = ['AES-256-GCM', 'XChaCha20-Poly1305'],
    dataSize = 1024,
    iterations = 10,
  } = data;

  try {
    const results: Record<string, number> = {};
    const testData = crypto.getRandomValues(new Uint8Array(dataSize));
    const testKey = crypto.getRandomValues(new Uint8Array(32));

    for (const algorithm of algorithms) {
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        if (algorithm === 'AES-256-GCM') {
          await AESGCMCipher.encrypt(testData, testKey);
        } else if (algorithm === 'XChaCha20-Poly1305') {
          await XChaCha20Poly1305Cipher.encrypt(testData, testKey);
        }

        const end = performance.now();
        times.push(end - start);
      }

      // Calculate average time and convert to operations per second
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const opsPerSecond = 1000 / avgTime;

      results[algorithm] = opsPerSecond;
      algorithmBenchmarks.set(algorithm, opsPerSecond);
    }

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      error: `Benchmarking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode: 'BENCHMARK_FAILED',
    };
  }
}

/**
 * Worker initialization
 */
console.log('Encryption Worker initialized');

// Perform initial algorithm benchmarking
handleBenchmark({
  algorithms: ['AES-256-GCM', 'XChaCha20-Poly1305'],
  dataSize: 1024,
  iterations: 5,
}).then(result => {
  if (result.success) {
    console.log('Initial algorithm benchmark completed:', result.data);
  }
});
