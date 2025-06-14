/**
 * @fileoverview User Analytics Functions
 * @description Cloud Functions for gathering user analytics and insights in ZK-Vault
 * @security Admin-only functions for user analytics and reporting
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {handleError} from "../utils/error-handler";
import {checkRateLimit} from "../utils/rate-limiting";

type CallableContext = functions.https.CallableContext;

const db = admin.firestore();

/**
 * Interface for user analytics data
 */
interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  averageSessionDuration: number;
  topUserCountries: Record<string, number>;
  userRetentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };
  featureUsage: Record<string, number>;
  storageUsage: {
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    topFileTypes: Record<string, number>;
  };
}

/**
 * Interface for generate user analytics request data
 */
interface GenerateUserAnalyticsData {
  dateRange?: number;
}

/**
 * Interface for user activity trends request data
 */
interface UserActivityTrendsData {
  period?: "24h" | "7d" | "30d" | "90d";
  granularity?: "hour" | "day" | "week";
}

/**
 * Interface for user segmentation request data
 */
interface UserSegmentationData {
  // Currently no specific parameters needed, but interface must have at least one property
  [key: string]: unknown;
}

/**
 * Interface for time bucket
 */
interface TimeBucket {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Generates comprehensive user analytics report
 * Provides insights into user behavior and system usage
 */
export const generateUserAnalytics = functions.https.onCall(
  async (data: GenerateUserAnalyticsData, context: CallableContext) => {
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
      await checkRateLimit(context.auth.uid, "admin", 5);

      const {dateRange = 30} = data; // Default to last 30 days

      // Calculate date boundaries
      const now = new Date();
      const startDate = new Date(
        now.getTime() - dateRange * 24 * 60 * 60 * 1000,
      );
      const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
      // Run analytics queries in parallel
      const [
        totalUsersResult,
        activeUsersResult,
        newUsersResult,
        userSessionsResult,
        userCountriesResult,
        filesResult,
      ] = await Promise.all([
        getTotalUsers(),
        getActiveUsers(startTimestamp),
        getNewUsers(startTimestamp),
        getUserSessions(startTimestamp),
        getUserCountries(startTimestamp),
        getFileAnalytics(),
      ]);

      // Calculate user growth rate
      const previousPeriodStart = new Date(
        startDate.getTime() - dateRange * 24 * 60 * 60 * 1000,
      );
      const previousPeriodUsers = await getNewUsers(
        admin.firestore.Timestamp.fromDate(previousPeriodStart),
        startTimestamp,
      );

      const userGrowthRate =
        previousPeriodUsers.count > 0 ?
          ((newUsersResult.count - previousPeriodUsers.count) /
              previousPeriodUsers.count) *
            100 :
          0;

      // Calculate retention rates
      const retentionRates = await calculateRetentionRates();

      // Calculate feature usage
      const featureUsage = await getFeatureUsage(startTimestamp);

      // Compile analytics report
      const analytics: UserAnalytics = {
        totalUsers: totalUsersResult.count,
        activeUsers: activeUsersResult.count,
        newUsersThisMonth: newUsersResult.count,
        userGrowthRate,
        averageSessionDuration: userSessionsResult.averageDuration,
        topUserCountries: userCountriesResult.countries,
        userRetentionRates: retentionRates,
        featureUsage: featureUsage.usage,
        storageUsage: {
          totalFiles: filesResult.totalFiles,
          totalSize: filesResult.totalSize,
          averageFileSize: filesResult.averageFileSize,
          topFileTypes: filesResult.topFileTypes,
        },
      };

      // Store analytics report for caching
      await db.collection("analyticsReports").add({
        type: "user_analytics",
        dateRange,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        generatedBy: context.auth.uid,
        data: analytics,
      });

      return {
        success: true,
        analytics,
        generatedAt: now.toISOString(),
      };
    } catch (error) {
      return handleError(error as Error, "generateUserAnalytics");
    }
  },
);

/**
 * Gets user activity trends over time
 * Provides data for charting user activity patterns
 */
export const getUserActivityTrends = functions.https.onCall(
  async (data: UserActivityTrendsData, context: CallableContext) => {
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

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "admin", 10);

      const {period = "7d", granularity = "day"} = data;

      // Calculate time boundaries
      const now = new Date();
      let periodDays = 7;

      switch (period) {
      case "24h":
        periodDays = 1;
        break;
      case "7d":
        periodDays = 7;
        break;
      case "30d":
        periodDays = 30;
        break;
      case "90d":
        periodDays = 90;
        break;
      default:
        periodDays = 7;
      }

      const startDate = new Date(
        now.getTime() - periodDays * 24 * 60 * 60 * 1000,
      );

      // Generate time buckets based on granularity
      const buckets = generateTimeBuckets(startDate, now, granularity);

      // Get activity data for each bucket
      const activityTrends = await Promise.all(
        buckets.map((bucket) => getActivityForBucket(bucket)),
      );

      return {
        success: true,
        trends: activityTrends,
        period,
        granularity,
      };
    } catch (error) {
      return handleError(error as Error, "getUserActivityTrends");
    }
  },
);

/**
 * Gets user segmentation data
 * Segments users by behavior patterns and usage
 */
export const getUserSegmentation = functions.https.onCall(
  async (data: UserSegmentationData, context: CallableContext) => {
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

      // Apply rate limiting
      await checkRateLimit(context.auth.uid, "admin", 5);

      // Get user segments
      const [powerUsers, regularUsers, lightUsers, inactiveUsers, newUsers] =
        await Promise.all([
          getPowerUsers(),
          getRegularUsers(),
          getLightUsers(),
          getInactiveUsers(),
          getNewUsersLastWeek(),
        ]);

      const totalUsers =
        powerUsers.count +
        regularUsers.count +
        lightUsers.count +
        inactiveUsers.count;

      const segmentation = {
        powerUsers: {
          count: powerUsers.count,
          percentage: Math.round((powerUsers.count / totalUsers) * 100),
          definition: "Users with high activity and storage usage",
        },
        regularUsers: {
          count: regularUsers.count,
          percentage: Math.round((regularUsers.count / totalUsers) * 100),
          definition: "Users with moderate activity and regular usage",
        },
        lightUsers: {
          count: lightUsers.count,
          percentage: Math.round((lightUsers.count / totalUsers) * 100),
          definition: "Users with low activity but regular logins",
        },
        inactiveUsers: {
          count: inactiveUsers.count,
          percentage: Math.round((inactiveUsers.count / totalUsers) * 100),
          definition: "Users with no activity in the last 30 days",
        },
        newUsers: {
          count: newUsers.count,
          percentage: Math.round((newUsers.count / totalUsers) * 100),
          definition: "Users who joined in the last 7 days",
        },
      };

      return {
        success: true,
        segmentation,
        totalUsers,
      };
    } catch (error) {
      return handleError(error as Error, "getUserSegmentation");
    }
  },
);

// Helper functions

async function getTotalUsers() {
  const snapshot = await db.collection("users").get();
  return {count: snapshot.size};
}

async function getActiveUsers(since: admin.firestore.Timestamp) {
  const snapshot = await db
    .collection("users")
    .where("lastLoginAt", ">=", since)
    .get();
  return {count: snapshot.size};
}

async function getNewUsers(
  since: admin.firestore.Timestamp,
  until?: admin.firestore.Timestamp,
) {
  let query = db.collection("users").where("createdAt", ">=", since);

  if (until) {
    query = query.where("createdAt", "<", until);
  }

  const snapshot = await query.get();
  return {count: snapshot.size};
}

async function getUserSessions(since: admin.firestore.Timestamp) {
  const snapshot = await db
    .collection("userSessions")
    .where("timestamp", ">=", since)
    .get();

  if (snapshot.empty) {
    return {averageDuration: 0};
  }

  let totalDuration = 0;
  let sessionCount = 0;

  snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
    const session = doc.data();
    if (session.duration && typeof session.duration === "number") {
      totalDuration += session.duration;
      sessionCount++;
    }
  });

  return {
    averageDuration:
      sessionCount > 0 ? Math.round(totalDuration / sessionCount) : 0,
  };
}

async function getUserCountries(since: admin.firestore.Timestamp) {
  const snapshot = await db
    .collection("userSessions")
    .where("timestamp", ">=", since)
    .get();

  const countryCounts: Record<string, number> = {};

  snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
    const session = doc.data();
    if (session.geoData && session.geoData.country) {
      const country = session.geoData.country;
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    }
  });

  // Sort by count and return top 10
  const sortedCountries = Object.entries(countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .reduce(
      (obj, [country, count]) => {
        obj[country] = count;
        return obj;
      },
      {} as Record<string, number>,
    );

  return {countries: sortedCountries};
}

async function getFileAnalytics() {
  const snapshot = await db
    .collection("files")
    .where("status", "==", "complete")
    .get();

  if (snapshot.empty) {
    return {
      totalFiles: 0,
      totalSize: 0,
      averageFileSize: 0,
      topFileTypes: {},
    };
  }

  let totalSize = 0;
  const fileTypeCounts: Record<string, number> = {};

  snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
    const file = doc.data();
    if (file.totalSize) {
      totalSize += file.totalSize;
    }
    if (file.contentType) {
      const fileType = file.contentType.split("/")[0] || "unknown";
      fileTypeCounts[fileType] = (fileTypeCounts[fileType] || 0) + 1;
    }
  });

  return {
    totalFiles: snapshot.size,
    totalSize,
    averageFileSize: Math.round(totalSize / snapshot.size),
    topFileTypes: fileTypeCounts,
  };
}

async function calculateRetentionRates() {
  // Calculate retention for users who joined in different time periods
  const day1Retention = await calculateRetentionForPeriod(1);
  const day7Retention = await calculateRetentionForPeriod(7);
  const day30Retention = await calculateRetentionForPeriod(30);

  return {
    day1: day1Retention,
    day7: day7Retention,
    day30: day30Retention,
  };
}

async function calculateRetentionForPeriod(days: number): Promise<number> {
  const now = new Date();
  const periodStart = new Date(
    now.getTime() - (days + 1) * 24 * 60 * 60 * 1000,
  );
  const periodEnd = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Get users who joined in this period
  const newUsersSnapshot = await db
    .collection("users")
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(periodStart))
    .where("createdAt", "<", admin.firestore.Timestamp.fromDate(periodEnd))
    .get();

  if (newUsersSnapshot.empty) {
    return 0;
  }

  // Check how many of these users have been active since
  let retainedUsers = 0;

  for (const userDoc of newUsersSnapshot.docs) {
    const userSessions = await db
      .collection("userSessions")
      .where("userId", "==", userDoc.id)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(periodEnd))
      .limit(1)
      .get();

    if (!userSessions.empty) {
      retainedUsers++;
    }
  }

  return Math.round((retainedUsers / newUsersSnapshot.size) * 100);
}

async function getFeatureUsage(since: admin.firestore.Timestamp) {
  // This would track usage of different features
  // For now, we'll simulate with some basic metrics

  const [vaultItems, fileUploads, shares] = await Promise.all([
    db.collectionGroup("items").where("metadata.createdAt", ">=", since).get(),
    db.collection("files").where("createdAt", ">=", since).get(),
    db.collection("fileShares").where("createdAt", ">=", since).get(),
  ]);

  return {
    usage: {
      vault_items_created: vaultItems.size,
      files_uploaded: fileUploads.size,
      files_shared: shares.size,
    },
  };
}

function generateTimeBuckets(start: Date, end: Date, granularity: string) {
  const buckets = [];
  let current = new Date(start);

  let incrementMs = 0;
  switch (granularity) {
  case "hour":
    incrementMs = 60 * 60 * 1000;
    break;
  case "day":
    incrementMs = 24 * 60 * 60 * 1000;
    break;
  case "week":
    incrementMs = 7 * 24 * 60 * 60 * 1000;
    break;
  default:
    incrementMs = 24 * 60 * 60 * 1000; // Default to day
  }

  while (current < end) {
    const bucketEnd = new Date(current.getTime() + incrementMs);
    buckets.push({
      start: new Date(current),
      end: bucketEnd,
      label: formatBucketLabel(current, granularity),
    });
    current = bucketEnd;
  }

  return buckets;
}

function formatBucketLabel(date: Date, granularity: string): string {
  switch (granularity) {
  case "hour":
    return date.toISOString().substring(0, 13) + ":00";
  case "day":
    return date.toISOString().substring(0, 10);
  case "week":
    return `Week of ${date.toISOString().substring(0, 10)}`;
  default:
    return date.toISOString().substring(0, 10);
  }
}

async function getActivityForBucket(bucket: TimeBucket) {
  const startTimestamp = admin.firestore.Timestamp.fromDate(bucket.start);
  const endTimestamp = admin.firestore.Timestamp.fromDate(bucket.end);

  const [sessions, files, vaultItems] = await Promise.all([
    db
      .collection("userSessions")
      .where("timestamp", ">=", startTimestamp)
      .where("timestamp", "<", endTimestamp)
      .get(),
    db
      .collection("files")
      .where("createdAt", ">=", startTimestamp)
      .where("createdAt", "<", endTimestamp)
      .get(),
    db
      .collectionGroup("items")
      .where("metadata.createdAt", ">=", startTimestamp)
      .where("metadata.createdAt", "<", endTimestamp)
      .get(),
  ]);

  return {
    label: bucket.label,
    sessions: sessions.size,
    filesUploaded: files.size,
    vaultItemsCreated: vaultItems.size,
    timestamp: bucket.start.toISOString(),
  };
}

// User segmentation helper functions
async function getPowerUsers() {
  // Users with high activity and storage usage
  const snapshot = await db
    .collection("users")
    .where("totalStorageUsed", ">", 1024 * 1024 * 100) // > 100MB
    .get();
  return {count: snapshot.size};
}

async function getRegularUsers() {
  const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );

  const snapshot = await db
    .collection("users")
    .where("lastLoginAt", ">=", thirtyDaysAgo)
    .where("totalStorageUsed", "<=", 1024 * 1024 * 100)
    .where("totalStorageUsed", ">", 1024 * 1024 * 10) // 10MB - 100MB
    .get();
  return {count: snapshot.size};
}

async function getLightUsers() {
  const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );

  const snapshot = await db
    .collection("users")
    .where("lastLoginAt", ">=", thirtyDaysAgo)
    .where("totalStorageUsed", "<=", 1024 * 1024 * 10) // <= 10MB
    .get();
  return {count: snapshot.size};
}

async function getInactiveUsers() {
  const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );

  const snapshot = await db
    .collection("users")
    .where("lastLoginAt", "<", thirtyDaysAgo)
    .get();
  return {count: snapshot.size};
}

async function getNewUsersLastWeek() {
  const sevenDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );

  const snapshot = await db
    .collection("users")
    .where("createdAt", ">=", sevenDaysAgo)
    .get();
  return {count: snapshot.size};
}
