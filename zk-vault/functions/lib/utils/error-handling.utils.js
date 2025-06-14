"use strict";
/**
 * @fileoverview Advanced Error Handling Utilities
 * @description Additional error handling utilities and custom error classes
 * @security Secure error handling that doesn't leak sensitive information
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
exports.withRetry = exports.withTimeout = exports.safeJSONParse = exports.requireOwnership = exports.requireAuth = exports.validateRequired = exports.validateInput = exports.withAdvancedErrorHandling = exports.getErrorSeverity = exports.createErrorResponse = exports.mapToFirebaseError = exports.ErrorSeverity = exports.DataIntegrityError = exports.ExternalServiceError = exports.BusinessLogicError = exports.ResourceNotFoundError = exports.RateLimitError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logging_utils_1 = require("./logging.utils");
/**
 * Custom error classes for better error categorization
 */
class ValidationError extends Error {
    field;
    code;
    constructor(message, field, code = "VALIDATION_ERROR") {
        super(message);
        this.field = field;
        this.code = code;
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends Error {
    code;
    constructor(message = "Authentication failed", code = "AUTH_ERROR") {
        super(message);
        this.code = code;
        this.name = "AuthenticationError";
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    code;
    constructor(message = "Access denied", code = "AUTHZ_ERROR") {
        super(message);
        this.code = code;
        this.name = "AuthorizationError";
    }
}
exports.AuthorizationError = AuthorizationError;
class RateLimitError extends Error {
    retryAfter;
    code;
    constructor(message = "Rate limit exceeded", retryAfter, code = "RATE_LIMIT_ERROR") {
        super(message);
        this.retryAfter = retryAfter;
        this.code = code;
        this.name = "RateLimitError";
    }
}
exports.RateLimitError = RateLimitError;
class ResourceNotFoundError extends Error {
    code;
    constructor(resource, id, code = "NOT_FOUND_ERROR") {
        super(`${resource}${id ? ` with ID ${id}` : ""} not found`);
        this.code = code;
        this.name = "ResourceNotFoundError";
    }
}
exports.ResourceNotFoundError = ResourceNotFoundError;
class BusinessLogicError extends Error {
    code;
    constructor(message, code = "BUSINESS_LOGIC_ERROR") {
        super(message);
        this.code = code;
        this.name = "BusinessLogicError";
    }
}
exports.BusinessLogicError = BusinessLogicError;
class ExternalServiceError extends Error {
    code;
    constructor(service, message, code = "EXTERNAL_SERVICE_ERROR") {
        super(`${service}: ${message}`);
        this.code = code;
        this.name = "ExternalServiceError";
    }
}
exports.ExternalServiceError = ExternalServiceError;
class DataIntegrityError extends Error {
    code;
    constructor(message, code = "DATA_INTEGRITY_ERROR") {
        super(message);
        this.code = code;
        this.name = "DataIntegrityError";
    }
}
exports.DataIntegrityError = DataIntegrityError;
/**
 * Error severity levels
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity = exports.ErrorSeverity || (exports.ErrorSeverity = {}));
/**
 * Maps custom errors to Firebase HTTPS errors
 */
function mapToFirebaseError(error, context) {
    let code;
    let message;
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
    logging_utils_1.logger.logError(logging_utils_1.LogCategory.SYSTEM, `Function error: ${error.message}`, error, {
        userId: context?.userId,
        sessionId: context?.sessionId,
        functionName: context?.functionName,
        requestId: context?.requestId,
        data: context?.additionalData,
    });
    return new functions.https.HttpsError(code, message, {
        originalError: error.name,
        requestId: context?.requestId,
        timestamp: new Date().toISOString(),
    });
}
exports.mapToFirebaseError = mapToFirebaseError;
/**
 * Creates a standardized error response
 */
function createErrorResponse(error, context, includeStack = false) {
    const errorCode = error.code || error.name || "UNKNOWN_ERROR";
    // Don't expose sensitive error details in production
    const isDevelopment = process.env.NODE_ENV === "development";
    const response = {
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
exports.createErrorResponse = createErrorResponse;
/**
 * Returns a safe error message that doesn't expose sensitive information
 */
function getSafeErrorMessage(error) {
    // Map of safe error messages
    const safeMessages = {
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
function getErrorSeverity(error, context) {
    // Critical errors
    if (error instanceof DataIntegrityError) {
        return ErrorSeverity.CRITICAL;
    }
    // High severity errors
    if (error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        error instanceof ExternalServiceError) {
        return ErrorSeverity.HIGH;
    }
    // Medium severity errors
    if (error instanceof BusinessLogicError ||
        error instanceof ResourceNotFoundError) {
        return ErrorSeverity.MEDIUM;
    }
    // Low severity errors
    if (error instanceof ValidationError || error instanceof RateLimitError) {
        return ErrorSeverity.LOW;
    }
    // Default to medium for unknown errors
    return ErrorSeverity.MEDIUM;
}
exports.getErrorSeverity = getErrorSeverity;
/**
 * Wraps a function with comprehensive error handling
 */
function withAdvancedErrorHandling(fn, functionName, options = {}) {
    return async (...args) => {
        const requestId = generateRequestId();
        const context = {
            functionName,
            requestId,
            ...(options.includeContext && extractContextFromArgs(args)),
        };
        try {
            return await fn(...args);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            // Use custom error handler if provided
            if (options.customErrorHandler) {
                return options.customErrorHandler(err, context);
            }
            // Log error if enabled
            if (options.logErrors !== false) {
                const severity = getErrorSeverity(err, context);
                await logging_utils_1.logger.logError(logging_utils_1.LogCategory.SYSTEM, `Function ${functionName} failed: ${err.message}`, err, {
                    userId: context.userId,
                    sessionId: context.sessionId,
                    functionName: context.functionName,
                    requestId: context.requestId,
                    data: {
                        severity,
                        errorType: err.constructor.name,
                        ...context.additionalData,
                    },
                });
            }
            // Throw Firebase-compatible error
            throw mapToFirebaseError(err, context);
        }
    };
}
exports.withAdvancedErrorHandling = withAdvancedErrorHandling;
/**
 * Validates input and throws ValidationError if invalid
 */
function validateInput(value, validator, message, field) {
    if (!validator(value)) {
        throw new ValidationError(message, field);
    }
}
exports.validateInput = validateInput;
/**
 * Validates required fields
 */
function validateRequired(obj, requiredFields) {
    for (const field of requiredFields) {
        if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
            throw new ValidationError(`${field} is required`, field);
        }
    }
}
exports.validateRequired = validateRequired;
/**
 * Checks user authentication and authorization
 */
function requireAuth(context, requiredRole) {
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
exports.requireAuth = requireAuth;
/**
 * Checks resource ownership
 */
async function requireOwnership(userId, resourceType, resourceId) {
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
    }
    catch (error) {
        if (error instanceof AuthorizationError ||
            error instanceof ResourceNotFoundError) {
            throw error;
        }
        throw new DataIntegrityError("Failed to verify resource ownership");
    }
}
exports.requireOwnership = requireOwnership;
/**
 * Helper function to generate unique request IDs
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
/**
 * Extracts context information from function arguments
 */
function extractContextFromArgs(args) {
    // Look for context in the second argument (Firebase callable functions pattern)
    if (args.length >= 2 && args[1] && typeof args[1] === "object") {
        const context = args[1];
        return {
            userId: context.auth?.uid,
            sessionId: args[0]?.sessionId,
            ip: context.rawRequest?.ip,
            userAgent: context.rawRequest?.headers?.["user-agent"],
        };
    }
    return {};
}
/**
 * Utility to safely parse JSON with error handling
 */
function safeJSONParse(jsonString, defaultValue) {
    try {
        return JSON.parse(jsonString);
    }
    catch (error) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new ValidationError("Invalid JSON format");
    }
}
exports.safeJSONParse = safeJSONParse;
/**
 * Utility to safely execute async operations with timeout
 */
async function withTimeout(operation, timeoutMs, timeoutMessage = "Operation timed out") {
    return Promise.race([
        operation,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new ExternalServiceError("timeout", timeoutMessage));
            }, timeoutMs);
        }),
    ]);
}
exports.withTimeout = withTimeout;
/**
 * Retry mechanism with exponential backoff
 */
async function withRetry(operation, maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    let lastError = new Error("Unknown error");
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxRetries) {
                break;
            }
            // Don't retry certain types of errors
            if (lastError instanceof ValidationError ||
                lastError instanceof AuthenticationError ||
                lastError instanceof AuthorizationError) {
                break;
            }
            // Calculate delay with exponential backoff
            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError || new Error("Operation failed after retries");
}
exports.withRetry = withRetry;
//# sourceMappingURL=error-handling.utils.js.map