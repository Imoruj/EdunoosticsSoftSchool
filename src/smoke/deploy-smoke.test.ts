/**
 * Optional HTTP smoke tests against a deployed environment (e.g. Vercel + edunostics.com).
 *
 * Run:
 *   SMOKE_APEX_URL=https://edunostics.com SMOKE_SCHOOL_SLUG=tis npm run test:smoke
 *
 * Optional:
 *   SMOKE_STRICT=1          — require tenant / to redirect (subdomain mode + DNS must be ready)
 *   SMOKE_SKIP_TENANT_HOST=1 — skip checks that call https://{slug}.{root} (wildcard DNS not ready yet)
 *
 * Skipped when SMOKE_APEX_URL or SMOKE_SCHOOL_SLUG is unset (does not affect `npm test`).
 */

import { describe, expect, it } from "vitest";

const apexRaw = process.env.SMOKE_APEX_URL?.trim();
const slug = process.env.SMOKE_SCHOOL_SLUG?.trim()?.toLowerCase();

const apexUrl = apexRaw ? apexRaw.replace(/\/$/, "") : "";
const enabled = Boolean(apexUrl && slug);

const strict = process.env.SMOKE_STRICT === "1";
const skipTenantHost = process.env.SMOKE_SKIP_TENANT_HOST === "1";

const FETCH_MS = 20_000;

function tenantOrigin(): string {
    const hostname = new URL(apexUrl).hostname.toLowerCase().replace(/^www\./, "");
    return `https://${slug}.${hostname}`;
}

async function smokeFetch(url: string): Promise<Response> {
    return fetch(url, {
        redirect: "manual",
        headers: { Accept: "text/html" },
        signal: AbortSignal.timeout(FETCH_MS),
    });
}

describe.skipIf(!enabled)("deploy smoke (SMOKE_APEX_URL + SMOKE_SCHOOL_SLUG)", () => {
    it("apex root returns success (landing)", async () => {
        const res = await smokeFetch(`${apexUrl}/`);
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(400);
    });

    it.skipIf(skipTenantHost)("tenant root redirects to branded school login path (or 200 if subdomain mode off)", async () => {
        const res = await smokeFetch(`${tenantOrigin()}/`);
        const redirect = [301, 302, 303, 307, 308].includes(res.status);

        if (redirect) {
            const loc = res.headers.get("location");
            expect(loc, "Location header expected for tenant / redirect").toBeTruthy();
            expect(loc!).toMatch(new RegExp(`/s/${slug}/login`));
            return;
        }

        if (res.status === 200) {
            if (strict) {
                throw new Error(
                    `Expected redirect from tenant / but got 200. Set NEXT_PUBLIC_USE_TENANT_SUBDOMAINS=true, ` +
                        `NEXT_PUBLIC_APP_ROOT_DOMAIN, add *.domain to Vercel + DNS, or unset SMOKE_STRICT.`
                );
            }
            console.warn(
                "[smoke] Tenant / returned 200 (no redirect). Subdomain routing may be off until env + wildcard DNS are configured."
            );
            return;
        }

        throw new Error(`Unexpected status ${res.status} for ${tenantOrigin()}/`);
    });

    it("apex /s/{slug}/login exists or redirects (not 404)", async () => {
        const url = `${apexUrl}/s/${slug}/login`;
        const res = await smokeFetch(url);
        if (res.status === 404) {
            throw new Error(
                `GET ${url} → 404. Deploy this Next app to ${apexUrl}, or verify the route exists (build output includes /s/[slug]/login).`
            );
        }
        expect([200, 301, 302, 303, 307, 308]).toContain(res.status);
        if ([301, 302, 303, 307, 308].includes(res.status)) {
            const loc = res.headers.get("location") ?? "";
            expect(loc.length).toBeGreaterThan(0);
            if (loc.includes(slug!)) {
                expect(loc).toMatch(/\/s\/[^/]+\/login/);
            }
        }
    });

    it.skipIf(skipTenantHost)("tenant school login page returns HTML", async () => {
        const url = `${tenantOrigin()}/s/${slug}/login`;
        const res = await smokeFetch(url);
        expect(res.status, `GET ${url} — check wildcard DNS and SSL for tenant host`).toBe(200);
        const text = await res.text();
        expect(text.length).toBeGreaterThan(100);
    });
});
