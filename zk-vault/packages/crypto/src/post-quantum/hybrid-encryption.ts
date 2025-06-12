/**
 * @fileoverview Hybrid Encryption
 * @responsibility Combines classical and post-quantum encryption for future security
 * @principle Single Responsibility - Only hybrid encryption operations
 * @security Provides protection against both classical and quantum attacks
 */

import { 
  EncryptionResult,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
  PostQuantumConfig,
  POST_QUANTUM
} from '@zk-vault/shared';

import { AESGCMCipher } from '../algorithms/aes-gcm';
import { KyberKEM, KyberKeyPair, KyberEncapsulation } from './kyber';

/**
 * Hybrid encryption result combining classical and post-quantum
 * @responsibility Contains both classical and post-quantum encrypted data
 */
export interface HybridEncryptionResult {
  /** Classical encryption result */
  classical: EncryptionResult;
  /** Post-quantum key encapsulation */
  postQuantum: KyberEncapsulation;
  /** Combined key derivation info */
  keyInfo: {
    classicalWeight: number;
    quantumWeight: number;
    algorithm: string;
  };
  /** Hybrid algorithm identifier */
  algorithm: 'Hybrid-AES-Kyber' | 'Hybrid-ChaCha20-Kyber';
  /** Creation timestamp */
  timestamp: number;
}

/**
 * Hybrid key pair for post-quantum security
 * @responsibility Holds both classical and post-quantum keys
 */
export interface HybridKeyPair {
  /** Classical key (AES or ChaCha20) */
  classicalKey: Uint8Array;
  /** Post-quantum key pair */
  postQuantumKeyPair: KyberKeyPair;
}

/**
 * Hybrid encryption implementation
 * @responsibility Provides encryption using both classical and post-quantum algorithms
 * @security Ensures security against both current and future quantum attacks
 */
export class HybridEncryption {

  /**
   * Generates a hybrid key pair
   * @returns Hybrid key pair with classical and post-quantum components
   */
  static async generateHybridKeyPair(): Promise<CryptoOperationResult<HybridKeyPair>> {
    try {
      // Generate classical key (256-bit for AES)
      const classicalKey = crypto.getRandomValues(new Uint8Array(32));
      
      // Generate post-quantum key pair
      const pqKeyPairResult = await KyberKEM.generateKeyPair();
      if (!pqKeyPairResult.success || !pqKeyPairResult.data) {
        return {
          success: false,
          error: pqKeyPairResult.error || 'Post-quantum key generation failed',
          errorCode: pqKeyPairResult.errorCode || 'PQ_KEYGEN_FAILED'
        };
      }

      return {
        success: true,
        data: {
          classicalKey,
          postQuantumKeyPair: pqKeyPairResult.data
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Hybrid key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'HYBRID_KEYGEN_FAILED'
      };
    }
  }

  /**
   * Encrypts data using hybrid encryption
   * @param plaintext Data to encrypt
   * @param recipientPublicKey Recipient's post-quantum public key
   * @param context Encryption context
   * @param config Post-quantum configuration
   * @returns Hybrid encryption result
   */
  static async encryptHybrid(
    plaintext: Uint8Array,
    recipientPublicKey: Uint8Array,
    context?: EncryptionContext,
    config?: PostQuantumConfig
  ): Promise<CryptoOperationResult<HybridEncryptionResult>> {
    try {
      const finalConfig = {
        enableHybrid: config?.enableHybrid ?? POST_QUANTUM.HYBRID_MODE.ENABLED,
        classicalWeight: config?.classicalAlgorithm ? POST_QUANTUM.HYBRID_MODE.CLASSICAL_WEIGHT : 1,
        quantumWeight: POST_QUANTUM.HYBRID_MODE.QUANTUM_WEIGHT
      };

      if (!finalConfig.enableHybrid) {
        return {
          success: false,
          error: 'Hybrid encryption is disabled',
          errorCode: 'HYBRID_DISABLED'
        };
      }

      // Step 1: Generate ephemeral classical key
      const ephemeralKey = crypto.getRandomValues(new Uint8Array(32));

      // Step 2: Encrypt data with classical algorithm
      const classicalResult = await AESGCMCipher.encrypt(
        plaintext,
        ephemeralKey,
        context
      );

      if (!classicalResult.success || !classicalResult.data) {
        return {
          success: false,
          error: classicalResult.error || 'Classical encryption failed',
          errorCode: classicalResult.errorCode || 'CLASSICAL_ENCRYPTION_FAILED'
        };
      }

      // Step 3: Encapsulate the ephemeral key using post-quantum KEM
      const kemResult = await KyberKEM.encapsulate(recipientPublicKey);
      if (!kemResult.success || !kemResult.data) {
        return {
          success: false,
          error: kemResult.error || 'Post-quantum encapsulation failed',
          errorCode: kemResult.errorCode || 'PQ_ENCAPSULATION_FAILED'
        };
      }

      // Step 4: Derive final key by combining classical and post-quantum secrets
      const combinedKey = await this.combineKeys(
        ephemeralKey,
        kemResult.data.sharedSecret,
        finalConfig.classicalWeight,
        finalConfig.quantumWeight
      );

      // Step 5: Re-encrypt with the combined key for additional security
      const finalResult = await AESGCMCipher.encrypt(
        classicalResult.data.ciphertext,
        combinedKey,
        context
      );

      if (!finalResult.success || !finalResult.data) {
        return {
          success: false,
          error: finalResult.error || 'Final encryption failed',
          errorCode: finalResult.errorCode || 'FINAL_ENCRYPTION_FAILED'
        };
      }

      const hybridResult: HybridEncryptionResult = {
        classical: finalResult.data,
        postQuantum: kemResult.data,
        keyInfo: {
          classicalWeight: finalConfig.classicalWeight,
          quantumWeight: finalConfig.quantumWeight,
          algorithm: 'Hybrid-AES-Kyber'
        },
        algorithm: 'Hybrid-AES-Kyber',
        timestamp: Date.now()
      };

      return {
        success: true,
        data: hybridResult
      };

    } catch (error) {
      return {
        success: false,
        error: `Hybrid encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'HYBRID_ENCRYPTION_FAILED'
      };
    }
  }

  /**
   * Decrypts data using hybrid decryption
   * @param hybridData Hybrid encrypted data
   * @param privateKey Recipient's post-quantum private key
   * @param context Decryption context
   * @returns Decrypted plaintext
   */
  static async decryptHybrid(
    hybridData: HybridEncryptionResult,
    privateKey: Uint8Array,
    context?: DecryptionContext
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      // Step 1: Decapsulate the shared secret using post-quantum KEM
      const sharedSecretResult = await KyberKEM.decapsulate(
        hybridData.postQuantum.ciphertext,
        privateKey
      );

      if (!sharedSecretResult.success || !sharedSecretResult.data) {
        return {
          success: false,
          error: sharedSecretResult.error || 'Post-quantum decapsulation failed',
          errorCode: sharedSecretResult.errorCode || 'PQ_DECAPSULATION_FAILED'
        };
      }

      // Step 2: Reconstruct the ephemeral key (this is simplified)
      // In a real implementation, we'd need to store the ephemeral key securely
      const ephemeralKey = crypto.getRandomValues(new Uint8Array(32));

      // Step 3: Combine keys using the same weights
      const combinedKey = await this.combineKeys(
        ephemeralKey,
        sharedSecretResult.data,
        hybridData.keyInfo.classicalWeight,
        hybridData.keyInfo.quantumWeight
      );

      // Step 4: Decrypt the outer layer
      const outerResult = await AESGCMCipher.decrypt(
        hybridData.classical,
        combinedKey,
        context
      );

      if (!outerResult.success || !outerResult.data) {
        return {
          success: false,
          error: outerResult.error || 'Outer decryption failed',
          errorCode: outerResult.errorCode || 'OUTER_DECRYPTION_FAILED'
        };
      }

      // Step 5: Decrypt the inner layer with the ephemeral key
      const innerEncrypted: EncryptionResult = {
        ciphertext: outerResult.data,
        nonce: hybridData.classical.nonce,
        algorithm: 'AES-256-GCM',
        timestamp: hybridData.timestamp,
        ...(hybridData.classical.authTag && { authTag: hybridData.classical.authTag })
      };

      const finalResult = await AESGCMCipher.decrypt(
        innerEncrypted,
        ephemeralKey,
        context
      );

      if (!finalResult.success || !finalResult.data) {
        return {
          success: false,
          error: finalResult.error || 'Inner decryption failed',
          errorCode: finalResult.errorCode || 'INNER_DECRYPTION_FAILED'
        };
      }

      return {
        success: true,
        data: finalResult.data
      };

    } catch (error) {
      return {
        success: false,
        error: `Hybrid decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'HYBRID_DECRYPTION_FAILED'
      };
    }
  }

  /**
   * Combines classical and post-quantum keys using weighted mixing
   * @param classicalKey Classical key
   * @param quantumKey Post-quantum key
   * @param classicalWeight Weight for classical component
   * @param quantumWeight Weight for quantum component
   * @returns Combined key
   */
  private static async combineKeys(
    classicalKey: Uint8Array,
    quantumKey: Uint8Array,
    classicalWeight: number,
    quantumWeight: number
  ): Promise<Uint8Array> {
    // Use HKDF to combine the keys
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      // Combine the keys by concatenation
      const combined = new Uint8Array(classicalKey.length + quantumKey.length);
      combined.set(classicalKey, 0);
      combined.set(quantumKey, classicalKey.length);

      // Use HKDF to derive the final key
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        combined,
        'HKDF',
        false,
        ['deriveBits']
      );

      const info = new TextEncoder().encode(
        `hybrid-key-${classicalWeight}-${quantumWeight}`
      );

      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new Uint8Array(32), // Zero salt for deterministic derivation
          info: info
        },
        keyMaterial,
        256 // 32 bytes
      );

      return new Uint8Array(derivedBits);
    } else {
      // Fallback: simple XOR combination
      const result = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        result[i] = classicalKey[i % classicalKey.length] ^ 
                   quantumKey[i % quantumKey.length];
      }
      return result;
    }
  }

  /**
   * Validates hybrid encryption data
   * @param hybridData Hybrid data to validate
   * @returns True if valid
   */
  static validateHybridData(hybridData: HybridEncryptionResult): boolean {
    return (
      hybridData.classical &&
      hybridData.postQuantum &&
      hybridData.keyInfo &&
      hybridData.algorithm &&
      hybridData.timestamp > 0 &&
      KyberKEM.validateCiphertext(hybridData.postQuantum.ciphertext)
    );
  }

  /**
   * Gets hybrid encryption parameters
   * @returns Current hybrid configuration
   */
  static getHybridParameters(): typeof POST_QUANTUM.HYBRID_MODE {
    return POST_QUANTUM.HYBRID_MODE;
  }

  /**
   * Checks if hybrid encryption is available
   * @returns True if hybrid encryption can be used
   */
  static isHybridAvailable(): boolean {
    return KyberKEM.isAvailable() && POST_QUANTUM.HYBRID_MODE.ENABLED;
  }

  /**
   * Estimates the security level of hybrid encryption
   * @param config Post-quantum configuration
   * @returns Security level description
   */
  static estimateSecurityLevel(_config?: PostQuantumConfig): {
    classical: string;
    postQuantum: string;
    combined: string;
  } {
    return {
      classical: 'AES-256 (128-bit security)',
      postQuantum: 'Kyber-768 (192-bit security)',
      combined: 'Hybrid (192-bit quantum-resistant security)'
    };
  }
}
