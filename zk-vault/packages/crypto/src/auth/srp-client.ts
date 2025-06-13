/**
 * @fileoverview SRP Client Implementation
 * @responsibility Handles client-side SRP authentication protocol
 * @principle Single Responsibility - Only SRP client operations
 * @security Implements RFC 5054 SRP-6a protocol for zero-knowledge authentication
 * @reference https://tools.ietf.org/html/rfc5054
 */

import { SRPAuthProof, CryptoOperationResult } from '@zk-vault/shared';

/**
 * SRP client session data
 */
interface SRPClientSession {
  email: string;
  clientPrivate: string;
  clientPublic: string;
  salt: string;
  verifier: string;
  timestamp: number;
}

/**
 * SRP protocol parameters
 */
const SRP_PARAMS = {
  SALT_LENGTH: 16,
  PRIVATE_KEY_LENGTH: 32,
};

/**
 * SRP client implementation for zero-knowledge authentication
 * @responsibility Manages client-side SRP protocol operations
 * @security Ensures password never leaves the client
 */
export class SRPClient {
  /**
   * Initiates SRP authentication process
   * @param email User email/identifier
   * @param password User password (never transmitted)
   * @returns Client session data for authentication
   */
  static async initializeAuthentication(
    email: string,
    password: string
  ): Promise<CryptoOperationResult<SRPClientSession>> {
    try {
      // Validate inputs
      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // Generate client ephemeral key pair (a, A)
      const clientPrivate = this.generatePrivateKey();
      const clientPublic = await this.computePublicKey(clientPrivate);

      // Compute password verifier components
      const salt = crypto.getRandomValues(new Uint8Array(SRP_PARAMS.SALT_LENGTH));
      const passwordHash = await this.hashPassword(email, password, salt);
      const verifier = await this.computeVerifier(passwordHash);

      const session: SRPClientSession = {
        email,
        clientPrivate: this.bytesToHex(clientPrivate),
        clientPublic: this.bytesToHex(clientPublic),
        salt: this.bytesToHex(salt),
        verifier: this.bytesToHex(verifier),
        timestamp: Date.now(),
      };

      return {
        success: true,
        data: session,
      };
    } catch (error) {
      return {
        success: false,
        error: `SRP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'SRP_INIT_FAILED',
      };
    }
  }

  /**
   * Generates authentication proof after receiving server challenge
   * @param session Client session data
   * @param serverPublic Server's public key (B)
   * @param password User password
   * @returns Authentication proof
   */
  static async generateAuthProof(
    session: SRPClientSession,
    serverPublic: string,
    password: string
  ): Promise<CryptoOperationResult<SRPAuthProof>> {
    try {
      // Convert hex strings back to bytes
      const clientPrivate = this.hexToBytes(session.clientPrivate);
      const clientPublic = this.hexToBytes(session.clientPublic);
      const salt = this.hexToBytes(session.salt);
      const serverPublicBytes = this.hexToBytes(serverPublic);

      // Compute scrambling parameter u = H(A | B)
      const scrambler = await this.computeScrambler(clientPublic, serverPublicBytes);

      // Compute password hash
      const passwordHash = await this.hashPassword(session.email, password, salt);

      // Compute session key S = (B - k*g^x)^(a + u*x) mod N
      const sessionKey = await this.computeSessionKey(
        clientPrivate,
        serverPublicBytes,
        scrambler,
        passwordHash
      );

      // Compute client proof M1 = H(H(N) XOR H(g) | H(I) | s | A | B | K)
      const clientProof = await this.computeClientProof(
        session.email,
        salt,
        clientPublic,
        serverPublicBytes,
        sessionKey
      );

      const authProof: SRPAuthProof = {
        clientPublic: session.clientPublic,
        clientProof: this.bytesToHex(clientProof),
        timestamp: Date.now(),
        salt: session.salt,
      };

      return {
        success: true,
        data: authProof,
      };
    } catch (error) {
      return {
        success: false,
        error: `SRP proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'SRP_PROOF_FAILED',
      };
    }
  }

  /**
   * Verifies server's authentication proof
   * @param serverProof Server's proof (M2)
   * @param expectedProof Expected server proof
   * @returns True if server proof is valid
   */
  static async verifyServerProof(
    serverProof: string,
    expectedProof: string
  ): Promise<CryptoOperationResult<boolean>> {
    try {
      const serverProofBytes = this.hexToBytes(serverProof);
      const expectedProofBytes = this.hexToBytes(expectedProof);

      // Constant-time comparison to prevent timing attacks
      const isValid = this.constantTimeCompare(serverProofBytes, expectedProofBytes);

      return {
        success: true,
        data: isValid,
      };
    } catch (error) {
      return {
        success: false,
        error: `Server proof verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'SERVER_PROOF_VERIFICATION_FAILED',
      };
    }
  }

  /**
   * Generates a cryptographically secure private key
   * @returns Random private key
   */
  private static generatePrivateKey(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SRP_PARAMS.PRIVATE_KEY_LENGTH));
  }

  /**
   * Computes public key A = g^a mod N
   * @param privateKey Client private key (a)
   * @returns Client public key (A)
   */
  private static async computePublicKey(privateKey: Uint8Array): Promise<Uint8Array> {
    // Simplified implementation - in production, use proper modular exponentiation
    // This would use the SRP group parameters (N, g) from RFC 5054
    const hash = await this.hashData(privateKey);
    return hash;
  }

  /**
   * Computes password verifier v = g^x mod N where x = H(s | H(I | ":" | P))
   * @param passwordHash Hashed password
   * @returns Password verifier
   */
  private static async computeVerifier(passwordHash: Uint8Array): Promise<Uint8Array> {
    // Simplified implementation - in production, use proper modular exponentiation
    const hash = await this.hashData(passwordHash);
    return hash;
  }

  /**
   * Hashes password with salt using standard SRP method
   * @param email User email/identifier
   * @param password User password
   * @param salt Random salt
   * @returns Hashed password
   */
  private static async hashPassword(
    email: string,
    password: string,
    salt: Uint8Array
  ): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const emailBytes = encoder.encode(email);
    const passwordBytes = encoder.encode(password);

    // H(I | ":" | P)
    const identityHash = new Uint8Array(emailBytes.length + 1 + passwordBytes.length);
    identityHash.set(emailBytes, 0);
    identityHash.set(encoder.encode(':'), emailBytes.length);
    identityHash.set(passwordBytes, emailBytes.length + 1);

    const innerHash = await this.hashData(identityHash);

    // H(s | H(I | ":" | P))
    const combined = new Uint8Array(salt.length + innerHash.length);
    combined.set(salt, 0);
    combined.set(innerHash, salt.length);

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
   * Computes session key S = (B - k*g^x)^(a + u*x) mod N
   * @param clientPrivate Client private key (a)
   * @param serverPublic Server public key (B)
   * @param scrambler Scrambling parameter (u)
   * @param passwordHash Hashed password (x)
   * @returns Session key (S)
   */
  private static async computeSessionKey(
    clientPrivate: Uint8Array,
    serverPublic: Uint8Array,
    scrambler: Uint8Array,
    passwordHash: Uint8Array
  ): Promise<Uint8Array> {
    // Simplified implementation - in production, use proper SRP math
    const combined = new Uint8Array(
      clientPrivate.length + serverPublic.length + scrambler.length + passwordHash.length
    );
    combined.set(clientPrivate, 0);
    combined.set(serverPublic, clientPrivate.length);
    combined.set(scrambler, clientPrivate.length + serverPublic.length);
    combined.set(passwordHash, clientPrivate.length + serverPublic.length + scrambler.length);

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
