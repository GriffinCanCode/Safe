/**
 * @fileoverview Browser Compatibility Stubs
 * @responsibility Provides empty implementations for Node.js-specific modules
 * @principle Browser Compatibility - Prevents Node.js modules from loading in browser
 */

// Stub for libsodium-wrappers
export const ready = Promise.resolve();
export const sodium = {};
export const crypto_aead_xchacha20poly1305_ietf_encrypt = () => {
  throw new Error('libsodium-wrappers not available in browser environment');
};
export const crypto_aead_xchacha20poly1305_ietf_decrypt = () => {
  throw new Error('libsodium-wrappers not available in browser environment');
};
export const randombytes_buf = () => {
  throw new Error('libsodium-wrappers not available in browser environment');
};

// Stub for argon2
export const hash = () => {
  throw new Error('argon2 not available in browser environment');
};
export const argon2id = 'argon2id';

// Default export for compatibility
export default {
  ready,
  sodium,
  crypto_aead_xchacha20poly1305_ietf_encrypt,
  crypto_aead_xchacha20poly1305_ietf_decrypt,
  randombytes_buf,
  hash,
  argon2id,
};
