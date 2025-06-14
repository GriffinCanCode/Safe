/**
 * Zero-Knowledge Authentication Functions
 * Implements SRP authentication protocol for password verification
 * without the server knowing the password
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {SRPServer} from "@zk-vault/crypto";

/**
 * Interface for authentication session stored in Firestore
 */
interface AuthSession {
  email: string;
  serverPrivate: string;
  serverPublic: string;
  verifier: string;
  salt: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Interface for SRP authentication initialization request
 */
interface InitSRPAuthData {
  email: string;
}

/**
 * Interface for SRP authentication initialization response
 */
interface InitSRPAuthResponse {
  salt: string;
  serverPublic: string;
  timestamp: number;
}

/**
 * Interface for SRP authentication verification request
 */
interface VerifySRPAuthData {
  email: string;
  clientProof: string;
  clientPublic: string;
}

/**
 * Interface for SRP authentication verification response
 */
interface VerifySRPAuthResponse {
  success: boolean;
  customToken: string;
  serverProof: string;
  userId: string;
}

/**
 * Interface for user registration request
 */
interface RegisterUserData {
  email: string;
  verifier: string;
  salt: string;
}

/**
 * Interface for user registration response
 */
interface RegisterUserResponse {
  success: boolean;
  userId: string;
}

/**
 * Interface for password change request
 */
interface ChangePasswordData {
  newVerifier: string;
  newSalt: string;
}

/**
 * Interface for password change response
 */
interface ChangePasswordResponse {
  success: boolean;
}

/**
 * Initializes SRP authentication flow
 * Client provides email and receives salt and server public key
 */
export const initSRPAuth = functions.https.onCall(
  async (data: InitSRPAuthData): Promise<InitSRPAuthResponse> => {
    try {
      const {email} = data;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Valid email required",
        );
      }

      // Get user's salt and verifier from Firestore
      const userDoc = await admin
        .firestore()
        .collection("auth")
        .doc(email.toLowerCase())
        .get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not registered");
      }

      const userData = userDoc.data() as AuthSession;

      // Create SRP authentication challenge
      const challengeResult = await SRPServer.createAuthChallenge(
        email,
        userData.verifier,
        userData.salt,
      );

      if (!challengeResult.success || !challengeResult.data) {
        throw new functions.https.HttpsError(
          "internal",
          "Failed to create authentication challenge",
        );
      }

      // The SRP server stores the session internally,
      // but we also store session reference
      const now = Date.now();
      const sessionRef: AuthSession = {
        email,
        serverPrivate: "", // Server manages this internally
        serverPublic: challengeResult.data.serverPublic,
        verifier: userData.verifier,
        salt: userData.salt,
        timestamp: now,
        expiresAt: now + 5 * 60 * 1000, // 5 minutes
      };

      // Store session reference in Firestore for cleanup
      await admin
        .firestore()
        .collection("authSessions")
        .doc(email.toLowerCase())
        .set(sessionRef);

      // Return challenge to client
      return {
        salt: userData.salt,
        serverPublic: challengeResult.data.serverPublic,
        timestamp: challengeResult.data.timestamp,
      };
    } catch (error) {
      console.error("Error in initSRPAuth:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Verifies client SRP proof
 * Client proves knowledge of password without revealing it
 */
export const verifySRPAuth = functions.https.onCall(
  async (data: VerifySRPAuthData): Promise<VerifySRPAuthResponse> => {
    try {
      const {email, clientProof, clientPublic} = data;

      if (!email || !clientProof || !clientPublic) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields",
        );
      }

      // Get active session
      const sessionDoc = await admin
        .firestore()
        .collection("authSessions")
        .doc(email.toLowerCase())
        .get();

      if (!sessionDoc.exists) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "No active session found",
        );
      }

      const session = sessionDoc.data() as AuthSession;

      // Check session expiry
      const now = Date.now();
      if (now > session.expiresAt) {
        // Delete expired session
        await sessionDoc.ref.delete();
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "Session expired",
        );
      }

      // Verify client proof using actual SRP implementation
      const srpProof = {
        clientPublic,
        clientProof,
        email,
        timestamp: now,
        salt: session.salt,
      };

      const verificationResult = await SRPServer.verifyClientProof(
        email,
        srpProof,
      );

      if (!verificationResult.success || !verificationResult.data) {
        // Increment failed login attempts
        await admin
          .firestore()
          .collection("users")
          .doc(email.toLowerCase())
          .set(
            {
              failedLoginAttempts: admin.firestore.FieldValue.increment(1),
              lastFailedLogin: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
          );

        throw new functions.https.HttpsError(
          "unauthenticated",
          "Invalid credentials",
        );
      }

      // Verification successful
      const isVerified = verificationResult.data.verified;
      if (!isVerified) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Invalid credentials",
        );
      }

      // Ensure serverProof is available
      const serverProof = verificationResult.data.serverProof;
      if (!serverProof) {
        throw new functions.https.HttpsError(
          "internal",
          "Server proof not generated",
        );
      }

      // Generate custom token
      const userRecord = await getUserRecord(email);
      const customToken = await admin.auth().createCustomToken(userRecord.uid, {
        srpVerified: true,
      });

      // Update user record with successful login
      await admin.firestore().collection("users").doc(userRecord.uid).set(
        {
          lastSignIn: admin.firestore.FieldValue.serverTimestamp(),
          failedLoginAttempts: 0,
        },
        {merge: true},
      );

      // Remove the session
      await sessionDoc.ref.delete();

      return {
        success: true,
        customToken,
        serverProof,
        userId: userRecord.uid,
      };
    } catch (error) {
      console.error("Error in verifySRPAuth:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Creates a new user account with SRP verifier
 */
export const registerUser = functions.https.onCall(
  async (data: RegisterUserData): Promise<RegisterUserResponse> => {
    try {
      const {email, verifier, salt} = data;

      if (!email || !verifier || !salt) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields",
        );
      }

      // Check if user already exists
      try {
        await admin.auth().getUserByEmail(email);
        // User exists
        throw new functions.https.HttpsError(
          "already-exists",
          "Email already in use",
        );
      } catch (error: unknown) {
        const firebaseError = error as {code?: string};
        if (firebaseError.code !== "auth/user-not-found") {
          throw error;
        }
        // User not found, continue with registration
      }

      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        emailVerified: false,
        disabled: false,
      });

      // Store verifier and salt in Firestore using SRP server
      const storeResult = await SRPServer.storeUserCredentials(
        email,
        verifier,
        salt,
      );

      if (!storeResult.success) {
        // Cleanup the user record if credential storage fails
        await admin.auth().deleteUser(userRecord.uid);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to store user credentials",
        );
      }

      // Also store in our auth collection for user management
      await admin.firestore().collection("auth").doc(email.toLowerCase()).set({
        email,
        verifier,
        salt,
        userId: userRecord.uid,
        created: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Initialize user profile
      await admin
        .firestore()
        .collection("users")
        .doc(userRecord.uid)
        .set({
          email,
          emailVerified: false,
          created: admin.firestore.FieldValue.serverTimestamp(),
          lastSignIn: admin.firestore.FieldValue.serverTimestamp(),
          failedLoginAttempts: 0,
          settings: {
            autoLockTimeout: 15, // minutes
            theme: "system",
          },
        });

      // Return success
      return {
        success: true,
        userId: userRecord.uid,
      };
    } catch (error) {
      console.error("Error in registerUser:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Changes user password by updating the SRP verifier
 */
export const changePassword = functions.https.onCall(
  async (data: ChangePasswordData, context: functions.https.CallableContext): Promise<ChangePasswordResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      const {newVerifier, newSalt} = data;

      if (!newVerifier || !newSalt) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields",
        );
      }

      // Get user's email
      const userRecord = await admin.auth().getUser(context.auth.uid);

      if (!userRecord.email) {
        throw new functions.https.HttpsError(
          "not-found",
          "User has no email address",
        );
      }

      const email = userRecord.email as string;

      // Update verifier and salt using SRP server
      const updateResult = await SRPServer.storeUserCredentials(
        email,
        newVerifier,
        newSalt,
      );

      if (!updateResult.success) {
        throw new functions.https.HttpsError(
          "internal",
          "Failed to update user credentials",
        );
      }

      // Update verifier and salt in Firestore
      await admin.firestore().collection("auth").doc(email.toLowerCase()).update({
        verifier: newVerifier,
        salt: newSalt,
        updated: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update password change timestamp
      await admin.firestore().collection("users").doc(context.auth.uid).update({
        "security.lastPasswordChange":
          admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error in changePassword:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Gets or creates a user record
 * @param email User email
 * @returns Firebase Auth user record
 */
async function getUserRecord(email: string): Promise<admin.auth.UserRecord> {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (error: unknown) {
    const firebaseError = error as {code?: string};
    if (firebaseError.code === "auth/user-not-found") {
      // Create user if not found
      return await admin.auth().createUser({
        email,
        emailVerified: false,
      });
    }
    throw error;
  }
}
