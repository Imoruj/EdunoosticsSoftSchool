/**
 * Lightweight CSRF protection via Origin-header validation.
 *
 * All state-changing JSON API routes should call assertOrigin(req) before
 * processing the request body. Requests with a mismatched Origin are rejected
 * with 403 to prevent cross-site request forgery.
 *
 * Same-origin browser fetches and server-to-server calls (no Origin header)
 * pass through, so SSR and cron jobs are unaffected.
 */

import { NextResponse } from "next/server";

/**
 * Returns true if the request Origin matches NEXTAUTH_URL (or is absent,
 * meaning same-origin or server-side). Returns false for cross-origin requests.
 */
export function isOriginAllowed(req: Request): boolean {
    const origin = req.headers.get("origin");

    // No Origin header → same-origin navigation or server-to-server. Allow.
    if (!origin) return true;

    const appUrl = process.env.NEXTAUTH_URL;
    if (!appUrl) return true; // Can't validate without configured URL

    try {
        return new URL(origin).origin === new URL(appUrl).origin;
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
