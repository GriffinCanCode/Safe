"use strict";
/**
 * @fileoverview Validation Utilities
 * @description Common validation functions for Firebase Cloud Functions
 * @security Input validation and sanitization utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidHexString = exports.validatePaginationParams = exports.validateFunctionContext = exports.isValidFileSize = exports.isValidNumberInRange = exports.isValidContentType = exports.sanitizeStringInput = exports.isValidIPAddress = exports.isValidUserId = exports.isValidFileName = exports.validatePasswordStrength = exports.isValidEmail = void 0;
/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = new RegExp("^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9]" +
    "(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?" +
    "(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$");
/**
 * Validates email address format
 * @param {string} email Email address to validate
 * @return {boolean} True if valid email format
 */
function isValidEmail(email) {
    if (!email || typeof email !== "string") {
        return false;
    }
    return EMAIL_REGEX.test(email.trim().toLowerCase());
}
exports.isValidEmail = isValidEmail;
/**
 * Validates password strength
 * @param {string} password Password to validate
 * @return {object} Object with validation result and requirements
 */
function validatePasswordStrength(password) {
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
exports.validatePasswordStrength = validatePasswordStrength;
/**
 * Validates file name for security
 * @param {string} fileName File name to validate
 * @return {boolean} True if file name is safe
 */
function isValidFileName(fileName) {
    if (!fileName || typeof fileName !== "string") {
        return false;
    }
    // Check length
    if (fileName.length > 255 || fileName.length < 1) {
        return false;
    }
    // Check for dangerous characters and patterns
    const dangerousPatterns = [
        /\.\./,
        /[<>:"|?*]/,
        /^\.+$/,
        /\0/,
        // eslint-disable-next-line no-control-regex
        /[\x00-\x1f\x80-\x9f]/, // Control characters
    ];
    return !dangerousPatterns.some((pattern) => pattern.test(fileName));
}
exports.isValidFileName = isValidFileName;
/**
 * Validates user ID format
 * @param {string} userId User ID to validate
 * @return {boolean} True if valid user ID format
 */
function isValidUserId(userId) {
    if (!userId || typeof userId !== "string") {
        return false;
    }
    // Firebase user IDs are typically 28 characters, alphanumeric
    return /^[a-zA-Z0-9]{20,30}$/.test(userId);
}
exports.isValidUserId = isValidUserId;
/**
 * Validates IP address format
 * @param {string} ip IP address to validate
 * @return {boolean} True if valid IP address (IPv4 or IPv6)
 */
function isValidIPAddress(ip) {
    if (!ip || typeof ip !== "string") {
        return false;
    }
    // IPv4 regex
    const ipv4Regex = new RegExp("^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}" +
        "(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");
    // IPv6 regex (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
exports.isValidIPAddress = isValidIPAddress;
/**
 * Sanitizes string input for database storage
 * @param {string} input String to sanitize
 * @param {number} maxLength Maximum allowed length
 * @return {string} Sanitized string
 */
function sanitizeStringInput(input, maxLength = 1000) {
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
exports.sanitizeStringInput = sanitizeStringInput;
/**
 * Validates content type for file uploads
 * @param {string} contentType Content type to validate
 * @param {string[]} allowedTypes Array of allowed content types
 * @return {boolean} True if content type is allowed
 */
function isValidContentType(contentType, allowedTypes = []) {
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
    const typesToCheck = allowedTypes.length > 0 ? allowedTypes : defaultAllowedTypes;
    return typesToCheck.includes(contentType.toLowerCase());
}
exports.isValidContentType = isValidContentType;
/**
 * Validates numeric input within range
 * @param {any} value Value to validate
 * @param {number} min Minimum allowed value
 * @param {number} max Maximum allowed value
 * @return {boolean} True if value is valid number within range
 */
function isValidNumberInRange(value, min, max) {
    if (typeof value !== "number" || isNaN(value)) {
        return false;
    }
    return value >= min && value <= max;
}
exports.isValidNumberInRange = isValidNumberInRange;
/**
 * Validates file size
 * @param {number} size File size in bytes
 * @param {number} maxSize Maximum allowed size in bytes
 * @return {boolean} True if file size is valid
 */
function isValidFileSize(size, maxSize = 100 * 1024 * 1024) {
    return isValidNumberInRange(size, 1, maxSize);
}
exports.isValidFileSize = isValidFileSize;
/**
 * Validates Firebase Cloud Function context
 * @param {functions.https.CallableContext} context Function context
 * @param {boolean} requireAuth Whether authentication is required
 * @return {object} Validation result
 */
function validateFunctionContext(context, requireAuth = true) {
    if (!context) {
        return { isValid: false, error: "Context is required" };
    }
    if (requireAuth && !context.auth) {
        return { isValid: false, error: "Authentication required" };
    }
    if (requireAuth && context.auth && !isValidUserId(context.auth.uid)) {
        return { isValid: false, error: "Invalid user ID format" };
    }
    return { isValid: true };
}
exports.validateFunctionContext = validateFunctionContext;
/**
 * Validates pagination parameters
 * @param {any} limit Limit parameter
 * @param {any} offset Offset parameter
 * @return {object} Validation result with sanitized values
 */
function validatePaginationParams(limit, offset) {
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
        validatedLimit = limit;
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
        validatedOffset = offset;
    }
    return {
        isValid: true,
        limit: validatedLimit,
        offset: validatedOffset,
    };
}
exports.validatePaginationParams = validatePaginationParams;
/**
 * Validates hex string (for hashes, IDs, etc.)
 * @param {string} hexString String to validate
 * @param {number} expectedLength Expected length (optional)
 * @return {boolean} True if valid hex string
 */
function isValidHexString(hexString, expectedLength) {
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
exports.isValidHexString = isValidHexString;
//# sourceMappingURL=validation.utils.js.map