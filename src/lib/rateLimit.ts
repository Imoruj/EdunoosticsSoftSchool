/**
 * Simple in-memory rate limiter.
 * For multi-instance / serverless deployments, replace with
 * an Upstash Redis limiter (@upstash/ratelimit).
 *
 * Usage:
 *   const ok = rateLimit("login", ip, { limit: 10, windowMs: 60_000 });
 *   if (!ok) return apiError("Too many requests", 429);
 */

interface Bucket {
    count: number;
    resetAt: number;
}

const store = new Map<string, Bucket>();

// Evict expired buckets every 5 minutes to prevent unbounded memory growth
setInterval(() => {
    const now = Date.now();
    store.forEach((bucket, key) => {
        if (bucket.resetAt < now) store.delete(key);
    });
}, 5 * 60 * 1000);

export function rateLimit(
    namespace: string,
    identifier: string,
    opts: { limit: number; windowMs: number },
): boolean {
    const key = `${namespace}:${identifier}`;
    const now = Date.now();
    const bucket = store.get(key);

    if (!bucket || bucket.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + opts.windowMs });
        return true;
    }

    if (bucket.count >= opts.limit) return false;

    bucket.count += 1;
    return true;
}

/** Extract a best-effort client IP from Next.js request headers. */
export function getClientIp(req: Request): string {
    const headers = req instanceof Request ? req.headers : (req as any).headers;
    return (
        (typeof headers.get === "function"
            ? headers.get("x-forwarded-for")?.split(",")[0].trim()
            : (headers as any)["x-forwarded-for"]?.split(",")[0].trim()) ??
        "unknown"
    );
}
