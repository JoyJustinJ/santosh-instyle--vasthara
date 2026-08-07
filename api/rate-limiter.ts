/**
 * rate-limiter.ts
 *
 * Distributed rate limiter backed by Firestore.
 * Works across stateless Vercel serverless functions.
 *
 * Strategy: sliding-window counter stored in the `rate_limits` collection.
 * Each document key is `<action>:<identifier>` (e.g. "send-otp:phone:919876543210").
 * The document holds an array of request timestamps; old ones are pruned each call.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface RateLimitConfig {
  /** Collection key prefix, e.g. "send-otp:phone" */
  action: string;
  /** Unique identifier (phone, userId, IP address) */
  identifier: string;
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** How many requests remain in this window */
  remaining: number;
  /** Unix timestamp (ms) when the oldest request in window expires */
  retryAfterMs: number;
  /** Current count within window */
  count: number;
}

/**
 * Check and increment a rate limit counter.
 * Returns whether the current request is allowed.
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const db = getFirestore();
  const docId = `${config.action}:${config.identifier}`;
  const docRef = db.collection('rate_limits').doc(docId);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      let timestamps: number[] = [];

      if (snap.exists) {
        const data = snap.data();
        // Keep only timestamps within the current window
        timestamps = (data?.timestamps ?? []).filter((t: number) => t > windowStart);
      }

      const count = timestamps.length;
      const allowed = count < config.maxRequests;

      // Calculate when the window resets (oldest timestamp + window duration)
      const oldestInWindow = timestamps.length > 0 ? Math.min(...timestamps) : now;
      const retryAfterMs = oldestInWindow + config.windowMs;

      if (allowed) {
        // Add current timestamp and save
        timestamps.push(now);
        tx.set(docRef, {
          timestamps,
          // TTL field: documents expire 1 hour after last update
          // (Firestore TTL policy should be set on this field in production)
          expiresAt: new Date(now + Math.max(config.windowMs, 3600_000)),
          action: config.action,
          identifier: config.identifier,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        allowed,
        remaining: Math.max(0, config.maxRequests - count - (allowed ? 1 : 0)),
        retryAfterMs,
        count: count + (allowed ? 1 : 0),
      };
    });

    return result;
  } catch (error) {
    // On Firestore error, fail open (allow the request) to avoid breaking the app
    console.error('[RateLimiter] Firestore error, failing open:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      retryAfterMs: now + config.windowMs,
      count: 0,
    };
  }
}

/**
 * Helper: Get IP address from Vercel request headers.
 * Handles proxies and Vercel's forwarding headers.
 */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const xForwardedFor = headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',')[0];
    return ips.trim();
  }
  return headers['x-real-ip'] as string || 'unknown';
}

/**
 * Helper: build a standard 429 response payload.
 */
export function buildRateLimitResponse(result: RateLimitResult): {
  error: string;
  retryAfter: number;
} {
  const retryAfterSecs = Math.ceil((result.retryAfterMs - Date.now()) / 1000);
  return {
    error: `Too many requests. Please try again in ${retryAfterSecs} seconds.`,
    retryAfter: retryAfterSecs,
  };
}
