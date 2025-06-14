"use strict";
/**
 * @fileoverview SRP Authentication Helper Functions
 * @description Additional SRP authentication utilities and helpers
 * @security Implements secure SRP protocol helpers
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
exports.getSRPSecuritySettings = exports.validateSRPParameters = void 0;
const functions = __importStar(require("firebase-functions"));
const error_handler_1 = require("../utils/error-handler");
const rate_limiting_1 = require("../utils/rate-limiting");
/**
 * Validates SRP parameters
 * Ensures SRP parameters meet security requirements
 */
exports.validateSRPParameters = functions.https.onCall(async (data, context) => {
    try {
        const { verifier, salt } = data;
        if (!verifier || !salt) {
            throw new functions.https.HttpsError("invalid-argument", "Verifier and salt required");
        }
        // Validate salt length (should be at least 128 bits / 16 bytes)
        if (salt.length < 32) {
            // 16 bytes = 32 hex characters
            throw new functions.https.HttpsError("invalid-argument", "Salt too short - minimum 128 bits required");
        }
        // Validate verifier length (should be reasonable for SRP-6a)
        if (verifier.length < 256 || verifier.length > 1024) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid verifier length");
        }
        // Validate hex encoding
        const hexPattern = /^[0-9a-fA-F]+$/;
        if (!hexPattern.test(salt) || !hexPattern.test(verifier)) {
            throw new functions.https.HttpsError("invalid-argument", "Parameters must be hex encoded");
        }
        return {
            valid: true,
            saltLength: salt.length,
            verifierLength: verifier.length,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, "validateSRPParameters");
    }
});
/**
 * Gets SRP security settings
 * Returns current SRP configuration and security parameters
 */
exports.getSRPSecuritySettings = functions.https.onCall(async (data, context) => {
    try {
        // Apply rate limiting
        await (0, rate_limiting_1.checkRateLimit)("anonymous", "getSRPSettings", 10);
        // Return public SRP parameters (safe to expose)
        const settings = {
            minimumSaltLength: 32,
            minimumVerifierLength: 256,
            maximumVerifierLength: 1024,
            sessionTimeout: 5 * 60 * 1000,
            maxFailedAttempts: 5,
            lockoutDuration: 15 * 60 * 1000,
            supportedAlgorithms: ["SRP-6a"],
            groupParameters: {
                name: "RFC 5054 2048-bit",
                bitLength: 2048,
            },
        };
        return {
            success: true,
            settings,
        };
    }
    catch (error) {
        return (0, error_handler_1.handleError)(error, "getSRPSecuritySettings");
    }
});
//# sourceMappingURL=srp-auth.functions.js.map