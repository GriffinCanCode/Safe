/**
 * @fileoverview Vault Audit Functions
 * @description Cloud Functions for auditing vault operations in ZK-Vault
 * @security Zero-knowledge audit trail - logs metadata without exposing sensitive data
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {handleError} from "../utils/error-handler";
import {checkRateLimit} from "../utils/rate-limiting";
import {validateFunctionContext} from "../utils/validation.utils";

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
 * Interface for device information
 */
interface DeviceInfo {
  platform?: string;
  browser?: string;
  version?: string;
  os?: string;
  isMobile?: boolean;
  [key: string]: unknown;
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
    deviceInfo?: DeviceInfo;
    success: boolean;
    errorCode?: string;
    additionalData?: Record<string, unknown>;
  };
}

/**
 * Interface for logging audit event data
 */
interface LogAuditEventData {
  eventType: AuditEventType;
  itemId?: string;
  itemType?: string;
  targetUserId?: string;
  success?: boolean;
  errorCode?: string;
  additionalData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: DeviceInfo;
}

/**
 * Interface for getting user audit logs data
 */
interface GetUserAuditLogsData {
  startDate?: string;
  endDate?: string;
  eventTypes?: AuditEventType[];
  limit?: number;
  offset?: number;
}

/**
 * Interface for audit log response
 */
interface AuditLogResponse {
  id: string;
  eventType: AuditEventType;
  itemId?: string;
  itemType?: string;
  targetUserId?: string;
  timestamp?: string;
  success: boolean;
  errorCode?: string;
  ipAddress?: string;
  userAgent?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Interface for user audit stats data
 */
interface GetUserAuditStatsData {
  period?: number;
}

/**
 * Interface for sharing activity stats
 */
interface SharingActivityStats {
  itemsShared: number;
  itemsUnshared: number;
  uniqueRecipients: number;
}

/**
 * Interface for user audit statistics
 */
interface UserAuditStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByDay: Record<string, number>;
  successfulEvents: number;
  failedEvents: number;
  mostActiveDay: string;
  mostCommonEventType: string;
  itemTypes: Record<string, number>;
  sharingActivity: SharingActivityStats;
}

/**
 * Interface for system audit analytics data
 */
interface GetSystemAuditAnalyticsData {
  period?: number;
}

/**
 * Interface for sharing metrics
 */
interface SharingMetrics {
  totalShares: number;
  totalUnshares: number;
  activeShares: number;
}

/**
 * Interface for system audit analytics
 */
interface SystemAuditAnalytics {
  totalEvents: number;
  uniqueUsers: number;
  eventsByType: Record<string, number>;
  eventsByDay: Record<string, number>;
  successRate: number;
  topUsers: Record<string, number>;
  securityEvents: number;
  sharingMetrics: SharingMetrics;
}

/**
 * Interface for security alert details
 */
interface SecurityAlertDetails {
  exportCount?: number;
  shareCount?: number;
  timeWindow: string;
  threshold: number;
}

/**
 * Interface for security alert
 */
interface SecurityAlert {
  type: string;
  userId: string;
  eventType: AuditEventType;
  severity: "low" | "medium" | "high" | "critical";
  details: SecurityAlertDetails;
  timestamp: admin.firestore.FieldValue;
  status: "active" | "resolved" | "dismissed";
}

/**
 * Interface for user data
 */
interface UserData {
  isAdmin?: boolean;
  [key: string]: unknown;
}

/**
 * Logs a vault audit event
 * Records vault operations for security and compliance while preserving zero-knowledge
 */
export const logVaultAuditEvent = functions.https.onCall(
  async (data: LogAuditEventData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      const userId = context.auth?.uid;
      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User ID is required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(userId, "audit", 50);

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
        userId,
        eventType,
        itemId: itemId || undefined,
        itemType: itemType || undefined,
        targetUserId: targetUserId || undefined,
        metadata: {
          timestamp:
            admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
          ipAddress: ipAddress || context.rawRequest?.ip,
          userAgent: userAgent || context.rawRequest?.get("user-agent"),
          deviceInfo: deviceInfo || undefined,
          success,
          errorCode: errorCode || undefined,
          additionalData,
        },
      };

      // Store audit entry
      const auditRef = await db.collection("vaultAuditLogs").add(auditEntry);

      // Update user's audit statistics
      await updateUserAuditStats(userId, eventType, success);

      // Check for suspicious activity patterns
      await checkSuspiciousActivity(userId, eventType);

      return {
        success: true,
        auditId: auditRef.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return handleError(error as import("../utils/error-handler").GenericError, "logVaultAuditEvent");
    }
  },
);

/**
 * Retrieves audit logs for a user
 * Provides access to user's own audit trail
 */
export const getUserAuditLogs = functions.https.onCall(
  async (data: GetUserAuditLogsData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      const userId = context.auth?.uid;
      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User ID is required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(userId, "audit", 20);

      const {
        startDate,
        endDate,
        eventTypes = [],
        limit = 50,
        offset = 0,
      } = data || {};

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
      const auditLogs: AuditLogResponse[] = snapshot.docs
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
      return handleError(error as import("../utils/error-handler").GenericError, "getUserAuditLogs");
    }
  },
);

/**
 * Gets audit statistics for a user
 * Provides insights into vault usage patterns
 */
export const getUserAuditStats = functions.https.onCall(
  async (data: GetUserAuditStatsData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      const userId = context.auth?.uid;
      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User ID is required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(userId, "audit", 10);

      const {period = 30} = data || {}; // Default to last 30 days

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
      const stats: UserAuditStats = {
        totalEvents: snapshot.size,
        eventsByType: {},
        eventsByDay: {},
        successfulEvents: 0,
        failedEvents: 0,
        mostActiveDay: "",
        mostCommonEventType: "",
        itemTypes: {},
        sharingActivity: {
          itemsShared: 0,
          itemsUnshared: 0,
          uniqueRecipients: 0,
        },
      };

      const uniqueRecipients = new Set<string>();

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
            uniqueRecipients.add(data.targetUserId);
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

      // Set unique recipients count
      stats.sharingActivity.uniqueRecipients = uniqueRecipients.size;

      return {
        success: true,
        period,
        stats,
      };
    } catch (error) {
      return handleError(error as import("../utils/error-handler").GenericError, "getUserAuditStats");
    }
  },
);

/**
 * Admin function to get system-wide audit analytics
 * Provides overview of vault usage across all users
 */
export const getSystemAuditAnalytics = functions.https.onCall(
  async (data: GetSystemAuditAnalyticsData, context: functions.https.CallableContext) => {
    try {
      // Validate context
      const validation = validateFunctionContext(context);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          validation.error || "Authentication required",
        );
      }

      const userId = context.auth?.uid;
      if (!userId) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User ID is required",
        );
      }

      // Check admin privileges
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data() as UserData | undefined;

      if (!userData?.isAdmin) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Admin privileges required",
        );
      }

      // Apply rate limiting
      await checkRateLimit(userId, "admin", 5);

      const {period = 7} = data || {}; // Default to last 7 days

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
      const analytics: SystemAuditAnalytics = {
        totalEvents: snapshot.size,
        uniqueUsers: 0,
        eventsByType: {},
        eventsByDay: {},
        successRate: 0,
        topUsers: {},
        securityEvents: 0,
        sharingMetrics: {
          totalShares: 0,
          totalUnshares: 0,
          activeShares: 0,
        },
      };

      const uniqueUsers = new Set<string>();
      let successfulEvents = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as VaultAuditEntry;
        const userId = data.userId;
        const eventType = data.eventType;
        const day =
          data.metadata.timestamp?.toDate()?.toISOString().split("T")[0] || "";

        // Track unique users
        uniqueUsers.add(userId);

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
        analytics.totalEvents > 0 ?
          Math.round((successfulEvents / analytics.totalEvents) * 100) :
          100;

      // Set unique users count
      analytics.uniqueUsers = uniqueUsers.size;

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
      return handleError(error as import("../utils/error-handler").GenericError, "getSystemAuditAnalytics");
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
      {merge: true},
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
        const alert: SecurityAlert = {
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
        };

        await db.collection("securityAlerts").add(alert);
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
        const alert: SecurityAlert = {
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
        };

        await db.collection("securityAlerts").add(alert);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
