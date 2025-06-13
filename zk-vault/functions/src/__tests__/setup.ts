/**
 * Test Setup for Firebase Functions
 * Configures test environment and utilities
 */

import * as admin from "firebase-admin";
import testUtils from "firebase-functions-test";

// Initialize Firebase test environment
const test = testUtils({
  projectId: "zk-vault-test",
  databaseURL: "https://zk-vault-test.firebaseio.com",
});

// Initialize Firebase Admin SDK for testing
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "zk-vault-test",
    credential: admin.credential.applicationDefault(),
  });
}

// Test utilities and helpers
export class TestHelper {
  /**
   * Creates a mock callable context
   */
  static createCallableContext(
    uid?: string,
    email?: string,
    isAdmin: boolean = false,
    customClaims: Record<string, any> = {},
  ) {
    const auth = uid
      ? {
          uid,
          email: email || `test-${uid}@example.com`,
          token: {
            iss: "https://securetoken.google.com/zk-vault-test",
            aud: "zk-vault-test",
            auth_time: Math.floor(Date.now() / 1000),
            user_id: uid,
            sub: uid,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            email: email || `test-${uid}@example.com`,
            email_verified: true,
            firebase: {
              identities: {
                email: [email || `test-${uid}@example.com`],
              },
              sign_in_provider: "custom",
            },
            ...customClaims,
          },
        }
      : undefined;

    return {
      auth,
      rawRequest: {
        ip: "127.0.0.1",
        headers: {
          "user-agent": "test-agent",
        },
      },
    };
  }

  /**
   * Creates test user data
   */
  static createTestUser(uid: string = "test-user-123") {
    return {
      uid,
      email: `test-${uid}@example.com`,
      password: "TestPassword123!",
      displayName: "Test User",
    };
  }

  /**
   * Creates test file data
   */
  static createTestFileData(size: number = 1024): Uint8Array {
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = i % 256;
    }
    return data;
  }

  /**
   * Creates test vault item
   */
  static createTestVaultItem() {
    return {
      id: "test-item-123",
      type: "password",
      name: "Test Service",
      url: "https://example.com",
      username: "testuser",
      password: "secretpassword",
      notes: "Test notes",
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
  }

  /**
   * Creates test encrypted data
   */
  static createTestEncryptedData() {
    return {
      ciphertext: new Uint8Array([1, 2, 3, 4, 5]),
      nonce: new Uint8Array([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]),
      authTag: new Uint8Array([
        18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
      ]),
      algorithm: "AES-256-GCM" as const,
      timestamp: Date.now(),
    };
  }

  /**
   * Cleans up test data from Firestore
   */
  static async cleanupFirestore(collections: string[] = []) {
    const db = admin.firestore();

    const defaultCollections = [
      "users",
      "auth",
      "authSessions",
      "files",
      "vaults",
      "fileShares",
      "systemLogs",
      "securityLogs",
      "auditLogs",
    ];

    const collectionsToClean =
      collections.length > 0 ? collections : defaultCollections;

    for (const collectionName of collectionsToClean) {
      const collection = db.collection(collectionName);
      const snapshot = await collection.get();

      const batch = db.batch();
      snapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
        batch.delete(doc.ref);
      });

      if (!snapshot.empty) {
        await batch.commit();
      }
    }
  }

  /**
   * Waits for a specified amount of time
   */
  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates a random string
   */
  static randomString(length: number = 10): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Creates a test rate limit document
   */
  static async createTestRateLimit(
    userId: string,
    endpoint: string,
    count: number = 0,
  ) {
    const db = admin.firestore();
    await db.collection("rateLimits").doc(`user_${userId}_${endpoint}`).set({
      userId,
      endpoint,
      requestCount: count,
      windowStartTime: admin.firestore.Timestamp.now(),
      lastRequest: admin.firestore.Timestamp.now(),
      blocked: false,
    });
  }

  /**
   * Creates test admin user
   */
  static async createTestAdmin(uid: string = "admin-user-123") {
    const db = admin.firestore();
    await db
      .collection("users")
      .doc(uid)
      .set({
        uid,
        email: `admin-${uid}@example.com`,
        isAdmin: true,
        created: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    return uid;
  }
}

// Export test environment
export { test };

// Global test teardown
export const teardown = () => {
  test.cleanup();
};
