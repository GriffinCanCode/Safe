/**
 * @fileoverview User Management Functions
 * @description Cloud Functions for user account management and administration
 * @security Handles user operations while maintaining zero-knowledge principles
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {handleError} from "../utils/error-handler";
import {checkRateLimit} from "../utils/rate-limiting";

const db = admin.firestore();

// TypeScript interfaces
interface UserSettings {
  autoLockTimeout: number;
  theme: "light" | "dark" | "system";
  notifications: boolean;
  twoFactorEnabled: boolean;
}

interface UserPreferences {
  [key: string]: string | number | boolean | null | undefined;
}

interface UpdateUserProfileData {
  displayName?: string;
  preferences?: UserPreferences;
  settings?: Partial<UserSettings>;
}

interface StorageUsage {
  totalFiles: number;
  totalSize: number;
  totalVaultItems: number;
}

interface PlanInfo {
  plan: string;
  storageLimit: number;
  fileLimit: number;
}

interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  emailVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  preferences: UserPreferences;
  settings: UserSettings;
  storageUsage: StorageUsage;
  planInfo: PlanInfo;
}

interface DeleteUserAccountData {
  confirmationCode: string;
}

interface UpdateUserEmailData {
  newEmail: string;
}

interface UpdateTwoFactorAuthData {
  enabled: boolean;
  backupCodes?: string[];
  ip?: string;
  userAgent?: string;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp?: string;
}

interface SecurityStatus {
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  lastPasswordChange?: string;
  lastLoginAt?: string;
  activeSessionsCount: number;
  recentAlerts: SecurityAlert[];
  securityScore: number;
  recommendations: string[];
}

interface AdminManageUserData {
  targetUserId: string;
  action: "suspend" | "activate" | "verify_email" | "reset_2fa";
  reason?: string;
}

interface UserData {
  email?: string;
  displayName?: string;
  emailVerified?: boolean;
  createdAt?: admin.firestore.Timestamp;
  lastLoginAt?: admin.firestore.Timestamp;
  preferences?: UserPreferences;
  settings?: UserSettings;
  totalFiles?: number;
  totalStorageUsed?: number;
  totalVaultItems?: number;
  plan?: string;
  storageLimit?: number;
  fileLimit?: number;
  isAdmin?: boolean;
  suspended?: boolean;
  suspendedAt?: admin.firestore.Timestamp;
  suspensionReason?: string;
  activatedAt?: admin.firestore.Timestamp;
  security?: {
    lastPasswordChange?: admin.firestore.Timestamp;
    twoFactorUpdatedAt?: admin.firestore.Timestamp;
    twoFactorResetAt?: admin.firestore.Timestamp;
    twoFactorResetBy?: string;
    backupCodes?: string[];
  };
  securityAlerts?: number;
  lastAdminAction?: {
    action: string;
    adminId: string;
    reason: string;
    timestamp: admin.firestore.Timestamp;
  };
  updatedAt?: admin.firestore.Timestamp;
  emailUpdatedAt?: admin.firestore.Timestamp;
  [key: string]: string | number | boolean | admin.firestore.Timestamp | UserPreferences | UserSettings | object | null | undefined; // Allow additional properties for Firestore compatibility
}

interface FileData {
  userId: string;
  chunkPaths?: string[];
}

/**
 * Updates user profile information
 * Allows users to update their profile data
 */
export const updateUserProfile = functions.https.onCall(
  async (data: UpdateUserProfileData, context: functions.https.CallableContext) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "updateProfile", 10);

      const {displayName, preferences, settings} = data;

      // Prepare update data (only allow specific fields)
      const updateData: Record<string, unknown> = {
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
        const validSettings: UserSettings = {
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
      return handleError(error as Error, "updateUserProfile");
    }
  },
);

/**
 * Gets user profile information
 * Returns user's profile data (non-sensitive information only)
 */
export const getUserProfile = functions.https.onCall(
  async (data: Record<string, never>, context: functions.https.CallableContext) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "getUserProfile", 20);

      // Get user document
      const userDoc = await db.collection("users").doc(context.auth.uid).get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "User profile not found",
        );
      }

      const userData = userDoc.data() as UserData;

      // Return only safe profile data
      const profile: UserProfile = {
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
          storageLimit: userData?.storageLimit || 1024 * 1024 * 100, // 100MB default
          fileLimit: userData?.fileLimit || 100,
        },
      };

      return {
        success: true,
        profile,
      };
    } catch (error) {
      return handleError(error as Error, "getUserProfile");
    }
  },
);

/**
 * Deletes user account and all associated data
 * Permanent deletion with data cleanup
 */
export const deleteUserAccount = functions.https.onCall(
  async (data: DeleteUserAccountData, context: functions.https.CallableContext) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "deleteAccount", 2);

      const {confirmationCode} = data;

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
        const fileData = fileDoc.data() as FileData;

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
      return handleError(error as Error, "deleteUserAccount");
    }
  },
);

/**
 * Updates user email address
 * Handles email verification and security checks
 */
export const updateUserEmail = functions.https.onCall(
  async (data: UpdateUserEmailData, context: functions.https.CallableContext) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "updateEmail", 3);

      const {newEmail} = data;

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
      } catch (error: unknown) {
        const firebaseError = error as { code?: string };
        if (firebaseError.code !== "auth/user-not-found") {
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
      return handleError(error as Error, "updateUserEmail");
    }
  },
);

/**
 * Enables or disables two-factor authentication
 * Manages 2FA settings for enhanced security
 */
export const updateTwoFactorAuth = functions.https.onCall(
  async (data: UpdateTwoFactorAuthData, context: functions.https.CallableContext) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "update2FA", 5);

      const {enabled, backupCodes} = data;

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
          ...(backupCodes && {"security.backupCodes": backupCodes}),
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
      return handleError(error as Error, "updateTwoFactorAuth");
    }
  },
);

/**
 * Gets user's security settings and status
 * Returns security-related information for the user
 */
export const getUserSecurityStatus = functions.https.onCall(
  async (data: Record<string, never>, context: functions.https.CallableContext) => {
    try {
      // Ensure user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "getSecurityStatus", 10);

      // Get user document
      const userDoc = await db.collection("users").doc(context.auth.uid).get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data() as UserData;

      // Get recent security alerts
      const alertsSnapshot = await db
        .collection("securityAlerts")
        .where("userId", "==", context.auth.uid)
        .where("status", "==", "new")
        .orderBy("timestamp", "desc")
        .limit(5)
        .get();

      const alerts: SecurityAlert[] = alertsSnapshot.docs.map((doc) => {
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

      const securityStatus: SecurityStatus = {
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
      return handleError(error as Error, "getUserSecurityStatus");
    }
  },
);

/**
 * Admin function to manage user accounts
 * Allows admins to suspend, activate, or modify user accounts
 */
export const adminManageUser = functions.https.onCall(
  async (data: AdminManageUserData, context: functions.https.CallableContext) => {
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
      const adminData = adminDoc.data() as UserData;

      if (!adminData?.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "adminManageUser", 10);

      const {targetUserId, action, reason} = data;

      if (!targetUserId || !action) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Target user ID and action required",
        );
      }

      // Get target user
      const targetUserDoc = await db
        .collection("users")
        .doc(targetUserId)
        .get();

      if (!targetUserDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Target user not found",
        );
      }

      const updateData: Record<string, unknown> = {
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
        updateData.emailUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
        // Also update Firebase Auth
        await admin.auth().updateUser(targetUserId, {emailVerified: true});
        break;

      case "reset_2fa":
        updateData["settings.twoFactorEnabled"] = false;
        updateData["security.twoFactorResetAt"] = admin.firestore.FieldValue.serverTimestamp();
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
      return handleError(error as Error, "adminManageUser");
    }
  },
);

// Helper functions

function calculateSecurityScore(userData: UserData): number {
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

function generateSecurityRecommendations(userData: UserData): string[] {
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
