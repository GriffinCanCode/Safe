# Agent 1: Foundation & Crypto Core Implementation Plan

## Mission
You are responsible for creating the cryptographic foundation and shared utilities that all other agents will depend on. Your code must be production-ready, secure, and well-documented since it forms the security backbone of the entire system.

## Critical Success Factors
1. **Freeze interfaces by Day 3** - Other agents are waiting
2. **Mock implementations first** - Allow others to start immediately  
3. **Security over speed** - This is zero-knowledge crypto, no shortcuts
4. **Comprehensive testing** - 100% coverage for crypto functions

## Deliverables Overview

### Week 1: Interfaces & Mock Implementations
- [ ] Complete TypeScript interfaces for all crypto operations
- [ ] Mock implementations returning realistic data
- [ ] Published to `@zk-vault/shared` and `@zk-vault/crypto` packages
- [ ] Basic documentation for other agents

### Week 2-3: Real Implementation
- [ ] Argon2id with OWASP 2025 parameters
- [ ] AES-256-GCM and XChaCha20-Poly1305 algorithms
- [ ] SRP authentication protocol
- [ ] Zero-knowledge vault architecture
- [ ] Memory protection mechanisms

### Week 4: Hardening & Integration
- [ ] Security audit of all crypto code
- [ ] Performance optimization
- [ ] Post-quantum crypto preparation
- [ ] Integration support for other agents

## Detailed Implementation Steps

### Phase 1: Project Setup (Day 1)

1. **Initialize Monorepo Structure**
```bash
mkdir -p zk-vault/packages/{shared,crypto}
cd zk-vault
npm init -y
npx lerna init
```

2. **Configure TypeScript**
Create `tools/config/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

3. **Setup Shared Package**
```bash
cd packages/shared
npm init -y
npm install --save-dev typescript @types/node
```

Create `packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tools/config/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### Phase 2: Type Definitions (Day 2)

Create comprehensive types that other agents will use:

**packages/shared/src/types/encryption.types.ts**
```typescript
export interface EncryptionResult {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  authTag?: Uint8Array;
  algorithm: 'AES-256-GCM' | 'XChaCha20-Poly1305';
}

export interface KeyDerivationParams {
  password: string;
  salt: Uint8Array;
  time?: number;      // iterations (default: 3)
  memory?: number;    // KiB (default: 19456)
  parallelism?: number;
  outputLength?: number;
}

export interface MasterKeyStructure {
  masterKey: CryptoKey;
  accountKey: CryptoKey;
  salt: Uint8Array;
  authProof: SRPAuthProof;
}

export interface SRPAuthProof {
  clientPublic: string;
  clientProof: string;
  timestamp: number;
}

// Continue with all types from the plan...
```

**packages/shared/src/types/vault.types.ts**
```typescript
export interface VaultItem {
  id: string;
  type: 'password' | 'note' | 'card' | 'identity';
  encrypted: EncryptedData;
  metadata: VaultItemMetadata;
  created: Date;
  modified: Date;
  folder?: string;
  favorite?: boolean;
  shared?: SharedItemInfo;
}

export interface EncryptedData {
  data: string;  // Base64 encoded ciphertext
  iv: string;    // Base64 encoded IV
  authTag?: string;
  algorithm: string;
}

export interface PasswordEntry extends VaultItem {
  type: 'password';
  decrypted?: {
    title: string;
    username: string;
    password: string;
    url?: string;
    notes?: string;
    totp?: string;
    customFields?: Record<string, string>;
  };
}
```

### Phase 3: Mock Implementations (Day 3)

Create working mocks so other agents can start immediately:

**packages/crypto/src/mocks/crypto-mock.ts**
```typescript
import { EncryptionResult, KeyDerivationParams } from '@zk-vault/shared';

export class CryptoMock {
  async deriveKey(params: KeyDerivationParams): Promise<Uint8Array> {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return deterministic mock key based on password
    const encoder = new TextEncoder();
    const data = encoder.encode(params.password);
    const mockKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      mockKey[i] = data[i % data.length] ^ (i * 7);
    }
    return mockKey;
  }

  async encrypt(plaintext: Uint8Array, key: Uint8Array): Promise<EncryptionResult> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Create mock encrypted data
    const nonce = crypto.getRandomValues(new Uint8Array(24));
    const ciphertext = new Uint8Array(plaintext.length + 16);
    
    // Simple XOR for mock (NOT SECURE - MOCK ONLY)
    for (let i = 0; i < plaintext.length; i++) {
      ciphertext[i] = plaintext[i] ^ key[i % key.length] ^ nonce[i % nonce.length];
    }
    
    // Mock auth tag
    const authTag = crypto.getRandomValues(new Uint8Array(16));
    ciphertext.set(authTag, plaintext.length);
    
    return {
      ciphertext,
      nonce,
      authTag,
      algorithm: 'XChaCha20-Poly1305'
    };
  }

  async decrypt(encrypted: EncryptionResult, key: Uint8Array): Promise<Uint8Array> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Extract auth tag
    const ciphertext = encrypted.ciphertext.slice(0, -16);
    const plaintext = new Uint8Array(ciphertext.length);
    
    // Reverse XOR
    for (let i = 0; i < ciphertext.length; i++) {
      plaintext[i] = ciphertext[i] ^ key[i % key.length] ^ encrypted.nonce[i % encrypted.nonce.length];
    }
    
    return plaintext;
  }
}

// Export as main implementation temporarily
export const crypto = new CryptoMock();
```

### Phase 4: Real Implementation Structure (Week 2)

1. **Install Real Dependencies**
```bash
cd packages/crypto
npm install argon2 libsodium-wrappers tweetnacl @stablelib/xchacha20poly1305
npm install --save-dev @types/libsodium-wrappers
```

2. **Implement Algorithm Selector**

**packages/crypto/src/algorithms/algorithm-selector.ts**
```typescript
export class AlgorithmSelector {
  private static hasAESNI?: boolean;

  static async detectHardwareAcceleration(): Promise<boolean> {
    if (this.hasAESNI !== undefined) return this.hasAESNI;

    try {
      // Check for AES-NI support
      if (typeof window !== 'undefined' && 'crypto' in window) {
        // Try to use WebCrypto AES - it's hardware accelerated if available
        const testKey = await window.crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt']
        );
        this.hasAESNI = true;
      } else {
        // Node.js environment - check CPU flags
        const os = require('os');
        const cpus = os.cpus();
        // This is a simplified check - in production you'd check actual CPU flags
        this.hasAESNI = cpus[0].model.includes('Intel') || cpus[0].model.includes('AMD');
      }
    } catch {
      this.hasAESNI = false;
    }

    return this.hasAESNI;
  }

  static async selectOptimalAlgorithm(): Promise<'AES-256-GCM' | 'XChaCha20-Poly1305'> {
    const hasHardwareAcceleration = await this.detectHardwareAcceleration();
    return hasHardwareAcceleration ? 'AES-256-GCM' : 'XChaCha20-Poly1305';
  }
}
```

3. **Implement Argon2id Key Derivation**

**packages/crypto/src/key-derivation/argon2.ts**
```typescript
import * as argon2 from 'argon2';

export class Argon2idDerivation {
  private static readonly DEFAULT_OPTIONS = {
    time: 3,        // iterations
    memory: 19456,  // 19 MiB
    parallelism: 1,
    hashLength: 32,
    type: argon2.argon2id
  };

  static async deriveKey(
    password: string,
    salt: Uint8Array,
    options: Partial<typeof Argon2idDerivation.DEFAULT_OPTIONS> = {}
  ): Promise<Uint8Array> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      const hash = await argon2.hash(password, {
        salt: Buffer.from(salt),
        ...finalOptions
      });
      
      // Extract raw hash bytes
      const hashBuffer = Buffer.from(hash.split('$').pop()!, 'base64');
      return new Uint8Array(hashBuffer);
    } catch (error) {
      throw new Error(`Argon2id key derivation failed: ${error.message}`);
    }
  }

  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }
}
```

### Phase 5: Error Handling & Recovery

**Every crypto operation must handle:**

1. **Invalid Input**
```typescript
export function validateKeyDerivationInput(params: KeyDerivationParams): void {
  if (!params.password || params.password.length === 0) {
    throw new Error('Password cannot be empty');
  }
  if (!params.salt || params.salt.length < 16) {
    throw new Error('Salt must be at least 16 bytes');
  }
  if (params.time && (params.time < 1 || params.time > 10)) {
    throw new Error('Time parameter must be between 1 and 10');
  }
  if (params.memory && (params.memory < 8192 || params.memory > 524288)) {
    throw new Error('Memory parameter must be between 8MB and 512MB');
  }
}
```

2. **Memory Protection**
```typescript
export class SecureBuffer {
  private buffer: Uint8Array;
  private cleared = false;

  constructor(size: number) {
    this.buffer = new Uint8Array(size);
  }

  get data(): Uint8Array {
    if (this.cleared) {
      throw new Error('Buffer has been cleared');
    }
    return this.buffer;
  }

  clear(): void {
    crypto.getRandomValues(this.buffer);
    this.buffer.fill(0);
    this.cleared = true;
  }

  // Auto-clear after timeout
  autoClear(ms: number = 300000): void {
    setTimeout(() => this.clear(), ms);
  }
}
```

### Phase 6: Testing Strategy

**packages/crypto/src/__tests__/test-helpers.ts**
```typescript
export class CryptoTestHelpers {
  static async generateTestVectors() {
    return {
      passwords: [
        'simple',
        'unicode-测试-тест',
        'special!@#$%^&*()',
        'very-long-'.repeat(100)
      ],
      salts: [
        new Uint8Array(32).fill(0),
        new Uint8Array(32).fill(255),
        crypto.getRandomValues(new Uint8Array(32))
      ]
    };
  }

  static async benchmarkOperation(
    name: string,
    operation: () => Promise<any>,
    iterations: number = 100
  ) {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      times.push(performance.now() - start);
    }

    return {
      name,
      average: times.reduce((a, b) => a + b) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: times.sort()[Math.floor(times.length / 2)]
    };
  }
}
```

### Phase 7: Documentation

Create comprehensive docs for other agents:

**packages/crypto/README.md**
```markdown
# @zk-vault/crypto

Zero-knowledge cryptographic library for the vault system.

## Quick Start

\```typescript
import { ZeroKnowledgeVault } from '@zk-vault/crypto';

// Initialize vault
const vault = new ZeroKnowledgeVault();
const masterKey = await vault.initialize('user-password');

// Encrypt data
const encrypted = await vault.encrypt('sensitive data', masterKey);

// Decrypt data
const decrypted = await vault.decrypt(encrypted, masterKey);
\```

## API Reference

### Key Derivation
- `deriveKey(password, salt, options)` - Argon2id key derivation
- `generateSalt()` - Generate cryptographically secure salt

### Encryption
- `encrypt(data, key)` - Encrypt with auto-selected algorithm
- `decrypt(encrypted, key)` - Decrypt data
- `encryptFile(file, key)` - Progressive file encryption

### Zero-Knowledge Auth
- `initializeSRP(email, password)` - Start SRP authentication
- `verifySRP(challenge, password)` - Complete authentication

## Security Considerations
[Include all security notes from the plan]
```

## Contingency Planning

### If Dependencies Fail to Install
1. Use pure JavaScript implementations:
   - Replace argon2 with scrypt or PBKDF2
   - Use WebCrypto API instead of libsodium
   - Implement ChaCha20-Poly1305 manually

### If Performance is Poor
1. Implement progressive hashing
2. Use Web Workers for CPU-intensive operations
3. Cache derived keys appropriately
4. Reduce Argon2 parameters for development

### If Integration Issues Arise
1. Provide synchronous API alternatives
2. Create compatibility layer for different environments
3. Implement graceful degradation
4. Provide detailed integration examples

## Success Metrics
- [ ] All interfaces frozen by Day 3
- [ ] Mock implementations working by Day 3
- [ ] 100% test coverage for crypto functions
- [ ] Performance benchmarks meet targets
- [ ] Security audit passed
- [ ] Other agents successfully integrated

## Communication Protocol
Since agents cannot communicate directly:

1. **Day 1-3**: Push all interfaces to `main` branch
2. **Day 3**: Tag release `v0.1.0-mock` with mocks
3. **Week 2**: Push implementation updates daily
4. **Week 3**: Tag release `v1.0.0-rc1`
5. **Week 4**: Support integration via detailed docs

## Daily Checklist
- [ ] Run all tests before pushing
- [ ] Update CHANGELOG.md with changes
- [ ] Ensure backward compatibility
- [ ] Check for security vulnerabilities
- [ ] Update documentation
- [ ] Tag releases appropriately 