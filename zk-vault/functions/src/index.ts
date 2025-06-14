/**
 * ZK-Vault Firebase Functions
 * Main entry point for all cloud functions
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Authentication Functions
export * from "./auth/auth-functions";
export * from "./auth/session-management.functions";
export * from "./auth/user-management.functions";
export * from "./auth/srp-auth.functions";

// Vault Functions
export * from "./vault/vault-functions";
export * from "./vault/audit.functions";
export * from "./vault/sharing.functions";
export * from "./vault/vault-operations.functions";

// File Management Functions
export * from "./files/file-management.functions";
export * from "./files/chunk-processing.functions";
export * from "./files/deduplication.functions";

// Security Functions
export * from "./security/anomaly-detection.functions";
export * from "./security/breach-monitor.functions";
export * from "./security/rate-limiting.functions";

// Admin Functions
export * from "./admin/maintenance.functions";
export * from "./admin/system-health.functions";
export * from "./admin/user-analytics.functions";

// Note: All functions are exported via wildcard exports above
