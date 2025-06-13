"use strict";
/**
 * @fileoverview Logging Utilities
 * @description Structured logging utilities for Firebase Cloud Functions
 * @security Secure logging that doesn't expose sensitive information
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
exports.logAudit =
  exports.logSecurity =
  exports.logError =
  exports.logWarn =
  exports.logInfo =
  exports.logger =
  exports.StructuredLogger =
  exports.LogCategory =
  exports.LogLevel =
    void 0;
const admin = __importStar(require("firebase-admin"));
/**
 * Log levels for structured logging
 */
var LogLevel;
(function (LogLevel) {
  LogLevel["DEBUG"] = "debug";
  LogLevel["INFO"] = "info";
  LogLevel["WARN"] = "warn";
  LogLevel["ERROR"] = "error";
  LogLevel["CRITICAL"] = "critical";
})((LogLevel = exports.LogLevel || (exports.LogLevel = {})));
/**
 * Log categories for better organization
 */
var LogCategory;
(function (LogCategory) {
  LogCategory["AUTH"] = "auth";
  LogCategory["VAULT"] = "vault";
  LogCategory["FILES"] = "files";
  LogCategory["SECURITY"] = "security";
  LogCategory["ADMIN"] = "admin";
  LogCategory["SYSTEM"] = "system";
})((LogCategory = exports.LogCategory || (exports.LogCategory = {})));
/**
 * Structured logger class
 */
class StructuredLogger {
  static instance;
  db;
  constructor() {
    this.db = admin.firestore();
  }
  static getInstance() {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }
  /**
   * Log a general message
   */
  async log(level, category, message, metadata) {
    try {
      const logEntry = {
        level,
        category,
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: metadata?.userId,
        sessionId: metadata?.sessionId,
        functionName: metadata?.functionName,
        requestId: metadata?.requestId,
        metadata: metadata?.data,
      };
      // Log to console for Cloud Functions logging
      this.logToConsole(logEntry);
      // Store in Firestore for persistent logging (only for important logs)
      if (
        level === LogLevel.ERROR ||
        level === LogLevel.CRITICAL ||
        category === LogCategory.SECURITY
      ) {
        await this.storeLog(logEntry);
      }
    } catch (error) {
      console.error("Failed to log message:", error);
    }
  }
  /**
   * Log an error with stack trace
   */
  async logError(category, message, error, metadata) {
    try {
      const logEntry = {
        level: LogLevel.ERROR,
        category,
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: metadata?.userId,
        sessionId: metadata?.sessionId,
        functionName: metadata?.functionName,
        requestId: metadata?.requestId,
        metadata: metadata?.data,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
      };
      // Log to console
      this.logToConsole(logEntry);
      // Store in Firestore
      await this.storeLog(logEntry);
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  }
  /**
   * Log a security event
   */
  async logSecurity(message, severity, metadata) {
    try {
      const logEntry = {
        level: severity === "critical" ? LogLevel.CRITICAL : LogLevel.WARN,
        category: LogCategory.SECURITY,
        message,
        severity,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        functionName: metadata.functionName,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        geoData: metadata.geoData,
        anomalyType: metadata.anomalyType,
        metadata: metadata.data,
      };
      // Log to console
      this.logToConsole(logEntry);
      // Always store security logs
      await this.storeSecurityLog(logEntry);
      // Create security alert for high severity events
      if (severity === "high" || severity === "critical") {
        await this.createSecurityAlert(logEntry);
      }
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }
  /**
   * Log an audit event
   */
  async logAudit(action, message, metadata) {
    try {
      const logEntry = {
        level: LogLevel.INFO,
        category: LogCategory.SYSTEM,
        message,
        action,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        functionName: metadata.functionName,
        resource: metadata.resource,
        resourceId: metadata.resourceId,
        previousValues: metadata.previousValues,
        newValues: metadata.newValues,
        metadata: metadata.data,
      };
      // Log to console
      this.logToConsole(logEntry);
      // Store audit logs
      await this.storeAuditLog(logEntry);
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  }
  /**
   * Log to console with structured format
   */
  logToConsole(entry) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: entry.level,
      category: entry.category,
      message: entry.message,
      userId: entry.userId,
      functionName: entry.functionName,
      metadata: entry.metadata,
    };
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(logData));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(logData));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logData));
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(JSON.stringify(logData));
        break;
      default:
        console.log(JSON.stringify(logData));
    }
  }
  /**
   * Store log entry in Firestore
   */
  async storeLog(entry) {
    await this.db.collection("systemLogs").add(entry);
  }
  /**
   * Store security log entry
   */
  async storeSecurityLog(entry) {
    await this.db.collection("securityLogs").add(entry);
  }
  /**
   * Store audit log entry
   */
  async storeAuditLog(entry) {
    await this.db.collection("auditLogs").add(entry);
  }
  /**
   * Create security alert for high severity events
   */
  async createSecurityAlert(entry) {
    await this.db.collection("securityAlerts").add({
      type: entry.anomalyType || "security_event",
      message: entry.message,
      severity: entry.severity,
      userId: entry.userId,
      timestamp: entry.timestamp,
      status: "new",
      metadata: {
        ip: entry.ip,
        userAgent: entry.userAgent,
        geoData: entry.geoData,
        functionName: entry.functionName,
        data: entry.metadata,
      },
    });
  }
  /**
   * Query logs with filters
   */
  async queryLogs(filters) {
    try {
      let query = this.db.collection("systemLogs");
      if (filters.category) {
        query = query.where("category", "==", filters.category);
      }
      if (filters.level) {
        query = query.where("level", "==", filters.level);
      }
      if (filters.userId) {
        query = query.where("userId", "==", filters.userId);
      }
      if (filters.startDate) {
        query = query.where(
          "timestamp",
          ">=",
          admin.firestore.Timestamp.fromDate(filters.startDate),
        );
      }
      if (filters.endDate) {
        query = query.where(
          "timestamp",
          "<=",
          admin.firestore.Timestamp.fromDate(filters.endDate),
        );
      }
      query = query.orderBy("timestamp", "desc").limit(filters.limit || 100);
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      console.error("Failed to query logs:", error);
      return [];
    }
  }
}
exports.StructuredLogger = StructuredLogger;
// Export singleton instance
exports.logger = StructuredLogger.getInstance();
// Convenience functions
const logInfo = (category, message, metadata) =>
  exports.logger.log(LogLevel.INFO, category, message, metadata);
exports.logInfo = logInfo;
const logWarn = (category, message, metadata) =>
  exports.logger.log(LogLevel.WARN, category, message, metadata);
exports.logWarn = logWarn;
const logError = (category, message, error, metadata) =>
  exports.logger.logError(category, message, error, metadata);
exports.logError = logError;
const logSecurity = (message, severity, metadata) =>
  exports.logger.logSecurity(message, severity, metadata);
exports.logSecurity = logSecurity;
const logAudit = (action, message, metadata) =>
  exports.logger.logAudit(action, message, metadata);
exports.logAudit = logAudit;
//# sourceMappingURL=logging.utils.js.map
