import type { NextRequest } from "next/server";
import { appRootDomain, tenantSubdomainsEnabled } from "@/lib/hostContext";

/**
 * Public school portal URL for display (admin UI, emails) without a Request.
 * Prefer subdomain URL when tenant mode is enabled; otherwise NEXTAUTH_URL / Vercel / relative path.
 */
export function absolutePortalUrlForSlug(slug: string | null | undefined): string | null {
    if (!slug?.trim()) return null;
    const s = slug.trim();
    const root = appRootDomain();
    if (tenantSubdomainsEnabled() && root) {
        return `https://${s}.${root}/s/${s}/login`;
    }
    const base =
        process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    if (base) {
        return `${base}/s/${s}/login`;
    }
    return `/s/${s}/login`;
}

function requestProtocol(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-proto");
    if (forwarded) return forwarded.split(",")[0]?.trim() ?? "https";
    return req.nextUrl.protocol.replace(":", "") || "http";
}

function requestDisplayHost(req: NextRequest): string {
    const xf = req.headers.get("x-forwarded-host");
    if (xf) return xf.split(",")[0]?.trim() ?? "";
    return req.headers.get("host") ?? req.nextUrl.host ?? "";
}

export function buildPortalUrl(req: NextRequest, slug?: string | null): string {
    const proto = requestProtocol(req);
    const host = requestDisplayHost(req);
    const origin = `${proto}://${host}`;

    if (!slug) {
        return `${origin}/auth/login`;
    }

    const rootDomain = appRootDomain();
    if (tenantSubdomainsEnabled() && rootDomain) {
        return `${proto}://${slug}.${rootDomain}/s/${slug}/login`;
    }

    return `${origin}/s/${slug}/login`;
}
