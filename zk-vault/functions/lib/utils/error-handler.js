"use strict";
/**
 * Error handling utilities for Firebase Cloud Functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withErrorHandling = exports.handleError = exports.handleAuthError = exports.createHttpsError = exports.logError = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Logs an error to the audit log in Firestore
 * @param error Error to log
 */
async function logError(error) {
    try {
        await admin
            .firestore()
            .collection("auditLogs")
            .add({
            ...error,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (loggingError) {
        console.error("Failed to log error to audit log:", loggingError);
        console.error("Original error:", error);
    }
}
exports.logError = logError;
/**
 * Creates a Firebase HTTPS error from a structured error
 * @param error Structured error
 * @return Firebase HTTPS error
 */
function createHttpsError(error) {
    // Map severity to Firebase error code
    let code = "unknown";
    switch (error.code) {
        case "INVALID_ARGUMENT":
            code = "invalid-argument";
            break;
        case "UNAUTHENTICATED":
            code = "unauthenticated";
            break;
        case "PERMISSION_DENIED":
            code = "permission-denied";
            break;
        case "NOT_FOUND":
            code = "not-found";
            break;
        case "ALREADY_EXISTS":
            code = "already-exists";
            break;
        case "RESOURCE_EXHAUSTED":
            code = "resource-exhausted";
            break;
        case "FAILED_PRECONDITION":
            code = "failed-precondition";
            break;
        case "ABORTED":
            code = "aborted";
            break;
        case "INTERNAL":
            code = "internal";
            break;
        case "UNAVAILABLE":
            code = "unavailable";
            break;
        default:
            code = "unknown";
    }
    return new functions.https.HttpsError(code, error.message, error.details);
}
exports.createHttpsError = createHttpsError;
/**
 * Handles authentication errors consistently
 * @param error Error to handle
 * @return Firebase HTTPS error
 */
function handleAuthError(error) {
    console.error("Auth error:", error);
    // Log the error to Firestore audit log
    const structuredError = {
        message: error.message || "Authentication failed",
        code: "UNAUTHENTICATED",
        details: { originalError: error.toString() },
        severity: "warning",
        timestamp: Date.now(),
    };
    logError(structuredError).catch(console.error);
    // Map common auth errors to specific codes
    if (error.code === "auth/user-not-found") {
        return new functions.https.HttpsError("not-found", "Account not found");
    }
    if (error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential") {
        return new functions.https.HttpsError("unauthenticated", "Invalid credentials");
    }
    if (error.code === "auth/email-already-exists") {
        return new functions.https.HttpsError("already-exists", "Email already in use");
    }
    return new functions.https.HttpsError("unauthenticated", "Authentication failed");
}
exports.handleAuthError = handleAuthError;
/**
 * Wraps a function with error handling
 * @param fn Function to wrap
 * @returns Wrapped function with error handling
 */
/**
 * Generic error handler for Cloud Functions
 * @param error Error object
 * @param functionName Function name for context
 * @param userId Optional user ID
 * @return Firebase HTTPS error response
 */
function handleError(error, functionName, userId) {
    console.error(`Error in ${functionName}:`, error);
    if (error instanceof functions.https.HttpsError) {
        return {
            success: false,
            error: error.message,
            code: error.code,
        };
    }
    // Create structured error
    const structuredError = {
        message: error.message || "An unexpected error occurred",
        code: "INTERNAL",
        details: {
            functionName,
            originalError: error.toString(),
        },
        severity: "error",
        timestamp: Date.now(),
        userId,
    };
    // Log error to Firestore
    logError(structuredError).catch(console.error);
    return {
        success: false,
        error: "An unexpected error occurred",
        code: "internal",
    };
}
exports.handleError = handleError;
function withErrorHandling(fn) {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            if (error instanceof functions.https.HttpsError) {
                throw error; // Already a Firebase error, just rethrow
            }
            console.error("Function error:", error);
            // Get user ID from context if available
            const context = args[1];
            const userId = context?.auth?.uid;
            // Create structured error
            const structuredError = {
                message: error.message || "An unexpected error occurred",
                code: "INTERNAL",
                details: { originalError: error.toString() },
                severity: "error",
                timestamp: Date.now(),
                userId,
            };
            // Log error to Firestore
            logError(structuredError).catch(console.error);
            // Convert to Firebase error
            throw createHttpsError(structuredError);
        }
    };
}
exports.withErrorHandling = withErrorHandling;
//# sourceMappingURL=error-handler.js.map