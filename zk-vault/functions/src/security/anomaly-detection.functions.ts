/**
 * @fileoverview Anomaly Detection Functions
 * @description Cloud Functions for detecting suspicious activities in ZK-Vault
 * @security Monitors for security anomalies while preserving zero-knowledge principles
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// Rate limiting utilities available if needed

const db = admin.firestore();

/**
 * Monitors for unusual login patterns
 * Detects potential account compromise while preserving privacy
 */
export const detectLoginAnomalies = functions.firestore
  .document("userSessions/{sessionId}")
  .onCreate(async (snapshot, context) => {
    try {
      const sessionData = snapshot.data();
      const userId = sessionData.userId;

      if (!userId) {
        console.error("Session missing userId");
        return null;
      }

      // Get user's previous sessions
      const previousSessionsSnapshot = await db
        .collection("userSessions")
        .where("userId", "==", userId)
        .where("timestamp", "<", sessionData.timestamp)
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      if (previousSessionsSnapshot.empty) {
        // First login, no anomalies to detect
        return null;
      }

      const previousSessions = previousSessionsSnapshot.docs.map((doc) =>
        doc.data(),
      );

      // Check for anomalies
      const anomalies = [];

      // 1. Unusual location
      if (sessionData.geoData && sessionData.geoData.country) {
        const previousCountries = new Set(
          previousSessions
            .filter((s) => s.geoData && s.geoData.country)
            .map((s) => s.geoData.country),
        );

        if (!previousCountries.has(sessionData.geoData.country)) {
          anomalies.push({
            type: "unusual_location",
            severity: "medium",
            details: {
              newCountry: sessionData.geoData.country,
              previousCountries: Array.from(previousCountries),
            },
          });
        }
      }

      // 2. Unusual time
      if (sessionData.timestamp) {
        const loginTime = new Date(sessionData.timestamp.toDate());
        const loginHour = loginTime.getHours();

        // Check if user typically logs in at this hour
        const previousLoginHours = previousSessions
          .filter((s) => s.timestamp)
          .map((s: admin.firestore.DocumentData) =>
            s.timestamp.toDate().getHours(),
          );

        const hourFrequency: Record<number, number> = previousLoginHours.reduce(
          (acc: Record<number, number>, hour: number) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
          },
          {},
        );

        // If this hour is rare or never seen before
        if (!hourFrequency[loginHour] || hourFrequency[loginHour] <= 1) {
          anomalies.push({
            type: "unusual_login_time",
            severity: "medium",
            description: `Login at unusual hour: ${loginHour}:00`,
            details: {
              loginHour,
              usualHours: Object.keys(hourFrequency).filter(
                (h: string) => hourFrequency[parseInt(h)] > 1,
              ),
            },
          });
        }
      }

      // 3. Unusual device
      if (sessionData.deviceInfo && sessionData.deviceInfo.userAgent) {
        const previousDevices = new Set(
          previousSessions
            .filter((s) => s.deviceInfo && s.deviceInfo.userAgent)
            .map((s) => s.deviceInfo.userAgent),
        );

        if (!previousDevices.has(sessionData.deviceInfo.userAgent)) {
          anomalies.push({
            type: "new_device",
            severity: "medium",
            details: {
              newDevice: sessionData.deviceInfo.userAgent,
            },
          });
        }
      }

      // 4. Rapid location change (impossible travel)
      if (
        sessionData.geoData &&
        sessionData.geoData.latitude &&
        sessionData.geoData.longitude &&
        sessionData.timestamp
      ) {
        // Find most recent session with geo data
        const lastSessionWithGeo = previousSessions.find(
          (s) =>
            s.geoData &&
            s.geoData.latitude &&
            s.geoData.longitude &&
            s.timestamp,
        );

        if (lastSessionWithGeo) {
          // Calculate distance and time difference
          const distance = calculateDistance(
            sessionData.geoData.latitude,
            sessionData.geoData.longitude,
            lastSessionWithGeo.geoData.latitude,
            lastSessionWithGeo.geoData.longitude,
          );

          const timeDiff =
            sessionData.timestamp.toDate() -
            lastSessionWithGeo.timestamp.toDate();
          const hoursDiff = timeDiff / (1000 * 60 * 60);

          // Assuming max travel speed of 500 miles per hour (conservative airplane speed)
          const maxPossibleDistance = 500 * hoursDiff;

          if (distance > maxPossibleDistance && distance > 500) {
            // At least 500 miles difference
            anomalies.push({
              type: "impossible_travel",
              severity: "high",
              details: {
                distance,
                timeDiff: hoursDiff,
                maxPossibleDistance,
                currentLocation: `${sessionData.geoData.city || ""}, ${sessionData.geoData.country || ""}`,
                previousLocation: `${lastSessionWithGeo.geoData.city || ""}, ${lastSessionWithGeo.geoData.country || ""}`,
              },
            });
          }
        }
      }

      // If anomalies detected, record them
      if (anomalies.length > 0) {
        await db.collection("securityAlerts").add({
          userId,
          sessionId: context.params.sessionId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          anomalies,
          sessionData: {
            ip: sessionData.ip,
            deviceInfo: sessionData.deviceInfo,
            geoData: sessionData.geoData,
            timestamp: sessionData.timestamp,
          },
          status: "new",
        });

        // For high severity anomalies, notify user
        if (anomalies.some((a) => a.severity === "high")) {
          await db
            .collection("users")
            .doc(userId)
            .update({
              securityAlerts: admin.firestore.FieldValue.increment(1),
              lastSecurityAlertAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          // In a real system, we would trigger an email/push notification here
        }
      }

      return null;
    } catch (error) {
      console.error("Error detecting login anomalies:", error);
      return null;
    }
  });

/**
 * Monitors for unusual file access patterns
 * Detects potential data breaches or unauthorized access
 */
export const detectFileAccessAnomalies = functions.firestore
  .document("fileAccessLogs/{logId}")
  .onCreate(async (snapshot, context) => {
    try {
      const accessData = snapshot.data();
      const userId = accessData.userId;
      const fileId = accessData.fileId;

      if (!userId || !fileId) {
        console.error("Access log missing userId or fileId");
        return null;
      }

      // Get user's previous access patterns
      const previousAccessSnapshot = await db
        .collection("fileAccessLogs")
        .where("userId", "==", userId)
        .where("timestamp", "<", accessData.timestamp)
        .orderBy("timestamp", "desc")
        .limit(50)
        .get();

      const previousAccess = previousAccessSnapshot.docs.map((doc) =>
        doc.data(),
      );

      // Check for anomalies
      const anomalies = [];

      // 1. Unusual access volume
      const recentAccessSnapshot = await db
        .collection("fileAccessLogs")
        .where("userId", "==", userId)
        .where(
          "timestamp",
          ">",
          admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          ),
        )
        .get();

      const accessCount = recentAccessSnapshot.size;

      // Calculate average daily access over past week (excluding today)
      const weekAccessSnapshot = await db
        .collection("fileAccessLogs")
        .where("userId", "==", userId)
        .where(
          "timestamp",
          ">",
          admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          ),
        )
        .where(
          "timestamp",
          "<",
          admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 24 * 60 * 60 * 1000), // Excluding last 24 hours
          ),
        )
        .get();

      const avgDailyAccess = weekAccessSnapshot.size / 6; // Divide by 6 days

      // If today's access is significantly higher than average
      if (accessCount > avgDailyAccess * 3 && accessCount > 10) {
        anomalies.push({
          type: "high_access_volume",
          severity: "medium",
          details: {
            todayCount: accessCount,
            averageDailyCount: avgDailyAccess,
            percentIncrease: Math.round(
              (accessCount / avgDailyAccess - 1) * 100,
            ),
          },
        });
      }

      // 2. Unusual file type access
      if (accessData.fileType) {
        const previousFileTypes = previousAccess
          .filter((a) => a.fileType)
          .map((a) => a.fileType);

        const fileTypeFrequency = previousFileTypes.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        // If this file type is rare or never accessed before
        if (
          !fileTypeFrequency[accessData.fileType] ||
          fileTypeFrequency[accessData.fileType] <= 2
        ) {
          anomalies.push({
            type: "unusual_file_type",
            severity: "low",
            details: {
              fileType: accessData.fileType,
              commonTypes: Object.keys(fileTypeFrequency).filter(
                (t) => fileTypeFrequency[t] > 2,
              ),
            },
          });
        }
      }

      // 3. Access to sensitive files
      if (accessData.sensitivity === "high") {
        // Check if accessing from new location
        if (accessData.geoData && accessData.geoData.country) {
          const previousLocationsForSensitiveFiles = new Set(
            previousAccess
              .filter(
                (a) =>
                  a.sensitivity === "high" && a.geoData && a.geoData.country,
              )
              .map((a) => a.geoData.country),
          );

          if (
            !previousLocationsForSensitiveFiles.has(accessData.geoData.country)
          ) {
            anomalies.push({
              type: "sensitive_file_new_location",
              severity: "high",
              details: {
                fileId,
                newLocation: `${accessData.geoData.city || ""}, ${accessData.geoData.country || ""}`,
                previousLocations: Array.from(
                  previousLocationsForSensitiveFiles,
                ),
              },
            });
          }
        }
      }

      // If anomalies detected, record them
      if (anomalies.length > 0) {
        await db.collection("securityAlerts").add({
          userId,
          fileId,
          logId: context.params.logId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          anomalies,
          accessData: {
            ip: accessData.ip,
            deviceInfo: accessData.deviceInfo,
            geoData: accessData.geoData,
            timestamp: accessData.timestamp,
            operation: accessData.operation,
          },
          status: "new",
        });

        // For high severity anomalies, notify user
        if (anomalies.some((a) => a.severity === "high")) {
          await db
            .collection("users")
            .doc(userId)
            .update({
              securityAlerts: admin.firestore.FieldValue.increment(1),
              lastSecurityAlertAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          // In a real system, we would trigger an email/push notification here
        }
      }

      return null;
    } catch (error) {
      console.error("Error detecting file access anomalies:", error);
      return null;
    }
  });

/**
 * Monitors for unusual encryption key usage patterns
 * Detects potential key compromise without accessing actual keys
 */
export const detectKeyUsageAnomalies = functions.firestore
  .document("keyUsageLogs/{logId}")
  .onCreate(async (snapshot, context) => {
    try {
      const usageData = snapshot.data();
      const userId = usageData.userId;
      const keyId = usageData.keyId;

      if (!userId || !keyId) {
        console.error("Key usage log missing userId or keyId");
        return null;
      }

      // Get previous key usage patterns
      const previousUsageSnapshot = await db
        .collection("keyUsageLogs")
        .where("userId", "==", userId)
        .where("keyId", "==", keyId)
        .where("timestamp", "<", usageData.timestamp)
        .orderBy("timestamp", "desc")
        .limit(20)
        .get();

      // Check for anomalies
      const anomalies = [];

      // 1. Unusual operation frequency
      const recentUsageSnapshot = await db
        .collection("keyUsageLogs")
        .where("userId", "==", userId)
        .where("keyId", "==", keyId)
        .where(
          "timestamp",
          ">",
          admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          ),
        )
        .get();

      const usageCount = recentUsageSnapshot.size;

      // If this key is being used much more frequently than usual
      if (usageCount > 20 && usageCount > previousUsageSnapshot.size * 2) {
        anomalies.push({
          type: "high_key_usage_frequency",
          severity: "medium",
          details: {
            keyId,
            recentUsageCount: usageCount,
            previousUsageCount: previousUsageSnapshot.size,
            percentIncrease: Math.round(
              (usageCount / (previousUsageSnapshot.size || 1) - 1) * 100,
            ),
          },
        });
      }

      // 2. Key usage from new device
      if (usageData.deviceInfo && usageData.deviceInfo.deviceId) {
        const previousDevices = new Set(
          previousUsageSnapshot.docs
            .filter(
              (doc) => doc.data().deviceInfo && doc.data().deviceInfo.deviceId,
            )
            .map((doc) => doc.data().deviceInfo.deviceId),
        );

        if (!previousDevices.has(usageData.deviceInfo.deviceId)) {
          anomalies.push({
            type: "key_usage_new_device",
            severity: "high",
            details: {
              keyId,
              newDevice: usageData.deviceInfo.deviceId,
              deviceInfo: usageData.deviceInfo,
            },
          });
        }
      }

      // 3. Unusual operation type
      if (usageData.operation) {
        const previousOperations = previousUsageSnapshot.docs
          .filter((doc) => doc.data().operation)
          .map((doc) => doc.data().operation);

        const operationFrequency = previousOperations.reduce((acc, op) => {
          acc[op] = (acc[op] || 0) + 1;
          return acc;
        }, {});

        // If this operation is rare or never performed before with this key
        if (
          !operationFrequency[usageData.operation] ||
          operationFrequency[usageData.operation] <= 1
        ) {
          anomalies.push({
            type: "unusual_key_operation",
            severity: "medium",
            details: {
              keyId,
              operation: usageData.operation,
              commonOperations: Object.keys(operationFrequency).filter(
                (op) => operationFrequency[op] > 1,
              ),
            },
          });
        }
      }

      // If anomalies detected, record them
      if (anomalies.length > 0) {
        await db.collection("securityAlerts").add({
          userId,
          keyId,
          logId: context.params.logId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          anomalies,
          usageData: {
            ip: usageData.ip,
            deviceInfo: usageData.deviceInfo,
            geoData: usageData.geoData,
            timestamp: usageData.timestamp,
            operation: usageData.operation,
          },
          status: "new",
        });

        // For high severity anomalies, notify user
        if (anomalies.some((a) => a.severity === "high")) {
          await db
            .collection("users")
            .doc(userId)
            .update({
              securityAlerts: admin.firestore.FieldValue.increment(1),
              lastSecurityAlertAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          // In a real system, we would trigger an email/push notification here
        }
      }

      return null;
    } catch (error) {
      console.error("Error detecting key usage anomalies:", error);
      return null;
    }
  });

/**
 * Helper function to calculate distance between two coordinates
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Helper function to convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
