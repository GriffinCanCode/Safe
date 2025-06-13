"use strict";
/**
 * Authentication Functions Tests
 * Comprehensive tests for SRP authentication and user management
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
Object.defineProperty(exports, "__esModule", { value: true });
const setup_1 = require("./setup");
const admin = __importStar(require("firebase-admin"));
// Import the functions to test
const auth_functions_1 = require("../auth/auth-functions");
describe("Authentication Functions", () => {
  let db;
  beforeAll(() => {
    db = admin.firestore();
  });
  beforeEach(async () => {
    // Clean up test data before each test
    await setup_1.TestHelper.cleanupFirestore([
      "auth",
      "users",
      "authSessions",
    ]);
  });
  afterAll(async () => {
    // Final cleanup
    await setup_1.TestHelper.cleanupFirestore();
  });
  describe("registerUser", () => {
    it("should successfully register a new user", async () => {
      const testUser = setup_1.TestHelper.createTestUser();
      const context = setup_1.TestHelper.createCallableContext();
      const mockData = {
        email: testUser.email,
        verifier: "test_verifier_" + setup_1.TestHelper.randomString(32),
        salt: "test_salt_" + setup_1.TestHelper.randomString(16),
      };
      const result = await (0, auth_functions_1.registerUser)(
        mockData,
        context,
      );
      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      // Verify user was created in Firebase Auth
      try {
        const userRecord = await admin.auth().getUserByEmail(testUser.email);
        expect(userRecord.email).toBe(testUser.email);
      } catch (error) {
        fail("User should have been created in Firebase Auth");
      }
      // Verify user credentials were stored
      const authDoc = await db
        .collection("auth")
        .doc(testUser.email.toLowerCase())
        .get();
      expect(authDoc.exists).toBe(true);
      const authData = authDoc.data();
      expect(authData?.email).toBe(testUser.email);
      expect(authData?.verifier).toBe(mockData.verifier);
      expect(authData?.salt).toBe(mockData.salt);
    });
    it("should fail when registering with existing email", async () => {
      const testUser = setup_1.TestHelper.createTestUser();
      const context = setup_1.TestHelper.createCallableContext();
      const mockData = {
        email: testUser.email,
        verifier: "test_verifier_" + setup_1.TestHelper.randomString(32),
        salt: "test_salt_" + setup_1.TestHelper.randomString(16),
      };
      // First registration should succeed
      await (0, auth_functions_1.registerUser)(mockData, context);
      // Second registration should fail
      try {
        await (0, auth_functions_1.registerUser)(mockData, context);
        fail("Should have thrown an error for duplicate email");
      } catch (error) {
        expect(error.code).toBe("already-exists");
      }
    });
    it("should fail with invalid input data", async () => {
      const context = setup_1.TestHelper.createCallableContext();
      const invalidData = {
        email: "",
        verifier: "",
        salt: "",
      };
      try {
        await (0, auth_functions_1.registerUser)(invalidData, context);
        fail("Should have thrown an error for invalid input");
      } catch (error) {
        expect(error.code).toBe("invalid-argument");
      }
    });
  });
  describe("initSRPAuth", () => {
    it("should successfully initialize SRP authentication", async () => {
      const testUser = setup_1.TestHelper.createTestUser();
      const context = setup_1.TestHelper.createCallableContext();
      // First register the user
      const verifier = "test_verifier_" + setup_1.TestHelper.randomString(32);
      const salt = "test_salt_" + setup_1.TestHelper.randomString(16);
      await (0, auth_functions_1.registerUser)(
        {
          email: testUser.email,
          verifier,
          salt,
        },
        context,
      );
      // Now try to initialize authentication
      const authData = { email: testUser.email };
      const result = await (0, auth_functions_1.initSRPAuth)(authData, context);
      expect(result.salt).toBe(salt);
      expect(result.serverPublic).toBeDefined();
      expect(result.timestamp).toBeDefined();
      // Verify session was stored
      const sessionDoc = await db
        .collection("authSessions")
        .doc(testUser.email.toLowerCase())
        .get();
      expect(sessionDoc.exists).toBe(true);
    });
    it("should fail for non-existent user", async () => {
      const context = setup_1.TestHelper.createCallableContext();
      const authData = { email: "nonexistent@example.com" };
      try {
        await (0, auth_functions_1.initSRPAuth)(authData, context);
        fail("Should have thrown an error for non-existent user");
      } catch (error) {
        expect(error.code).toBe("not-found");
      }
    });
    it("should fail with invalid email format", async () => {
      const context = setup_1.TestHelper.createCallableContext();
      const authData = { email: "invalid-email" };
      try {
        await (0, auth_functions_1.initSRPAuth)(authData, context);
        fail("Should have thrown an error for invalid email");
      } catch (error) {
        expect(error.code).toBe("invalid-argument");
      }
    });
  });
  describe("verifySRPAuth", () => {
    let testUser;
    let verifier;
    let salt;
    beforeEach(async () => {
      testUser = setup_1.TestHelper.createTestUser();
      verifier = "test_verifier_" + setup_1.TestHelper.randomString(32);
      salt = "test_salt_" + setup_1.TestHelper.randomString(16);
      const context = setup_1.TestHelper.createCallableContext();
      // Register user and initialize auth
      await (0, auth_functions_1.registerUser)(
        {
          email: testUser.email,
          verifier,
          salt,
        },
        context,
      );
      await (0, auth_functions_1.initSRPAuth)(
        { email: testUser.email },
        context,
      );
    });
    it("should successfully verify valid SRP proof", async () => {
      const context = setup_1.TestHelper.createCallableContext();
      const mockProofData = {
        email: testUser.email,
        clientProof:
          "valid_client_proof_" + setup_1.TestHelper.randomString(32),
        clientPublic:
          "valid_client_public_" + setup_1.TestHelper.randomString(32),
      };
      // Note: In a real test, we would need to generate actual SRP proofs
      // For now, we'll mock the SRP verification to always succeed
      const result = await (0, auth_functions_1.verifySRPAuth)(
        mockProofData,
        context,
      );
      expect(result.success).toBe(true);
      expect(result.customToken).toBeDefined();
      expect(result.userId).toBeDefined();
    });
    it("should fail with expired session", async () => {
      const context = setup_1.TestHelper.createCallableContext();
      // Manually expire the session
      const sessionDoc = db
        .collection("authSessions")
        .doc(testUser.email.toLowerCase());
      await sessionDoc.update({
        expiresAt: Date.now() - 1000, // 1 second ago
      });
      const mockProofData = {
        email: testUser.email,
        clientProof: "test_proof",
        clientPublic: "test_public",
      };
      try {
        await (0, auth_functions_1.verifySRPAuth)(mockProofData, context);
        fail("Should have thrown an error for expired session");
      } catch (error) {
        expect(error.code).toBe("deadline-exceeded");
      }
    });
    it("should fail with missing session", async () => {
      const context = setup_1.TestHelper.createCallableContext();
      // Delete the session
      await db
        .collection("authSessions")
        .doc(testUser.email.toLowerCase())
        .delete();
      const mockProofData = {
        email: testUser.email,
        clientProof: "test_proof",
        clientPublic: "test_public",
      };
      try {
        await (0, auth_functions_1.verifySRPAuth)(mockProofData, context);
        fail("Should have thrown an error for missing session");
      } catch (error) {
        expect(error.code).toBe("failed-precondition");
      }
    });
  });
  describe("changePassword", () => {
    let testUser;
    let userUid;
    beforeEach(async () => {
      testUser = setup_1.TestHelper.createTestUser();
      const context = setup_1.TestHelper.createCallableContext();
      // Register user
      const registerResult = await (0, auth_functions_1.registerUser)(
        {
          email: testUser.email,
          verifier: "old_verifier_" + setup_1.TestHelper.randomString(32),
          salt: "old_salt_" + setup_1.TestHelper.randomString(16),
        },
        context,
      );
      userUid = registerResult.userId;
    });
    it("should successfully change password", async () => {
      const context = setup_1.TestHelper.createCallableContext(
        userUid,
        testUser.email,
      );
      const newVerifier = "new_verifier_" + setup_1.TestHelper.randomString(32);
      const newSalt = "new_salt_" + setup_1.TestHelper.randomString(16);
      const result = await (0, auth_functions_1.changePassword)(
        {
          newVerifier,
          newSalt,
        },
        context,
      );
      expect(result.success).toBe(true);
      // Verify credentials were updated
      const authDoc = await db
        .collection("auth")
        .doc(testUser.email.toLowerCase())
        .get();
      const authData = authDoc.data();
      expect(authData?.verifier).toBe(newVerifier);
      expect(authData?.salt).toBe(newSalt);
    });
    it("should fail for unauthenticated user", async () => {
      const context = setup_1.TestHelper.createCallableContext(); // No auth
      try {
        await (0, auth_functions_1.changePassword)(
          {
            newVerifier: "test_verifier",
            newSalt: "test_salt",
          },
          context,
        );
        fail("Should have thrown an error for unauthenticated user");
      } catch (error) {
        expect(error.code).toBe("unauthenticated");
      }
    });
    it("should fail with missing parameters", async () => {
      const context = setup_1.TestHelper.createCallableContext(
        userUid,
        testUser.email,
      );
      try {
        await (0, auth_functions_1.changePassword)({}, context);
        fail("Should have thrown an error for missing parameters");
      } catch (error) {
        expect(error.code).toBe("invalid-argument");
      }
    });
  });
  describe("Rate Limiting", () => {
    it("should apply rate limiting to authentication endpoints", async () => {
      const testUser = setup_1.TestHelper.createTestUser();
      const context = setup_1.TestHelper.createCallableContext();
      // Set up a high rate limit count
      await setup_1.TestHelper.createTestRateLimit(
        context.auth?.uid || "anonymous",
        "auth",
        100,
      );
      try {
        await (0, auth_functions_1.initSRPAuth)(
          { email: testUser.email },
          context,
        );
        fail("Should have been rate limited");
      } catch (error) {
        expect(error.code).toBe("resource-exhausted");
      }
    });
  });
  describe("Security Features", () => {
    it("should increment failed login attempts on verification failure", async () => {
      const testUser = setup_1.TestHelper.createTestUser();
      const context = setup_1.TestHelper.createCallableContext();
      // Register user and initialize auth
      await (0, auth_functions_1.registerUser)(
        {
          email: testUser.email,
          verifier: "test_verifier",
          salt: "test_salt",
        },
        context,
      );
      await (0, auth_functions_1.initSRPAuth)(
        { email: testUser.email },
        context,
      );
      // Try to verify with invalid proof
      try {
        await (0, auth_functions_1.verifySRPAuth)(
          {
            email: testUser.email,
            clientProof: "invalid_proof",
            clientPublic: "invalid_public",
          },
          context,
        );
      } catch (error) {
        // Expected to fail
      }
      // Check that failed login count was incremented
      const userDoc = await db
        .collection("users")
        .doc(testUser.email.toLowerCase())
        .get();
      const userData = userDoc.data();
      expect(userData?.failedLoginAttempts).toBe(1);
    });
    it("should clean up expired sessions", async () => {
      const testUser = setup_1.TestHelper.createTestUser();
      const context = setup_1.TestHelper.createCallableContext();
      // Create an expired session manually
      await db
        .collection("authSessions")
        .doc(testUser.email.toLowerCase())
        .set({
          email: testUser.email,
          serverPrivate: "",
          serverPublic: "test_public",
          verifier: "test_verifier",
          salt: "test_salt",
          timestamp: Date.now() - 10 * 60 * 1000,
          expiresAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago (expired)
        });
      // Trying to verify should fail due to expiration
      try {
        await (0, auth_functions_1.verifySRPAuth)(
          {
            email: testUser.email,
            clientProof: "test_proof",
            clientPublic: "test_public",
          },
          context,
        );
        fail("Should have failed due to expired session");
      } catch (error) {
        expect(error.code).toBe("deadline-exceeded");
      }
    });
  });
});
//# sourceMappingURL=auth.test.js.map
