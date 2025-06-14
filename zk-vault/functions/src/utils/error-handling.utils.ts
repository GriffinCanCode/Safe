/**
 * @fileoverview Advanced Error Handling Utilities
 * @description Additional error handling utilities and custom error classes
 * @security Secure error handling that doesn't leak sensitive information
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {logger, LogCategory} from "./logging.utils";

/**
 * Custom error classes for better error categorization
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code: string = "VALIDATION_ERROR",
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends Error {
  constructor(
    message = "Authentication failed",
    public code: string = "AUTH_ERROR",
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(
    message = "Access denied",
    public code: string = "AUTHZ_ERROR",
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class RateLimitError extends Error {
  constructor(
    message = "Rate limit exceeded",
    public retryAfter?: number,
    public code: string = "RATE_LIMIT_ERROR",
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class ResourceNotFoundError extends Error {
  constructor(
    resource: string,
    id?: string,
    public code: string = "NOT_FOUND_ERROR",
  ) {
    super(`${resource}${id ? ` with ID ${id}` : ""} not found`);
    this.name = "ResourceNotFoundError";
  }
}

export class BusinessLogicError extends Error {
  constructor(
    message: string,
    public code: string = "BUSINESS_LOGIC_ERROR",
  ) {
    super(message);
    this.name = "BusinessLogicError";
  }
}

export class ExternalServiceError extends Error {
  constructor(
    service: string,
    message: string,
    public code: string = "EXTERNAL_SERVICE_ERROR",
  ) {
    super(`${service}: ${message}`);
    this.name = "ExternalServiceError";
  }
}

export class DataIntegrityError extends Error {
  constructor(
    message: string,
    public code: string = "DATA_INTEGRITY_ERROR",
  ) {
    super(message);
    this.name = "DataIntegrityError";
  }
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Interface for error context
 */
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  functionName?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Interface for error response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
    timestamp: string;
  };
}

/**
 * Maps custom errors to Firebase HTTPS errors
 */
export function mapToFirebaseError(
  error: Error,
  context?: ErrorContext,
): functions.https.HttpsError {
  let code: functions.https.FunctionsErrorCode;
  let message: string;

  switch (error.constructor) {
  case ValidationError:
    code = "invalid-argument";
    message = error.message;
    break;

  case AuthenticationError:
    code = "unauthenticated";
    message = "Authentication required";
    break;

  case AuthorizationError:
    code = "permission-denied";
    message = "Access denied";
    break;

  case RateLimitError:
    code = "resource-exhausted";
    message = "Rate limit exceeded";
    break;

  case ResourceNotFoundError:
    code = "not-found";
    message = "Resource not found";
    break;

  case BusinessLogicError:
    code = "failed-precondition";
    message = error.message;
    break;

  case ExternalServiceError:
    code = "unavailable";
    message = "External service unavailable";
    break;

  case DataIntegrityError:
    code = "data-loss";
    message = "Data integrity violation";
    break;

  default:
    code = "internal";
    message = "An unexpected error occurred";
  }

  // Log the error
  logger.logError(
    LogCategory.SYSTEM,
    `Function error: ${error.message}`,
    error,
    {
      userId: context?.userId,
      sessionId: context?.sessionId,
      functionName: context?.functionName,
      requestId: context?.requestId,
      data: context?.additionalData,
    },
  );

  return new functions.https.HttpsError(code, message, {
    originalError: error.name,
    requestId: context?.requestId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: Error,
  context?: ErrorContext,
  includeStack = false,
): ErrorResponse {
  const errorCode = (error as Error & { code?: string }).code || error.name || "UNKNOWN_ERROR";

  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  const response: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: isDevelopment ? error.message : getSafeErrorMessage(error),
      requestId: context?.requestId,
      timestamp: new Date().toISOString(),
    },
  };

  // Include additional details in development
  if (isDevelopment && includeStack) {
    response.error.details = {
      stack: error.stack,
      name: error.name,
    };
  }

  return response;
}

/**
 * Returns a safe error message that doesn't expose sensitive information
 */
function getSafeErrorMessage(error: Error): string {
  // Map of safe error messages
  const safeMessages: Record<string, string> = {
    ValidationError: "Invalid input provided",
    AuthenticationError: "Authentication failed",
    AuthorizationError: "Access denied",
    RateLimitError: "Too many requests",
    ResourceNotFoundError: "Resource not found",
    BusinessLogicError: "Operation cannot be completed",
    ExternalServiceError: "Service temporarily unavailable",
    DataIntegrityError: "Data consistency error",
  };

  return safeMessages[error.name] || "An unexpected error occurred";
}

/**
 * Determines error severity based on error type and context
 */
export function getErrorSeverity(
  error: Error,
): ErrorSeverity {
  // Critical errors
  if (error instanceof DataIntegrityError) {
    return ErrorSeverity.CRITICAL;
  }

  // High severity errors
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof ExternalServiceError
  ) {
    return ErrorSeverity.HIGH;
  }

  // Medium severity errors
  if (
    error instanceof BusinessLogicError ||
    error instanceof ResourceNotFoundError
  ) {
    return ErrorSeverity.MEDIUM;
  }

  // Low severity errors
  if (error instanceof ValidationError || error instanceof RateLimitError) {
    return ErrorSeverity.LOW;
  }

  // Default to medium for unknown errors
  return ErrorSeverity.MEDIUM;
}

/**
 * Interface for error handling options
 */
interface ErrorHandlingOptions {
  logErrors?: boolean;
  includeContext?: boolean;
  customErrorHandler?: (error: Error, context?: ErrorContext) => unknown;
}

/**
 * Wraps a function with comprehensive error handling
 */
export function withAdvancedErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  functionName: string,
  options: ErrorHandlingOptions = {},
) {
  return async (...args: T): Promise<R> => {
    const requestId = generateRequestId();
    const context: ErrorContext = {
      functionName,
      requestId,
      ...(options.includeContext && extractContextFromArgs(args)),
    };

    try {
      return await fn(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Use custom error handler if provided
      if (options.customErrorHandler) {
        return options.customErrorHandler(err, context) as R;
      }

      // Log error if enabled
      if (options.logErrors !== false) {
        const severity = getErrorSeverity(err);

        await logger.logError(
          LogCategory.SYSTEM,
          `Function ${functionName} failed: ${err.message}`,
          err,
          {
            userId: context.userId,
            sessionId: context.sessionId,
            functionName: context.functionName,
            requestId: context.requestId,
            data: {
              severity,
              errorType: err.constructor.name,
              ...context.additionalData,
            },
          },
        );
      }

      // Throw Firebase-compatible error
      throw mapToFirebaseError(err, context);
    }
  };
}

/**
 * Validates input and throws ValidationError if invalid
 */
export function validateInput(
  value: unknown,
  validator: (value: unknown) => boolean,
  message: string,
  field?: string,
): void {
  if (!validator(value)) {
    throw new ValidationError(message, field);
  }
}

/**
 * Validates required fields
 */
export function validateRequired(
  obj: Record<string, unknown>,
  requiredFields: string[],
): void {
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      throw new ValidationError(`${field} is required`, field);
    }
  }
}

/**
 * Checks user authentication and authorization
 */
export function requireAuth(
  context: functions.https.CallableContext,
  requiredRole?: string,
): void {
  if (!context.auth) {
    throw new AuthenticationError();
  }

  if (requiredRole) {
    // This would need to be implemented based on your role system
    // For now, we'll check for admin role as an example
    if (requiredRole === "admin") {
      // You would typically check the user's claims or database record
      // This is a placeholder implementation
      throw new AuthorizationError("Admin role required");
    }
  }
}

/**
 * Checks resource ownership
 */
export async function requireOwnership(
  userId: string,
  resourceType: string,
  resourceId: string,
): Promise<void> {
  try {
    const resourceDoc = await admin
      .firestore()
      .collection(resourceType)
      .doc(resourceId)
      .get();

    if (!resourceDoc.exists) {
      throw new ResourceNotFoundError(resourceType, resourceId);
    }

    const resourceData = resourceDoc.data();
    if (resourceData?.userId !== userId) {
      throw new AuthorizationError("You do not own this resource");
    }
  } catch (error) {
    if (
      error instanceof AuthorizationError ||
      error instanceof ResourceNotFoundError
    ) {
      throw error;
    }
    throw new DataIntegrityError("Failed to verify resource ownership");
  }
}

/**
 * Helper function to generate unique request IDs
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Interface for function arguments with context
 */
interface FunctionArgsWithContext {
  0?: { sessionId?: string };
  1?: {
    auth?: { uid: string };
    rawRequest?: {
      ip?: string;
      headers?: { "user-agent"?: string };
    };
  };
}

/**
 * Extracts context information from function arguments
 */
function extractContextFromArgs(args: unknown[]): Partial<ErrorContext> {
  // Look for context in the second argument (Firebase callable functions pattern)
  if (args.length >= 2 && args[1] && typeof args[1] === "object") {
    const typedArgs = args as FunctionArgsWithContext;
    const context = typedArgs[1];
    return {
      userId: context?.auth?.uid,
      sessionId: typedArgs[0]?.sessionId,
      ip: context?.rawRequest?.ip,
      userAgent: context?.rawRequest?.headers?.["user-agent"],
    };
  }

  return {};
}

/**
 * Utility to safely parse JSON with error handling
 */
export function safeJSONParse<T = unknown>(
  jsonString: string,
  defaultValue?: T,
): T | undefined {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ValidationError("Invalid JSON format");
  }
}

/**
 * Utility to safely execute async operations with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out",
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ExternalServiceError("timeout", timeoutMessage));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000,
): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      // Don't retry certain types of errors
      if (
        lastError instanceof ValidationError ||
        lastError instanceof AuthenticationError ||
        lastError instanceof AuthorizationError
      ) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Operation failed after retries");
}
