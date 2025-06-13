"use strict";
/**
 * Test Setup for Firebase Functions
 * Configures test environment and utilities
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.teardown = exports.test = exports.TestHelper = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_functions_test_1 = __importDefault(
  require("firebase-functions-test"),
);
// Initialize Firebase test environment
const test = (0, firebase_functions_test_1.default)({
  projectId: "zk-vault-test",
  databaseURL: "https://zk-vault-test.firebaseio.com",
});
exports.test = test;
// Initialize Firebase Admin SDK for testing
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "zk-vault-test",
    credential: admin.credential.applicationDefault(),
  });
}
// Test utilities and helpers
class TestHelper {
  /**
   * Creates a mock callable context
   */
  static createCallableContext(uid, email, isAdmin = false, customClaims = {}) {
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
  static createTestUser(uid = "test-user-123") {
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
  static createTestFileData(size = 1024) {
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
      algorithm: "AES-256-GCM",
      timestamp: Date.now(),
    };
  }
  /**
   * Cleans up test data from Firestore
   */
  static async cleanupFirestore(collections = []) {
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
      snapshot.docs.forEach((doc) => {
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
  static async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Generates a random string
   */
  static randomString(length = 10) {
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
  static async createTestRateLimit(userId, endpoint, count = 0) {
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
  static async createTestAdmin(uid = "admin-user-123") {
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
exports.TestHelper = TestHelper;
// Global test teardown
const teardown = () => {
  test.cleanup();
};
exports.teardown = teardown;
//# sourceMappingURL=setup.js.map
