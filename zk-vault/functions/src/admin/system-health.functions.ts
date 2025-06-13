/**
 * @fileoverview System Health Functions
 * @description Cloud Functions for monitoring system health in ZK-Vault
 * @security Admin-only functions for system monitoring
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { handleError } from "../utils/error-handler";
import { checkRateLimit } from "../utils/rate-limiting";

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

/**
 * System metrics to track
 */
interface SystemMetrics {
  userCount: number;
  activeUserCount: number;
  fileCount: number;
  totalStorageUsed: number;
  vaultItemCount: number;
  averageFileSize: number;
  averageChunksPerFile: number;
  deduplicationSavings: number;
  errorRate: number;
  apiUsage: Record<string, number>;
  timestamp: admin.firestore.Timestamp;
}

/**
 * Collects system metrics
 * Runs daily to gather system statistics
 */
export const collectSystemMetrics = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    try {
      // Get user counts
      const userSnapshot = await db.collection("users").get();
      const userCount = userSnapshot.size;

      // Get active users (logged in within last 30 days)
      const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      );

      const activeUserSnapshot = await db
        .collection("users")
        .where("lastLoginAt", ">=", thirtyDaysAgo)
        .get();

      const activeUserCount = activeUserSnapshot.size;

      // Get file counts and storage usage
      const fileSnapshot = await db
        .collection("files")
        .where("status", "==", "complete")
        .get();

      const fileCount = fileSnapshot.size;

      let totalStorageUsed = 0;
      let totalChunks = 0;
      let deduplicatedFiles = 0;
      let potentialStorageWithoutDedup = 0;

      fileSnapshot.forEach((doc) => {
        const fileData = doc.data();
        const fileSize = fileData.totalSize || 0;

        totalStorageUsed += fileSize;
        totalChunks += fileData.totalChunks || 0;

        // Track deduplication savings
        if (fileData.isDeduplicated) {
          deduplicatedFiles++;
          potentialStorageWithoutDedup += fileSize;
        }
      });

      const averageFileSize = fileCount > 0 ? totalStorageUsed / fileCount : 0;
      const averageChunksPerFile = fileCount > 0 ? totalChunks / fileCount : 0;

      // Calculate deduplication savings
      const deduplicationSavings = potentialStorageWithoutDedup;

      // Get vault item count
      const vaultItemSnapshot = await db.collection("vaultItems").get();
      const vaultItemCount = vaultItemSnapshot.size;

      // Get error rate (last 24 hours)
      const oneDayAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      );

      const errorLogsSnapshot = await db
        .collection("errorLogs")
        .where("timestamp", ">=", oneDayAgo)
        .get();

      const apiLogsSnapshot = await db
        .collection("apiLogs")
        .where("timestamp", ">=", oneDayAgo)
        .get();

      const errorRate =
        apiLogsSnapshot.size > 0
          ? errorLogsSnapshot.size / apiLogsSnapshot.size
          : 0;

      // Get API usage by endpoint
      const apiUsage: Record<string, number> = {};

      apiLogsSnapshot.forEach((doc) => {
        const logData = doc.data();
        const endpoint = logData.endpoint || "unknown";

        apiUsage[endpoint] = (apiUsage[endpoint] || 0) + 1;
      });

      // Create metrics object
      const metrics: SystemMetrics = {
        userCount,
        activeUserCount,
        fileCount,
        totalStorageUsed,
        vaultItemCount,
        averageFileSize,
        averageChunksPerFile,
        deduplicationSavings,
        errorRate,
        apiUsage,
        timestamp:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      };

      // Store metrics
      await db.collection("systemMetrics").add(metrics);

      // Update current metrics document
      await db.collection("systemStatus").doc("currentMetrics").set(metrics);

      return null;
    } catch (error) {
      console.error("Error collecting system metrics:", error);
      return null;
    }
  });

/**
 * Gets system health status
 * Provides current system metrics and health indicators
 */
export const getSystemHealth = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
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

      // Apply rate limiting for admin operations
      await checkRateLimit(context.auth.uid, "admin", 10);

      // Get current metrics
      const metricsDoc = await db
        .collection("systemStatus")
        .doc("currentMetrics")
        .get();
      const currentMetrics = metricsDoc.exists
        ? (metricsDoc.data() as SystemMetrics)
        : null;

      // Get historical metrics for trends (last 30 days)
      const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      );

      const historicalMetricsSnapshot = await db
        .collection("systemMetrics")
        .where("timestamp", ">=", thirtyDaysAgo)
        .orderBy("timestamp", "asc")
        .get();

      const historicalMetrics = historicalMetricsSnapshot.docs.map((doc) =>
        doc.data(),
      );

      // Calculate trends
      const trends = calculateTrends(historicalMetrics as SystemMetrics[]);

      // Get current system alerts
      const alertsSnapshot = await db
        .collection("systemAlerts")
        .where("status", "==", "active")
        .orderBy("severity", "desc")
        .limit(10)
        .get();

      const alerts = alertsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          message: data.message,
          severity: data.severity,
          createdAt: data.createdAt?.toDate() || null,
          details: data.details || null,
        };
      });

      // Get recent errors
      const recentErrorsSnapshot = await db
        .collection("errorLogs")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      const recentErrors = recentErrorsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          error: data.error,
          endpoint: data.endpoint,
          userId: data.userId,
          timestamp: data.timestamp?.toDate() || null,
          details: data.details || null,
        };
      });

      // Calculate system health score (0-100)
      const healthScore = calculateHealthScore(currentMetrics, alerts.length);

      return {
        currentMetrics,
        trends,
        alerts,
        recentErrors,
        healthScore,
        healthStatus: getHealthStatus(healthScore),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return handleError(error, "getSystemHealth");
    }
  },
);

/**
 * Runs system health checks
 * Performs diagnostic tests on system components
 */
export const runSystemHealthCheck = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
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

      // Apply rate limiting for admin operations
      await checkRateLimit(context.auth.uid, "admin", 2);

      // Run health checks
      const healthChecks = await Promise.allSettled([
        checkFirestoreHealth(),
        checkStorageHealth(),
        checkAuthHealth(),
        checkFunctionsHealth(),
      ]);

      // Process results
      const results = {
        firestore:
          healthChecks[0].status === "fulfilled"
            ? healthChecks[0].value
            : { status: "error" },
        storage:
          healthChecks[1].status === "fulfilled"
            ? healthChecks[1].value
            : { status: "error" },
        auth:
          healthChecks[2].status === "fulfilled"
            ? healthChecks[2].value
            : { status: "error" },
        functions:
          healthChecks[3].status === "fulfilled"
            ? healthChecks[3].value
            : { status: "error" },
        timestamp: new Date().toISOString(),
      };

      // Store health check results
      await db.collection("systemStatus").doc("lastHealthCheck").set({
        results,
        runBy: context.auth.uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return results;
    } catch (error) {
      return handleError(error, "runSystemHealthCheck");
    }
  },
);

/**
 * Creates a system alert
 * Records system issues for admin attention
 */
export const createSystemAlert = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
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

      const { type, message, severity = "medium", details = null } = data;

      // Validate input
      if (!type || !message) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing type or message",
        );
      }

      if (!["low", "medium", "high", "critical"].includes(severity)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid severity level",
        );
      }

      // Create alert
      const alertRef = await db.collection("systemAlerts").add({
        type,
        message,
        severity,
        details,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // For critical alerts, notify all admins
      if (severity === "critical") {
        const adminsSnapshot = await db
          .collection("users")
          .where("isAdmin", "==", true)
          .get();

        adminsSnapshot.forEach((doc) => {
          // In a real system, we would send notifications to admins here
          console.log(
            `Would notify admin ${doc.id} about critical alert: ${message}`,
          );
        });
      }

      return {
        success: true,
        alertId: alertRef.id,
      };
    } catch (error) {
      return handleError(error, "createSystemAlert");
    }
  },
);

/**
 * Resolves a system alert
 * Marks an alert as resolved
 */
export const resolveSystemAlert = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
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

      const { alertId, resolution } = data;

      // Validate input
      if (!alertId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing alertId",
        );
      }

      // Get alert
      const alertRef = db.collection("systemAlerts").doc(alertId);
      const alertDoc = await alertRef.get();

      if (!alertDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Alert not found");
      }

      // Update alert
      await alertRef.update({
        status: "resolved",
        resolution: resolution || "Marked as resolved",
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
        resolvedBy: context.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        alertId,
      };
    } catch (error) {
      return handleError(error, "resolveSystemAlert");
    }
  },
);

/**
 * Helper function to check Firestore health
 */
async function checkFirestoreHealth() {
  try {
    // Check read operations
    const startTime = Date.now();
    const testDoc = await db.collection("systemStatus").doc("health").get();
    const readLatency = Date.now() - startTime;

    // Check write operations
    const writeStartTime = Date.now();
    await db.collection("systemStatus").doc("health").set({
      lastCheck: admin.firestore.FieldValue.serverTimestamp(),
      status: "healthy",
    });
    const writeLatency = Date.now() - writeStartTime;

    return {
      status: "healthy",
      readLatency,
      writeLatency,
      details: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Firestore health check failed:", error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      details: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Helper function to check Storage health
 */
async function checkStorageHealth() {
  try {
    // Check if bucket is accessible
    const startTime = Date.now();
    await bucket.exists();
    const latency = Date.now() - startTime;

    // Write a test file
    const writeStartTime = Date.now();
    const testFile = bucket.file("system-health/test.txt");
    await testFile.save("System health check", {
      contentType: "text/plain",
    });
    const writeLatency = Date.now() - writeStartTime;

    // Delete the test file
    await testFile.delete();

    return {
      status: "healthy",
      latency,
      writeLatency,
      details: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Storage health check failed:", error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      details: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Helper function to check Auth health
 */
async function checkAuthHealth() {
  try {
    // Check if auth service is accessible
    const startTime = Date.now();
    await admin.auth().listUsers(1);
    const latency = Date.now() - startTime;

    return {
      status: "healthy",
      latency,
      details: {
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Auth health check failed:", error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      details: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Helper function to check Functions health
 */
async function checkFunctionsHealth() {
  try {
    // For Functions, we can only check if the current function is running
    // which it obviously is if we're executing this code

    // We could make HTTP calls to other functions, but that would require
    // setting up specific endpoints for health checks

    return {
      status: "healthy",
      details: {
        timestamp: new Date().toISOString(),
        note: "Limited health check - only verifies current function execution",
      },
    };
  } catch (error) {
    console.error("Functions health check failed:", error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      details: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Helper function to calculate trends from historical metrics
 */
function calculateTrends(metrics: SystemMetrics[]) {
  if (!metrics || metrics.length < 2) {
    return {
      userGrowth: 0,
      storageGrowth: 0,
      vaultItemGrowth: 0,
      errorRateTrend: 0,
    };
  }

  const oldest = metrics[0];
  const newest = metrics[metrics.length - 1];

  const userGrowth = calculateGrowthRate(oldest.userCount, newest.userCount);
  const storageGrowth = calculateGrowthRate(
    oldest.totalStorageUsed,
    newest.totalStorageUsed,
  );
  const vaultItemGrowth = calculateGrowthRate(
    oldest.vaultItemCount,
    newest.vaultItemCount,
  );
  const errorRateTrend = calculateGrowthRate(
    oldest.errorRate,
    newest.errorRate,
  );

  return {
    userGrowth,
    storageGrowth,
    vaultItemGrowth,
    errorRateTrend,
  };
}

/**
 * Helper function to calculate growth rate
 */
function calculateGrowthRate(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Helper function to calculate system health score
 */
function calculateHealthScore(
  metrics: SystemMetrics | null,
  alertCount: number,
): number {
  if (!metrics) return 50; // Default score if no metrics

  // Base score starts at 100
  let score = 100;

  // Reduce score based on error rate (up to -30 points)
  score -= Math.min(metrics.errorRate * 100, 30);

  // Reduce score based on active alerts (up to -20 points)
  score -= Math.min(alertCount * 5, 20);

  // Reduce score if active users are low compared to total users (up to -20 points)
  const userRatio =
    metrics.userCount > 0 ? metrics.activeUserCount / metrics.userCount : 1;
  score -= Math.min((1 - userRatio) * 20, 20);

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Helper function to get health status text
 */
function getHealthStatus(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 25) return "Poor";
  return "Critical";
}
