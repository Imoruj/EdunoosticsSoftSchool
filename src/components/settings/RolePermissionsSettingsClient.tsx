"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { handleUnauthorizedApiResponse, readApiError } from "@/lib/client-session";
import {
    getRoleDefaultPermissionKeys,
    getRolePermissionDefinitions,
    MANAGED_ROLE_PERMISSION_ROLES,
    ROLE_PERMISSION_DESCRIPTIONS,
    ROLE_PERMISSION_LABELS,
    type ManagedRolePermissionRole,
    type PermissionKey,
} from "@/lib/permissions";

type RolePermissionAssignments = Record<ManagedRolePermissionRole, PermissionKey[]>;

function createDefaultAssignments(): RolePermissionAssignments {
    return Object.fromEntries(
        MANAGED_ROLE_PERMISSION_ROLES.map((role) => [role, getRoleDefaultPermissionKeys(role)])
    ) as RolePermissionAssignments;
}

export default function RolePermissionsSettingsClient() {
    const [selectedRole, setSelectedRole] = useState<ManagedRolePermissionRole>("SCHOOL_ADMIN");
    const [permissions, setPermissions] = useState<RolePermissionAssignments>(createDefaultAssignments);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [savedAt, setSavedAt] = useState<Date | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await fetch("/api/settings/role-permissions");
                if (await handleUnauthorizedApiResponse(response)) {
                    return;
                }
                if (!response.ok) {
                    throw new Error(await readApiError(response, "Failed to load role access settings"));
                }
                const data = await response.json();
                if (data?.permissions) {
                    setPermissions(data.permissions as RolePermissionAssignments);
                }
            } catch (loadError) {
                const message = loadError instanceof Error ? loadError.message : "Failed to load role access settings";
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const definitions = useMemo(
        () => getRolePermissionDefinitions(selectedRole),
        [selectedRole]
    );

    const groupedDefinitions = useMemo(() => {
        const grouped = new Map<string, typeof definitions>();
        for (const definition of definitions) {
            const items = grouped.get(definition.group) || [];
            grouped.set(definition.group, [...items, definition]);
        }
        return ["General", "People", "Academics", "Reports", "School"]
            .map((group) => ({
                group,
                items: grouped.get(group) || [],
            }))
            .filter((entry) => entry.items.length > 0);
    }, [definitions]);

    const enabledSet = useMemo(
        () => new Set(permissions[selectedRole] || []),
        [permissions, selectedRole]
    );

    const togglePermission = (key: PermissionKey) => {
        setPermissions((current) => {
            const currentSet = new Set(current[selectedRole] || []);
            if (currentSet.has(key)) {
                currentSet.delete(key);
            } else {
                currentSet.add(key);
            }

            return {
                ...current,
                [selectedRole]: Array.from(currentSet).sort(),
            };
        });
    };

    const toggleGroup = (keys: PermissionKey[], nextValue: boolean) => {
        setPermissions((current) => {
            const currentSet = new Set(current[selectedRole] || []);
            for (const key of keys) {
                if (nextValue) {
                    currentSet.add(key);
                } else {
                    currentSet.delete(key);
                }
            }

            return {
                ...current,
                [selectedRole]: Array.from(currentSet).sort(),
            };
        });
    };

    const save = async () => {
        setSaving(true);
        setError("");

        try {
            const response = await fetch("/api/settings/role-permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permissions }),
            });

            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }
            if (!response.ok) {
                throw new Error(await readApiError(response, "Failed to save role access settings"));
            }

            const data = await response.json();
            if (data?.permissions) {
                setPermissions(data.permissions as RolePermissionAssignments);
            }
            setSavedAt(new Date());
            window.dispatchEvent(new Event("role-permissions-updated"));
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Failed to save role access settings";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2">
                    <Link
                        href="/dashboard/settings"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                        <span aria-hidden="true">←</span>
                        Back to Settings
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Role Access Management</h1>
                        <p className="mt-1 text-sm text-gray-500 max-w-3xl">
                            Turn app modules on or off for each user role. School-wide feature controls still apply,
                            so a globally disabled feature stays hidden even if a role has it enabled here.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {savedAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Saved {savedAt.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={save}
                        disabled={saving || loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors shadow-sm"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Roles</p>
                    <div className="mt-4 space-y-2">
                        {MANAGED_ROLE_PERMISSION_ROLES.map((role) => {
                            const isActive = role === selectedRole;
                            const enabledCount = permissions[role]?.length || 0;

                            return (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                                        isActive
                                            ? "border-primary-200 bg-primary-50"
                                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{ROLE_PERMISSION_LABELS[role]}</p>
                                            <p className="mt-1 text-xs text-gray-500">{ROLE_PERMISSION_DESCRIPTIONS[role]}</p>
                                        </div>
                                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                            {enabledCount}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    Editing Role
                                </p>
                                <h2 className="mt-1 text-xl font-bold text-gray-900">
                                    {ROLE_PERMISSION_LABELS[selectedRole]}
                                </h2>
                                <p className="mt-2 text-sm text-gray-500">
                                    Dashboard and profile access stay available by default. The toggles below control
                                    additional modules this role can open from the dashboard.
                                </p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                                Enabled modules: <span className="font-semibold text-gray-900">{permissions[selectedRole]?.length || 0}</span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 shadow-sm">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
                        </div>
                    ) : groupedDefinitions.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
                            <p className="text-sm text-gray-500">No configurable modules are defined for this role yet.</p>
                        </div>
                    ) : (
                        groupedDefinitions.map(({ group, items }) => {
                            const groupKeys = items.map((item) => item.key as PermissionKey);
                            const allEnabled = groupKeys.every((key) => enabledSet.has(key));

                            return (
                                <div key={group} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4">
                                        <div>
                                            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">{group}</h3>
                                            <p className="mt-1 text-xs text-gray-500">{items.length} module{items.length === 1 ? "" : "s"}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleGroup(groupKeys, !allEnabled)}
                                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                                        >
                                            {allEnabled ? "Disable All" : "Enable All"}
                                        </button>
                                    </div>

                                    <div className="divide-y divide-gray-100">
                                        {items.map((item) => {
                                            const permissionKey = item.key as PermissionKey;
                                            const isEnabled = enabledSet.has(permissionKey);
                                            return (
                                                <div key={item.key} className="flex items-center justify-between gap-4 px-6 py-4">
                                                    <div>
                                                        <p className={`text-sm font-medium ${isEnabled ? "text-gray-800" : "text-gray-400"}`}>
                                                            {item.label}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => togglePermission(permissionKey)}
                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                                            isEnabled ? "bg-primary-600" : "bg-gray-200"
                                                        }`}
                                                        role="switch"
                                                        aria-checked={isEnabled}
                                                        aria-label={`Toggle ${item.label}`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                                                                isEnabled ? "translate-x-5" : "translate-x-0"
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
