/**
 * @fileoverview SRP Authentication Helper Functions
 * @description Additional SRP authentication utilities and helpers
 * @security Implements secure SRP protocol helpers
 */

import * as functions from "firebase-functions";
import {handleError} from "../utils/error-handler";
import {checkRateLimit} from "../utils/rate-limiting";

/**
 * Validates SRP parameters
 * Ensures SRP parameters meet security requirements
 */
export const validateSRPParameters = functions.https.onCall(
  async (data: {verifier: string; salt: string}) => {
    try {
      const {verifier, salt} = data;

      if (!verifier || !salt) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Verifier and salt required",
        );
      }

      // Validate salt length (should be at least 128 bits / 16 bytes)
      if (salt.length < 32) {
        // 16 bytes = 32 hex characters
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Salt too short - minimum 128 bits required",
        );
      }

      // Validate verifier length (should be reasonable for SRP-6a)
      if (verifier.length < 256 || verifier.length > 1024) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid verifier length",
        );
      }

      // Validate hex encoding
      const hexPattern = /^[0-9a-fA-F]+$/;
      if (!hexPattern.test(salt) || !hexPattern.test(verifier)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Parameters must be hex encoded",
        );
      }

      return {
        valid: true,
        saltLength: salt.length,
        verifierLength: verifier.length,
      };
    } catch (error) {
      return handleError(error as Error, "validateSRPParameters");
    }
  },
);

/**
 * Gets SRP security settings
 * Returns current SRP configuration and security parameters
 */
export const getSRPSecuritySettings = functions.https.onCall(
  async () => {
    try {
      // Apply rate limiting
      await checkRateLimit("anonymous", "getSRPSettings", 10);

      // Return public SRP parameters (safe to expose)
      const settings = {
        minimumSaltLength: 32, // hex characters (16 bytes)
        minimumVerifierLength: 256,
        maximumVerifierLength: 1024,
        sessionTimeout: 5 * 60 * 1000, // 5 minutes in milliseconds
        maxFailedAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
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
    } catch (error) {
      return handleError(error as Error, "getSRPSecuritySettings");
    }
  },
);
