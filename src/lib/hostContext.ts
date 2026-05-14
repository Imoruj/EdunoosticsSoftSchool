/**
 * Hostname parsing for multi-tenant subdomains (e.g. tis.edunostics.com).
 * Uses NEXT_PUBLIC_APP_ROOT_DOMAIN (e.g. edunostics.com) — must match deployed DNS.
 */

const RESERVED_SUBDOMAIN_LABELS = new Set([
    "www",
    "app",
    "api",
    "admin",
    "cdn",
    "mail",
    "ftp",
    "localhost",
    "staging",
    "status",
    "test",
]);

export function normalizeHostHeader(host: string | null | undefined): string {
    if (!host) return "";
    const first = host.split(",")[0]?.trim() ?? "";
    const withoutPort = first.split(":")[0] ?? "";
    return withoutPort.toLowerCase();
}

function stripLeadingWww(hostname: string): string {
    return hostname.replace(/^www\./, "");
}

/**
 * Returns the first DNS label if `hostname` is a single-level subdomain of rootDomain,
 * e.g. tis + edunostics.com → "tis". www.edunostics.com → null (reserved).
 */
export function getTenantSlugFromHostname(hostname: string, rootDomain: string | undefined | null): string | null {
    const root = rootDomain?.trim().toLowerCase();
    if (!root) return null;

    const host = normalizeHostHeader(hostname);
    if (!host) return null;

    const apex = stripLeadingWww(host);
    const rootApex = stripLeadingWww(root);

    if (apex === rootApex) return null;

    if (!apex.endsWith(`.${rootApex}`)) return null;

    const remainder = apex.slice(0, -(rootApex.length + 1));
    if (!remainder || remainder.includes(".")) return null;

    if (RESERVED_SUBDOMAIN_LABELS.has(remainder)) return null;

    return remainder;
}

/** True when host is the apex / www marketing domain (not a tenant subdomain). */
export function isApexMarketingHost(hostname: string, rootDomain: string | undefined | null): boolean {
    const root = rootDomain?.trim().toLowerCase();
    if (!root) return false;

    const host = normalizeHostHeader(hostname);
    const apex = stripLeadingWww(host);
    const rootApex = stripLeadingWww(root);

    return apex === rootApex;
}

export function isReservedTenantLabel(label: string): boolean {
    return RESERVED_SUBDOMAIN_LABELS.has(label.trim().toLowerCase());
}

export function tenantSubdomainsEnabled(): boolean {
    return process.env.NEXT_PUBLIC_USE_TENANT_SUBDOMAINS === "true";
}

export function appRootDomain(): string | undefined {
    const v = process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN?.trim();
    return v || undefined;
}
