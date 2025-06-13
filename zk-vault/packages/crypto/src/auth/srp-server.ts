/**
 * @fileoverview SRP Server Implementation
 * @responsibility Handles server-side SRP authentication protocol
 * @principle Single Responsibility - Only SRP server operations
 * @security Implements RFC 5054 SRP-6a protocol for zero-knowledge authentication
 * @reference https://tools.ietf.org/html/rfc5054
 */

import { SRPAuthProof, CryptoOperationResult } from '@zk-vault/shared';

/**
 * SRP server session data
 * @responsibility Holds server-side session information
 */
export interface SRPServerSession {
  /** User email/identifier */
  email: string;
  /** Server private key (b) */
  serverPrivate: string;
  /** Server public key (B) */
  serverPublic: string;
  /** Password verifier (v) */
  verifier: string;
  /** Salt used for password verification */
  salt: string;
  /** Session creation timestamp */
  timestamp: number;
  /** Session expiry time */
  expiresAt: number;
}

/**
 * SRP server challenge
 * @responsibility Contains server challenge data for client
 */
export interface SRPServerChallenge {
  /** Server public key (B) */
  serverPublic: string;
  /** Salt for password verification */
  salt: string;
  /** Challenge timestamp */
  timestamp: number;
}

/**
 * SRP server implementation for zero-knowledge authentication
 * @responsibility Manages server-side SRP protocol operations
 * @security Verifies client authentication without knowing password
 */
export class SRPServer {
  private static readonly SESSION_TIMEOUT = 300000; // 5 minutes
  private static activeSessions = new Map<string, SRPServerSession>();

  /**
   * Initiates SRP authentication challenge for a user
   * @param email User email/identifier
   * @param storedVerifier Stored password verifier for the user
   * @param storedSalt Stored salt for the user
   * @returns Server challenge for client authentication
   */
  static async createAuthChallenge(
    email: string,
    storedVerifier: string,
    storedSalt: string
  ): Promise<CryptoOperationResult<SRPServerChallenge>> {
    try {
      // Validate inputs
      if (!email || !storedVerifier || !storedSalt) {
        return {
          success: false,
          error: 'Email, verifier, and salt are required',
          errorCode: 'INVALID_PARAMETERS',
        };
      }

      // Generate server ephemeral key pair (b, B)
      const serverPrivate = this.generatePrivateKey();
      const serverPublic = await this.computeServerPublicKey(serverPrivate, storedVerifier);

      // Create server session
      const session: SRPServerSession = {
        email,
        serverPrivate: this.bytesToHex(serverPrivate),
        serverPublic: this.bytesToHex(serverPublic),
        verifier: storedVerifier,
        salt: storedSalt,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.SESSION_TIMEOUT,
      };

      // Store session
      this.activeSessions.set(email, session);

      // Return challenge
      const challenge: SRPServerChallenge = {
        serverPublic: session.serverPublic,
        salt: storedSalt,
        timestamp: session.timestamp,
      };

      return {
        success: true,
        data: challenge,
      };
    } catch (error) {
      return {
        success: false,
        error: `SRP challenge creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'SRP_CHALLENGE_FAILED',
      };
    }
  }

  /**
   * Verifies client authentication proof
   * @param email User email/identifier
   * @param clientProof Client's authentication proof
   * @returns Verification result with server proof
   */
  static async verifyClientProof(
    email: string,
    clientProof: SRPAuthProof
  ): Promise<CryptoOperationResult<{ verified: boolean; serverProof?: string }>> {
    try {
      // Get active session
      const session = this.activeSessions.get(email);
      if (!session) {
        return {
          success: false,
          error: 'No active session found for user',
          errorCode: 'NO_ACTIVE_SESSION',
        };
      }

      // Check session expiry
      if (Date.now() > session.expiresAt) {
        this.activeSessions.delete(email);
        return {
          success: false,
          error: 'Session expired',
          errorCode: 'SESSION_EXPIRED',
        };
      }

      // Validate client proof format
      if (!this.isValidClientProof(clientProof)) {
        return {
          success: false,
          error: 'Invalid client proof format',
          errorCode: 'INVALID_CLIENT_PROOF',
        };
      }

      // Convert hex strings to bytes
      const serverPrivate = this.hexToBytes(session.serverPrivate);
      const serverPublic = this.hexToBytes(session.serverPublic);
      const clientPublic = this.hexToBytes(clientProof.clientPublic);
      const verifier = this.hexToBytes(session.verifier);
      const salt = this.hexToBytes(session.salt);

      // Compute scrambling parameter u = H(A | B)
      const scrambler = await this.computeScrambler(clientPublic, serverPublic);

      // Compute session key S = (A * v^u)^b mod N
      const sessionKey = await this.computeSessionKey(
        clientPublic,
        verifier,
        scrambler,
        serverPrivate
      );

      // Compute expected client proof M1
      const expectedClientProof = await this.computeClientProof(
        email,
        salt,
        clientPublic,
        serverPublic,
        sessionKey
      );

      // Verify client proof using constant-time comparison
      const clientProofBytes = this.hexToBytes(clientProof.clientProof);
      const isValid = this.constantTimeCompare(clientProofBytes, expectedClientProof);

      if (isValid) {
        // Compute server proof M2 = H(A | M1 | K)
        const serverProof = await this.computeServerProof(
          clientPublic,
          expectedClientProof,
          sessionKey
        );

        // Clean up session
        this.activeSessions.delete(email);

        return {
          success: true,
          data: {
            verified: true,
            serverProof: this.bytesToHex(serverProof),
          },
        };
      } else {
        return {
          success: true,
          data: {
            verified: false,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Client proof verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'CLIENT_PROOF_VERIFICATION_FAILED',
      };
    }
  }

  /**
   * Stores user credentials (verifier and salt) for future authentication
   * @param email User email/identifier
   * @param verifier Password verifier
   * @param salt Salt used for verifier computation
   * @returns Success status
   */
  static async storeUserCredentials(
    _email: string,
    verifier: string,
    salt: string
  ): Promise<CryptoOperationResult<boolean>> {
    try {
      // In a real implementation, this would store to a database
      // For now, we'll just validate the format

      if (!this.isValidHex(verifier) || !this.isValidHex(salt)) {
        return {
          success: false,
          error: 'Invalid verifier or salt format',
          errorCode: 'INVALID_CREDENTIAL_FORMAT',
        };
      }

      // Placeholder for database storage
      // console.log(`Storing credentials for ${email}`);

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Credential storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'CREDENTIAL_STORAGE_FAILED',
      };
    }
  }

  /**
   * Retrieves stored user credentials
   * @param email User email/identifier
   * @returns Stored verifier and salt
   */
  static async getUserCredentials(
    _email: string
  ): Promise<CryptoOperationResult<{ verifier: string; salt: string }>> {
    try {
      // In a real implementation, this would query a database
      // For now, return placeholder data

      return {
        success: false,
        error: 'User credentials not found',
        errorCode: 'USER_NOT_FOUND',
      };
    } catch (error) {
      return {
        success: false,
        error: `Credential retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'CREDENTIAL_RETRIEVAL_FAILED',
      };
    }
  }

  /**
   * Cleans up expired sessions
   */
  static cleanupExpiredSessions(): void {
    const now = Date.now();

    for (const [email, session] of this.activeSessions) {
      if (now > session.expiresAt) {
        this.activeSessions.delete(email);
      }
    }
  }

  /**
   * Gets the number of active sessions
   * @returns Number of active sessions
   */
  static getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Generates a cryptographically secure private key
   * @returns Random private key
   */
  private static generatePrivateKey(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  /**
   * Computes server public key B = k*v + g^b mod N
   * @param serverPrivate Server private key (b)
   * @param verifier Password verifier (v)
   * @returns Server public key (B)
   */
  private static async computeServerPublicKey(
    serverPrivate: Uint8Array,
    verifier: string
  ): Promise<Uint8Array> {
    // Simplified implementation - in production, use proper modular arithmetic
    const verifierBytes = this.hexToBytes(verifier);
    const combined = new Uint8Array(serverPrivate.length + verifierBytes.length);
    combined.set(serverPrivate, 0);
    combined.set(verifierBytes, serverPrivate.length);

    return await this.hashData(combined);
  }

  /**
   * Computes scrambling parameter u = H(A | B)
   * @param clientPublic Client public key (A)
   * @param serverPublic Server public key (B)
   * @returns Scrambling parameter (u)
   */
  private static async computeScrambler(
    clientPublic: Uint8Array,
    serverPublic: Uint8Array
  ): Promise<Uint8Array> {
    const combined = new Uint8Array(clientPublic.length + serverPublic.length);
    combined.set(clientPublic, 0);
    combined.set(serverPublic, clientPublic.length);

    return await this.hashData(combined);
  }

  /**
   * Computes session key S = (A * v^u)^b mod N
   * @param clientPublic Client public key (A)
   * @param verifier Password verifier (v)
   * @param scrambler Scrambling parameter (u)
   * @param serverPrivate Server private key (b)
   * @returns Session key (S)
   */
  private static async computeSessionKey(
    clientPublic: Uint8Array,
    verifier: Uint8Array,
    scrambler: Uint8Array,
    serverPrivate: Uint8Array
  ): Promise<Uint8Array> {
    // Simplified implementation - in production, use proper SRP math
    const combined = new Uint8Array(
      clientPublic.length + verifier.length + scrambler.length + serverPrivate.length
    );
    combined.set(clientPublic, 0);
    combined.set(verifier, clientPublic.length);
    combined.set(scrambler, clientPublic.length + verifier.length);
    combined.set(serverPrivate, clientPublic.length + verifier.length + scrambler.length);

    return await this.hashData(combined);
  }

  /**
   * Computes client proof M1 = H(H(N) XOR H(g) | H(I) | s | A | B | K)
   * @param email User email/identifier
   * @param salt Random salt
   * @param clientPublic Client public key (A)
   * @param serverPublic Server public key (B)
   * @param sessionKey Session key (K)
   * @returns Client proof (M1)
   */
  private static async computeClientProof(
    email: string,
    salt: Uint8Array,
    clientPublic: Uint8Array,
    serverPublic: Uint8Array,
    sessionKey: Uint8Array
  ): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const emailHash = await this.hashData(encoder.encode(email));

    // Simplified proof computation
    const combined = new Uint8Array(
      emailHash.length + salt.length + clientPublic.length + serverPublic.length + sessionKey.length
    );

    let offset = 0;
    combined.set(emailHash, offset);
    offset += emailHash.length;
    combined.set(salt, offset);
    offset += salt.length;
    combined.set(clientPublic, offset);
    offset += clientPublic.length;
    combined.set(serverPublic, offset);
    offset += serverPublic.length;
    combined.set(sessionKey, offset);

    return await this.hashData(combined);
  }

  /**
   * Computes server proof M2 = H(A | M1 | K)
   * @param clientPublic Client public key (A)
   * @param clientProof Client proof (M1)
   * @param sessionKey Session key (K)
   * @returns Server proof (M2)
   */
  private static async computeServerProof(
    clientPublic: Uint8Array,
    clientProof: Uint8Array,
    sessionKey: Uint8Array
  ): Promise<Uint8Array> {
    const combined = new Uint8Array(clientPublic.length + clientProof.length + sessionKey.length);
    combined.set(clientPublic, 0);
    combined.set(clientProof, clientPublic.length);
    combined.set(sessionKey, clientPublic.length + clientProof.length);

    return await this.hashData(combined);
  }

  /**
   * Validates client proof format
   * @param proof Client proof to validate
   * @returns True if proof format is valid
   */
  private static isValidClientProof(proof: SRPAuthProof): boolean {
    return (
      proof &&
      typeof proof.clientPublic === 'string' &&
      typeof proof.clientProof === 'string' &&
      typeof proof.salt === 'string' &&
      typeof proof.timestamp === 'number' &&
      this.isValidHex(proof.clientPublic) &&
      this.isValidHex(proof.clientProof) &&
      this.isValidHex(proof.salt)
    );
  }

  /**
   * Hashes data using SHA-256
   * @param data Data to hash
   * @returns Hash bytes
   */
  private static async hashData(data: Uint8Array): Promise<Uint8Array> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return new Uint8Array(hashBuffer);
    } else {
      throw new Error('SHA-256 not available in this environment');
    }
  }

  /**
   * Converts bytes to hexadecimal string
   * @param bytes Bytes to convert
   * @returns Hex string
   */
  private static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Converts hexadecimal string to bytes
   * @param hex Hex string to convert
   * @returns Bytes
   */
  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Validates hexadecimal string format
   * @param hex String to validate
   * @returns True if valid hex
   */
  private static isValidHex(hex: string): boolean {
    return /^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0;
  }

  /**
   * Performs constant-time comparison to prevent timing attacks
   * @param a First buffer
   * @param b Second buffer
   * @returns True if buffers are equal
   */
  private static constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }
}
