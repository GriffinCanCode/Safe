/**
 * @fileoverview Validation Utilities
 * @description Common validation functions for Firebase Cloud Functions
 * @security Input validation and sanitization utilities
 */

import * as functions from "firebase-functions";

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = new RegExp(
  "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9]" +
  "(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?" +
  "(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
);

/**
 * Validates email address format
 * @param {string} email Email address to validate
 * @return {boolean} True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Validates password strength
 * @param {string} password Password to validate
 * @return {object} Object with validation result and requirements
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
  score: number;
} {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      requirements: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
      },
      score: 0,
    };
  }

  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;
  const isValid = score === 5;

  return {
    isValid,
    requirements,
    score: (score / 5) * 100,
  };
}

/**
 * Validates file name for security
 * @param {string} fileName File name to validate
 * @return {boolean} True if file name is safe
 */
export function isValidFileName(fileName: string): boolean {
  if (!fileName || typeof fileName !== "string") {
    return false;
  }

  // Check length
  if (fileName.length > 255 || fileName.length < 1) {
    return false;
  }

  // Check for dangerous characters and patterns
  const dangerousPatterns = [
    /\.\./, // Directory traversal
    /[<>:"|?*]/, // Invalid filename characters
    /^\.+$/, // Only dots
    /\0/, // Null bytes
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1f\x80-\x9f]/, // Control characters
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(fileName));
}

/**
 * Validates user ID format
 * @param {string} userId User ID to validate
 * @return {boolean} True if valid user ID format
 */
export function isValidUserId(userId: string): boolean {
  if (!userId || typeof userId !== "string") {
    return false;
  }

  // Firebase user IDs are typically 28 characters, alphanumeric
  return /^[a-zA-Z0-9]{20,30}$/.test(userId);
}

/**
 * Validates IP address format
 * @param {string} ip IP address to validate
 * @return {boolean} True if valid IP address (IPv4 or IPv6)
 */
export function isValidIPAddress(ip: string): boolean {
  if (!ip || typeof ip !== "string") {
    return false;
  }

  // IPv4 regex
  const ipv4Regex = new RegExp(
    "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}" +
    "(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
  );

  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Sanitizes string input for database storage
 * @param {string} input String to sanitize
 * @param {number} maxLength Maximum allowed length
 * @return {string} Sanitized string
 */
export function sanitizeStringInput(
  input: string,
  maxLength = 1000,
): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates content type for file uploads
 * @param {string} contentType Content type to validate
 * @param {string[]} allowedTypes Array of allowed content types
 * @return {boolean} True if content type is allowed
 */
export function isValidContentType(
  contentType: string,
  allowedTypes: string[] = [],
): boolean {
  if (!contentType || typeof contentType !== "string") {
    return false;
  }

  // Default allowed types if none specified
  const defaultAllowedTypes = [
    "text/plain",
    "text/csv",
    "application/json",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    "video/mp4",
    "video/mpeg",
    "audio/mpeg",
    "audio/wav",
    "application/zip",
    "application/x-rar-compressed",
  ];

  const typesToCheck =
    allowedTypes.length > 0 ? allowedTypes : defaultAllowedTypes;

  return typesToCheck.includes(contentType.toLowerCase());
}

/**
 * Validates numeric input within range
 * @param {unknown} value Value to validate
 * @param {number} min Minimum allowed value
 * @param {number} max Maximum allowed value
 * @return {boolean} True if value is valid number within range
 */
export function isValidNumberInRange(
  value: unknown,
  min: number,
  max: number,
): boolean {
  if (typeof value !== "number" || isNaN(value)) {
    return false;
  }

  return value >= min && value <= max;
}

/**
 * Validates file size
 * @param {number} size File size in bytes
 * @param {number} maxSize Maximum allowed size in bytes
 * @return {boolean} True if file size is valid
 */
export function isValidFileSize(
  size: number,
  maxSize: number = 100 * 1024 * 1024,
): boolean {
  return isValidNumberInRange(size, 1, maxSize);
}

/**
 * Validates Firebase Cloud Function context
 * @param {functions.https.CallableContext} context Function context
 * @param {boolean} requireAuth Whether authentication is required
 * @return {object} Validation result
 */
export function validateFunctionContext(
  context: functions.https.CallableContext,
  requireAuth = true,
): { isValid: boolean; error?: string } {
  if (!context) {
    return {isValid: false, error: "Context is required"};
  }

  if (requireAuth && !context.auth) {
    return {isValid: false, error: "Authentication required"};
  }

  if (requireAuth && context.auth && !isValidUserId(context.auth.uid)) {
    return {isValid: false, error: "Invalid user ID format"};
  }

  return {isValid: true};
}

/**
 * Validates pagination parameters
 * @param {unknown} limit Limit parameter
 * @param {unknown} offset Offset parameter
 * @return {object} Validation result with sanitized values
 */
export function validatePaginationParams(
  limit?: unknown,
  offset?: unknown,
): {
  isValid: boolean;
  limit: number;
  offset: number;
  error?: string;
} {
  const defaultLimit = 50;
  const maxLimit = 1000;
  const defaultOffset = 0;

  let validatedLimit = defaultLimit;
  let validatedOffset = defaultOffset;

  // Validate limit
  if (limit !== undefined) {
    if (!isValidNumberInRange(limit, 1, maxLimit)) {
      return {
        isValid: false,
        limit: defaultLimit,
        offset: defaultOffset,
        error: `Limit must be between 1 and ${maxLimit}`,
      };
    }
    validatedLimit = limit as number;
  }

  // Validate offset
  if (offset !== undefined) {
    if (!isValidNumberInRange(offset, 0, Number.MAX_SAFE_INTEGER)) {
      return {
        isValid: false,
        limit: validatedLimit,
        offset: defaultOffset,
        error: "Offset must be a non-negative number",
      };
    }
    validatedOffset = offset as number;
  }

  return {
    isValid: true,
    limit: validatedLimit,
    offset: validatedOffset,
  };
}

/**
 * Validates hex string (for hashes, IDs, etc.)
 * @param {string} hexString String to validate
 * @param {number} expectedLength Expected length (optional)
 * @return {boolean} True if valid hex string
 */
export function isValidHexString(
  hexString: string,
  expectedLength?: number,
): boolean {
  if (!hexString || typeof hexString !== "string") {
    return false;
  }

  const hexPattern = /^[0-9a-fA-F]+$/;

  if (!hexPattern.test(hexString)) {
    return false;
  }

  if (expectedLength && hexString.length !== expectedLength) {
    return false;
  }

  return true;
}
