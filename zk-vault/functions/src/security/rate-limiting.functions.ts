/**
 * @fileoverview Rate Limiting Functions
 * @description Cloud Functions for rate limiting API requests in ZK-Vault
 * @security Prevents abuse and brute force attacks
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { handleError } from "../utils/error-handler";
import { RateLimitConfig } from "../utils/rate-limiting";

const db = admin.firestore();

/**
 * Rate limiting configurations for different endpoints
 */
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Authentication endpoints
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
  },

  // Vault operations
  vault: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },

  // File operations
  files: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },

  // Sharing operations
  sharing: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 15,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },

  // Security operations
  security: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
};

/**
 * Updates rate limit configurations
 * Allows dynamic adjustment of rate limits
 */
export const updateRateLimitConfig = functions.https.onCall(
  async (data, context) => {
    try {
      // Ensure user is authenticated and an admin
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Check if user is an admin
      const userDoc = await db.collection("users").doc(context.auth.uid).get();
      const userData = userDoc.data();

      if (!userData?.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges required",
        );
      }

      const { endpoint, config } = data;

      // Validate input
      if (!endpoint || !config) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing endpoint or configuration",
        );
      }

      // Validate configuration
      if (
        typeof config.windowSizeMs !== "number" ||
        typeof config.maxRequests !== "number" ||
        typeof config.blockDurationMs !== "number"
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid rate limit configuration",
        );
      }

      // Update configuration in Firestore
      await db
        .collection("configurations")
        .doc("rateLimits")
        .set(
          {
            [endpoint]: config,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: context.auth.uid,
          },
          { merge: true },
        );

      return {
        success: true,
        endpoint,
        config,
      };
    } catch (error) {
      return handleError(error, "updateRateLimitConfig");
    }
  },
);

/**
 * Gets current rate limit status for a user or IP
 * Helps clients understand their current rate limit status
 */
export const getRateLimitStatus = functions.https.onCall(
  async (data, context) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      const { endpoint } = data;

      // Validate input
      if (!endpoint) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing endpoint",
        );
      }

      // Get rate limit status for user
      const userRateLimitRef = db
        .collection("rateLimits")
        .doc(`user_${context.auth.uid}_${endpoint}`);

      const userRateLimitDoc = await userRateLimitRef.get();
      const userRateLimit = userRateLimitDoc.exists
        ? userRateLimitDoc.data()
        : null;

      // Get current rate limit configs
      const configsDoc = await db.collection("rateLimit").doc("configs").get();
      const configs = configsDoc.exists ? configsDoc.data() : undefined;

      const config =
        (configs && configs[endpoint]) ||
        RATE_LIMIT_CONFIGS[endpoint] ||
        RATE_LIMIT_CONFIGS.auth;

      // Calculate remaining requests and time until reset
      let remainingRequests = config.maxRequests;
      let msUntilReset = 0;

      if (userRateLimit) {
        const windowStartTime = userRateLimit.windowStartTime.toDate();
        const windowEndTime = new Date(
          windowStartTime.getTime() + config.windowSizeMs,
        );
        const now = new Date();

        msUntilReset = Math.max(0, windowEndTime.getTime() - now.getTime());
        remainingRequests = Math.max(
          0,
          config.maxRequests - userRateLimit.requestCount,
        );

        // Check if user is blocked
        if (userRateLimit.blocked) {
          const blockEndTime =
            userRateLimit.blockedAt.toDate().getTime() + config.blockDurationMs;
          const msUntilUnblock = Math.max(0, blockEndTime - now.getTime());

          if (msUntilUnblock > 0) {
            return {
              endpoint,
              blocked: true,
              msUntilUnblock,
              secondsUntilUnblock: Math.ceil(msUntilUnblock / 1000),
              reason: userRateLimit.reason || "Rate limit exceeded",
            };
          }
        }
      }

      return {
        endpoint,
        remainingRequests,
        msUntilReset,
        secondsUntilReset: Math.ceil(msUntilReset / 1000),
        maxRequests: config.maxRequests,
        windowSizeMs: config.windowSizeMs,
        blocked: false,
      };
    } catch (error) {
      return handleError(error, "getRateLimitStatus");
    }
  },
);

/**
 * Manually blocks a user or IP from making requests
 * Used by admins to block abusive users
 */
export const blockUser = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated and an admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    // Check if user is an admin
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }

    const { userId, ip, reason, durationMs = 24 * 60 * 60 * 1000 } = data; // Default 24 hours

    // Validate input
    if (!userId && !ip) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide userId or IP",
      );
    }

    if (durationMs < 60000 || durationMs > 30 * 24 * 60 * 60 * 1000) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Block duration must be between 1 minute and 30 days",
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // Block for all endpoints
    for (const endpoint of Object.keys(RATE_LIMIT_CONFIGS)) {
      // Block user ID if provided
      if (userId) {
        const userRateLimitRef = db
          .collection("rateLimits")
          .doc(`user_${userId}_${endpoint}`);
        batch.set(
          userRateLimitRef,
          {
            userId,
            endpoint,
            blocked: true,
            blockedAt: now,
            blockDurationMs: durationMs,
            reason: reason || "Manual block by admin",
            blockedBy: context.auth.uid,
          },
          { merge: true },
        );
      }

      // Block IP if provided
      if (ip) {
        const ipRateLimitRef = db
          .collection("rateLimits")
          .doc(`ip_${ip.replace(/\./g, "_")}_${endpoint}`);
        batch.set(
          ipRateLimitRef,
          {
            ip,
            endpoint,
            blocked: true,
            blockedAt: now,
            blockDurationMs: durationMs,
            reason: reason || "Manual block by admin",
            blockedBy: context.auth.uid,
          },
          { merge: true },
        );
      }
    }

    // If blocking a user, also update their user record
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      batch.update(userRef, {
        blocked: true,
        blockedAt: now,
        blockReason: reason || "Manual block by admin",
        blockedBy: context.auth.uid,
        blockExpiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + durationMs),
        ),
      });

      // Log the action
      const actionLogRef = db.collection("adminActionLogs").doc();
      batch.set(actionLogRef, {
        action: "block_user",
        adminId: context.auth.uid,
        targetUserId: userId,
        targetIp: ip || null,
        reason: reason || "Manual block by admin",
        durationMs,
        timestamp: now,
      });
    }

    await batch.commit();

    return {
      success: true,
      userId: userId || null,
      ip: ip || null,
      durationMs,
      expiresAt: new Date(Date.now() + durationMs).toISOString(),
    };
  } catch (error) {
    return handleError(error, "blockUser");
  }
});

/**
 * Unblocks a previously blocked user or IP
 * Used by admins to remove blocks
 */
export const unblockUser = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated and an admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    // Check if user is an admin
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }

    const { userId, ip } = data;

    // Validate input
    if (!userId && !ip) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide userId or IP",
      );
    }

    const batch = db.batch();

    // Unblock for all endpoints
    for (const endpoint of Object.keys(RATE_LIMIT_CONFIGS)) {
      // Unblock user ID if provided
      if (userId) {
        const userRateLimitRef = db
          .collection("rateLimits")
          .doc(`user_${userId}_${endpoint}`);
        batch.update(userRateLimitRef, {
          blocked: false,
          unblockedAt: admin.firestore.FieldValue.serverTimestamp(),
          unblockedBy: context.auth.uid,
        });
      }

      // Unblock IP if provided
      if (ip) {
        const ipRateLimitRef = db
          .collection("rateLimits")
          .doc(`ip_${ip.replace(/\./g, "_")}_${endpoint}`);
        batch.update(ipRateLimitRef, {
          blocked: false,
          unblockedAt: admin.firestore.FieldValue.serverTimestamp(),
          unblockedBy: context.auth.uid,
        });
      }
    }

    // If unblocking a user, also update their user record
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      batch.update(userRef, {
        blocked: false,
        unblockedAt: admin.firestore.FieldValue.serverTimestamp(),
        unblockedBy: context.auth.uid,
      });

      // Log the action
      const actionLogRef = db.collection("adminActionLogs").doc();
      batch.set(actionLogRef, {
        action: "unblock_user",
        adminId: context.auth.uid,
        targetUserId: userId,
        targetIp: ip || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      success: true,
      userId: userId || null,
      ip: ip || null,
    };
  } catch (error) {
    return handleError(error, "unblockUser");
  }
});

/**
 * Gets a list of currently blocked users and IPs
 * Used by admins to manage blocked entities
 */
export const getBlockedEntities = functions.https.onCall(
  async (data, context) => {
    try {
      // Ensure user is authenticated and an admin
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Check if user is an admin
      const userDoc = await db.collection("users").doc(context.auth.uid).get();
      const userData = userDoc.data();

      if (!userData?.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges required",
        );
      }

      // Get blocked users
      const blockedUsersSnapshot = await db
        .collection("users")
        .where("blocked", "==", true)
        .get();

      const blockedUsers = blockedUsersSnapshot.docs.map((doc) => {
        const user = doc.data();
        return {
          userId: doc.id,
          email: user.email,
          blockedAt: user.blockedAt?.toDate() || null,
          blockReason: user.blockReason || "Unknown",
          blockedBy: user.blockedBy || null,
          blockExpiresAt: user.blockExpiresAt?.toDate() || null,
        };
      });

      // Get blocked IPs (from the auth endpoint as representative)
      const blockedIpsSnapshot = await db
        .collection("rateLimits")
        .where("endpoint", "==", "auth")
        .where("blocked", "==", true)
        .where("ip", "!=", null)
        .get();

      const blockedIps = blockedIpsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ip: data.ip,
          blockedAt: data.blockedAt?.toDate() || null,
          reason: data.reason || "Unknown",
          blockedBy: data.blockedBy || null,
          blockDurationMs: data.blockDurationMs || 0,
          blockExpiresAt:
            data.blockedAt && data.blockDurationMs
              ? new Date(
                  data.blockedAt.toDate().getTime() + data.blockDurationMs,
                )
              : null,
        };
      });

      return {
        blockedUsers,
        blockedIps,
      };
    } catch (error) {
      return handleError(error, "getBlockedEntities");
    }
  },
);
