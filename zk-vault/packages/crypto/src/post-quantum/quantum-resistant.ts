/**
 * @fileoverview Quantum-Resistant Encryption
 * @responsibility Main interface for quantum-resistant cryptographic operations
 * @principle Single Responsibility - Coordinates post-quantum cryptography
 * @security Provides unified interface for quantum-resistant encryption
 */

import { 
  EncryptionResult,
  EncryptionContext,
  DecryptionContext,
  CryptoOperationResult,
  PostQuantumConfig,
  POST_QUANTUM
} from '@zk-vault/shared';

import { KyberKEM, KyberKeyPair } from './kyber';
import { HybridEncryption, HybridEncryptionResult, HybridKeyPair } from './hybrid-encryption';

/**
 * Quantum-resistant encryption mode
 * @responsibility Defines available quantum-resistant encryption modes
 */
export type QuantumResistantMode = 
  | 'classical-only'      // Current classical algorithms
  | 'hybrid'              // Classical + Post-quantum
  | 'post-quantum-only';  // Pure post-quantum (future)

/**
 * Quantum-resistant configuration
 * @responsibility Configuration for quantum-resistant operations
 */
export interface QuantumResistantConfig extends PostQuantumConfig {
  /** Encryption mode to use */
  mode: QuantumResistantMode;
  /** Fallback to classical if post-quantum fails */
  allowFallback: boolean;
  /** Migration strategy for existing data */
  migrationStrategy: 'immediate' | 'gradual' | 'on-demand';
}

/**
 * Quantum-resistant encryption result
 * @responsibility Unified result format for quantum-resistant operations
 */
export interface QuantumResistantResult {
  /** Encryption mode used */
  mode: QuantumResistantMode;
  /** Classical result (if applicable) */
  classical?: EncryptionResult;
  /** Hybrid result (if applicable) */
  hybrid?: HybridEncryptionResult;
  /** Algorithm used */
  algorithm: string;
  /** Security level achieved */
  securityLevel: string;
  /** Quantum resistance status */
  quantumResistant: boolean;
}

/**
 * Main quantum-resistant encryption interface
 * @responsibility Provides unified access to quantum-resistant cryptography
 * @security Ensures quantum resistance while maintaining compatibility
 */
export class QuantumResistantCrypto {

  /**
   * Encrypts data using quantum-resistant algorithms
   * @param plaintext Data to encrypt
   * @param publicKey Recipient's public key
   * @param context Encryption context
   * @param config Quantum-resistant configuration
   * @returns Quantum-resistant encryption result
   */
  static async encrypt(
    plaintext: Uint8Array,
    publicKey: Uint8Array,
    context?: EncryptionContext,
    config?: QuantumResistantConfig
  ): Promise<CryptoOperationResult<QuantumResistantResult>> {
    try {
      const finalConfig = this.getDefaultConfig(config);

      switch (finalConfig.mode) {
        case 'hybrid':
          return await this.encryptHybrid(plaintext, publicKey, context, finalConfig);
        
        case 'post-quantum-only':
          return await this.encryptPostQuantumOnly(plaintext, publicKey, context, finalConfig);
        
        case 'classical-only':
        default:
          return await this.encryptClassicalOnly(plaintext, context, finalConfig);
      }

    } catch (error) {
      return {
        success: false,
        error: `Quantum-resistant encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'QR_ENCRYPTION_FAILED'
      };
    }
  }

  /**
   * Decrypts quantum-resistant encrypted data
   * @param encryptedData Quantum-resistant encrypted data
   * @param privateKey Recipient's private key
   * @param context Decryption context
   * @returns Decrypted plaintext
   */
  static async decrypt(
    encryptedData: QuantumResistantResult,
    privateKey: Uint8Array,
    context?: DecryptionContext
  ): Promise<CryptoOperationResult<Uint8Array>> {
    try {
      switch (encryptedData.mode) {
        case 'hybrid':
          if (!encryptedData.hybrid) {
            return {
              success: false,
              error: 'Hybrid data missing',
              errorCode: 'MISSING_HYBRID_DATA'
            };
          }
          return await HybridEncryption.decryptHybrid(
            encryptedData.hybrid,
            privateKey,
            context
          );

        case 'post-quantum-only':
          return {
            success: false,
            error: 'Post-quantum only mode not yet implemented',
            errorCode: 'PQ_ONLY_NOT_IMPLEMENTED'
          };

        case 'classical-only':
        default:
          if (!encryptedData.classical) {
            return {
              success: false,
              error: 'Classical data missing',
              errorCode: 'MISSING_CLASSICAL_DATA'
            };
          }
          // Would use classical decryption here
          return {
            success: false,
            error: 'Classical-only decryption not implemented in this interface',
            errorCode: 'CLASSICAL_ONLY_NOT_IMPLEMENTED'
          };
      }

    } catch (error) {
      return {
        success: false,
        error: `Quantum-resistant decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'QR_DECRYPTION_FAILED'
      };
    }
  }

  /**
   * Generates quantum-resistant key pairs
   * @param mode Key generation mode
   * @returns Generated key pair
   */
  static async generateKeyPair(
    mode: QuantumResistantMode = 'hybrid'
  ): Promise<CryptoOperationResult<HybridKeyPair | KyberKeyPair>> {
    try {
      switch (mode) {
        case 'hybrid':
          return await HybridEncryption.generateHybridKeyPair();
        
        case 'post-quantum-only':
          return await KyberKEM.generateKeyPair();
        
        case 'classical-only':
        default: {
          // Generate classical key pair
          const classicalKey = crypto.getRandomValues(new Uint8Array(32));
          return {
            success: true,
            data: {
              classicalKey,
              postQuantumKeyPair: {
                publicKey: new Uint8Array(0),
                privateKey: new Uint8Array(0)
              }
            } as HybridKeyPair
          };
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `Key pair generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'QR_KEYGEN_FAILED'
      };
    }
  }

  /**
   * Encrypts using hybrid mode
   * @param plaintext Data to encrypt
   * @param publicKey Public key
   * @param context Encryption context
   * @param config Configuration
   * @returns Hybrid encryption result
   */
  private static async encryptHybrid(
    plaintext: Uint8Array,
    publicKey: Uint8Array,
    context?: EncryptionContext,
    config?: QuantumResistantConfig
  ): Promise<CryptoOperationResult<QuantumResistantResult>> {
    const hybridResult = await HybridEncryption.encryptHybrid(
      plaintext,
      publicKey,
      context,
      config
    );

    if (!hybridResult.success || !hybridResult.data) {
      if (config?.allowFallback) {
        return await this.encryptClassicalOnly(plaintext, context, config);
      }
      return {
        success: false,
        error: hybridResult.error || 'Hybrid encryption failed',
        errorCode: hybridResult.errorCode || 'HYBRID_ENCRYPTION_FAILED'
      };
    }

    return {
      success: true,
      data: {
        mode: 'hybrid',
        hybrid: hybridResult.data,
        algorithm: hybridResult.data.algorithm,
        securityLevel: 'Quantum-resistant (192-bit)',
        quantumResistant: true
      }
    };
  }

  /**
   * Encrypts using post-quantum only mode (future implementation)
   * @param plaintext Data to encrypt
   * @param publicKey Public key
   * @param context Encryption context
   * @param config Configuration
   * @returns Post-quantum encryption result
   */
  private static async encryptPostQuantumOnly(
    _plaintext: Uint8Array,
    _publicKey: Uint8Array,
    _context?: EncryptionContext,
    _config?: QuantumResistantConfig
  ): Promise<CryptoOperationResult<QuantumResistantResult>> {
    // This would be implemented when pure post-quantum algorithms are ready
    return {
      success: false,
      error: 'Post-quantum only mode not yet implemented',
      errorCode: 'PQ_ONLY_NOT_IMPLEMENTED'
    };
  }

  /**
   * Encrypts using classical only mode
   * @param plaintext Data to encrypt
   * @param context Encryption context
   * @param config Configuration
   * @returns Classical encryption result
   */
  private static async encryptClassicalOnly(
    _plaintext: Uint8Array,
    _context?: EncryptionContext,
    _config?: QuantumResistantConfig
  ): Promise<CryptoOperationResult<QuantumResistantResult>> {
    // This would use the classical AES-GCM implementation
    return {
      success: false,
      error: 'Classical-only mode not implemented in this interface',
      errorCode: 'CLASSICAL_ONLY_NOT_IMPLEMENTED'
    };
  }

  /**
   * Gets default quantum-resistant configuration
   * @param config Partial configuration
   * @returns Complete configuration
   */
  private static getDefaultConfig(config?: QuantumResistantConfig): QuantumResistantConfig {
    return {
      mode: config?.mode ?? 'hybrid',
      allowFallback: config?.allowFallback ?? true,
      migrationStrategy: config?.migrationStrategy ?? 'gradual',
      enableHybrid: config?.enableHybrid ?? POST_QUANTUM.HYBRID_MODE.ENABLED,
      algorithm: config?.algorithm ?? 'Kyber',
      classicalAlgorithm: config?.classicalAlgorithm ?? 'AES-256-GCM'
    };
  }

  /**
   * Assesses quantum threat level
   * @returns Current quantum threat assessment
   */
  static assessQuantumThreat(): {
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  } {
    // This would be updated based on current quantum computing developments
    return {
      level: 'medium',
      description: 'Quantum computers are advancing but not yet capable of breaking current encryption',
      recommendation: 'Begin migration to quantum-resistant algorithms'
    };
  }

  /**
   * Checks quantum resistance status
   * @param algorithm Algorithm to check
   * @returns Quantum resistance information
   */
  static checkQuantumResistance(algorithm: string): {
    resistant: boolean;
    securityLevel: string;
    recommendation: string;
  } {
    const quantumResistantAlgorithms = ['Kyber', 'CRYSTALS-DILITHIUM', 'SPHINCS+'];
    const hybridAlgorithms = ['Hybrid-AES-Kyber', 'Hybrid-ChaCha20-Kyber'];

    if (quantumResistantAlgorithms.includes(algorithm)) {
      return {
        resistant: true,
        securityLevel: 'Post-quantum secure',
        recommendation: 'Algorithm is quantum-resistant'
      };
    } else if (hybridAlgorithms.includes(algorithm)) {
      return {
        resistant: true,
        securityLevel: 'Hybrid quantum-resistant',
        recommendation: 'Algorithm provides quantum resistance with classical fallback'
      };
    } else {
      return {
        resistant: false,
        securityLevel: 'Classical security only',
        recommendation: 'Consider upgrading to quantum-resistant algorithms'
      };
    }
  }

  /**
   * Gets migration recommendations
   * @param currentAlgorithm Current algorithm in use
   * @returns Migration recommendations
   */
  static getMigrationRecommendations(currentAlgorithm: string): {
    urgency: 'low' | 'medium' | 'high';
    targetAlgorithm: string;
    migrationPath: string[];
    timeline: string;
  } {
    const resistance = this.checkQuantumResistance(currentAlgorithm);
    
    if (resistance.resistant) {
      return {
        urgency: 'low',
        targetAlgorithm: currentAlgorithm,
        migrationPath: [],
        timeline: 'No migration needed'
      };
    } else {
      return {
        urgency: 'medium',
        targetAlgorithm: 'Hybrid-AES-Kyber',
        migrationPath: [
          'Enable hybrid mode',
          'Generate quantum-resistant keys',
          'Migrate existing data gradually',
          'Phase out classical-only algorithms'
        ],
        timeline: '1-2 years'
      };
    }
  }

  /**
   * Validates quantum-resistant configuration
   * @param config Configuration to validate
   * @returns True if configuration is valid
   */
  static validateConfig(config: QuantumResistantConfig): boolean {
    const validModes: QuantumResistantMode[] = ['classical-only', 'hybrid', 'post-quantum-only'];
    const validStrategies = ['immediate', 'gradual', 'on-demand'];

    return (
      validModes.includes(config.mode) &&
      typeof config.allowFallback === 'boolean' &&
      validStrategies.includes(config.migrationStrategy)
    );
  }
}
