# ZK-Vault Secure Registration System

## Overview

ZK-Vault now features a comprehensive secure registration system that supports both email/password and Gmail OAuth registration methods, enhanced with advanced cryptographic security protocols from our in-house crypto packages.

## Features

### 🔐 Dual Registration Methods
- **Email/Password Registration**: Maximum security with zero-knowledge master password encryption
- **Gmail OAuth Registration**: Quick setup with Google account integration and biometric authentication support

### 🛡️ Advanced Security Protocols
- **Zero-Knowledge Architecture**: Server never sees plaintext passwords or encryption keys
- **Post-Quantum Cryptography**: Hybrid encryption supporting both classical and post-quantum algorithms
- **SRP Authentication**: Secure Remote Password protocol for authentication without password transmission
- **Memory Protection**: Advanced memory protection against dumps and cold boot attacks
- **Hardware Acceleration**: Automatic detection and use of AES-NI when available

### 🧬 Cryptographic Features
- **Multi-Algorithm Support**: AES-256-GCM, XChaCha20-Poly1305, and hybrid post-quantum encryption
- **Advanced Password Analysis**: Real-time strength analysis with entropy calculation and breach detection
- **Secure Memory Management**: Protected memory regions with obfuscation, fragmentation, and scrambling
- **Constant-Time Operations**: Protection against timing side-channel attacks

## Usage

### Basic Implementation

```vue
<template>
  <SecureRegistrationFlow
    @success="handleRegistrationSuccess"
    @error="handleRegistrationError"
    @complete="handleRegistrationComplete"
  />
</template>

<script setup lang="ts">
import { SecureRegistrationFlow } from '@/components/auth'

const handleRegistrationSuccess = (data: any) => {
  console.log('Registration successful:', data)
  // Handle successful registration
  // data includes: email, isNewUser, method ('email' | 'google')
}

const handleRegistrationError = (error: string) => {
  console.error('Registration error:', error)
  // Handle registration errors
}

const handleRegistrationComplete = (data: any) => {
  console.log('Registration complete:', data)
  // Handle final completion
  // Redirect to dashboard or next step
}
</script>
```

### Enhanced Security Service

For applications requiring maximum security, use the enhanced secure authentication service:

```typescript
import { secureAuthService, type SecureRegistrationData } from '@/services/secure-auth.service'

// Enhanced registration with custom crypto settings
const registrationData: SecureRegistrationData = {
  email: 'user@example.com',
  password: 'SecurePassword123!',
  displayName: 'John Doe',
  acceptTerms: true,
  acceptMarketing: false,
  securityLevel: 'maximum', // 'standard' | 'high' | 'maximum'
  cryptoSettings: {
    algorithm: 'hybrid', // 'aes-gcm' | 'xchacha20-poly1305' | 'hybrid'
    keyDerivationRounds: 200000,
    memoryFactor: 131072,
    enablePostQuantum: true
  }
}

try {
  const result = await secureAuthService.registerSecure(registrationData)
  console.log('Secure registration successful:', result)
  console.log('Crypto metadata:', result.cryptoMetadata)
} catch (error) {
  console.error('Secure registration failed:', error)
}
```

## Security Levels

### Standard Security
- **Key Derivation**: 100,000 rounds
- **Memory Factor**: 64KB
- **Algorithm**: Auto-detected optimal
- **Use Case**: General consumer applications

### High Security (Default)
- **Key Derivation**: 150,000 rounds
- **Memory Factor**: 96KB
- **Algorithm**: Hybrid post-quantum
- **Use Case**: Business and professional use

### Maximum Security
- **Key Derivation**: 200,000 rounds
- **Memory Factor**: 128KB
- **Algorithm**: Full post-quantum protection
- **Use Case**: High-security environments, government, financial institutions

## Password Strength Analysis

The system includes advanced password strength analysis:

```typescript
import { secureAuthService } from '@/services/secure-auth.service'

const analysis = secureAuthService.validatePasswordStrength('MyPassword123!')

console.log(analysis)
// {
//   score: 75,
//   level: 'good',
//   issues: ['Contains common patterns'],
//   recommendations: ['Consider using 16+ characters for better security']
// }
```

### Security Checks
- **Length Analysis**: Minimum 12 characters recommended
- **Character Variety**: Uppercase, lowercase, numbers, symbols
- **Pattern Detection**: Sequential characters, repeated patterns, common words
- **Entropy Calculation**: Shannon entropy analysis for randomness
- **Breach Database**: Check against known compromised passwords

## Crypto Package Integration

### Memory Protection

```typescript
import { MemoryProtection, ConstantTime } from '@zk-vault/crypto'

// Enable global memory protection
MemoryProtection.enableGlobalProtection()

// Create protected memory region
const passwordRegion = MemoryProtection.createProtectedRegion(
  'user-password',
  32, // size in bytes
  {
    obfuscate: true,      // XOR obfuscation
    fragment: true,       // Split into fragments
    scramble: true,       // Randomize order
    autoClearTimeout: 30000, // Auto-clear after 30 seconds
    maxLifetime: 300000   // Maximum lifetime 5 minutes
  }
)

// Store sensitive data
const passwordBytes = new TextEncoder().encode('sensitive-password')
passwordRegion.write(passwordBytes)

// Read when needed
const retrievedData = passwordRegion.read(passwordBytes.length)

// Secure cleanup
passwordRegion.destroy()
ConstantTime.secureClear(passwordBytes)
```

### Zero-Knowledge Vault

```typescript
import { ZeroKnowledgeVault } from '@zk-vault/crypto'

const vault = new ZeroKnowledgeVault()

// Initialize with user credentials
const result = await vault.initialize('user-password', 'user@example.com')

if (result.success) {
  console.log('Vault initialized successfully')
  console.log('Master key structure:', result.data)
} else {
  console.error('Vault initialization failed:', result.error)
}

// Encrypt data
const encryptedData = await vault.encrypt('sensitive-data', {
  purpose: 'user-note',
  itemType: 'secure-note'
})

// Decrypt data
const decryptedData = await vault.decrypt(encryptedData, {
  purpose: 'user-note'
})
```

### Key Derivation

```typescript
import { MasterKeyDerivation } from '@zk-vault/crypto'

// Create master key structure
const masterKeyResult = await MasterKeyDerivation.createMasterKeyStructure(
  'user-password',
  'user@example.com'
)

if (masterKeyResult.success) {
  const masterKey = masterKeyResult.data
  console.log('Master key derived successfully')
  
  // Use master key for subsequent operations
  // Keys are automatically managed and never exposed
}
```

## Configuration

### Environment Variables

```bash
# Optional: Configure crypto settings
VITE_CRYPTO_DEFAULT_ALGORITHM=hybrid
VITE_CRYPTO_KEY_DERIVATION_ROUNDS=150000
VITE_CRYPTO_MEMORY_FACTOR=98304
VITE_CRYPTO_ENABLE_POST_QUANTUM=true

# Security level
VITE_DEFAULT_SECURITY_LEVEL=high

# Memory protection
VITE_ENABLE_MEMORY_PROTECTION=true
VITE_AUTO_CLEAR_TIMEOUT=30000
```

### Firebase Configuration

Ensure your Firebase configuration supports Google OAuth:

```typescript
// firebase.config.ts
import { GoogleAuthProvider } from 'firebase/auth'

const provider = new GoogleAuthProvider()
provider.addScope('profile')
provider.addScope('email')
provider.setCustomParameters({
  prompt: 'select_account'
})
```

## CSS Styling

The registration flow uses the project's CSS architecture with proper dark mode support:

```css
/* Custom styling example */
.secure-registration-flow {
  --registration-max-width: 28rem;
  --registration-spacing: var(--spacing-6);
  --registration-border-radius: var(--radius-lg);
}

/* Dark mode customization */
@media (prefers-color-scheme: dark) {
  .secure-registration-flow {
    --registration-bg: var(--color-surface-dark);
    --registration-border: var(--color-border-dark);
  }
}
```

## Security Best Practices

### For Developers

1. **Always use the crypto packages** for security operations
2. **Never log sensitive data** (passwords, keys, encrypted content)
3. **Clear sensitive data** from memory after use
4. **Use constant-time operations** for security-critical comparisons
5. **Validate all inputs** before encryption/decryption

### For Users

1. **Use strong, unique passwords** (minimum 12 characters)
2. **Enable biometric authentication** when available
3. **Keep recovery information** secure and accessible
4. **Regularly update passwords** (every 90 days recommended)
5. **Use two-factor authentication** for additional security

## Troubleshooting

### Common Issues

#### Registration Fails with Crypto Error
```typescript
// Check if crypto packages are properly initialized
try {
  const vault = new ZeroKnowledgeVault()
  const result = await vault.initialize(password, email)
  if (!result.success) {
    console.error('Crypto initialization failed:', result.error)
  }
} catch (error) {
  console.error('Crypto package error:', error)
}
```

#### Google OAuth Not Working
```typescript
// Verify Firebase configuration
import { firebaseService } from '@/services/firebase.service'

if (!firebaseService.isInitialized) {
  console.error('Firebase not properly initialized')
}

// Check Google OAuth configuration
const provider = new GoogleAuthProvider()
console.log('Google OAuth provider:', provider)
```

#### Memory Protection Issues
```typescript
// Check if memory protection is enabled
import { MemoryProtection } from '@zk-vault/crypto'

try {
  MemoryProtection.enableGlobalProtection()
  console.log('Memory protection enabled')
} catch (error) {
  console.error('Memory protection failed:', error)
}
```

## Performance Considerations

### Hardware Acceleration
- **AES-NI**: Automatically detected and used for AES operations
- **WebCrypto API**: Leveraged for hardware-accelerated cryptography
- **Memory Management**: Optimized for minimal memory footprint

### Algorithm Selection
- **Hybrid Mode**: Best security with reasonable performance
- **AES-GCM**: Fastest on modern hardware
- **XChaCha20-Poly1305**: Best compatibility across devices

### Memory Usage
- **Automatic Cleanup**: Sensitive data automatically cleared
- **Configurable Timeouts**: Adjust based on security requirements
- **Memory Pressure Handling**: Graceful degradation under memory constraints

## Migration Guide

### From Basic Registration

If you're migrating from the basic `RegisterForm` component:

```vue
<!-- Before -->
<RegisterForm
  @success="handleSuccess"
  @error="handleError"
/>

<!-- After -->
<SecureRegistrationFlow
  @success="handleRegistrationSuccess"
  @error="handleRegistrationError"
  @complete="handleRegistrationComplete"
/>
```

### Update Event Handlers

```typescript
// Before
const handleSuccess = (data: { email: string; isNewUser: boolean }) => {
  // Handle success
}

// After
const handleRegistrationSuccess = (data: { 
  email: string; 
  isNewUser: boolean; 
  method: 'email' | 'google' 
}) => {
  // Handle success with method information
}

const handleRegistrationComplete = (data: { method: string }) => {
  // Handle final completion
  router.push('/dashboard')
}
```

## API Reference

### SecureRegistrationFlow Component

#### Events
- `@success`: Emitted when registration succeeds
- `@error`: Emitted when registration fails  
- `@complete`: Emitted when registration flow is complete

### SecureAuthService

#### Methods
- `registerSecure(data: SecureRegistrationData): Promise<SecureAuthResult>`
- `signInSecure(email: string, password: string): Promise<SecureAuthResult>`
- `generateSecurePassword(length?: number): Promise<string>`
- `validatePasswordStrength(password: string): PasswordStrengthResult`
- `cleanup(): Promise<void>`

## Support

For additional support or questions about the secure registration system:

1. **Documentation**: Check this guide and inline code comments
2. **Security Issues**: Report through proper security channels
3. **Performance Issues**: Profile with browser dev tools
4. **Integration Help**: Review the example implementations above

Remember: Security is paramount in ZK-Vault. Always prioritize security over convenience, and never compromise on cryptographic best practices. 