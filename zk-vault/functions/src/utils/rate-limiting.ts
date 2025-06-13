/**
 * Rate limiting utilities for Firebase Cloud Functions
 * Prevents abuse of the API by limiting requests
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

type Transaction = admin.firestore.Transaction;

/**
 * Global rate limiting state
 * In production, this would use Redis or another shared cache
 */
// const rateLimiters = new Map<string, Map<string, number[]>>();

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

/**
 * Default rate limiting configurations
 */
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 5, windowMs: 5 * 60 * 1000 }, // 5 requests per 5 minutes
  upload: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  download: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  admin: { maxRequests: 2, windowMs: 60 * 1000 }, // 2 admin requests per minute
  default: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
};

/**
 * Checks if a user has exceeded rate limits
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxRequests?: number,
): Promise<void> {
  try {
    const db = admin.firestore();
    const now = Date.now();

    // Get rate limit configuration
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default;
    const actualMaxRequests = maxRequests || config.maxRequests;
    const windowMs = config.windowMs;

    // Create rate limit key
    const rateLimitKey = `${userId}:${endpoint}`;

    // Get current rate limit document
    const rateLimitRef = db.collection("rateLimits").doc(rateLimitKey);
    const rateLimitDoc = await rateLimitRef.get();

    let data = rateLimitDoc.data();

    // Check if document exists and is within current window
    if (data && data.windowStartTime) {
      const windowStartTime = data.windowStartTime.toDate().getTime();

      // If we're still in the same window
      if (now - windowStartTime < windowMs) {
        // Check if user is currently blocked
        if (data.blocked) {
          const blockTime = data.blockedAt?.toDate()?.getTime() || 0;
          const blockDuration = data.blockDurationMs || 5 * 60 * 1000; // 5 minutes default

          // Check if block period has expired
          if (now - blockTime < blockDuration) {
            throw new functions.https.HttpsError(
              "resource-exhausted",
              `Rate limit exceeded. Try again in ${Math.ceil((blockDuration - (now - blockTime)) / 1000)} seconds`,
            );
          } else {
            // Block has expired, reset
            data = undefined;
          }
        }

        // Check if request count exceeds limit
        if (data && data.requestCount >= actualMaxRequests) {
          // Block user for 5 minutes
          await rateLimitRef.update({
            blocked: true,
            blockedAt: admin.firestore.FieldValue.serverTimestamp(),
            blockDurationMs: 5 * 60 * 1000,
          });

          throw new functions.https.HttpsError(
            "resource-exhausted",
            "Rate limit exceeded. Account temporarily blocked",
          );
        }

        // Increment request count
        if (data) {
          await rateLimitRef.update({
            requestCount: admin.firestore.FieldValue.increment(1),
            lastRequestAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } else {
        // Window has expired, reset
        data = undefined;
      }
    }

    // If no existing data or window expired, create new window
    if (!data) {
      await rateLimitRef.set({
        requestCount: 1,
        windowStartTime: admin.firestore.FieldValue.serverTimestamp(),
        lastRequestAt: admin.firestore.FieldValue.serverTimestamp(),
        blocked: false,
        endpoint,
        userId,
      });
    }
  } catch (error) {
    // If it's already an HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // For other errors, log and allow the request (fail open)
    console.error("Rate limiting error:", error);
  }
}

/**
 * Rate limiting middleware for HTTP functions
 */
export function rateLimit(config: RateLimitConfig) {
  return async (data: any, context: functions.https.CallableContext) => {
    // In this implementation, we'll just return the original function
    // The actual rate limiting is done in checkRateLimit
    return data;
  };
}

/**
 * Persistent rate limiter using Firestore
 * For tracking rate limits across function instances
 */
export async function checkPersistentRateLimit(
  userId: string,
  functionName: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const now = Date.now();

    // Get rate limit document
    const rateLimitRef = admin.firestore().collection("rateLimit").doc(userId);

    // Use transaction to ensure atomic updates
    const isAllowed = await admin
      .firestore()
      .runTransaction(async (transaction: Transaction) => {
        const doc = await transaction.get(rateLimitRef);

        if (!doc.exists) {
          // First request from this user
          transaction.set(rateLimitRef, {
            [functionName]: {
              count: 1,
              windowStart: now,
            },
          });
          return true;
        }

        const data = doc.data();
        const functionData = data?.[functionName] || {
          count: 0,
          windowStart: now,
        };

        // Reset window if enough time has passed
        if (now - functionData.windowStart > windowMs) {
          transaction.update(rateLimitRef, {
            [functionName]: {
              count: 1,
              windowStart: now,
            },
          });
          return true;
        }

        // Check if under limit
        if (functionData.count >= maxRequests) {
          return false;
        }

        // Increment counter
        transaction.update(rateLimitRef, {
          [functionName]: {
            count: functionData.count + 1,
            windowStart: functionData.windowStart,
          },
        });

        return true;
      });

    return isAllowed;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Allow the request if the rate limit check fails
    return true;
  }
}
