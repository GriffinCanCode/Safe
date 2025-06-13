"use strict";
/**
 * @fileoverview User Management Functions
 * @description Cloud Functions for user account management and administration
 * @security Handles user operations while maintaining zero-knowledge principles
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
exports.adminManageUser =
  exports.getUserSecurityStatus =
  exports.updateTwoFactorAuth =
  exports.updateUserEmail =
  exports.deleteUserAccount =
  exports.getUserProfile =
  exports.updateUserProfile =
    void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const error_handler_1 = require("../utils/error-handler");
const rate_limiting_1 = require("../utils/rate-limiting");
const db = admin.firestore();
/**
 * Updates user profile information
 * Allows users to update their profile data
 */
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
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
      "updateProfile",
      10,
    );
    const { displayName, preferences, settings } = data;
    // Prepare update data (only allow specific fields)
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (preferences !== undefined) {
      updateData.preferences = preferences;
    }
    if (settings !== undefined) {
      // Validate settings structure
      const validSettings = {
        autoLockTimeout: settings.autoLockTimeout || 15,
        theme: settings.theme || "system",
        notifications: settings.notifications || true,
        twoFactorEnabled: settings.twoFactorEnabled || false,
      };
      updateData.settings = validSettings;
    }
    // Update user document
    await db.collection("users").doc(context.auth.uid).update(updateData);
    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "updateUserProfile");
  }
});
/**
 * Gets user profile information
 * Returns user's profile data (non-sensitive information only)
 */
exports.getUserProfile = functions.https.onCall(async (data, context) => {
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
      "getUserProfile",
      20,
    );
    // Get user document
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User profile not found",
      );
    }
    const userData = userDoc.data();
    // Return only safe profile data
    const profile = {
      uid: context.auth.uid,
      email: userData?.email,
      displayName: userData?.displayName,
      emailVerified: userData?.emailVerified,
      createdAt: userData?.createdAt?.toDate()?.toISOString(),
      lastLoginAt: userData?.lastLoginAt?.toDate()?.toISOString(),
      preferences: userData?.preferences || {},
      settings: userData?.settings || {
        autoLockTimeout: 15,
        theme: "system",
        notifications: true,
        twoFactorEnabled: false,
      },
      storageUsage: {
        totalFiles: userData?.totalFiles || 0,
        totalSize: userData?.totalStorageUsed || 0,
        totalVaultItems: userData?.totalVaultItems || 0,
      },
      planInfo: {
        plan: userData?.plan || "free",
        storageLimit: userData?.storageLimit || 1024 * 1024 * 100,
        fileLimit: userData?.fileLimit || 100,
      },
    };
    return {
      success: true,
      profile,
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "getUserProfile");
  }
});
/**
 * Deletes user account and all associated data
 * Permanent deletion with data cleanup
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
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
      "deleteAccount",
      2,
    );
    const { confirmationCode } = data;
    // For security, require confirmation code
    if (!confirmationCode || confirmationCode !== "DELETE_MY_ACCOUNT") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid confirmation code",
      );
    }
    const userId = context.auth.uid;
    // Begin deletion process
    console.log(`Starting account deletion for user ${userId}`);
    // 1. Delete user's files and chunks
    const filesSnapshot = await db
      .collection("files")
      .where("userId", "==", userId)
      .get();
    for (const fileDoc of filesSnapshot.docs) {
      const fileData = fileDoc.data();
      // Delete file chunks from storage
      if (fileData.chunkPaths && Array.isArray(fileData.chunkPaths)) {
        const storage = admin.storage();
        const bucket = storage.bucket();
        for (const chunkPath of fileData.chunkPaths) {
          try {
            await bucket.file(chunkPath).delete();
          } catch (error) {
            console.warn(`Failed to delete chunk ${chunkPath}:`, error);
            // Continue with deletion
          }
        }
      }
      // Delete file document
      await fileDoc.ref.delete();
    }
    // 2. Delete vault items
    const vaultItemsSnapshot = await db
      .collection("vaults")
      .doc(userId)
      .collection("items")
      .get();
    const vaultBatch = db.batch();
    vaultItemsSnapshot.docs.forEach((doc) => {
      vaultBatch.delete(doc.ref);
    });
    if (!vaultItemsSnapshot.empty) {
      await vaultBatch.commit();
    }
    // Delete vault container
    await db
      .collection("vaults")
      .doc(userId)
      .delete()
      .catch(() => {
        // Vault may not exist, continue
      });
    // 3. Delete file shares (both sent and received)
    const sentSharesSnapshot = await db
      .collection("fileShares")
      .where("sharedByUserId", "==", userId)
      .get();
    const receivedSharesSnapshot = await db
      .collection("fileShares")
      .where("sharedWithUserId", "==", userId)
      .get();
    const sharesBatch = db.batch();
    sentSharesSnapshot.docs.forEach((doc) => {
      sharesBatch.delete(doc.ref);
    });
    receivedSharesSnapshot.docs.forEach((doc) => {
      sharesBatch.delete(doc.ref);
    });
    if (sentSharesSnapshot.size + receivedSharesSnapshot.size > 0) {
      await sharesBatch.commit();
    }
    // 4. Delete user sessions
    const sessionsSnapshot = await db
      .collection("userSessions")
      .where("userId", "==", userId)
      .get();
    const sessionsBatch = db.batch();
    sessionsSnapshot.docs.forEach((doc) => {
      sessionsBatch.delete(doc.ref);
    });
    if (!sessionsSnapshot.empty) {
      await sessionsBatch.commit();
    }
    // 5. Delete auth record
    const authSnapshot = await db
      .collection("auth")
      .where("userId", "==", userId)
      .get();
    const authBatch = db.batch();
    authSnapshot.docs.forEach((doc) => {
      authBatch.delete(doc.ref);
    });
    if (!authSnapshot.empty) {
      await authBatch.commit();
    }
    // 6. Delete user from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
    } catch (error) {
      console.error("Error deleting Firebase Auth user:", error);
      // Continue with Firestore deletion
    }
    // 7. Delete user profile document (last)
    await db.collection("users").doc(userId).delete();
    // 8. Log the deletion
    await db.collection("adminActionLogs").add({
      action: "user_account_deleted",
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        filesDeleted: filesSnapshot.size,
        vaultItemsDeleted: vaultItemsSnapshot.size,
        sharesDeleted: sentSharesSnapshot.size + receivedSharesSnapshot.size,
        sessionsDeleted: sessionsSnapshot.size,
      },
    });
    console.log(`Successfully deleted account for user ${userId}`);
    return {
      success: true,
      message: "Account successfully deleted",
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "deleteUserAccount");
  }
});
/**
 * Updates user email address
 * Handles email verification and security checks
 */
exports.updateUserEmail = functions.https.onCall(async (data, context) => {
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
      "updateEmail",
      3,
    );
    const { newEmail } = data;
    // Validate email format
    if (!newEmail || !newEmail.includes("@")) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Valid email address required",
      );
    }
    // Check if email is already in use
    try {
      await admin.auth().getUserByEmail(newEmail);
      throw new functions.https.HttpsError(
        "already-exists",
        "Email address is already in use",
      );
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
      // Email is available, continue
    }
    // Update email in Firebase Auth
    await admin.auth().updateUser(context.auth.uid, {
      email: newEmail,
      emailVerified: false, // Require re-verification
    });
    // Update email in Firestore
    await db.collection("users").doc(context.auth.uid).update({
      email: newEmail.toLowerCase(),
      emailVerified: false,
      emailUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update auth collection if it exists
    const authSnapshot = await db
      .collection("auth")
      .where("userId", "==", context.auth.uid)
      .get();
    if (!authSnapshot.empty) {
      await authSnapshot.docs[0].ref.update({
        email: newEmail.toLowerCase(),
        updated: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return {
      success: true,
      message:
        "Email address updated successfully. Please verify your new email address.",
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "updateUserEmail");
  }
});
/**
 * Enables or disables two-factor authentication
 * Manages 2FA settings for enhanced security
 */
exports.updateTwoFactorAuth = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }
    // Apply rate limiting
    await (0, rate_limiting_1.checkRateLimit)(context.auth.uid, "update2FA", 5);
    const { enabled, backupCodes } = data;
    if (typeof enabled !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Enabled flag must be boolean",
      );
    }
    // Update user settings
    await db
      .collection("users")
      .doc(context.auth.uid)
      .update({
        "settings.twoFactorEnabled": enabled,
        "security.twoFactorUpdatedAt":
          admin.firestore.FieldValue.serverTimestamp(),
        ...(backupCodes && { "security.backupCodes": backupCodes }),
      });
    // Log security change
    await db.collection("securityLogs").add({
      userId: context.auth.uid,
      action: "two_factor_auth_updated",
      enabled,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        ip: data.ip || "unknown",
        userAgent: data.userAgent || "unknown",
      },
    });
    return {
      success: true,
      message: `Two-factor authentication ${enabled ? "enabled" : "disabled"} successfully`,
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "updateTwoFactorAuth");
  }
});
/**
 * Gets user's security settings and status
 * Returns security-related information for the user
 */
exports.getUserSecurityStatus = functions.https.onCall(
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
        "getSecurityStatus",
        10,
      );
      // Get user document
      const userDoc = await db.collection("users").doc(context.auth.uid).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }
      const userData = userDoc.data();
      // Get recent security alerts
      const alertsSnapshot = await db
        .collection("securityAlerts")
        .where("userId", "==", context.auth.uid)
        .where("status", "==", "new")
        .orderBy("timestamp", "desc")
        .limit(5)
        .get();
      const alerts = alertsSnapshot.docs.map((doc) => {
        const alert = doc.data();
        return {
          id: doc.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message || "Security alert detected",
          timestamp: alert.timestamp?.toDate()?.toISOString(),
        };
      });
      // Get active sessions count
      const activeSessionsSnapshot = await db
        .collection("userSessions")
        .where("userId", "==", context.auth.uid)
        .where("isActive", "==", true)
        .where("expiresAt", ">", admin.firestore.Timestamp.now())
        .get();
      const securityStatus = {
        twoFactorEnabled: userData?.settings?.twoFactorEnabled || false,
        emailVerified: userData?.emailVerified || false,
        lastPasswordChange: userData?.security?.lastPasswordChange
          ?.toDate()
          ?.toISOString(),
        lastLoginAt: userData?.lastLoginAt?.toDate()?.toISOString(),
        activeSessionsCount: activeSessionsSnapshot.size,
        recentAlerts: alerts,
        securityScore: calculateSecurityScore(userData),
        recommendations: generateSecurityRecommendations(userData),
      };
      return {
        success: true,
        securityStatus,
      };
    } catch (error) {
      return (0, error_handler_1.handleError)(error, "getUserSecurityStatus");
    }
  },
);
/**
 * Admin function to manage user accounts
 * Allows admins to suspend, activate, or modify user accounts
 */
exports.adminManageUser = functions.https.onCall(async (data, context) => {
  try {
    // Ensure user is authenticated and an admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }
    // Check if user is an admin
    const adminDoc = await db.collection("users").doc(context.auth.uid).get();
    const adminData = adminDoc.data();
    if (!adminData?.isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin privileges required",
      );
    }
    // Apply rate limiting
    await (0, rate_limiting_1.checkRateLimit)(
      context.auth.uid,
      "adminManageUser",
      10,
    );
    const { targetUserId, action, reason } = data;
    if (!targetUserId || !action) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Target user ID and action required",
      );
    }
    // Get target user
    const targetUserDoc = await db.collection("users").doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Target user not found",
      );
    }
    let updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAdminAction: {
        action,
        adminId: context.auth.uid,
        reason: reason || "No reason provided",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      },
    };
    switch (action) {
      case "suspend":
        updateData.suspended = true;
        updateData.suspendedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.suspensionReason = reason;
        break;
      case "activate":
        updateData.suspended = false;
        updateData.activatedAt = admin.firestore.FieldValue.serverTimestamp();
        break;
      case "verify_email":
        updateData.emailVerified = true;
        updateData.emailVerifiedAt =
          admin.firestore.FieldValue.serverTimestamp();
        // Also update Firebase Auth
        await admin.auth().updateUser(targetUserId, { emailVerified: true });
        break;
      case "reset_2fa":
        updateData["settings.twoFactorEnabled"] = false;
        updateData["security.twoFactorResetAt"] =
          admin.firestore.FieldValue.serverTimestamp();
        updateData["security.twoFactorResetBy"] = context.auth.uid;
        break;
      default:
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid action",
        );
    }
    // Update user document
    await targetUserDoc.ref.update(updateData);
    // Log admin action
    await db.collection("adminActionLogs").add({
      action: `user_${action}`,
      adminId: context.auth.uid,
      targetUserId,
      reason: reason || "No reason provided",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
      success: true,
      message: `User ${action} completed successfully`,
    };
  } catch (error) {
    return (0, error_handler_1.handleError)(error, "adminManageUser");
  }
});
// Helper functions
function calculateSecurityScore(userData) {
  let score = 0;
  // Email verified
  if (userData?.emailVerified) score += 25;
  // Two-factor authentication enabled
  if (userData?.settings?.twoFactorEnabled) score += 35;
  // Recent password change (within 90 days)
  if (userData?.security?.lastPasswordChange) {
    const passwordAge =
      Date.now() - userData.security.lastPasswordChange.toDate().getTime();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    if (passwordAge < ninetyDays) score += 20;
  }
  // No recent security alerts
  if (!userData?.securityAlerts || userData.securityAlerts === 0) score += 20;
  return Math.min(score, 100);
}
function generateSecurityRecommendations(userData) {
  const recommendations = [];
  if (!userData?.emailVerified) {
    recommendations.push("Verify your email address for enhanced security");
  }
  if (!userData?.settings?.twoFactorEnabled) {
    recommendations.push(
      "Enable two-factor authentication for better account protection",
    );
  }
  if (userData?.security?.lastPasswordChange) {
    const passwordAge =
      Date.now() - userData.security.lastPasswordChange.toDate().getTime();
    const sixMonths = 180 * 24 * 60 * 60 * 1000;
    if (passwordAge > sixMonths) {
      recommendations.push(
        "Consider changing your password (last changed over 6 months ago)",
      );
    }
  } else {
    recommendations.push("Consider changing your password regularly");
  }
  if (userData?.securityAlerts && userData.securityAlerts > 0) {
    recommendations.push(
      "Review and address any security alerts in your account",
    );
  }
  return recommendations;
}
//# sourceMappingURL=user-management.functions.js.map
