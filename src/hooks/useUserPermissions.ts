"use client";

import { useEffect, useState } from "react";
import { createEmptyPermissionState, type PermissionState } from "@/lib/permissions";

let cache: { permissions: PermissionState; fetchedAt: number } | null = null;
let inFlight: Promise<PermissionState> | null = null;
const CACHE_TTL_MS = 60 * 1000;

export function useUserPermissions(): { permissions: PermissionState; loading: boolean } {
    const [permissions, setPermissions] = useState<PermissionState>(createEmptyPermissionState());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const load = async (force = false) => {
            if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
                if (mounted) {
                    setPermissions(cache.permissions);
                    setLoading(false);
                }
                return;
            }

            try {
                if (!inFlight) {
                    inFlight = fetch("/api/permissions/me")
                        .then(async (response) => {
                            if (!response.ok) {
                                throw new Error("Failed to load permissions");
                            }
                            const data = await response.json();
                            return data.permissions as PermissionState;
                        })
                        .finally(() => {
                            inFlight = null;
                        });
                }

                const nextPermissions = await inFlight;
                cache = {
                    permissions: nextPermissions,
                    fetchedAt: Date.now(),
                };
                if (mounted) {
                    setPermissions(nextPermissions);
                }
            } catch {
                if (mounted) {
                    setPermissions(createEmptyPermissionState());
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        load();
        const handleRefresh = () => {
            cache = null;
            if (mounted) {
                setLoading(true);
            }
            void load(true);
        };

        window.addEventListener("role-permissions-updated", handleRefresh);
        return () => {
            mounted = false;
            window.removeEventListener("role-permissions-updated", handleRefresh);
        };
    }, []);

    return { permissions, loading };
}
