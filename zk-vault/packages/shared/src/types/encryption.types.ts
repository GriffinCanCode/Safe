/**
 * @fileoverview Encryption Types
 * @responsibility Defines all encryption-related type interfaces and structures
 * @principle Single Responsibility - Only encryption type definitions
 * @security Critical types for zero-knowledge cryptographic operations
 */

/**
 * Result of an encryption operation containing all necessary data for decryption
 * @security Contains encrypted data and authentication information
 */
export interface EncryptionResult {
  /** The encrypted data as bytes */
  ciphertext: Uint8Array;
  /** Cryptographic nonce/IV used for encryption */
  nonce: Uint8Array;
  /** Authentication tag for integrity verification (AEAD) */
  authTag?: Uint8Array;
  /** Algorithm used for encryption */
  algorithm: 'AES-256-GCM' | 'XChaCha20-Poly1305';
  /** Timestamp when encryption was performed */
  timestamp: number;
}

/**
 * Parameters for key derivation using Argon2id
 * @security OWASP 2025 compliant parameters
 */
export interface KeyDerivationParams {
  /** User password (never stored or transmitted) */
  password: string;
  /** Cryptographic salt for key derivation */
  salt: Uint8Array;
  /** Number of iterations (default: 3 per OWASP 2025) */
  time?: number;
  /** Memory usage in KiB (default: 19456 = 19 MiB) */
  memory?: number;
  /** Parallelism factor (default: 1) */
  parallelism?: number;
  /** Output key length in bytes (default: 32) */
  outputLength?: number;
}

/**
 * Master key structure containing all derived keys
 * @security Zero-knowledge architecture - server never sees these keys
 */
export interface MasterKeyStructure {
  /** Primary master key derived from password */
  masterKey: CryptoKey;
  /** Account-level encryption key */
  accountKey: CryptoKey;
  /** Salt used for key derivation */
  salt: Uint8Array;
  /** SRP authentication proof (doesn't reveal password) */
  authProof: SRPAuthProof;
  /** Key derivation parameters used */
  derivationParams: KeyDerivationParams;
}

/**
 * SRP (Secure Remote Password) authentication proof
 * @security Allows authentication without revealing password
 */
export interface SRPAuthProof {
  /** Client's public ephemeral value */
  clientPublic: string;
  /** Client's proof of password knowledge */
  clientProof: string;
  /** Timestamp for replay protection */
  timestamp: number;
  /** Salt used in SRP calculation */
  salt: string;
}

/**
 * Encrypted data structure for storage
 * @responsibility Standard format for all encrypted data in the system
 */
export interface EncryptedData {
  /** Base64 encoded encrypted data */
  data: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Base64 encoded authentication tag */
  authTag?: string;
  /** Encryption algorithm identifier */
  algorithm: string;
  /** Version for future algorithm upgrades */
  version: number;
}

/**
 * Key derivation result containing derived key and metadata
 * @security Includes all information needed for key verification
 */
export interface KeyDerivationResult {
  /** The derived key */
  key: Uint8Array;
  /** Salt used for derivation */
  salt: Uint8Array;
  /** Parameters used for derivation */
  params: KeyDerivationParams;
  /** Time taken for derivation (for performance monitoring) */
  derivationTime: number;
}

/**
 * Algorithm selection criteria for optimal performance
 * @responsibility Determines best encryption algorithm based on hardware
 */
export interface AlgorithmSelection {
  /** Selected algorithm */
  algorithm: 'AES-256-GCM' | 'XChaCha20-Poly1305';
  /** Reason for selection */
  reason: 'hardware-acceleration' | 'software-fallback' | 'user-preference';
  /** Hardware acceleration available */
  hardwareAccelerated: boolean;
  /** Performance benchmark score */
  performanceScore?: number;
}

/**
 * Memory protection configuration
 * @security Defines how sensitive data should be handled in memory
 */
export interface MemoryProtectionConfig {
  /** Auto-clear timeout in milliseconds */
  autoClearTimeout: number;
  /** Use secure memory allocation if available */
  useSecureMemory: boolean;
  /** Overwrite memory with random data on clear */
  secureOverwrite: boolean;
  /** Maximum time sensitive data can remain in memory */
  maxLifetime: number;
}

/**
 * Post-quantum cryptography configuration
 * @future Preparation for quantum-resistant algorithms
 */
export interface PostQuantumConfig {
  /** Enable hybrid classical/post-quantum encryption */
  enableHybrid: boolean;
  /** Post-quantum algorithm to use */
  algorithm: 'Kyber' | 'CRYSTALS-DILITHIUM' | 'SPHINCS+';
  /** Classical algorithm to combine with */
  classicalAlgorithm: 'AES-256-GCM' | 'XChaCha20-Poly1305';
  /** Migration strategy */
  migrationStrategy: 'immediate' | 'gradual' | 'on-demand';
}

/**
 * Encryption operation context
 * @responsibility Provides context for encryption operations
 */
export interface EncryptionContext {
  /** Purpose of encryption */
  purpose: 'vault-item' | 'file-chunk' | 'metadata' | 'sharing';
  /** User ID for key derivation */
  userId?: string;
  /** Item ID for per-item keys */
  itemId?: string;
  /** Additional authenticated data */
  additionalData?: Uint8Array;
  /** Compression before encryption */
  compress?: boolean;
}

/**
 * Decryption operation context
 * @responsibility Provides context for decryption operations
 */
export interface DecryptionContext {
  /** Expected data purpose */
  expectedPurpose: 'vault-item' | 'file-chunk' | 'metadata' | 'sharing';
  /** Verify additional authenticated data */
  verifyAdditionalData?: Uint8Array;
  /** Decompress after decryption */
  decompress?: boolean;
  /** Maximum allowed age of encrypted data */
  maxAge?: number;
}

/**
 * Cryptographic operation result
 * @responsibility Standard result format for all crypto operations
 */
export interface CryptoOperationResult<T = any> {
  /** Operation success status */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: string;
  /** Performance metrics */
  metrics?: {
    duration: number;
    memoryUsed: number;
    cpuUsage: number;
  };
}
