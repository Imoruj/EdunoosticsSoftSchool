"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { handleUnauthorizedApiResponse } from "@/lib/client-session";

type CachedBranding = {
    logoUrl: string | null;
    fetchedAt: number;
};

const BRANDING_CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_FAVICON = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#16a34a"/>
        <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#ffffff">E</text>
    </svg>`
)}`;

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
