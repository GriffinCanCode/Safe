/**
 * Rate limiting utilities for Firebase Cloud Functions
 * Prevents abuse of the API by limiting requests
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Function to extract the key for rate limiting */
  keyGenerator: (context: functions.https.CallableContext) => string;
}

/**
 * In-memory rate limiter for functions
 */
const rateLimiters = new Map<string, Map<string, number[]>>();

/**
 * Rate limit decorator for Cloud Functions
 * @param config Rate limit configuration
 */
export function rateLimit(config: RateLimitConfig) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const [data, context] = args;
      const key = config.keyGenerator(context);
      const now = Date.now();
      
      // Get or create limiter for this function
      if (!rateLimiters.has(propertyKey)) {
        rateLimiters.set(propertyKey, new Map());
      }
      const limiter = rateLimiters.get(propertyKey)!;
      
      // Get timestamps for this key
      const timestamps = limiter.get(key) || [];
      
      // Remove old timestamps
      const validTimestamps = timestamps.filter(ts => now - ts < config.windowMs);
      
      // Check limit
      if (validTimestamps.length >= config.maxRequests) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many requests. Please try again later.'
        );
      }
      
      // Add current timestamp
      validTimestamps.push(now);
      limiter.set(key, validTimestamps);
      
      // Store rate limit info in Firestore for persistent tracking
      try {
        if (context.auth) {
          await admin.firestore()
            .collection('rateLimit')
            .doc(context.auth.uid)
            .set({
              functionName: propertyKey,
              lastRequest: now,
              requestsInWindow: validTimestamps.length,
              windowMs: config.windowMs
            }, { merge: true });
        }
      } catch (error) {
        console.warn('Failed to store rate limit info:', error);
        // Continue execution even if storing rate limit info fails
      }
      
      // Call original method
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
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
  windowMs: number
): Promise<boolean> {
  try {
    const now = Date.now();
    
    // Get rate limit document
    const rateLimitRef = admin.firestore()
      .collection('rateLimit')
      .doc(userId);
    
    // Use transaction to ensure atomic updates
    const isAllowed = await admin.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      
      if (!doc.exists) {
        // First request from this user
        transaction.set(rateLimitRef, {
          [functionName]: {
            count: 1,
            windowStart: now
          }
        });
        return true;
      }
      
      const data = doc.data();
      const functionData = data?.[functionName] || { count: 0, windowStart: now };
      
      // Reset window if enough time has passed
      if (now - functionData.windowStart > windowMs) {
        transaction.update(rateLimitRef, {
          [functionName]: {
            count: 1,
            windowStart: now
          }
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
          windowStart: functionData.windowStart
        }
      });
      
      return true;
    });
    
    return isAllowed;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow the request if the rate limit check fails
    return true;
  }
} 