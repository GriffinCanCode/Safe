/**
 * Error handling utilities for Firebase Cloud Functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Error severity levels
 */
export type ErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Structured error interface for consistent error handling
 */
export interface StructuredError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
  severity: ErrorSeverity;
  timestamp: number;
  userId?: string;
}

/**
 * Firebase Auth error interface
 */
export interface FirebaseAuthError {
  code: string;
  message: string;
  toString(): string;
}

/**
 * Generic error interface
 */
export interface GenericError {
  message?: string;
  code?: string;
  toString(): string;
}

/**
 * Function context interface for Cloud Functions
 */
export interface FunctionContext {
  auth?: {
    uid: string;
    token?: unknown;
  };
  rawRequest?: unknown;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * Logs an error to the audit log in Firestore
 * @param error Error to log
 */
export async function logError(error: StructuredError): Promise<void> {
  try {
    await admin
      .firestore()
      .collection("auditLogs")
      .add({
        ...error,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
  } catch (loggingError) {
    console.error("Failed to log error to audit log:", loggingError);
    console.error("Original error:", error);
  }
}

/**
 * Creates a Firebase HTTPS error from a structured error
 * @param error Structured error
 * @return Firebase HTTPS error
 */
export function createHttpsError(
  error: StructuredError,
): functions.https.HttpsError {
  // Map severity to Firebase error code
  let code: functions.https.FunctionsErrorCode = "unknown";

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

/**
 * Handles authentication errors consistently
 * @param error Error to handle
 * @return Firebase HTTPS error
 */
export function handleAuthError(error: FirebaseAuthError): functions.https.HttpsError {
  console.error("Auth error:", error);

  // Log the error to Firestore audit log
  const structuredError: StructuredError = {
    message: error.message || "Authentication failed",
    code: "UNAUTHENTICATED",
    details: {originalError: error.toString()},
    severity: "warning",
    timestamp: Date.now(),
  };

  logError(structuredError).catch(console.error);

  // Map common auth errors to specific codes
  if (error.code === "auth/user-not-found") {
    return new functions.https.HttpsError("not-found", "Account not found");
  }

  if (
    error.code === "auth/wrong-password" ||
    error.code === "auth/invalid-credential"
  ) {
    return new functions.https.HttpsError(
      "unauthenticated",
      "Invalid credentials",
    );
  }

  if (error.code === "auth/email-already-exists") {
    return new functions.https.HttpsError(
      "already-exists",
      "Email already in use",
    );
  }

  return new functions.https.HttpsError(
    "unauthenticated",
    "Authentication failed",
  );
}

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
export function handleError(
  error: GenericError | functions.https.HttpsError,
  functionName: string,
  userId?: string,
): ErrorResponse {
  console.error(`Error in ${functionName}:`, error);

  if (error instanceof functions.https.HttpsError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  // Create structured error
  const structuredError: StructuredError = {
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

export function withErrorHandling<T extends(...args: unknown[]) => Promise<unknown>>(
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) {
        throw error; // Already a Firebase error, just rethrow
      }

      const genericError = error as GenericError;
      console.error("Function error:", genericError);

      // Get user ID from context if available
      const context = args[1] as FunctionContext | undefined;
      const userId = context?.auth?.uid;

      // Create structured error
      const structuredError: StructuredError = {
        message: genericError.message || "An unexpected error occurred",
        code: "INTERNAL",
        details: {originalError: genericError.toString()},
        severity: "error",
        timestamp: Date.now(),
        userId,
      };

      // Log error to Firestore
      logError(structuredError).catch(console.error);

      // Convert to Firebase error
      throw createHttpsError(structuredError);
    }
  }) as T;
}
