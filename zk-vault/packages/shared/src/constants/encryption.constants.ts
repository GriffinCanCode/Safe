/**
 * @fileoverview Encryption Constants
 * @responsibility Defines all encryption-related constants and configuration values
 * @principle Single Responsibility - Only encryption constants
 * @security OWASP 2025 compliant parameters and secure defaults
 */

/**
 * Argon2id key derivation parameters (OWASP 2025 compliant)
 * @security These parameters provide strong protection against brute force attacks
 */
export const ARGON2_PARAMS = {
  /** Number of iterations (OWASP 2025 minimum) */
  TIME: 3,
  /** Memory usage in KiB (19 MiB = 19456 KiB) */
  MEMORY: 19456,
  /** Parallelism factor */
  PARALLELISM: 1,
  /** Output key length in bytes */
  HASH_LENGTH: 32,
  /** Salt length in bytes */
  SALT_LENGTH: 32,
} as const;

/**
 * AES-256-GCM encryption parameters
 * @security Industry standard parameters for AES-GCM
 */
export const AES_GCM_PARAMS = {
  /** Key length in bits */
  KEY_LENGTH: 256,
  /** IV/Nonce length in bytes */
  IV_LENGTH: 12,
  /** Authentication tag length in bytes */
  TAG_LENGTH: 16,
  /** Algorithm identifier */
  ALGORITHM: 'AES-GCM',
} as const;

/**
 * XChaCha20-Poly1305 encryption parameters
 * @security Modern AEAD cipher with extended nonce
 */
export const XCHACHA20_PARAMS = {
  /** Key length in bytes */
  KEY_LENGTH: 32,
  /** Nonce length in bytes (extended nonce) */
  NONCE_LENGTH: 24,
  /** Authentication tag length in bytes */
  TAG_LENGTH: 16,
  /** Algorithm identifier */
  ALGORITHM: 'XChaCha20-Poly1305',
} as const;

/**
 * Key derivation function parameters
 * @security HKDF parameters for key expansion
 */
export const HKDF_PARAMS = {
  /** Hash algorithm for HKDF */
  HASH: 'SHA-256',
  /** Default output length */
  OUTPUT_LENGTH: 32,
  /** Info parameter for different key types */
  INFO: {
    MASTER_KEY: 'zk-vault-master-key',
    ACCOUNT_KEY: 'zk-vault-account-key',
    ITEM_KEY: 'zk-vault-item-key',
    FILE_KEY: 'zk-vault-file-key',
    SHARING_KEY: 'zk-vault-sharing-key',
  },
} as const;

/**
 * Memory protection constants
 * @security Secure memory handling parameters
 */
export const MEMORY_PROTECTION = {
  /** Auto-clear timeout in milliseconds (5 minutes) */
  AUTO_CLEAR_TIMEOUT: 300000,
  /** Maximum lifetime for sensitive data (15 minutes) */
  MAX_LIFETIME: 900000,
  /** Secure overwrite passes */
  OVERWRITE_PASSES: 3,
  /** Memory allocation alignment */
  ALIGNMENT: 16,
} as const;

/**
 * File encryption constants
 * @security Parameters for chunked file encryption
 */
export const FILE_ENCRYPTION = {
  /** Default chunk size (4 MB) */
  CHUNK_SIZE: 4 * 1024 * 1024,
  /** Maximum file size (1 GB) */
  MAX_FILE_SIZE: 1024 * 1024 * 1024,
  /** Minimum chunk size (64 KB) */
  MIN_CHUNK_SIZE: 64 * 1024,
  /** Maximum chunk size (16 MB) */
  MAX_CHUNK_SIZE: 16 * 1024 * 1024,
  /** Hash algorithm for content verification */
  HASH_ALGORITHM: 'SHA-256',
} as const;

/**
 * Encryption algorithm identifiers
 * @responsibility Standard algorithm names for consistency
 */
export const ALGORITHMS = {
  AES_256_GCM: 'AES-256-GCM',
  XCHACHA20_POLY1305: 'XChaCha20-Poly1305',
  ARGON2ID: 'Argon2id',
  HKDF_SHA256: 'HKDF-SHA256',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
} as const;

/**
 * Encryption version constants
 * @responsibility Version tracking for algorithm upgrades
 */
export const ENCRYPTION_VERSIONS = {
  /** Current encryption version */
  CURRENT: 1,
  /** Supported versions */
  SUPPORTED: [1],
  /** Deprecated versions */
  DEPRECATED: [],
  /** Version migration required */
  MIGRATION_REQUIRED: [],
} as const;

/**
 * Performance benchmarking constants
 * @responsibility Performance testing parameters
 */
export const PERFORMANCE_BENCHMARKS = {
  /** Benchmark iterations */
  ITERATIONS: 100,
  /** Warmup iterations */
  WARMUP: 10,
  /** Test data sizes in bytes */
  TEST_SIZES: [1024, 4096, 16384, 65536, 262144, 1048576],
  /** Performance thresholds in ms */
  THRESHOLDS: {
    FAST: 10,
    ACCEPTABLE: 50,
    SLOW: 200,
  },
} as const;

/**
 * Post-quantum cryptography constants
 * @future Preparation for quantum-resistant algorithms
 */
export const POST_QUANTUM = {
  /** Kyber key encapsulation parameters */
  KYBER: {
    VARIANT: 'Kyber-768',
    PUBLIC_KEY_SIZE: 1184,
    PRIVATE_KEY_SIZE: 2400,
    CIPHERTEXT_SIZE: 1088,
    SHARED_SECRET_SIZE: 32,
  },
  /** Hybrid encryption mode */
  HYBRID_MODE: {
    ENABLED: false, // Will be enabled when post-quantum is ready
    CLASSICAL_WEIGHT: 0.5,
    QUANTUM_WEIGHT: 0.5,
  },
} as const;

/**
 * Security validation constants
 * @security Input validation and security checks
 */
export const SECURITY_VALIDATION = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 12,
  /** Maximum password length */
  MAX_PASSWORD_LENGTH: 128,
  /** Minimum salt length */
  MIN_SALT_LENGTH: 16,
  /** Maximum data size for encryption (100 MB) */
  MAX_ENCRYPTION_SIZE: 100 * 1024 * 1024,
  /** Maximum key derivation time (10 seconds) */
  MAX_DERIVATION_TIME: 10000,
} as const;

/**
 * Error codes for cryptographic operations
 * @responsibility Standardized error identification
 */
export const CRYPTO_ERROR_CODES = {
  INVALID_KEY_LENGTH: 'CRYPTO_INVALID_KEY_LENGTH',
  INVALID_NONCE_LENGTH: 'CRYPTO_INVALID_NONCE_LENGTH',
  INVALID_DATA_SIZE: 'CRYPTO_INVALID_DATA_SIZE',
  ENCRYPTION_FAILED: 'CRYPTO_ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'CRYPTO_DECRYPTION_FAILED',
  KEY_DERIVATION_FAILED: 'CRYPTO_KEY_DERIVATION_FAILED',
  AUTHENTICATION_FAILED: 'CRYPTO_AUTHENTICATION_FAILED',
  MEMORY_ALLOCATION_FAILED: 'CRYPTO_MEMORY_ALLOCATION_FAILED',
  ALGORITHM_NOT_SUPPORTED: 'CRYPTO_ALGORITHM_NOT_SUPPORTED',
  HARDWARE_NOT_AVAILABLE: 'CRYPTO_HARDWARE_NOT_AVAILABLE',
} as const;

/**
 * Default encryption context values
 * @responsibility Standard context configurations
 */
export const DEFAULT_CONTEXTS = {
  VAULT_ITEM: {
    purpose: 'vault-item' as const,
    compress: true,
  },
  FILE_CHUNK: {
    purpose: 'file-chunk' as const,
    compress: false,
  },
  METADATA: {
    purpose: 'metadata' as const,
    compress: true,
  },
  SHARING: {
    purpose: 'sharing' as const,
    compress: true,
  },
} as const;
