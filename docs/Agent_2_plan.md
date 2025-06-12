# Agent 2: Backend Infrastructure Implementation Plan

## Mission
You are responsible for building the entire server-side infrastructure including Firebase Cloud Functions, security rules, and deployment infrastructure. Your code must handle zero-knowledge operations without ever accessing plaintext data.

## Critical Success Factors
1. **Never access plaintext** - Server must remain zero-knowledge
2. **Mock Firebase services first** - Allow frontend to develop immediately
3. **Robust security rules** - Prevent any data breaches
4. **Cost-optimized** - Efficient use of Firebase resources

## Deliverables Overview

### Week 1: Infrastructure & Mocks
- [ ] Firebase project setup and configuration
- [ ] Mock Cloud Functions with realistic responses
- [ ] Security rules skeleton
- [ ] Basic Terraform infrastructure

### Week 2-3: Real Implementation
- [ ] SRP authentication functions
- [ ] Vault operation functions
- [ ] File management with chunking
- [ ] Security monitoring functions
- [ ] Rate limiting and abuse prevention

### Week 4: Production Readiness
- [ ] Performance optimization
- [ ] Cost analysis and optimization
- [ ] Security hardening
- [ ] Deployment automation

## Detailed Implementation Steps

### Phase 1: Project Setup (Day 1)

1. **Initialize Firebase Project**
```bash
# Create project structure
mkdir -p zk-vault/functions/src/{auth,vault,files,security,admin,utils}
cd zk-vault

# Initialize Firebase
firebase init
# Select: Functions, Firestore, Storage, Hosting
# Choose TypeScript
# Enable ESLint
```

2. **Configure Firebase Rules Templates**

**firestore.rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function hasRequiredFields(fields) {
      return request.resource.data.keys().hasAll(fields);
    }
    
    function isValidEncryptedData() {
      return request.resource.data.encrypted is map
        && request.resource.data.encrypted.keys().hasAll(['data', 'iv', 'algorithm'])
        && request.resource.data.encrypted.data is string
        && request.resource.data.encrypted.iv is string;
    }
    
    // User profile (public keys for sharing)
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId)
        && hasRequiredFields(['publicKey', 'email']);
    }
    
    // Encrypted vault data
    match /vaults/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId)
        && isValidEncryptedData();
        
      // Vault items
      match /items/{itemId} {
        allow read: if isOwner(userId);
        allow create: if isOwner(userId)
          && isValidEncryptedData()
          && request.resource.data.created == request.time;
        allow update: if isOwner(userId)
          && isValidEncryptedData()
          && request.resource.data.modified == request.time
          && resource.data.created == request.resource.data.created;
        allow delete: if isOwner(userId);
      }
    }
    
    // Shared items
    match /shares/{shareId} {
      allow read: if isAuthenticated()
        && (resource.data.from == request.auth.uid 
            || resource.data.to == request.auth.uid);
      allow create: if isAuthenticated()
        && request.auth.uid == request.resource.data.from
        && request.resource.data.keys().hasAll(['from', 'to', 'itemId', 'encryptedKey']);
      allow delete: if isAuthenticated()
        && (resource.data.from == request.auth.uid 
            || resource.data.to == request.auth.uid);
    }
  }
}
```

**storage.rules**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isValidChunk() {
      return request.resource.size <= 5 * 1024 * 1024  // 5MB max chunk
        && request.resource.metadata.keys().hasAll(['iv'])
        && request.resource.metadata.iv is string;
    }
    
    // User file chunks
    match /users/{userId}/chunks/{chunkId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && isValidChunk();
      allow delete: if isOwner(userId);
    }
    
    // Deduplicated chunks (content-addressed)
    match /chunks/{contentHash} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isValidChunk();
      // Never allow deletion of deduplicated chunks
    }
  }
}
```

### Phase 2: Mock Implementations (Day 2-3)

Create mock functions that return realistic data:

**functions/src/mocks/auth-mocks.ts**
```typescript
import * as functions from 'firebase-functions';

// Mock SRP authentication
export const initSRPAuthMock = functions.https.onCall(async (data) => {
  const { email } = data;
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Return mock SRP challenge
  return {
    salt: Buffer.from('mock-salt-' + email).toString('base64'),
    serverPublic: Buffer.from('mock-server-public').toString('base64'),
    sessionId: 'mock-session-' + Date.now()
  };
});

export const verifySRPAuthMock = functions.https.onCall(async (data) => {
  const { email, clientProof, sessionId } = data;
  
  // Simulate verification
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Always succeed in mock mode
  const mockUid = 'mock-user-' + Buffer.from(email).toString('base64').slice(0, 10);
  
  // Create custom token (in real implementation, this would be after SRP verification)
  const customToken = await admin.auth().createCustomToken(mockUid, {
    email: email,
    srpVerified: true
  });
  
  return {
    success: true,
    customToken,
    userId: mockUid
  };
});
```

**functions/src/mocks/vault-mocks.ts**
```typescript
// Mock vault operations
export const createVaultItemMock = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { encrypted, type, metadata } = data;
  
  // Validate encrypted data structure
  if (!encrypted?.data || !encrypted?.iv || !encrypted?.algorithm) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid encrypted data');
  }
  
  // Create mock item
  const itemId = 'mock-item-' + Date.now();
  const item = {
    id: itemId,
    type,
    encrypted,
    metadata: metadata || {},
    created: admin.firestore.FieldValue.serverTimestamp(),
    modified: admin.firestore.FieldValue.serverTimestamp(),
    owner: context.auth.uid
  };
  
  // In real implementation, this would save to Firestore
  return {
    success: true,
    itemId,
    item
  };
});

export const searchVaultMock = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  // Return mock encrypted items
  const mockItems = [
    {
      id: 'mock-1',
      type: 'password',
      encrypted: {
        data: 'base64-encrypted-data-1',
        iv: 'base64-iv-1',
        algorithm: 'AES-256-GCM'
      },
      metadata: { lastUsed: Date.now() - 86400000 }
    },
    {
      id: 'mock-2',
      type: 'note',
      encrypted: {
        data: 'base64-encrypted-data-2',
        iv: 'base64-iv-2',
        algorithm: 'XChaCha20-Poly1305'
      },
      metadata: { favorite: true }
    }
  ];
  
  return {
    items: mockItems,
    hasMore: false,
    nextPageToken: null
  };
});
```

### Phase 3: Real SRP Implementation (Week 2)

Implement actual SRP protocol without crypto dependency:

**functions/src/auth/srp-auth.functions.ts**
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createHash, randomBytes } from 'crypto';

interface SRPSession {
  email: string;
  salt: Buffer;
  verifier: Buffer;
  serverPrivate: Buffer;
  serverPublic: Buffer;
  expectedProof: Buffer;
  created: number;
}

// In-memory session storage (use Redis in production)
const srpSessions = new Map<string, SRPSession>();

// SRP constants
const SRP_N = BigInt('0x' + 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
  '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
  'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
  'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
  'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D' +
  'C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F' +
  '83655D23DCA3AD961C62F356208552BB9ED529077096966D' +
  '670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B' +
  'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9' +
  'DE2BCBF6955817183995497CEA956AE515D2261898FA0510' +
  '15728E5A8AACAA68FFFFFFFFFFFFFFFF');
const SRP_G = BigInt(2);

export const initSRPAuth = functions.https.onCall(async (data) => {
  const { email } = data;
  
  if (!email || !email.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email');
  }
  
  try {
    // Get user's salt and verifier from Firestore
    const userDoc = await admin.firestore()
      .collection('auth')
      .doc(email)
      .get();
    
    let salt: Buffer;
    let verifier: Buffer;
    
    if (!userDoc.exists) {
      // New user - generate salt but don't store yet
      salt = randomBytes(32);
      // Verifier will be set during registration
      throw new functions.https.HttpsError('not-found', 'User not registered');
    } else {
      const userData = userDoc.data()!;
      salt = Buffer.from(userData.salt, 'base64');
      verifier = Buffer.from(userData.verifier, 'base64');
    }
    
    // Generate server ephemeral
    const serverPrivate = randomBytes(32);
    const serverPrivateInt = BigInt('0x' + serverPrivate.toString('hex'));
    
    // B = kv + g^b (simplified without k-multiplier)
    const serverPublic = modPow(SRP_G, serverPrivateInt, SRP_N);
    
    // Create session
    const sessionId = randomBytes(16).toString('hex');
    const session: SRPSession = {
      email,
      salt,
      verifier,
      serverPrivate,
      serverPublic: Buffer.from(serverPublic.toString(16), 'hex'),
      expectedProof: Buffer.alloc(0), // Will be calculated when client responds
      created: Date.now()
    };
    
    srpSessions.set(sessionId, session);
    
    // Clean up old sessions
    setTimeout(() => srpSessions.delete(sessionId), 300000); // 5 minutes
    
    return {
      salt: salt.toString('base64'),
      serverPublic: session.serverPublic.toString('base64'),
      sessionId
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    
    console.error('SRP init error:', error);
    throw new functions.https.HttpsError('internal', 'Authentication failed');
  }
});

// Helper function for modular exponentiation
function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = BigInt(1);
  base = base % modulus;
  
  while (exponent > 0) {
    if (exponent % BigInt(2) === BigInt(1)) {
      result = (result * base) % modulus;
    }
    exponent = exponent / BigInt(2);
    base = (base * base) % modulus;
  }
  
  return result;
}
```

### Phase 4: File Management Implementation

**functions/src/files/chunked-upload.functions.ts**
```typescript
export const initializeFileUpload = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { fileName, fileSize, chunkSize, fileHash } = data;
  
  // Validate inputs
  if (!fileName || !fileSize || !chunkSize || !fileHash) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }
  
  if (chunkSize > 5 * 1024 * 1024) {
    throw new functions.https.HttpsError('invalid-argument', 'Chunk size too large (max 5MB)');
  }
  
  const uploadId = randomBytes(16).toString('hex');
  const totalChunks = Math.ceil(fileSize / chunkSize);
  
  // Create upload session
  await admin.firestore()
    .collection('uploads')
    .doc(uploadId)
    .set({
      userId: context.auth.uid,
      fileName,
      fileSize,
      chunkSize,
      fileHash,
      totalChunks,
      uploadedChunks: [],
      status: 'pending',
      created: admin.firestore.FieldValue.serverTimestamp(),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
  
  // Generate signed URLs for each chunk
  const chunkUrls: string[] = [];
  const bucket = admin.storage().bucket();
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = `users/${context.auth.uid}/uploads/${uploadId}/chunk-${i}`;
    const [signedUrl] = await bucket.file(chunkPath).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      contentType: 'application/octet-stream'
    });
    chunkUrls.push(signedUrl);
  }
  
  return {
    uploadId,
    chunkUrls,
    totalChunks,
    chunkSize
  };
});

export const finalizeFileUpload = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { uploadId, encryptedManifest } = data;
  
  // Verify upload session
  const uploadDoc = await admin.firestore()
    .collection('uploads')
    .doc(uploadId)
    .get();
  
  if (!uploadDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Upload session not found');
  }
  
  const uploadData = uploadDoc.data()!;
  
  if (uploadData.userId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not your upload');
  }
  
  if (uploadData.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Upload already finalized');
  }
  
  // Store encrypted manifest
  const fileId = randomBytes(16).toString('hex');
  await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .collection('files')
    .doc(fileId)
    .set({
      ...encryptedManifest,
      uploadId,
      created: admin.firestore.FieldValue.serverTimestamp(),
      modified: admin.firestore.FieldValue.serverTimestamp()
    });
  
  // Mark upload as complete
  await uploadDoc.ref.update({
    status: 'completed',
    fileId,
    completed: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true, fileId };
});
```

### Phase 5: Security & Monitoring

**functions/src/security/rate-limiting.ts**
```typescript
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (context: functions.https.CallableContext) => string;
}

const rateLimiters = new Map<string, Map<string, number[]>>();

export function rateLimit(config: RateLimitConfig) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const [data, context] = args;
      const key = config.keyGenerator(context);
      const now = Date.now();
      
      // Get or create limiter for this function
      if (!rateLimiters.has(propertyKey)) {
        rateLimiters.set(propertyKey, new Map());
      }
      const limiter = rateLimiters.get(propertyKey)!;
      
      // Get timestamps for this key
      const timestamps = limiter.get(key) || [];
      
      // Remove old timestamps
      const validTimestamps = timestamps.filter(ts => now - ts < config.windowMs);
      
      // Check limit
      if (validTimestamps.length >= config.maxRequests) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many requests. Please try again later.'
        );
      }
      
      // Add current timestamp
      validTimestamps.push(now);
      limiter.set(key, validTimestamps);
      
      // Call original method
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// Usage example:
class VaultFunctions {
  @rateLimit({
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    keyGenerator: (context) => context.auth?.uid || context.rawRequest.ip
  })
  async createItem(data: any, context: functions.https.CallableContext) {
    // Implementation
  }
}
```

### Phase 6: Infrastructure as Code

**infrastructure/terraform/main.tf**
```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

# Enable required APIs
resource "google_project_service" "firebase" {
  service = "firebase.googleapis.com"
}

resource "google_project_service" "firestore" {
  service = "firestore.googleapis.com"
}

resource "google_project_service" "functions" {
  service = "cloudfunctions.googleapis.com"
}

resource "google_project_service" "storage" {
  service = "storage.googleapis.com"
}

# Create Firestore database
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# Create storage buckets
resource "google_storage_bucket" "user_files" {
  name          = "${var.project_id}-user-files"
  location      = var.region
  force_destroy = false

  lifecycle_rule {
    condition {
      age = 7
      matches_prefix = ["uploads/"]
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = ["https://${var.project_id}.web.app"]
    method          = ["GET", "PUT", "POST"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

# Cloud Functions configuration
resource "google_cloudfunctions_function" "auth_functions" {
  name        = "auth-functions"
  runtime     = "nodejs18"
  
  available_memory_mb   = 256
  source_archive_bucket = google_storage_bucket.functions_source.name
  source_archive_object = google_storage_bucket_object.functions_source.name
  
  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.write"
    resource   = "projects/${var.project_id}/databases/(default)/documents/auth/{email}"
  }
}
```

## Error Handling Strategies

### 1. Authentication Failures
```typescript
export async function handleAuthError(error: any): Promise<never> {
  console.error('Auth error:', error);
  
  if (error.code === 'auth/user-not-found') {
    throw new functions.https.HttpsError('not-found', 'Account not found');
  }
  
  if (error.code === 'auth/wrong-password') {
    throw new functions.https.HttpsError('unauthenticated', 'Invalid credentials');
  }
  
  // Don't leak internal errors
  throw new functions.https.HttpsError('internal', 'Authentication failed');
}
```

### 2. Firestore Transaction Handling
```typescript
export async function robustTransaction<T>(
  operation: (transaction: FirebaseFirestore.Transaction) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await admin.firestore().runTransaction(operation);
    } catch (error) {
      lastError = error;
      
      // Don't retry on permanent failures
      if (error.code === 'permission-denied' || error.code === 'invalid-argument') {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
  
  throw lastError;
}
```

## Testing Without Dependencies

### 1. Mock Firestore
```typescript
class MockFirestore {
  private data = new Map<string, any>();
  
  collection(path: string) {
    return {
      doc: (id: string) => ({
        get: async () => ({
          exists: this.data.has(`${path}/${id}`),
          data: () => this.data.get(`${path}/${id}`)
        }),
        set: async (data: any) => {
          this.data.set(`${path}/${id}`, data);
        }
      })
    };
  }
}

// Use in tests
const mockFirestore = new MockFirestore();
```

### 2. Integration Test Harness
```typescript
export class FunctionTestHarness {
  private auth: any = null;
  
  setAuth(uid: string, custom?: any) {
    this.auth = { uid, token: { ...custom } };
  }
  
  async callFunction(fn: any, data: any) {
    const context = {
      auth: this.auth,
      rawRequest: { ip: '127.0.0.1' }
    };
    
    return fn(data, context);
  }
}
```

## Success Metrics
- [ ] All mock functions return realistic data
- [ ] Zero-knowledge principle maintained (no plaintext access)
- [ ] Security rules prevent unauthorized access
- [ ] Rate limiting prevents abuse
- [ ] Cost projection under $100/month for 1000 users
- [ ] All functions respond in <500ms

## Communication Protocol
1. **Day 1-2**: Push mock functions to `functions-mock` branch
2. **Day 3**: Deploy to staging Firebase project
3. **Week 2**: Daily updates to `functions-dev` branch
4. **Week 3**: Deploy to production-like environment
5. **Week 4**: Production deployment ready

## Daily Checklist
- [ ] Test all functions locally
- [ ] Update security rules if needed
- [ ] Check Firebase usage/costs
- [ ] Document any API changes
- [ ] Run security audit
- [ ] Update deployment scripts 