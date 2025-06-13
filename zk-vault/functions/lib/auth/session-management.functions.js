"use strict";
/**
 * @fileoverview Session Management Functions
 * @description Cloud Functions for managing user sessions and authentication state
 * @security Handles secure session management while maintaining zero-knowledge principles
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
exports.cleanupExpiredSessions =
  exports.validateSession =
  exports.getActiveSessions =
  exports.terminateSession =
  exports.updateSessionActivity =
  exports.createSession =
    void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const error_handler_1 = require("../utils/error-handler");
const rate_limiting_1 = require("../utils/rate-limiting");
const db = admin.firestore();
/**
 * Creates a new user session
 * Called when user successfully logs in
 */
exports.createSession = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }
    // Apply rate limiting
    await (0, rate_limiting_1.checkRateLimit)(
      context.auth.uid,
      "createSession",
      10,
    );
    const { deviceInfo, geoData } = data;
    // Validate required fields
    if (!deviceInfo || !deviceInfo.userAgent) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Device information required",
      );
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    );
    // Create session record
    const sessionRef = db.collection("userSessions").doc();
    const sessionId = sessionRef.id;
    const sessionData = {
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
    await db
      .collection("users")
      .doc(context.auth.uid)
      .update({
        lastLoginAt: now,
        lastLoginIP: geoData?.ip || "unknown",
        activeSessionCount: admin.firestore.FieldValue.increment(1),
      });
    // Clean up old sessions for this user (keep only last 10)
    await cleanupOldSessions(context.auth.uid);
    return {
      success: true,
      sessionId,
      expiresAt: expiresAt.toDate().toISOString(),
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "createSession");
  }
});
/**
 * Updates session activity
 * Called periodically to keep session alive
 */
exports.updateSessionActivity = functions.https.onCall(
  async (data, context) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }
      // Apply rate limiting
      await (0, rate_limiting_1.checkRateLimit)(
        context.auth.uid,
        "updateSession",
        60,
      ); // Allow frequent updates
      const { sessionId } = data;
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
      const sessionData = sessionDoc.data();
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
      await sessionRef.update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
      });
      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      return (0, error_handler_1.handleError)(error, "updateSessionActivity");
    }
  },
);
/**
 * Terminates a user session
 * Called when user logs out or session needs to be invalidated
 */
exports.terminateSession = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }
    // Apply rate limiting
    await (0, rate_limiting_1.checkRateLimit)(
      context.auth.uid,
      "terminateSession",
      20,
    );
    const { sessionId, terminateAll = false } = data;
    if (terminateAll) {
      // Terminate all sessions for the user
      const sessionsSnapshot = await db
        .collection("userSessions")
        .where("userId", "==", context.auth.uid)
        .where("isActive", "==", true)
        .get();
      const batch = db.batch();
      sessionsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isActive: false,
          terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
          terminationReason: "user_logout_all",
        });
      });
      await batch.commit();
      // Update user's active session count
      await db.collection("users").doc(context.auth.uid).update({
        activeSessionCount: 0,
        lastLogoutAt: admin.firestore.FieldValue.serverTimestamp(),
      });
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
        throw new functions.https.HttpsError("not-found", "Session not found");
      }
      const sessionData = sessionDoc.data();
      // Verify session belongs to the user
      if (sessionData.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Session does not belong to user",
        );
      }
      // Update session
      await sessionRef.update({
        isActive: false,
        terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
        terminationReason: "user_logout",
      });
      // Update user's active session count
      await db
        .collection("users")
        .doc(context.auth.uid)
        .update({
          activeSessionCount: admin.firestore.FieldValue.increment(-1),
          lastLogoutAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      return {
        success: true,
        sessionId,
      };
    }
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "terminateSession");
  }
});
/**
 * Gets active sessions for a user
 * Allows users to see and manage their active sessions
 */
exports.getActiveSessions = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }
    // Apply rate limiting
    await (0, rate_limiting_1.checkRateLimit)(
      context.auth.uid,
      "getActiveSessions",
      10,
    );
    // Get all active sessions for the user
    const sessionsSnapshot = await db
      .collection("userSessions")
      .where("userId", "==", context.auth.uid)
      .where("isActive", "==", true)
      .where("expiresAt", ">", admin.firestore.Timestamp.now())
      .orderBy("expiresAt", "desc")
      .orderBy("lastActivity", "desc")
      .get();
    const sessions = sessionsSnapshot.docs.map((doc) => {
      const session = doc.data();
      return {
        sessionId: doc.id,
        deviceInfo: session.deviceInfo,
        geoData: session.geoData,
        createdAt: session.timestamp?.toDate()?.toISOString(),
        lastActivity: session.lastActivity?.toDate()?.toISOString(),
        expiresAt: session.expiresAt?.toDate()?.toISOString(),
        isCurrent: doc.id === data.currentSessionId,
      };
    });
    return {
      success: true,
      sessions,
      count: sessions.length,
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "getActiveSessions");
  }
});
/**
 * Validates a session token
 * Used by other functions to verify session validity
 */
exports.validateSession = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }
    const { sessionId } = data;
    if (!sessionId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Session ID required",
      );
    }
    // Get session
    const sessionDoc = await db.collection("userSessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return {
        valid: false,
        reason: "Session not found",
      };
    }
    const session = sessionDoc.data();
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
      await sessionDoc.ref.update({
        isActive: false,
        terminationReason: "expired",
      });
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
    return (0, error_handler_1.handleError)(error, "validateSession");
  }
});
/**
 * Scheduled function to clean up expired sessions
 * Runs every hour to remove expired session records
 */
exports.cleanupExpiredSessions = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
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
      expiredSessionsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isActive: false,
          terminationReason: "expired",
          cleanupAt: admin.firestore.FieldValue.serverTimestamp(),
        });
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
async function cleanupOldSessions(userId) {
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
//# sourceMappingURL=session-management.functions.js.map
