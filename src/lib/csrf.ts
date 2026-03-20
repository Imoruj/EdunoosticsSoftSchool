/**
 * Lightweight CSRF protection via Origin-header validation.
 *
 * All state-changing JSON API routes should call `checkCsrf(req)` before
 * processing the request body. Requests with a mismatched Origin are rejected
 * with 403 to prevent cross-site request forgery.
 *
 * Same-origin browser fetches and server-to-server calls (no Origin header)
 * pass through, so SSR and cron jobs are unaffected.
 */

import { NextResponse } from "next/server";

function normalizeHost(value: string | null): string | null {
    if (!value) return null;
    return value.split(",")[0]?.trim().toLowerCase() || null;
}

function getAllowedHosts(req: Request): Set<string> {
    const hosts = new Set<string>();
    const requestHost = normalizeHost(
        req.headers.get("x-forwarded-host") || req.headers.get("host")
    );
    const vercelHost = normalizeHost(process.env.VERCEL_URL || null);
    const appUrl = process.env.NEXTAUTH_URL;

    if (requestHost) hosts.add(requestHost);
    if (vercelHost) hosts.add(vercelHost);

    if (appUrl) {
        try {
            hosts.add(new URL(appUrl).host.toLowerCase());
        } catch {
            // Ignore malformed NEXTAUTH_URL and rely on request-host validation.
        }
    }

    return hosts;
}

/**
 * Returns true if the request Origin host matches the active request host,
 * Vercel deployment host, or NEXTAUTH_URL host. Returns false for cross-origin
 * requests and malformed Origin headers.
 */
export function isOriginAllowed(req: Request): boolean {
    const origin = req.headers.get("origin");

    // No Origin header means same-origin navigation or server-to-server. Allow.
    if (!origin) return true;

    try {
        const originHost = new URL(origin).host.toLowerCase();
        return getAllowedHosts(req).has(originHost);
    } catch {
        return false;
    }
}

/**
 * Returns a 403 NextResponse if the Origin is from a different site, or
 * null if the request is allowed. Use like:
 *
 *   const csrfError = checkCsrf(req);
 *   if (csrfError) return csrfError;
 */
export function checkCsrf(req: Request): NextResponse | null {
    if (!isOriginAllowed(req)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
}
