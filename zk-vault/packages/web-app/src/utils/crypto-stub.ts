/**
 * @fileoverview Browser Crypto Stub
 * @responsibility Provides browser-compatible stubs for Node.js crypto module
 * @principle Browser Compatibility - Redirects Node.js crypto to Web Crypto API
 */

// Crypto stub for browser compatibility
export const randomBytes = (size: number): Uint8Array => {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    return window.crypto.getRandomValues(new Uint8Array(size));
  }
  throw new Error('Crypto functionality not available in this environment');
};

export const createHmac = (algorithm: string, key: Uint8Array) => {
  throw new Error('Node.js crypto.createHmac not available in browser. Use Web Crypto API instead.');
};

export const pbkdf2 = (
  password: string | Uint8Array,
  salt: Uint8Array,
  iterations: number,
  keylen: number,
  digest: string,
  callback: (err: Error | null, derivedKey?: Uint8Array) => void
) => {
  // Redirect to Web Crypto API implementation
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    (async () => {
      try {
        const passwordBuffer = typeof password === 'string' 
          ? new TextEncoder().encode(password) 
          : password;

        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          passwordBuffer,
          'PBKDF2',
          false,
          ['deriveBits']
        );

        const derivedBits = await window.crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: digest.toUpperCase().replace('SHA', 'SHA-'),
          },
          keyMaterial,
          keylen * 8
        );

        callback(null, new Uint8Array(derivedBits));
      } catch (error) {
        callback(error instanceof Error ? error : new Error('PBKDF2 failed'));
      }
    })();
  } else {
    callback(new Error('Web Crypto API not available'));
  }
};

export const hkdf = (
  digest: string,
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  keylen: number,
  callback: (err: Error | null, derivedKey?: Uint8Array) => void
) => {
  // Redirect to Web Crypto API implementation
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    (async () => {
      try {
        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          ikm,
          'HKDF',
          false,
          ['deriveBits']
        );

        const derivedBits = await window.crypto.subtle.deriveBits(
          {
            name: 'HKDF',
            hash: digest.toUpperCase().replace('SHA', 'SHA-'),
            salt: salt,
            info: info,
          },
          keyMaterial,
          keylen * 8
        );

        callback(null, new Uint8Array(derivedBits));
      } catch (error) {
        callback(error instanceof Error ? error : new Error('HKDF failed'));
      }
    })();
  } else {
    callback(new Error('Web Crypto API not available'));
  }
};

// Default export for module compatibility
export default {
  randomBytes,
  createHmac,
  pbkdf2,
  hkdf,
}; 