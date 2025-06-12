/**
 * @fileoverview Crypto Package Main Export
 * @responsibility Central export point for all cryptographic operations
 * @principle Single Responsibility - Only exports, delegates to implementations
 * @security Critical security boundary - all crypto operations go through here
 */

// Export the main crypto interface
export { ZeroKnowledgeVault } from './vault/zero-knowledge-vault';

// Export algorithm implementations
export * from './algorithms/algorithm-selector';
export * from './algorithms/aes-gcm';
export * from './algorithms/xchacha20-poly1305';
export * from './algorithms/argon2';

// Export key derivation
export * from './key-derivation/master-key';
export * from './key-derivation/hkdf';
export * from './key-derivation/account-key';
export * from './key-derivation/item-key';

// Export authentication
export * from './auth/zero-knowledge-auth';
export * from './auth/srp-client';
export * from './auth/srp-server';

// Export memory protection
export * from './memory/secure-memory-manager';
export * from './memory/memory-protection';
export * from './memory/constant-time';

// Export vault operations
export * from './vault/password-encryption';
export { 
  FileChunk as CryptoFileChunk,
  EncryptedFileMetadata,
  EncryptedFile,
  FileProgressCallback,
  FileEncryption
} from './vault/file-encryption';
export * from './vault/chunked-encryption';

// Export post-quantum cryptography
export * from './post-quantum/kyber';
export * from './post-quantum/hybrid-encryption';
export * from './post-quantum/quantum-resistant';

// Re-export shared types for convenience
export * from '@zk-vault/shared';
