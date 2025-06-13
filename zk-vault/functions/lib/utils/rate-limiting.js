"use strict";
/**
 * Rate limiting utilities for Firebase Cloud Functions
 * Prevents abuse of the API by limiting requests
 */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPersistentRateLimit =
  exports.rateLimit =
  exports.checkRateLimit =
    void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Default rate limiting configurations
 */
const RATE_LIMIT_CONFIGS = {
  auth: { maxRequests: 5, windowMs: 5 * 60 * 1000 },
  upload: { maxRequests: 10, windowMs: 60 * 1000 },
  download: { maxRequests: 50, windowMs: 60 * 1000 },
  admin: { maxRequests: 2, windowMs: 60 * 1000 },
  default: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
};
/**
 * Checks if a user has exceeded rate limits
 */
async function checkRateLimit(userId, endpoint, maxRequests) {
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
exports.checkRateLimit = checkRateLimit;
/**
 * Rate limiting middleware for HTTP functions
 */
function rateLimit(config) {
  return async (data, context) => {
    // In this implementation, we'll just return the original function
    // The actual rate limiting is done in checkRateLimit
    return data;
  };
}
exports.rateLimit = rateLimit;
/**
 * Persistent rate limiter using Firestore
 * For tracking rate limits across function instances
 */
async function checkPersistentRateLimit(
  userId,
  functionName,
  maxRequests,
  windowMs,
) {
  try {
    const now = Date.now();
    // Get rate limit document
    const rateLimitRef = admin.firestore().collection("rateLimit").doc(userId);
    // Use transaction to ensure atomic updates
    const isAllowed = await admin
      .firestore()
      .runTransaction(async (transaction) => {
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
exports.checkPersistentRateLimit = checkPersistentRateLimit;
//# sourceMappingURL=rate-limiting.js.map
