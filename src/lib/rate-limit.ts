/**
 * Simple in-memory rate limiter using token bucket algorithm.
 * Suitable for serverless/edge environments with short-lived processes.
 * For production at scale, consider Redis-based rate limiting.
 */

interface RateLimitEntry {
    tokens: number;
    lastRefill: number;
}

interface RateLimitConfig {
    /** Maximum number of tokens (requests) in the bucket */
    maxTokens: number;
    /** Time window in milliseconds to fully refill the bucket */
    refillWindowMs: number;
}

const buckets = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    const staleThreshold = now - 10 * 60 * 1000; // 10 minutes
    Array.from(buckets.entries()).forEach(([key, entry]) => {
        if (entry.lastRefill < staleThreshold) {
            buckets.delete(key);
        }
    });
}

/**
 * Check if a request should be rate-limited.
 * @param identifier - Unique identifier (e.g., IP address or user ID)
 * @param config - Rate limit configuration
 * @returns { allowed: boolean, remaining: number, resetMs: number }
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): { allowed: boolean; remaining: number; resetMs: number } {
    cleanup();

    const now = Date.now();
    let entry = buckets.get(identifier);

    if (!entry) {
        entry = { tokens: config.maxTokens, lastRefill: now };
        buckets.set(identifier, entry);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - entry.lastRefill;
    const refillRate = config.maxTokens / config.refillWindowMs;
    const tokensToAdd = elapsed * refillRate;
    entry.tokens = Math.min(config.maxTokens, entry.tokens + tokensToAdd);
    entry.lastRefill = now;

    if (entry.tokens >= 1) {
        entry.tokens -= 1;
        return {
            allowed: true,
            remaining: Math.floor(entry.tokens),
            resetMs: Math.ceil((config.maxTokens - entry.tokens) / refillRate),
        };
    }

    // Calculate when the next token will be available
    const waitMs = Math.ceil((1 - entry.tokens) / refillRate);

    return {
        allowed: false,
        remaining: 0,
        resetMs: waitMs,
    };
}

// Pre-configured rate limiters for different endpoints
export const RATE_LIMITS = {
    /** AI classification: 10 requests per minute per IP */
    classify: { maxTokens: 10, refillWindowMs: 60 * 1000 },
    /** Eco Guide chat: 15 requests per minute per IP */
    ecoGuide: { maxTokens: 15, refillWindowMs: 60 * 1000 },
} as const;
