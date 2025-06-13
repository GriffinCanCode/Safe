/**
 * @fileoverview Vault Audit Functions
 * @description Cloud Functions for auditing vault operations in ZK-Vault
 * @security Zero-knowledge audit trail - logs metadata without exposing sensitive data
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { handleError } from "../utils/error-handler";
import { checkRateLimit } from "../utils/rate-limiting";
import { validateFunctionContext } from "../utils/validation.utils";

const db = admin.firestore();

/**
 * Audit event types for vault operations
 */
export enum AuditEventType {
  VAULT_ITEM_CREATED = "vault_item_created",
  VAULT_ITEM_ACCESSED = "vault_item_accessed",
  VAULT_ITEM_UPDATED = "vault_item_updated",
  VAULT_ITEM_DELETED = "vault_item_deleted",
  VAULT_ITEM_SHARED = "vault_item_shared",
  VAULT_ITEM_UNSHARED = "vault_item_unshared",
  VAULT_EXPORT = "vault_export",
  VAULT_IMPORT = "vault_import",
  VAULT_BACKUP = "vault_backup",
  VAULT_RESTORE = "vault_restore",
}

/**
 * Interface for audit log entries
 */
interface VaultAuditEntry {
  userId: string;
  eventType: AuditEventType;
  itemId?: string;
  itemType?: string;
  targetUserId?: string;
  metadata: {
    timestamp: admin.firestore.Timestamp;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: any;
    success: boolean;
    errorCode?: string;
    additionalData?: Record<string, any>;
  };
}

/**
 * Logs a vault audit event
 * Records vault operations for security and compliance while preserving zero-knowledge
 */
export const logVaultAuditEvent = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth!.uid, "audit", 50);

      const {
        eventType,
        itemId,
        itemType,
        targetUserId,
        success = true,
        errorCode,
        additionalData = {},
        ipAddress,
        userAgent,
        deviceInfo,
      } = data;

      // Validate required fields
      if (!eventType || !Object.values(AuditEventType).includes(eventType)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Valid event type is required",
        );
      }

      // Create audit entry
      const auditEntry: VaultAuditEntry = {
        userId: context.auth!.uid,
        eventType,
        itemId: itemId || null,
        itemType: itemType || null,
        targetUserId: targetUserId || null,
        metadata: {
          timestamp:
            admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
          ipAddress: ipAddress || context.rawRequest?.ip,
          userAgent: userAgent || context.rawRequest?.get("user-agent"),
          deviceInfo: deviceInfo || null,
          success,
          errorCode: errorCode || null,
          additionalData,
        },
      };

      // Store audit entry
      const auditRef = await db.collection("vaultAuditLogs").add(auditEntry);

      // Update user's audit statistics
      await updateUserAuditStats(context.auth!.uid, eventType, success);

      // Check for suspicious activity patterns
      await checkSuspiciousActivity(context.auth!.uid, eventType);

      return {
        success: true,
        auditId: auditRef.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return handleError(error, "logVaultAuditEvent");
    }
  },
);

/**
 * Retrieves audit logs for a user
 * Provides access to user's own audit trail
 */
export const getUserAuditLogs = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth!.uid, "audit", 20);

      const {
        startDate,
        endDate,
        eventTypes = [],
        limit = 50,
        offset = 0,
      } = data || {};

      const userId = context.auth!.uid;

      // Build query
      let query = db
        .collection("vaultAuditLogs")
        .where("userId", "==", userId)
        .orderBy("metadata.timestamp", "desc");

      // Add date filters if provided
      if (startDate) {
        query = query.where(
          "metadata.timestamp",
          ">=",
          admin.firestore.Timestamp.fromDate(new Date(startDate)),
        );
      }
      if (endDate) {
        query = query.where(
          "metadata.timestamp",
          "<=",
          admin.firestore.Timestamp.fromDate(new Date(endDate)),
        );
      }

      // Apply pagination
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();

      // Process results
      const auditLogs = snapshot.docs
        .map((doc) => {
          const data = doc.data() as VaultAuditEntry;
          return {
            id: doc.id,
            eventType: data.eventType,
            itemId: data.itemId,
            itemType: data.itemType,
            targetUserId: data.targetUserId,
            timestamp: data.metadata.timestamp?.toDate()?.toISOString(),
            success: data.metadata.success,
            errorCode: data.metadata.errorCode,
            ipAddress: data.metadata.ipAddress,
            userAgent: data.metadata.userAgent,
            additionalData: data.metadata.additionalData,
          };
        })
        .filter((log) => {
          // Filter by event types if specified
          return eventTypes.length === 0 || eventTypes.includes(log.eventType);
        });

      // Get total count for pagination
      const countQuery = await db
        .collection("vaultAuditLogs")
        .where("userId", "==", userId)
        .get();

      return {
        success: true,
        auditLogs,
        totalCount: countQuery.size,
        hasMore: auditLogs.length === limit,
      };
    } catch (error) {
      return handleError(error, "getUserAuditLogs");
    }
  },
);

/**
 * Gets audit statistics for a user
 * Provides insights into vault usage patterns
 */
export const getUserAuditStats = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth!.uid, "audit", 10);

      const { period = 30 } = data || {}; // Default to last 30 days

      const userId = context.auth!.uid;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      // Get audit logs for the period
      const snapshot = await db
        .collection("vaultAuditLogs")
        .where("userId", "==", userId)
        .where(
          "metadata.timestamp",
          ">=",
          admin.firestore.Timestamp.fromDate(startDate),
        )
        .get();

      // Analyze statistics
      const stats = {
        totalEvents: snapshot.size,
        eventsByType: {} as Record<string, number>,
        eventsByDay: {} as Record<string, number>,
        successfulEvents: 0,
        failedEvents: 0,
        mostActiveDay: "",
        mostCommonEventType: "",
        itemTypes: {} as Record<string, number>,
        sharingActivity: {
          itemsShared: 0,
          itemsUnshared: 0,
          uniqueRecipients: new Set<string>(),
        },
      };

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as VaultAuditEntry;
        const eventType = data.eventType;
        const day =
          data.metadata.timestamp?.toDate()?.toISOString().split("T")[0] || "";

        // Count by event type
        stats.eventsByType[eventType] =
          (stats.eventsByType[eventType] || 0) + 1;

        // Count by day
        stats.eventsByDay[day] = (stats.eventsByDay[day] || 0) + 1;

        // Count success/failure
        if (data.metadata.success) {
          stats.successfulEvents++;
        } else {
          stats.failedEvents++;
        }

        // Count item types
        if (data.itemType) {
          stats.itemTypes[data.itemType] =
            (stats.itemTypes[data.itemType] || 0) + 1;
        }

        // Track sharing activity
        if (eventType === AuditEventType.VAULT_ITEM_SHARED) {
          stats.sharingActivity.itemsShared++;
          if (data.targetUserId) {
            stats.sharingActivity.uniqueRecipients.add(data.targetUserId);
          }
        } else if (eventType === AuditEventType.VAULT_ITEM_UNSHARED) {
          stats.sharingActivity.itemsUnshared++;
        }
      });

      // Find most active day
      stats.mostActiveDay =
        Object.entries(stats.eventsByDay).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0] || "";

      // Find most common event type
      stats.mostCommonEventType =
        Object.entries(stats.eventsByType).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0] || "";

      // Convert Set to count
      const uniqueRecipientsCount = stats.sharingActivity.uniqueRecipients.size;
      stats.sharingActivity = {
        ...stats.sharingActivity,
        uniqueRecipients: uniqueRecipientsCount as any,
      };

      return {
        success: true,
        period,
        stats,
      };
    } catch (error) {
      return handleError(error, "getUserAuditStats");
    }
  },
);

/**
 * Admin function to get system-wide audit analytics
 * Provides overview of vault usage across all users
 */
export const getSystemAuditAnalytics = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      // Check admin privileges
      const userDoc = await db.collection("users").doc(context.auth!.uid).get();
      const userData = userDoc.data();

      if (!userData?.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(context.auth!.uid, "admin", 5);

      const { period = 7 } = data || {}; // Default to last 7 days

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      // Get all audit logs for the period
      const snapshot = await db
        .collection("vaultAuditLogs")
        .where(
          "metadata.timestamp",
          ">=",
          admin.firestore.Timestamp.fromDate(startDate),
        )
        .get();

      // Analyze system-wide statistics
      const analytics = {
        totalEvents: snapshot.size,
        uniqueUsers: new Set<string>(),
        eventsByType: {} as Record<string, number>,
        eventsByDay: {} as Record<string, number>,
        successRate: 0,
        topUsers: {} as Record<string, number>,
        securityEvents: 0,
        sharingMetrics: {
          totalShares: 0,
          totalUnshares: 0,
          activeShares: 0,
        },
      };

      let successfulEvents = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as VaultAuditEntry;
        const userId = data.userId;
        const eventType = data.eventType;
        const day =
          data.metadata.timestamp?.toDate()?.toISOString().split("T")[0] || "";

        // Track unique users
        analytics.uniqueUsers.add(userId);

        // Count by event type
        analytics.eventsByType[eventType] =
          (analytics.eventsByType[eventType] || 0) + 1;

        // Count by day
        analytics.eventsByDay[day] = (analytics.eventsByDay[day] || 0) + 1;

        // Track user activity
        analytics.topUsers[userId] = (analytics.topUsers[userId] || 0) + 1;

        // Count successful events
        if (data.metadata.success) {
          successfulEvents++;
        }

        // Track sharing metrics
        if (eventType === AuditEventType.VAULT_ITEM_SHARED) {
          analytics.sharingMetrics.totalShares++;
        } else if (eventType === AuditEventType.VAULT_ITEM_UNSHARED) {
          analytics.sharingMetrics.totalUnshares++;
        }

        // Count security-related events
        if (
          eventType === AuditEventType.VAULT_EXPORT ||
          eventType === AuditEventType.VAULT_BACKUP
        ) {
          analytics.securityEvents++;
        }
      });

      // Calculate success rate
      analytics.successRate =
        analytics.totalEvents > 0
          ? Math.round((successfulEvents / analytics.totalEvents) * 100)
          : 100;

      // Convert unique users set to count
      const uniqueUsersCount = analytics.uniqueUsers.size;
      analytics.uniqueUsers = uniqueUsersCount as any;

      // Calculate active shares (approximate)
      analytics.sharingMetrics.activeShares = Math.max(
        0,
        analytics.sharingMetrics.totalShares -
          analytics.sharingMetrics.totalUnshares,
      );

      return {
        success: true,
        period,
        analytics,
      };
    } catch (error) {
      return handleError(error, "getSystemAuditAnalytics");
    }
  },
);

/**
 * Helper function to update user audit statistics
 */
async function updateUserAuditStats(
  userId: string,
  eventType: AuditEventType,
  success: boolean,
): Promise<void> {
  try {
    const userStatsRef = db.collection("userAuditStats").doc(userId);

    await userStatsRef.set(
      {
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        totalEvents: admin.firestore.FieldValue.increment(1),
        successfulEvents: admin.firestore.FieldValue.increment(success ? 1 : 0),
        failedEvents: admin.firestore.FieldValue.increment(success ? 0 : 1),
        [`eventCounts.${eventType}`]: admin.firestore.FieldValue.increment(1),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Error updating user audit stats:", error);
    // Don't throw error as this is a background operation
  }
}

/**
 * Helper function to check for suspicious activity patterns
 */
async function checkSuspiciousActivity(
  userId: string,
  eventType: AuditEventType,
): Promise<void> {
  try {
    // Check for rapid vault exports (potential data exfiltration)
    if (eventType === AuditEventType.VAULT_EXPORT) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentExports = await db
        .collection("vaultAuditLogs")
        .where("userId", "==", userId)
        .where("eventType", "==", AuditEventType.VAULT_EXPORT)
        .where(
          "metadata.timestamp",
          ">=",
          admin.firestore.Timestamp.fromDate(oneHourAgo),
        )
        .get();

      if (recentExports.size >= 5) {
        // Create security alert
        await db.collection("securityAlerts").add({
          type: "suspicious_vault_activity",
          userId,
          eventType,
          severity: "high",
          details: {
            exportCount: recentExports.size,
            timeWindow: "1 hour",
            threshold: 5,
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "active",
        });
      }
    }

    // Check for excessive sharing activity
    if (eventType === AuditEventType.VAULT_ITEM_SHARED) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentShares = await db
        .collection("vaultAuditLogs")
        .where("userId", "==", userId)
        .where("eventType", "==", AuditEventType.VAULT_ITEM_SHARED)
        .where(
          "metadata.timestamp",
          ">=",
          admin.firestore.Timestamp.fromDate(oneDayAgo),
        )
        .get();

      if (recentShares.size >= 20) {
        // Create security alert
        await db.collection("securityAlerts").add({
          type: "excessive_sharing_activity",
          userId,
          eventType,
          severity: "medium",
          details: {
            shareCount: recentShares.size,
            timeWindow: "24 hours",
            threshold: 20,
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "active",
        });
      }
    }
  } catch (error) {
    console.error("Error checking suspicious activity:", error);
    // Don't throw error as this is a background operation
  }
}

/**
 * Automated cleanup of old audit logs
 * Runs daily to maintain performance and comply with data retention policies
 */
export const cleanupOldAuditLogs = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    try {
      // Delete audit logs older than 1 year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const oldLogsSnapshot = await db
        .collection("vaultAuditLogs")
        .where(
          "metadata.timestamp",
          "<",
          admin.firestore.Timestamp.fromDate(oneYearAgo),
        )
        .limit(500) // Process in batches
        .get();

      if (oldLogsSnapshot.empty) {
        console.log("No old audit logs to clean up");
        return null;
      }

      // Delete old logs in batch
      const batch = db.batch();
      oldLogsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Cleaned up ${oldLogsSnapshot.size} old audit log entries`);
      return null;
    } catch (error) {
      console.error("Error cleaning up old audit logs:", error);
      return null;
    }
  });
