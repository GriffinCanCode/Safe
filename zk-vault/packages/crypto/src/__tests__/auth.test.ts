/**
 * @fileoverview Authentication Tests
 * @responsibility Tests all authentication implementations
 */

import { TestUtils } from './setup';
import { ZeroKnowledgeAuth } from '../auth/zero-knowledge-auth';
import { SRPClient } from '../auth/srp-client';
import { SRPServer } from '../auth/srp-server';

describe('Zero-Knowledge Authentication', () => {
  const testEmail = TestUtils.createTestEmail();
  const testPassword = TestUtils.createTestPassword();

  describe('Challenge Generation', () => {
    test('should generate authentication challenge', () => {
      const challenge = ZeroKnowledgeAuth.generateChallenge();

      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
      expect(/^[0-9a-fA-F]+$/.test(challenge)).toBe(true); // Should be hex
    });

    test('should generate different challenges each time', () => {
      const challenge1 = ZeroKnowledgeAuth.generateChallenge();
      const challenge2 = ZeroKnowledgeAuth.generateChallenge();

      expect(challenge1).not.toBe(challenge2);
    });
  });

  describe('Authentication Proof', () => {
    test('should generate authentication proof', async () => {
      const challenge = ZeroKnowledgeAuth.generateChallenge();
      const result = await ZeroKnowledgeAuth.generateAuthProof(testEmail, testPassword, challenge);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.clientProof).toBeDefined();
      expect(result.data!.clientPublic).toBeDefined();
      expect(result.data!.salt).toBeDefined();
      expect(result.data!.timestamp).toBeGreaterThan(0);
    });

    test('should verify authentication proof', async () => {
      const challenge = ZeroKnowledgeAuth.generateChallenge();
      const proofResult = await ZeroKnowledgeAuth.generateAuthProof(
        testEmail,
        testPassword,
        challenge
      );
      expect(proofResult.success).toBe(true);

      const verifyResult = await ZeroKnowledgeAuth.verifyAuthProof(
        proofResult.data!,
        testEmail,
        challenge
      );

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data).toBe(true);
    });

    test('should reject expired proof', async () => {
      const challenge = ZeroKnowledgeAuth.generateChallenge();
      const proofResult = await ZeroKnowledgeAuth.generateAuthProof(
        testEmail,
        testPassword,
        challenge
      );
      expect(proofResult.success).toBe(true);

      // Modify timestamp to be old
      proofResult.data!.timestamp = Date.now() - 400000; // 6+ minutes ago

      const verifyResult = await ZeroKnowledgeAuth.verifyAuthProof(
        proofResult.data!,
        testEmail,
        challenge
      );

      expect(verifyResult.success).toBe(false);
      expect(verifyResult.errorCode).toBe('AUTH_EXPIRED');
    });

    test('should reject malformed proof', async () => {
      const challenge = ZeroKnowledgeAuth.generateChallenge();
      const malformedProof = {
        clientPublic: 'invalid-hex',
        clientProof: '',
        timestamp: Date.now(),
        salt: 'also-invalid',
      };

      const verifyResult = await ZeroKnowledgeAuth.verifyAuthProof(
        malformedProof,
        testEmail,
        challenge
      );

      expect(verifyResult.success).toBe(false);
      expect(verifyResult.errorCode).toBe('INVALID_PROOF_FORMAT');
    });
  });

  describe('Authentication Result Creation', () => {
    test('should create successful auth result', () => {
      const result = ZeroKnowledgeAuth.createAuthResult(true, testEmail);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.email).toBe(testEmail);
      expect(result.user!.uid).toBeDefined();
      expect(result.user!.preferences).toBeDefined();
      expect(result.user!.security).toBeDefined();
    });

    test('should create failed auth result', () => {
      const result = ZeroKnowledgeAuth.createAuthResult(false, undefined, 'Invalid credentials');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.errorCode).toBe('unknown-error');
      expect(result.user).toBeUndefined();
    });

    test('should generate consistent user IDs', () => {
      const result1 = ZeroKnowledgeAuth.createAuthResult(true, testEmail);
      const result2 = ZeroKnowledgeAuth.createAuthResult(true, testEmail);

      expect(result1.user!.uid).toBe(result2.user!.uid);
    });

    test('should generate different user IDs for different emails', () => {
      const result1 = ZeroKnowledgeAuth.createAuthResult(true, 'user1@example.com');
      const result2 = ZeroKnowledgeAuth.createAuthResult(true, 'user2@example.com');

      expect(result1.user!.uid).not.toBe(result2.user!.uid);
    });
  });
});

describe('SRP Client', () => {
  const testEmail = TestUtils.createTestEmail();
  const testPassword = TestUtils.createTestPassword();

  describe('Registration', () => {
    test('should generate registration data', async () => {
      const result = await SRPClient.initializeAuthentication(testEmail, testPassword);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.salt).toBeDefined();
      expect(result.data!.verifier).toBeDefined();
      expect(result.data!.email).toBe(testEmail);
    });

    test('should generate different verifiers for different passwords', async () => {
      const result1 = await SRPClient.initializeAuthentication(testEmail, 'password1');
      const result2 = await SRPClient.initializeAuthentication(testEmail, 'password2');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data!.verifier).not.toBe(result2.data!.verifier);
    });

    test('should validate registration parameters', async () => {
      // Empty email
      const emptyEmailResult = await SRPClient.initializeAuthentication('', testPassword);
      expect(emptyEmailResult.success).toBe(false);

      // Empty password
      const emptyPasswordResult = await SRPClient.initializeAuthentication(testEmail, '');
      expect(emptyPasswordResult.success).toBe(false);
    });

    test('should be deterministic for same inputs', async () => {
      const result1 = await SRPClient.initializeAuthentication(testEmail, testPassword);
      const result2 = await SRPClient.initializeAuthentication(testEmail, testPassword);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data!.verifier).toBe(result2.data!.verifier);
    });
  });

  describe('Authentication', () => {
    test('should start authentication', async () => {
      const result = await SRPClient.initializeAuthentication(testEmail, testPassword);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.clientPublic).toBeDefined();
      expect(result.data!.email).toBe(testEmail);
    });

    test('should validate email format', async () => {
      const invalidEmailResult = await SRPClient.initializeAuthentication(
        'invalid-email',
        testPassword
      );
      expect(invalidEmailResult.success).toBe(false);

      const emptyEmailResult = await SRPClient.initializeAuthentication('', testPassword);
      expect(emptyEmailResult.success).toBe(false);
    });

    test('should generate different client public keys', async () => {
      const result1 = await SRPClient.initializeAuthentication(testEmail, testPassword);
      const result2 = await SRPClient.initializeAuthentication(testEmail, testPassword);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data!.clientPublic).not.toBe(result2.data!.clientPublic);
    });
  });
});

describe('SRP Server', () => {
  const testEmail = TestUtils.createTestEmail();
  const testPassword = TestUtils.createTestPassword();

  describe('User Registration', () => {
    test('should register user', async () => {
      const clientResult = await SRPClient.initializeAuthentication(testEmail, testPassword);
      expect(clientResult.success).toBe(true);

      const serverResult = await SRPServer.createAuthChallenge(
        testEmail,
        clientResult.data!.verifier,
        clientResult.data!.salt
      );

      expect(serverResult.success).toBe(true);
      expect(serverResult.data).toBeDefined();
      expect(serverResult.data!.serverPublic).toBeDefined();
      expect(serverResult.data!.salt).toBe(clientResult.data!.salt);
    });

    test('should validate registration data', async () => {
      const result = await SRPServer.createAuthChallenge('', '', '');
      expect(result.success).toBe(false);
    });
  });

  describe('User Lookup', () => {
    test('should find registered user', async () => {
      // Register user first
      const clientResult = await SRPClient.initializeAuthentication(testEmail, testPassword);
      expect(clientResult.success).toBe(true);

      const serverResult = await SRPServer.createAuthChallenge(
        testEmail,
        clientResult.data!.verifier,
        clientResult.data!.salt
      );
      expect(serverResult.success).toBe(true);

      // Look up user
      const clientProof = await SRPClient.generateAuthProof(
        clientResult.data!,
        serverResult.data!.serverPublic,
        testPassword
      );

      expect(clientProof.success).toBe(true);
      expect(clientProof.data).toBeDefined();
      expect(clientProof.data!.clientProof).toBeDefined();
      expect(clientProof.data!.salt).toBe(clientResult.data!.salt);
    });

    test('should handle non-existent user', async () => {
      const result = await SRPServer.verifyClientProof('nonexistent@example.com', {
        clientPublic: 'invalid',
        clientProof: 'invalid',
        timestamp: Date.now(),
        salt: 'invalid',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_ACTIVE_SESSION');
    });
  });
});
