"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { handleUnauthorizedApiResponse } from "@/lib/client-session";
import { getTenantSlugFromHostname, tenantSubdomainsEnabled } from "@/lib/hostContext";

type CachedBranding = {
    logoUrl: string | null;
    fetchedAt: number;
};

const BRANDING_CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_FAVICON = "/images/brand/logo-mark.png";

let cachedSchoolBranding: CachedBranding | null = null;
const cachedSlugBranding = new Map<string, CachedBranding>();

function normalizeLogoUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function isCacheFresh(cache: CachedBranding | null): boolean {
    if (!cache) return false;
    return Date.now() - cache.fetchedAt < BRANDING_CACHE_TTL_MS;
}

function applyFavicon(logoUrl: string | null) {
    if (typeof document === "undefined") return;

    const href = logoUrl || DEFAULT_FAVICON;
    const iconLinks = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')
    );

    if (iconLinks.length === 0) {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = href;
        document.head.appendChild(link);
        return;
    }

    iconLinks.forEach((link) => {
        link.href = href;
    });
}

export function DynamicFavicon() {
    const pathname = usePathname();
    const { data: session, status } = useSession();

    const schoolSlug = useMemo(() => {
        if (tenantSubdomainsEnabled() && typeof window !== "undefined") {
            const fromHost = getTenantSlugFromHostname(
                window.location.hostname,
                process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN
            );
            if (fromHost) return fromHost;
        }
        if (!pathname) return null;
        // Only match /s/[slug]/login — other /s/... routes use literal segments (assignments, quizzes, progress)
        const match = pathname.match(/^\/s\/([^/]+)\/login/);
        return match?.[1] ?? null;
    }, [pathname]);

    const isSuperAdmin = useMemo(() => {
        const roles = session?.user?.roles || [];
        return roles.includes("SUPER_ADMIN");
    }, [session]);

    useEffect(() => {
        let active = true;

        const safeApplyFavicon = (logoUrl: string | null) => {
            if (!active) return;
            applyFavicon(logoUrl);
        };

        const fetchSchoolBySlug = async (slug: string, force = false) => {
            const cached = cachedSlugBranding.get(slug) || null;
            if (!force && isCacheFresh(cached)) {
                safeApplyFavicon(cached?.logoUrl || null);
                return;
            }

            try {
                const response = await fetch(`/api/schools/by-slug/${encodeURIComponent(slug)}`, {
                    cache: "no-store",
                });

                if (!response.ok) {
                    safeApplyFavicon(null);
                    return;
                }

                const data = await response.json();
                const logoUrl = normalizeLogoUrl(data?.logoUrl);
                cachedSlugBranding.set(slug, {
                    logoUrl,
                    fetchedAt: Date.now(),
                });
                safeApplyFavicon(logoUrl);
            } catch {
                safeApplyFavicon(null);
            }
        };

        const fetchSchoolForSession = async (force = false) => {
            if (isSuperAdmin) {
                safeApplyFavicon(null);
                return;
            }

            if (!force && isCacheFresh(cachedSchoolBranding)) {
                safeApplyFavicon(cachedSchoolBranding?.logoUrl || null);
                return;
            }

            try {
                const response = await fetch("/api/school", { cache: "no-store" });
                if (await handleUnauthorizedApiResponse(response)) {
                    safeApplyFavicon(null);
                    return;
                }
                if (!response.ok) {
                    safeApplyFavicon(null);
                    return;
                }

                const data = await response.json();
                const logoUrl = normalizeLogoUrl(data?.logoUrl);
                cachedSchoolBranding = {
                    logoUrl,
                    fetchedAt: Date.now(),
                };
                safeApplyFavicon(logoUrl);
            } catch {
                safeApplyFavicon(null);
            }
        };

        const syncFavicon = async (force = false) => {
            if (schoolSlug) {
                await fetchSchoolBySlug(schoolSlug, force);
                return;
            }

            if (status === "authenticated") {
                await fetchSchoolForSession(force);
                return;
            }

            if (status === "unauthenticated") {
                safeApplyFavicon(null);
            }
        };

        void syncFavicon();
        const handleSchoolUpdated = () => {
            void syncFavicon(true);
        };

        window.addEventListener("school-updated", handleSchoolUpdated);

        return () => {
            active = false;
            window.removeEventListener("school-updated", handleSchoolUpdated);
        };
    }, [schoolSlug, status, isSuperAdmin]);

    return null;
}
