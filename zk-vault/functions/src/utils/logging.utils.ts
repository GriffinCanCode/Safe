/**
 * @fileoverview Logging Utilities
 * @description Structured logging utilities for Firebase Cloud Functions
 * @security Secure logging that doesn't expose sensitive information
 */

import * as admin from "firebase-admin";

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * Log categories for better organization
 */
export enum LogCategory {
  AUTH = "auth",
  VAULT = "vault",
  FILES = "files",
  SECURITY = "security",
  ADMIN = "admin",
  SYSTEM = "system",
}

/**
 * Interface for structured log entries
 */
interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: admin.firestore.Timestamp;
  userId?: string;
  sessionId?: string;
  functionName?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Interface for security log entries
 */
interface SecurityLogEntry extends LogEntry {
  category: LogCategory.SECURITY;
  severity: "low" | "medium" | "high" | "critical";
  ip?: string;
  userAgent?: string;
  geoData?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  anomalyType?: string;
}

/**
 * Interface for audit log entries
 */
interface AuditLogEntry extends LogEntry {
  action: string;
  resource?: string;
  resourceId?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

/**
 * Structured logger class
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private db: admin.firestore.Firestore;

  private constructor() {
    this.db = admin.firestore();
  }

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * Log a general message
   */
  async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: {
      userId?: string;
      sessionId?: string;
      functionName?: string;
      requestId?: string;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const logEntry: LogEntry = {
        level,
        category,
        message,
        timestamp:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
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
  async logError(
    category: LogCategory,
    message: string,
    error: Error,
    metadata?: {
      userId?: string;
      sessionId?: string;
      functionName?: string;
      requestId?: string;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const logEntry: LogEntry = {
        level: LogLevel.ERROR,
        category,
        message,
        timestamp:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        userId: metadata?.userId,
        sessionId: metadata?.sessionId,
        functionName: metadata?.functionName,
        requestId: metadata?.requestId,
        metadata: metadata?.data,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
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
  async logSecurity(
    message: string,
    severity: "low" | "medium" | "high" | "critical",
    metadata: {
      userId?: string;
      sessionId?: string;
      functionName?: string;
      ip?: string;
      userAgent?: string;
      geoData?: {
        city?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
      };
      anomalyType?: string;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const logEntry: SecurityLogEntry = {
        level: severity === "critical" ? LogLevel.CRITICAL : LogLevel.WARN,
        category: LogCategory.SECURITY,
        message,
        severity,
        timestamp:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
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
  async logAudit(
    action: string,
    message: string,
    metadata: {
      userId: string;
      sessionId?: string;
      functionName?: string;
      resource?: string;
      resourceId?: string;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
      data?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        level: LogLevel.INFO,
        category: LogCategory.SYSTEM,
        message,
        action,
        timestamp:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
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
  private logToConsole(entry: LogEntry): void {
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
  private async storeLog(entry: LogEntry): Promise<void> {
    await this.db.collection("systemLogs").add(entry);
  }

  /**
   * Store security log entry
   */
  private async storeSecurityLog(entry: SecurityLogEntry): Promise<void> {
    await this.db.collection("securityLogs").add(entry);
  }

  /**
   * Store audit log entry
   */
  private async storeAuditLog(entry: AuditLogEntry): Promise<void> {
    await this.db.collection("auditLogs").add(entry);
  }

  /**
   * Create security alert for high severity events
   */
  private async createSecurityAlert(entry: SecurityLogEntry): Promise<void> {
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
  async queryLogs(filters: {
    category?: LogCategory;
    level?: LogLevel;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<LogEntry[]> {
    try {
      let query = this.db.collection("systemLogs") as admin.firestore.Query;

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
      return snapshot.docs.map((doc) => doc.data() as LogEntry);
    } catch (error) {
      console.error("Failed to query logs:", error);
      return [];
    }
  }
}

// Export singleton instance
export const logger = StructuredLogger.getInstance();

// Convenience functions
export const logInfo = (
  category: LogCategory,
  message: string,
  metadata?: any,
) => logger.log(LogLevel.INFO, category, message, metadata);

export const logWarn = (
  category: LogCategory,
  message: string,
  metadata?: any,
) => logger.log(LogLevel.WARN, category, message, metadata);

export const logError = (
  category: LogCategory,
  message: string,
  error: Error,
  metadata?: any,
) => logger.logError(category, message, error, metadata);

export const logSecurity = (
  message: string,
  severity: "low" | "medium" | "high" | "critical",
  metadata: any,
) => logger.logSecurity(message, severity, metadata);

export const logAudit = (action: string, message: string, metadata: any) =>
  logger.logAudit(action, message, metadata);
