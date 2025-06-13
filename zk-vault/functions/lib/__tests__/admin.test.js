"use strict";
/**
 * Admin Functions Tests
 * Comprehensive tests for admin analytics, health monitoring, and maintenance
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
const setup_1 = require("./setup");
const admin = __importStar(require("firebase-admin"));
// Import admin functions to test
const user_analytics_functions_1 = require("../admin/user-analytics.functions");
const system_health_functions_1 = require("../admin/system-health.functions");
const maintenance_functions_1 = require("../admin/maintenance.functions");
describe("Admin Functions", () => {
  let db;
  let adminUid;
  beforeAll(async () => {
    db = admin.firestore();
    adminUid = await setup_1.TestHelper.createTestAdmin();
  });
  beforeEach(async () => {
    // Clean up test data before each test
    await setup_1.TestHelper.cleanupFirestore([
      "users",
      "files",
      "vaultItems",
      "userSessions",
      "systemMetrics",
      "systemAlerts",
      "analyticsReports",
    ]);
  });
  afterAll(async () => {
    // Final cleanup
    await setup_1.TestHelper.cleanupFirestore();
  });
  describe("User Analytics Functions", () => {
    beforeEach(async () => {
      // Create test users and data for analytics
      await createTestAnalyticsData();
    });
    describe("generateUserAnalytics", () => {
      it("should generate comprehensive user analytics for admin", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const data = { dateRange: 30 };
        const result = await (0,
        user_analytics_functions_1.generateUserAnalytics)(data, context);
        expect(result.success).toBe(true);
        expect(result.analytics).toBeDefined();
        expect(result.analytics.totalUsers).toBeGreaterThanOrEqual(0);
        expect(result.analytics.activeUsers).toBeGreaterThanOrEqual(0);
        expect(result.analytics.newUsersThisMonth).toBeGreaterThanOrEqual(0);
        expect(result.analytics.storageUsage).toBeDefined();
        expect(result.analytics.featureUsage).toBeDefined();
      });
      it("should fail for non-admin user", async () => {
        const regularUserUid = "regular-user-123";
        const context = setup_1.TestHelper.createCallableContext(
          regularUserUid,
          undefined,
          false,
        );
        const data = { dateRange: 30 };
        try {
          await (0, user_analytics_functions_1.generateUserAnalytics)(
            data,
            context,
          );
          fail("Should have thrown permission-denied error");
        } catch (error) {
          expect(error.code).toBe("permission-denied");
        }
      });
      it("should fail for unauthenticated user", async () => {
        const context = setup_1.TestHelper.createCallableContext();
        const data = { dateRange: 30 };
        try {
          await (0, user_analytics_functions_1.generateUserAnalytics)(
            data,
            context,
          );
          fail("Should have thrown unauthenticated error");
        } catch (error) {
          expect(error.code).toBe("unauthenticated");
        }
      });
      it("should store analytics report in database", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const data = { dateRange: 30 };
        await (0, user_analytics_functions_1.generateUserAnalytics)(
          data,
          context,
        );
        // Verify report was stored
        const reportsSnapshot = await db
          .collection("analyticsReports")
          .where("type", "==", "user_analytics")
          .get();
        expect(reportsSnapshot.size).toBe(1);
        const reportData = reportsSnapshot.docs[0].data();
        expect(reportData.generatedBy).toBe(adminUid);
        expect(reportData.data).toBeDefined();
      });
    });
    describe("getUserActivityTrends", () => {
      it("should generate activity trends with different periods", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const periods = ["24h", "7d", "30d", "90d"];
        for (const period of periods) {
          const data = { period, granularity: "day" };
          const result = await (0,
          user_analytics_functions_1.getUserActivityTrends)(data, context);
          expect(result.success).toBe(true);
          expect(result.trends).toBeDefined();
          expect(Array.isArray(result.trends)).toBe(true);
          expect(result.period).toBe(period);
        }
      });
      it("should handle different granularities", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const granularities = ["hour", "day", "week"];
        for (const granularity of granularities) {
          const data = { period: "7d", granularity };
          const result = await (0,
          user_analytics_functions_1.getUserActivityTrends)(data, context);
          expect(result.success).toBe(true);
          expect(result.granularity).toBe(granularity);
        }
      });
    });
    describe("getUserSegmentation", () => {
      it("should segment users by activity patterns", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const result = await (0,
        user_analytics_functions_1.getUserSegmentation)({}, context);
        expect(result.success).toBe(true);
        expect(result.segmentation).toBeDefined();
        expect(result.segmentation.powerUsers).toBeDefined();
        expect(result.segmentation.regularUsers).toBeDefined();
        expect(result.segmentation.lightUsers).toBeDefined();
        expect(result.segmentation.inactiveUsers).toBeDefined();
        expect(result.segmentation.newUsers).toBeDefined();
        expect(result.totalUsers).toBeGreaterThanOrEqual(0);
      });
    });
  });
  describe("System Health Functions", () => {
    describe("getSystemHealth", () => {
      it("should return comprehensive system health status", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        // Create some test metrics
        await db.collection("systemStatus").doc("currentMetrics").set({
          userCount: 100,
          activeUserCount: 50,
          fileCount: 200,
          totalStorageUsed: 1024000,
          errorRate: 0.01,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        const result = await (0, system_health_functions_1.getSystemHealth)(
          {},
          context,
        );
        expect(result.currentMetrics).toBeDefined();
        expect(result.trends).toBeDefined();
        expect(result.alerts).toBeDefined();
        expect(result.recentErrors).toBeDefined();
        expect(result.healthScore).toBeGreaterThanOrEqual(0);
        expect(result.healthScore).toBeLessThanOrEqual(100);
        expect(result.healthStatus).toBeDefined();
      });
      it("should fail for non-admin user", async () => {
        const regularUserUid = "regular-user-123";
        const context = setup_1.TestHelper.createCallableContext(
          regularUserUid,
          undefined,
          false,
        );
        try {
          await (0, system_health_functions_1.getSystemHealth)({}, context);
          fail("Should have thrown permission-denied error");
        } catch (error) {
          expect(error.code).toBe("permission-denied");
        }
      });
    });
    describe("runSystemHealthCheck", () => {
      it("should perform comprehensive health checks", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const result = await (0,
        system_health_functions_1.runSystemHealthCheck)({}, context);
        expect(result.firestore).toBeDefined();
        expect(result.storage).toBeDefined();
        expect(result.auth).toBeDefined();
        expect(result.functions).toBeDefined();
        expect(result.timestamp).toBeDefined();
        // Verify health check was stored
        const healthCheckDoc = await db
          .collection("systemStatus")
          .doc("lastHealthCheck")
          .get();
        expect(healthCheckDoc.exists).toBe(true);
        const healthCheckData = healthCheckDoc.data();
        expect(healthCheckData?.runBy).toBe(adminUid);
      });
    });
    describe("createSystemAlert", () => {
      it("should create system alert successfully", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const alertData = {
          type: "high_error_rate",
          message: "Error rate exceeds threshold",
          severity: "high",
          details: { errorRate: 0.05, threshold: 0.02 },
        };
        const result = await (0, system_health_functions_1.createSystemAlert)(
          alertData,
          context,
        );
        expect(result.success).toBe(true);
        expect(result.alertId).toBeDefined();
        // Verify alert was created
        const alertDoc = await db
          .collection("systemAlerts")
          .doc(result.alertId)
          .get();
        expect(alertDoc.exists).toBe(true);
        const alertDocData = alertDoc.data();
        expect(alertDocData?.type).toBe(alertData.type);
        expect(alertDocData?.severity).toBe(alertData.severity);
        expect(alertDocData?.status).toBe("active");
      });
      it("should validate alert input", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const invalidData = {
          // Missing required fields
          severity: "invalid_severity",
        };
        try {
          await (0, system_health_functions_1.createSystemAlert)(
            invalidData,
            context,
          );
          fail("Should have thrown invalid-argument error");
        } catch (error) {
          expect(error.code).toBe("invalid-argument");
        }
      });
    });
    describe("resolveSystemAlert", () => {
      it("should resolve system alert successfully", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        // First create an alert
        const alertRef = await db.collection("systemAlerts").add({
          type: "test_alert",
          message: "Test alert",
          severity: "medium",
          status: "active",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: adminUid,
        });
        const resolveData = {
          alertId: alertRef.id,
          resolution: "Issue resolved by admin",
        };
        const result = await (0, system_health_functions_1.resolveSystemAlert)(
          resolveData,
          context,
        );
        expect(result.success).toBe(true);
        expect(result.alertId).toBe(alertRef.id);
        // Verify alert was resolved
        const alertDoc = await alertRef.get();
        const alertData = alertDoc.data();
        expect(alertData?.status).toBe("resolved");
        expect(alertData?.resolution).toBe(resolveData.resolution);
        expect(alertData?.resolvedBy).toBe(adminUid);
      });
    });
  });
  describe("Maintenance Functions", () => {
    describe("purgeInactiveUsers", () => {
      it("should return inactive users in dry run mode", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        // Create an inactive user
        const inactiveUserUid = "inactive-user-123";
        await db
          .collection("users")
          .doc(inactiveUserUid)
          .set({
            uid: inactiveUserUid,
            email: "inactive@example.com",
            lastLoginAt: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
            ),
            created: admin.firestore.FieldValue.serverTimestamp(),
          });
        const data = {
          inactiveDays: 365,
          dryRun: true,
        };
        const result = await (0, maintenance_functions_1.purgeInactiveUsers)(
          data,
          context,
        );
        expect(result.success).toBe(true);
        expect(result.dryRun).toBe(true);
        expect(result.inactiveUsers).toBeDefined();
        expect(Array.isArray(result.inactiveUsers)).toBe(true);
      });
      it("should validate minimum inactive days", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const data = {
          inactiveDays: 15,
          dryRun: true,
        };
        try {
          await (0, maintenance_functions_1.purgeInactiveUsers)(data, context);
          fail("Should have thrown invalid-argument error");
        } catch (error) {
          expect(error.code).toBe("invalid-argument");
        }
      });
      it("should actually purge users when not in dry run mode", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        // Create an inactive user
        const inactiveUserUid = "inactive-user-456";
        await admin.auth().createUser({
          uid: inactiveUserUid,
          email: "inactive456@example.com",
        });
        await db
          .collection("users")
          .doc(inactiveUserUid)
          .set({
            uid: inactiveUserUid,
            email: "inactive456@example.com",
            lastLoginAt: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
            ),
            created: admin.firestore.FieldValue.serverTimestamp(),
          });
        const data = {
          inactiveDays: 365,
          dryRun: false,
        };
        const result = await (0, maintenance_functions_1.purgeInactiveUsers)(
          data,
          context,
        );
        expect(result.success).toBe(true);
        expect(result.purgedCount).toBeGreaterThanOrEqual(0);
        // Verify admin action was logged
        const actionLogsSnapshot = await db
          .collection("adminActionLogs")
          .where("action", "==", "purge_inactive_users")
          .where("adminId", "==", adminUid)
          .get();
        expect(actionLogsSnapshot.size).toBeGreaterThanOrEqual(1);
      });
    });
    describe("optimizeSystem", () => {
      it("should run all optimization operations", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const data = { operations: ["all"] };
        const result = await (0, maintenance_functions_1.optimizeSystem)(
          data,
          context,
        );
        expect(result.success).toBe(true);
        expect(result.operations).toEqual(["all"]);
        expect(result.results).toBeDefined();
        expect(result.results.orphanedChunks).toBeDefined();
        expect(result.results.deduplicationIndex).toBeDefined();
        expect(result.results.expiredSessions).toBeDefined();
      });
      it("should run specific optimization operations", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const data = { operations: ["orphaned_chunks", "expired_sessions"] };
        const result = await (0, maintenance_functions_1.optimizeSystem)(
          data,
          context,
        );
        expect(result.success).toBe(true);
        expect(result.operations).toEqual([
          "orphaned_chunks",
          "expired_sessions",
        ]);
        expect(result.results.orphanedChunks).toBeDefined();
        expect(result.results.expiredSessions).toBeDefined();
        expect(result.results.deduplicationIndex).toBeUndefined();
      });
      it("should log optimization actions", async () => {
        const context = setup_1.TestHelper.createCallableContext(
          adminUid,
          undefined,
          true,
        );
        const data = { operations: ["orphaned_chunks"] };
        await (0, maintenance_functions_1.optimizeSystem)(data, context);
        // Verify admin action was logged
        const actionLogsSnapshot = await db
          .collection("adminActionLogs")
          .where("action", "==", "optimize_system")
          .where("adminId", "==", adminUid)
          .get();
        expect(actionLogsSnapshot.size).toBe(1);
      });
    });
  });
  describe("Rate Limiting", () => {
    it("should apply rate limiting to admin functions", async () => {
      const context = setup_1.TestHelper.createCallableContext(
        adminUid,
        undefined,
        true,
      );
      // Set up a high rate limit count for admin operations
      await setup_1.TestHelper.createTestRateLimit(adminUid, "admin", 100);
      try {
        await (0, user_analytics_functions_1.generateUserAnalytics)(
          { dateRange: 30 },
          context,
        );
        fail("Should have been rate limited");
      } catch (error) {
        expect(error.code).toBe("resource-exhausted");
      }
    });
  });
  describe("Security and Audit", () => {
    it("should log all admin actions for audit purposes", async () => {
      const context = setup_1.TestHelper.createCallableContext(
        adminUid,
        undefined,
        true,
      );
      // Perform various admin actions
      await (0, system_health_functions_1.createSystemAlert)(
        {
          type: "test_alert",
          message: "Test audit logging",
          severity: "low",
        },
        context,
      );
      // Check audit logs
      const auditLogsSnapshot = await db
        .collection("adminActionLogs")
        .where("adminId", "==", adminUid)
        .get();
      expect(auditLogsSnapshot.size).toBeGreaterThanOrEqual(1);
    });
    it("should prevent unauthorized access to sensitive data", async () => {
      const regularUserUid = "regular-user-123";
      const context = setup_1.TestHelper.createCallableContext(
        regularUserUid,
        undefined,
        false,
      );
      const sensitiveOperations = [
        () =>
          (0, user_analytics_functions_1.generateUserAnalytics)(
            { dateRange: 30 },
            context,
          ),
        () => (0, system_health_functions_1.getSystemHealth)({}, context),
        () =>
          (0, maintenance_functions_1.purgeInactiveUsers)(
            { inactiveDays: 365, dryRun: true },
            context,
          ),
        () =>
          (0, maintenance_functions_1.optimizeSystem)(
            { operations: ["all"] },
            context,
          ),
      ];
      for (const operation of sensitiveOperations) {
        try {
          await operation();
          fail("Should have denied access to non-admin user");
        } catch (error) {
          expect(error.code).toBe("permission-denied");
        }
      }
    });
  });
  // Helper function to create test data for analytics
  async function createTestAnalyticsData() {
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    // Create test users
    for (let i = 0; i < 5; i++) {
      await db
        .collection("users")
        .doc(`test-user-${i}`)
        .set({
          uid: `test-user-${i}`,
          email: `test${i}@example.com`,
          created: thirtyDaysAgo,
          lastLoginAt: now,
          totalStorageUsed: 1024 * 1024 * (i + 1),
          totalFiles: i + 1,
          totalVaultItems: (i + 1) * 2,
        });
    }
    // Create test sessions
    for (let i = 0; i < 3; i++) {
      await db
        .collection("userSessions")
        .doc(`session-${i}`)
        .set({
          userId: `test-user-${i}`,
          timestamp: now,
          duration: 300000,
          geoData: {
            country: i % 2 === 0 ? "US" : "CA",
            city: i % 2 === 0 ? "New York" : "Toronto",
          },
          isActive: true,
        });
    }
    // Create test files
    for (let i = 0; i < 10; i++) {
      await db
        .collection("files")
        .doc(`file-${i}`)
        .set({
          userId: `test-user-${i % 5}`,
          totalSize: 1024 * (i + 1),
          totalChunks: Math.ceil((i + 1) / 2),
          status: "complete",
          contentType: i % 2 === 0 ? "image/jpeg" : "text/plain",
          createdAt: thirtyDaysAgo,
        });
    }
  }
});
//# sourceMappingURL=admin.test.js.map
