/**
 * @fileoverview Session Management Functions
 * @description Cloud Functions for managing user sessions and authentication
 * @security Handles secure session management while maintaining
 * zero-knowledge principles
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {checkRateLimit} from "../utils/rate-limiting";

const db = admin.firestore();

/**
 * Interface for user session data
 */
interface UserSession {
  userId: string;
  sessionId: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    browser: string;
    deviceId: string;
  };
  geoData?: {
    ip: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  timestamp: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
  isActive: boolean;
  lastActivity: admin.firestore.Timestamp;
  terminatedAt?: admin.firestore.Timestamp;
  terminationReason?: string;
  cleanupAt?: admin.firestore.Timestamp;
}

/**
 * Interface for device information
 */
interface DeviceInfo {
  userAgent: string;
  platform?: string;
  browser?: string;
  deviceId?: string;
}

/**
 * Interface for geographical data
 */
interface GeoData {
  ip: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Interface for create session request
 */
interface CreateSessionData {
  deviceInfo: DeviceInfo;
  geoData?: GeoData;
}

/**
 * Interface for create session response
 */
interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  expiresAt: string;
}

/**
 * Interface for update session activity request
 */
interface UpdateSessionActivityData {
  sessionId: string;
}

/**
 * Interface for update session activity response
 */
interface UpdateSessionActivityResponse {
  success: boolean;
  sessionId: string;
}

/**
 * Interface for terminate session request
 */
interface TerminateSessionData {
  sessionId?: string;
  terminateAll?: boolean;
}

/**
 * Interface for terminate session response
 */
interface TerminateSessionResponse {
  success: boolean;
  sessionId?: string;
  terminatedSessions?: number;
}

/**
 * Interface for get active sessions request
 */
interface GetActiveSessionsData {
  currentSessionId?: string;
}

/**
 * Interface for session info in response
 */
interface SessionInfo {
  sessionId: string;
  deviceInfo: DeviceInfo;
  geoData?: GeoData;
  createdAt: string | null;
  lastActivity: string | null;
  expiresAt: string | null;
  isCurrent: boolean;
}

/**
 * Interface for get active sessions response
 */
interface GetActiveSessionsResponse {
  success: boolean;
  sessions: SessionInfo[];
  count: number;
}

/**
 * Interface for validate session request
 */
interface ValidateSessionData {
  sessionId: string;
}

/**
 * Interface for validate session response
 */
interface ValidateSessionResponse {
  valid: boolean;
  reason?: string;
  sessionId?: string;
  expiresAt?: string;
}

/**
 * Interface for user document updates
 */
interface UserUpdateData {
  lastLoginAt?: admin.firestore.FieldValue;
  lastLoginIP?: string;
  activeSessionCount?: admin.firestore.FieldValue | number;
  lastLogoutAt?: admin.firestore.FieldValue;
  [key: string]: string | number | boolean | admin.firestore.FieldValue | null | undefined; // Allow additional properties for Firestore compatibility
}

/**
 * Interface for session update data
 */
interface SessionUpdateData {
  lastActivity?: admin.firestore.FieldValue;
  isActive?: boolean;
  terminatedAt?: admin.firestore.FieldValue;
  terminationReason?: string;
  cleanupAt?: admin.firestore.FieldValue;
  [key: string]: string | number | boolean | admin.firestore.FieldValue | null | undefined; // Allow additional properties for Firestore compatibility
}

/**
 * Creates a new user session
 * Called when user successfully logs in
 */
export const createSession = functions.https.onCall(
  async (data: CreateSessionData, context: functions.https.CallableContext): Promise<CreateSessionResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "createSession", 10);

      const {deviceInfo, geoData} = data;

      // Validate required fields
      if (!deviceInfo || !deviceInfo.userAgent) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Device information required",
        );
      }

      const now = admin.firestore.FieldValue.serverTimestamp() as
        admin.firestore.Timestamp;
      const expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      );

      // Create session record
      const sessionRef = db.collection("userSessions").doc();
      const sessionId = sessionRef.id;

      const sessionData: Partial<UserSession> = {
        userId: context.auth.uid,
        sessionId,
        deviceInfo: {
          userAgent: deviceInfo.userAgent,
          platform: deviceInfo.platform || "unknown",
          browser: deviceInfo.browser || "unknown",
          deviceId: deviceInfo.deviceId || "unknown",
        },
        timestamp: now,
        expiresAt,
        isActive: true,
        lastActivity: now,
      };

      // Add geo data if provided
      if (geoData) {
        sessionData.geoData = {
          ip: geoData.ip,
          city: geoData.city,
          country: geoData.country,
          latitude: geoData.latitude,
          longitude: geoData.longitude,
        };
      }

      await sessionRef.set(sessionData);

      // Update user's last login time
      const userUpdateData: UserUpdateData = {
        lastLoginAt: now,
        lastLoginIP: geoData?.ip || "unknown",
        activeSessionCount: admin.firestore.FieldValue.increment(1),
      };

      await db
        .collection("users")
        .doc(context.auth.uid)
        .update(userUpdateData);

      // Clean up old sessions for this user (keep only last 10)
      await cleanupOldSessions(context.auth.uid);

      return {
        success: true,
        sessionId,
        expiresAt: expiresAt.toDate().toISOString(),
      };
    } catch (error) {
      console.error("Error in createSession:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Updates session activity
 * Called periodically to keep session alive
 */
export const updateSessionActivity = functions.https.onCall(
  async (data: UpdateSessionActivityData, context: functions.https.CallableContext): Promise<UpdateSessionActivityResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "updateSession", 60); // Allow frequent updates

      const {sessionId} = data;

      if (!sessionId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Session ID required",
        );
      }

      // Update session last activity
      const sessionRef = db.collection("userSessions").doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Session not found");
      }

      const sessionData = sessionDoc.data() as UserSession;

      // Verify session belongs to the user
      if (sessionData.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Session does not belong to user",
        );
      }

      // Check if session is expired
      if (sessionData.expiresAt.toDate() < new Date()) {
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "Session has expired",
        );
      }

      // Update last activity
      const updateData: SessionUpdateData = {
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
      };

      await sessionRef.update(updateData);

      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      console.error("Error in updateSessionActivity:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Terminates a user session
 * Called when user logs out or session needs to be invalidated
 */
export const terminateSession = functions.https.onCall(
  async (data: TerminateSessionData, context: functions.https.CallableContext): Promise<TerminateSessionResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "terminateSession", 20);

      const {sessionId, terminateAll = false} = data;

      if (terminateAll) {
        // Terminate all sessions for the user
        const sessionsSnapshot = await db
          .collection("userSessions")
          .where("userId", "==", context.auth.uid)
          .where("isActive", "==", true)
          .get();

        const batch = db.batch();

        const batchUpdateData: SessionUpdateData = {
          isActive: false,
          terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
          terminationReason: "user_logout_all",
        };

        sessionsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, batchUpdateData);
        });

        await batch.commit();

        // Update user's active session count
        const userUpdateData: UserUpdateData = {
          activeSessionCount: 0,
          lastLogoutAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("users").doc(context.auth.uid).update(userUpdateData);

        return {
          success: true,
          terminatedSessions: sessionsSnapshot.size,
        };
      } else {
        // Terminate specific session
        if (!sessionId) {
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Session ID required",
          );
        }

        const sessionRef = db.collection("userSessions").doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Session not found",
          );
        }

        const sessionData = sessionDoc.data() as UserSession;

        // Verify session belongs to the user
        if (sessionData.userId !== context.auth.uid) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Session does not belong to user",
          );
        }

        // Update session
        const sessionUpdateData: SessionUpdateData = {
          isActive: false,
          terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
          terminationReason: "user_logout",
        };

        await sessionRef.update(sessionUpdateData);

        // Update user's active session count
        const userUpdateData: UserUpdateData = {
          activeSessionCount: admin.firestore.FieldValue.increment(-1),
          lastLogoutAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db
          .collection("users")
          .doc(context.auth.uid)
          .update(userUpdateData);

        return {
          success: true,
          sessionId,
        };
      }
    } catch (error) {
      console.error("Error in terminateSession:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Gets active sessions for a user
 * Allows users to see and manage their active sessions
 */
export const getActiveSessions = functions.https.onCall(
  async (data: GetActiveSessionsData, context: functions.https.CallableContext): Promise<GetActiveSessionsResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "getActiveSessions", 10);

      // Get all active sessions for the user
      const sessionsSnapshot = await db
        .collection("userSessions")
        .where("userId", "==", context.auth.uid)
        .where("isActive", "==", true)
        .where("expiresAt", ">", admin.firestore.Timestamp.now())
        .orderBy("expiresAt", "desc")
        .orderBy("lastActivity", "desc")
        .get();

      const sessions: SessionInfo[] = sessionsSnapshot.docs.map((doc) => {
        const session = doc.data() as UserSession;
        return {
          sessionId: doc.id,
          deviceInfo: session.deviceInfo,
          geoData: session.geoData,
          createdAt: session.timestamp?.toDate()?.toISOString() || null,
          lastActivity: session.lastActivity?.toDate()?.toISOString() || null,
          expiresAt: session.expiresAt?.toDate()?.toISOString() || null,
          isCurrent: doc.id === data.currentSessionId,
        };
      });

      return {
        success: true,
        sessions,
        count: sessions.length,
      };
    } catch (error) {
      console.error("Error in getActiveSessions:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Validates a session token
 * Used by other functions to verify session validity
 */
export const validateSession = functions.https.onCall(
  async (data: ValidateSessionData, context: functions.https.CallableContext): Promise<ValidateSessionResponse> => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      const {sessionId} = data;

      if (!sessionId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Session ID required",
        );
      }

      // Get session
      const sessionDoc = await db
        .collection("userSessions")
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        return {
          valid: false,
          reason: "Session not found",
        };
      }

      const session = sessionDoc.data() as UserSession;

      // Check if session belongs to user
      if (session.userId !== context.auth.uid) {
        return {
          valid: false,
          reason: "Session does not belong to user",
        };
      }

      // Check if session is active
      if (!session.isActive) {
        return {
          valid: false,
          reason: "Session is not active",
        };
      }

      // Check if session is expired
      if (session.expiresAt.toDate() < new Date()) {
        // Mark session as expired
        const expiredUpdateData: SessionUpdateData = {
          isActive: false,
          terminationReason: "expired",
        };

        await sessionDoc.ref.update(expiredUpdateData);

        return {
          valid: false,
          reason: "Session has expired",
        };
      }

      // Session is valid
      return {
        valid: true,
        sessionId,
        expiresAt: session.expiresAt.toDate().toISOString(),
      };
    } catch (error) {
      console.error("Error in validateSession:", error);
      throw error instanceof functions.https.HttpsError ? error :
        new functions.https.HttpsError("internal", "An unexpected error occurred");
    }
  },
);

/**
 * Scheduled function to clean up expired sessions
 * Runs every hour to remove expired session records
 */
export const cleanupExpiredSessions = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (): Promise<null> => {
    try {
      console.log("Starting expired session cleanup...");

      // Find expired sessions
      const expiredSessionsSnapshot = await db
        .collection("userSessions")
        .where("expiresAt", "<", admin.firestore.Timestamp.now())
        .limit(500) // Process in batches
        .get();

      if (expiredSessionsSnapshot.empty) {
        console.log("No expired sessions to clean up");
        return null;
      }

      console.log(
        `Found ${expiredSessionsSnapshot.size} expired sessions to clean up`,
      );

      // Mark sessions as inactive and add cleanup timestamp
      const batch = db.batch();

      const cleanupUpdateData: SessionUpdateData = {
        isActive: false,
        terminationReason: "expired",
        cleanupAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      expiredSessionsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, cleanupUpdateData);
      });

      await batch.commit();

      console.log(
        `Successfully cleaned up ${expiredSessionsSnapshot.size} expired sessions`,
      );

      return null;
    } catch (error) {
      console.error("Error cleaning up expired sessions:", error);
      return null;
    }
  });

/**
 * Helper function to clean up old sessions for a user
 * Keeps only the most recent sessions to prevent database bloat
 */
async function cleanupOldSessions(userId: string): Promise<void> {
  try {
    // Get all sessions for user, ordered by creation time (newest first)
    const allSessionsSnapshot = await db
      .collection("userSessions")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    // Keep only the 10 most recent sessions
    const sessionsToDelete = allSessionsSnapshot.docs.slice(10);

    if (sessionsToDelete.length > 0) {
      const batch = db.batch();

      sessionsToDelete.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(
        `Cleaned up ${sessionsToDelete.length} old sessions for user ${userId}`,
      );
    }
  } catch (error) {
    console.error("Error cleaning up old sessions:", error);
    // Don't throw error, as this is a cleanup operation
  }
}
