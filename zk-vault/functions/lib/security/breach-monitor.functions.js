"use strict";
/**
 * @fileoverview Breach Monitoring Functions
 * @description Cloud Functions for monitoring potential security breaches in ZK-Vault
 * @security Monitors for breaches while preserving zero-knowledge principles
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
exports.monitorEncryptionOperations =
  exports.processBreachCheckTask =
  exports.scheduleCredentialBreachChecks =
  exports.checkLeakedCredentials =
  exports.monitorFailedLogins =
    void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const error_handler_1 = require("../utils/error-handler");
const rate_limiting_1 = require("../utils/rate-limiting");
const crypto = __importStar(require("crypto"));
const db = admin.firestore();
// Configuration for breach monitoring
const BREACH_CONFIG = {
  // Maximum failed login attempts before triggering alert
  MAX_FAILED_LOGINS: 5,
  // Time window for counting failed logins (in minutes)
  FAILED_LOGIN_WINDOW: 30,
  // Minimum severity level for logging alerts
  MIN_SEVERITY_LEVEL: "medium",
  // How often to check for leaked credentials (in days)
  CREDENTIAL_CHECK_INTERVAL: 7,
};
/**
 * Monitors for multiple failed login attempts
 * Detects potential brute force attacks
 */
exports.monitorFailedLogins = functions.firestore
  .document("loginAttempts/{attemptId}")
  .onCreate(async (snapshot, context) => {
    try {
      const attemptData = snapshot.data();
      const userId = attemptData.userId;
      const ip = attemptData.ip;
      // Only process failed attempts
      if (attemptData.success) {
        return null;
      }
      // Get timestamp from 30 minutes ago
      const windowStart = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - BREACH_CONFIG.FAILED_LOGIN_WINDOW * 60 * 1000),
      );
      // Query for recent failed attempts from same user or IP
      const userFailedAttemptsQuery = db
        .collection("loginAttempts")
        .where("userId", "==", userId)
        .where("success", "==", false)
        .where("timestamp", ">=", windowStart)
        .get();
      const ipFailedAttemptsQuery = db
        .collection("loginAttempts")
        .where("ip", "==", ip)
        .where("success", "==", false)
        .where("timestamp", ">=", windowStart)
        .get();
      const [userFailedAttempts, ipFailedAttempts] = await Promise.all([
        userFailedAttemptsQuery,
        ipFailedAttemptsQuery,
      ]);
      // Check for threshold breaches
      const userFailedCount = userFailedAttempts.size;
      const ipFailedCount = ipFailedAttempts.size;
      if (
        userFailedCount >= BREACH_CONFIG.MAX_FAILED_LOGINS ||
        ipFailedCount >= BREACH_CONFIG.MAX_FAILED_LOGINS
      ) {
        // Create security alert
        await db.collection("securityAlerts").add({
          type: "failed_login_threshold",
          userId,
          ip,
          userFailedCount,
          ipFailedCount,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          severity:
            userFailedCount > BREACH_CONFIG.MAX_FAILED_LOGINS * 2
              ? "high"
              : "medium",
          status: "new",
          details: {
            windowMinutes: BREACH_CONFIG.FAILED_LOGIN_WINDOW,
            deviceInfo: attemptData.deviceInfo || null,
            geoData: attemptData.geoData || null,
          },
        });
        // If high severity, update user record with alert flag
        if (userFailedCount > BREACH_CONFIG.MAX_FAILED_LOGINS * 2) {
          await db
            .collection("users")
            .doc(userId)
            .update({
              securityAlerts: admin.firestore.FieldValue.increment(1),
              lastSecurityAlertAt: admin.firestore.FieldValue.serverTimestamp(),
              accountLocked: true,
              lockReason: "multiple_failed_logins",
              lockTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          // In a real system, we would trigger an email notification here
        }
      }
      return null;
    } catch (error) {
      console.error("Error monitoring failed logins:", error);
      return null;
    }
  });
/**
 * Checks for leaked credentials against breach databases
 * Uses k-anonymity to preserve privacy while checking for leaks
 */
exports.checkLeakedCredentials = functions.https.onCall(
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
        "checkLeakedCredentials",
        5,
      );
      const { emailHash, passwordHash } = data;
      // Validate input
      if (!emailHash) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing emailHash",
        );
      }
      // In a real implementation, we would check against breach databases
      // using k-anonymity (sending only first 5 chars of hash)
      // For this example, we'll simulate the check
      // Extract prefix (first 5 chars) of hash for k-anonymity
      const emailPrefix = emailHash.substring(0, 5);
      // Simulate API call to breach database
      // In production, this would be an actual API call
      const breachResults = await simulateBreachCheck(emailPrefix);
      // Check if user's full hash is in the returned results
      const isEmailBreached = breachResults.some((hash) => hash === emailHash);
      // If password hash is provided, check it too
      let isPasswordBreached = false;
      if (passwordHash) {
        const passwordPrefix = passwordHash.substring(0, 5);
        const passwordBreachResults = await simulateBreachCheck(passwordPrefix);
        isPasswordBreached = passwordBreachResults.some(
          (hash) => hash === passwordHash,
        );
      }
      // Record the check in user's security log
      await db.collection("securityChecks").add({
        userId: context.auth.uid,
        type: "credential_breach_check",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        results: {
          emailBreached: isEmailBreached,
          passwordBreached: isPasswordBreached,
        },
      });
      // If credentials are breached, create security alert
      if (isEmailBreached || isPasswordBreached) {
        await db.collection("securityAlerts").add({
          userId: context.auth.uid,
          type: "leaked_credentials",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          severity: "high",
          status: "new",
          details: {
            emailBreached: isEmailBreached,
            passwordBreached: isPasswordBreached,
          },
        });
        // Update user record with alert flag
        await db
          .collection("users")
          .doc(context.auth.uid)
          .update({
            securityAlerts: admin.firestore.FieldValue.increment(1),
            lastSecurityAlertAt: admin.firestore.FieldValue.serverTimestamp(),
            credentialsBreached: true,
            breachCheckTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
      return {
        emailBreached: isEmailBreached,
        passwordBreached: isPasswordBreached,
        checkedAt: new Date().toISOString(),
        recommendPasswordChange: isEmailBreached || isPasswordBreached,
      };
    } catch (error) {
      return (0, error_handler_1.handleError)(error, "checkLeakedCredentials");
    }
  },
);
/**
 * Schedules regular credential breach checks for all users
 * Runs weekly to ensure ongoing protection
 */
exports.scheduleCredentialBreachChecks = functions.pubsub
  .schedule("every 168 hours") // Weekly
  .onRun(async (context) => {
    try {
      // Get users who haven't been checked in the configured interval
      const checkThreshold = admin.firestore.Timestamp.fromDate(
        new Date(
          Date.now() -
            BREACH_CONFIG.CREDENTIAL_CHECK_INTERVAL * 24 * 60 * 60 * 1000,
        ),
      );
      const usersToCheckSnapshot = await db
        .collection("users")
        .where("breachCheckTimestamp", "<", checkThreshold)
        .limit(500) // Process in batches
        .get();
      if (usersToCheckSnapshot.empty) {
        console.log("No users need credential breach checks");
        return null;
      }
      console.log(
        `Scheduling breach checks for ${usersToCheckSnapshot.size} users`,
      );
      // For each user, create a task to check their credentials
      const batch = db.batch();
      usersToCheckSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        // Create a task document in the breachCheckTasks collection
        const taskRef = db.collection("breachCheckTasks").doc();
        batch.set(taskRef, {
          userId: userDoc.id,
          email: userData.email,
          emailHash: userData.emailHash,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          priority: userData.securityLevel || "standard",
        });
        // Update user's breach check timestamp
        batch.update(userDoc.ref, {
          breachCheckTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      return null;
    } catch (error) {
      console.error("Error scheduling credential breach checks:", error);
      return null;
    }
  });
/**
 * Processes breach check tasks
 * Triggered by creation of breach check task documents
 */
exports.processBreachCheckTask = functions.firestore
  .document("breachCheckTasks/{taskId}")
  .onCreate(async (snapshot, context) => {
    try {
      const taskData = snapshot.data();
      const taskRef = snapshot.ref;
      // Update task status to processing
      await taskRef.update({
        status: "processing",
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Extract email hash prefix (first 5 chars) for k-anonymity
      const emailHash = taskData.emailHash;
      const emailPrefix = emailHash.substring(0, 5);
      // Simulate API call to breach database
      const breachResults = await simulateBreachCheck(emailPrefix);
      // Check if user's full hash is in the returned results
      const isEmailBreached = breachResults.some((hash) => hash === emailHash);
      // Record the result
      await taskRef.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        result: {
          emailBreached: isEmailBreached,
        },
      });
      // If email is breached, create security alert
      if (isEmailBreached) {
        await db.collection("securityAlerts").add({
          userId: taskData.userId,
          type: "leaked_credentials",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          severity: "high",
          status: "new",
          details: {
            emailBreached: isEmailBreached,
            source: "automated_check",
          },
        });
        // Update user record with alert flag
        await db
          .collection("users")
          .doc(taskData.userId)
          .update({
            securityAlerts: admin.firestore.FieldValue.increment(1),
            lastSecurityAlertAt: admin.firestore.FieldValue.serverTimestamp(),
            credentialsBreached: true,
          });
        // In a real system, we would trigger an email notification here
      }
      return null;
    } catch (error) {
      console.error("Error processing breach check task:", error);
      // Update task with error status
      await snapshot.ref.update({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }
  });
/**
 * Monitors for suspicious file encryption operations
 * Detects potential data exfiltration or ransomware activity
 */
exports.monitorEncryptionOperations = functions.firestore
  .document("encryptionOperations/{operationId}")
  .onCreate(async (snapshot, context) => {
    try {
      const operationData = snapshot.data();
      const userId = operationData.userId;
      // Get timestamp from 1 hour ago
      const windowStart = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 60 * 60 * 1000),
      );
      // Count recent encryption operations by this user
      const recentOperationsSnapshot = await db
        .collection("encryptionOperations")
        .where("userId", "==", userId)
        .where("timestamp", ">=", windowStart)
        .get();
      const operationCount = recentOperationsSnapshot.size;
      // Get user's average hourly encryption operations
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();
      const avgHourlyOperations =
        userData?.analytics?.avgHourlyEncryptionOps || 5; // Default threshold
      // If current rate is significantly higher than average, create alert
      if (operationCount > avgHourlyOperations * 3 && operationCount > 20) {
        await db.collection("securityAlerts").add({
          userId,
          type: "high_encryption_volume",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          severity: "medium",
          status: "new",
          details: {
            operationCount,
            timeWindowMinutes: 60,
            avgHourlyOperations,
            percentIncrease: Math.round(
              (operationCount / avgHourlyOperations - 1) * 100,
            ),
          },
        });
        // Update user analytics
        await db
          .collection("users")
          .doc(userId)
          .update({
            "analytics.lastHighVolumeEncryptionAt":
              admin.firestore.FieldValue.serverTimestamp(),
            "analytics.highVolumeEncryptionCount":
              admin.firestore.FieldValue.increment(1),
            securityAlerts: admin.firestore.FieldValue.increment(1),
          });
      }
      return null;
    } catch (error) {
      console.error("Error monitoring encryption operations:", error);
      return null;
    }
  });
/**
 * Helper function to simulate checking breach database
 * In production, this would call an actual breach database API
 */
async function simulateBreachCheck(hashPrefix) {
  // In a real implementation, this would call a breach database API
  // For simulation, we'll return some fake hashes with the same prefix
  // Generate some fake hashes with the same prefix
  const fakeHashes = [];
  for (let i = 0; i < 10; i++) {
    const randomSuffix = crypto.randomBytes(20).toString("hex");
    fakeHashes.push(hashPrefix + randomSuffix);
  }
  // Randomly decide if we should include the actual hash
  // This simulates whether the email was found in a breach
  if (Math.random() > 0.7) {
    // 30% chance the "email" is breached
    return fakeHashes;
  } else {
    return [];
  }
}
//# sourceMappingURL=breach-monitor.functions.js.map
