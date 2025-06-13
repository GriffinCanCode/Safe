/**
 * Type declarations for optional crypto libraries
 * These libraries may not be installed, so we declare them as modules
 * to avoid TypeScript compilation errors
 */

declare module 'argon2' {
  export function hash(password: string, options: any): Promise<any>;
  export const argon2id: number;
}

declare module 'libsodium-wrappers' {
  export function ready(): Promise<void>;
  export function crypto_aead_xchacha20poly1305_ietf_encrypt(
    message: Uint8Array,
    additionalData: Uint8Array | null,
    secretNonce: Uint8Array | null,
    publicNonce: Uint8Array,
    key: Uint8Array
  ): Uint8Array;
  export function crypto_aead_xchacha20poly1305_ietf_decrypt(
    secretNonce: Uint8Array | null,
    ciphertext: Uint8Array,
    additionalData: Uint8Array | null,
    publicNonce: Uint8Array,
    key: Uint8Array
  ): Uint8Array;
  export function crypto_kdf_derive_from_key(
    subkeyLen: number,
    subkeyId: number,
    ctx: string,
    key: Uint8Array
  ): Uint8Array;
  export function crypto_generichash(
    outlen: number,
    input: Uint8Array,
    key?: Uint8Array
  ): Uint8Array;
  export function randombytes_buf(length: number): Uint8Array;
}

declare module 'crypto' {
  export function pbkdf2(
    password: string,
    salt: any,
    iterations: number,
    keylen: number,
    digest: string,
    callback: (err: Error | null, derivedKey: any) => void
  ): void;
  export function randomBytes(size: number): any;
  export function createHash(algorithm: string): any;
  export function createHmac(algorithm: string, key: any): any;
}

declare module '@stablelib/xchacha20poly1305' {
  export class XChaCha20Poly1305 {
    constructor(key: Uint8Array);
    seal(nonce: Uint8Array, plaintext: Uint8Array, associatedData?: Uint8Array): Uint8Array;
    open(nonce: Uint8Array, ciphertext: Uint8Array, associatedData?: Uint8Array): Uint8Array | null;
  }
}

declare module '@stablelib/hkdf' {
  export function hkdf(
    hashFunction: any,
    ikm: Uint8Array,
    length: number,
    salt?: Uint8Array,
    info?: Uint8Array
  ): Uint8Array;
}

declare module '@stablelib/sha256' {
  export class SHA256 {
    update(data: Uint8Array): this;
    digest(): Uint8Array;
  }
  export function hash(data: Uint8Array): Uint8Array;
}

declare module '@stablelib/hmac' {
  export class HMAC {
    constructor(hashFunction: any, key: Uint8Array);
    update(data: Uint8Array): this;
    digest(): Uint8Array;
  }
}

declare module '@stablelib/pbkdf2' {
  export function pbkdf2(
    hashFunction: any,
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    dkLen: number
  ): Uint8Array;
}

declare module 'tweetnacl' {
  export namespace secretbox {
    export function seal(message: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array;
    export function open(
      ciphertext: Uint8Array,
      nonce: Uint8Array,
      key: Uint8Array
    ): Uint8Array | null;
    export const keyLength: number;
    export const nonceLength: number;
  }
  export function randomBytes(length: number): Uint8Array;
}

declare module 'node-forge' {
  export namespace cipher {
    export function createCipher(algorithm: string, key: any): any;
    export function createDecipher(algorithm: string, key: any): any;
  }
  export namespace random {
    export function getBytesSync(count: number): string;
  }
  export namespace util {
    export function encode64(bytes: string): string;
    export function decode64(encoded: string): string;
  }
}
