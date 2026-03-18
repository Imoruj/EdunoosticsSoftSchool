"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { navigation, isGroup, NavItem } from "./navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useSchoolFeatures } from "@/hooks/useSchoolFeatures";
import type { FeatureFlags } from "@/lib/getSchoolFeatures";

// Map nav item names → feature flag keys
const navItemFeatureKey: Partial<Record<string, keyof FeatureFlags>> = {
    "Students": "studentsEnabled",
    "Teachers": "teachersEnabled",
    "Score Entry": "scoreEntryEnabled",
    "Score Reviews": "scoreReviewsEnabled",
    "Subjects": "subjectsEnabled",
    "Lessons": "lessonsEnabled",
    "Quizzes": "quizzesEnabled",
    "Assignments": "assignmentsEnabled",
    "Scheme of Work": "schemesOfWorkEnabled",
    "Classes": "classesEnabled",
    "Broadsheet": "broadsheetEnabled",
    "Transcripts": "transcriptsEnabled",
    "Report Cards": "reportCardsEnabled",
    "Historical Records": "legacyRecordsEnabled",
    "Upload Requests": "uploadRequestsEnabled",
    "Attendance": "attendanceEnabled",
    "Behaviour & Skills": "behaviourEnabled",
    "Communication": "communicationEnabled",
    "Fees": "feesEnabled",
    "Settings": "settingsEnabled",
};

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SCHOOL_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSchool: {
    logoUrl: string | null;
    name: string;
    fetchedAt: number;
} | null = null;

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
    const [schoolName, setSchoolName] = useState<string>("Edunostics");
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [pendingUploadCount, setPendingUploadCount] = useState(0);

    const userName = session?.user?.name || "Admin User";
    const userEmail = session?.user?.email || "admin@school.edu.ng";
    const userInitials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    useEffect(() => {
        if (!session?.user) return;
        const loginType = (session.user as any)?.loginType;
        const sessionAvatar = (session.user as any)?.avatarUrl || (session.user as any)?.image;
        if (sessionAvatar) {
            setUserPhoto(sessionAvatar);
            return;
        }
        if (loginType === "student") {
            fetch("/api/students/me")
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data?.photoUrl) setUserPhoto(data.photoUrl); })
                .catch((err) => console.debug("[Sidebar] Student photo fetch failed:", err));
        }
    }, [session]);

    useEffect(() => {
        let mounted = true;

        const applySchool = (name: string, logoUrl: string | null) => {
            if (!mounted) return;
            setSchoolLogo(logoUrl);
            setSchoolName(name);
        };

        const fetchSchool = async (force = false) => {
            const schoolCache = cachedSchool;
            const cacheIsFresh = !!schoolCache && Date.now() - schoolCache.fetchedAt < SCHOOL_CACHE_TTL_MS;
            if (!force && cacheIsFresh && schoolCache) {
                applySchool(schoolCache.name, schoolCache.logoUrl);
                return;
            }

            try {
                const response = await fetch("/api/school");
                if (!response.ok) return;
                const data = await response.json();
                const nextName = data.name || "Edunostics";
                const nextLogo = data.logoUrl || null;
                cachedSchool = {
                    name: nextName,
                    logoUrl: nextLogo,
                    fetchedAt: Date.now(),
                };
                applySchool(nextName, nextLogo);
            } catch { }
        };

        fetchSchool();
        const handleSchoolUpdate = () => fetchSchool(true);
        window.addEventListener("school-updated", handleSchoolUpdate);

        return () => {
            mounted = false;
            window.removeEventListener("school-updated", handleSchoolUpdate);
        };
    }, []);

    useEffect(() => {
        const userRoles = (session?.user as any)?.roles || [];
        const isAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            setPendingUploadCount(0);
        }
    }, [session]);

    useEffect(() => {
        const handlePendingUploadCount = (event: Event) => {
            const { detail } = event as CustomEvent<number>;
            setPendingUploadCount(typeof detail === "number" ? detail : 0);
        };

        window.addEventListener("dashboard-pending-upload-count", handlePendingUploadCount as EventListener);
        return () => {
            window.removeEventListener("dashboard-pending-upload-count", handlePendingUploadCount as EventListener);
        };
    }, []);

    const handleLogout = () => {
        signOut({ callbackUrl: "/auth/login" });
    };

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        if (typeof window === "undefined") return {};
        try {
            const saved = localStorage.getItem("nav-expanded-groups");
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const toggleGroup = useCallback((label: string) => {
        setExpandedGroups(prev => {
            const next = { ...prev, [label]: !prev[label] };
            try { localStorage.setItem("nav-expanded-groups", JSON.stringify(next)); } catch { }
            return next;
        });
    }, []);

    useEffect(() => {
        setExpandedGroups(prev => {
            let changed = false;
            const next = { ...prev };

            for (const entry of navigation) {
                if (!isGroup(entry)) continue;
                const hasActive = entry.items.some(item =>
                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
                );
                if (hasActive && !next[entry.label]) {
                    next[entry.label] = true;
                    changed = true;
                }
            }

            if (!changed) return prev;
            try { localStorage.setItem("nav-expanded-groups", JSON.stringify(next)); } catch { }
            return next;
        });
    }, [pathname]);

    const loginType = (session?.user as any)?.loginType;
    const userRoles: string[] = (session?.user as any)?.roles || [];
    const isTeacher = userRoles.includes("CLASS_TEACHER") || userRoles.includes("SUBJECT_TEACHER");
    const isSuperAdmin = userRoles.includes("SUPER_ADMIN");
    const { features } = useSchoolFeatures();

    const isItemVisible = useCallback((item: NavItem): boolean => {
        if (loginType === "parent") {
            return ["My Wards", "Report Cards", "Fees", "My Profile"].includes(item.name);
        }
        if (loginType === "student") {
            return ["Dashboard", "My Profile", "Report Cards", "Assignments", "My Progress", "Lessons", "Quizzes", "Scheme of Work"].includes(item.name);
        }
        if (loginType === "admin" || !loginType) {
            if (isTeacher) {
                if (item.name === "My Wards" || item.name === "Fees") return false;
            }
            if (!item.roles.some(role => userRoles.includes(role))) return false;
            // Super admin sees everything; feature flags only apply to school users
            if (!isSuperAdmin) {
                const featureKey = navItemFeatureKey[item.name];
                if (featureKey && !features[featureKey]) return false;
            }
            return true;
        }
        return true;
    }, [loginType, userRoles, isTeacher, isSuperAdmin, features]);

    return (
        <>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                        {schoolLogo ? (
                            <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain p-0.5" />
                        ) : (
                            <div className="w-full h-full bg-primary-600 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">{schoolName?.charAt(0) || "E"}</span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{schoolName}</h1>
                        <p className="text-xs text-gray-500">Report Card System</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {navigation.map((entry) => {
                        if (!isGroup(entry)) {
                            if (!isItemVisible(entry)) return null;
                            const isActive = pathname === entry.href || (entry.href !== "/dashboard" && pathname.startsWith(entry.href + "/"));
                            return (
                                <Link
                                    key={entry.name}
                                    href={entry.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? "bg-primary-50 text-primary-700"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                        }`}
                                >
                                    <span className={isActive ? "text-primary-600" : "text-gray-400"}>
                                        {entry.icon}
                                    </span>
                                    {entry.name}
                                </Link>
                            );
                        }

                        const visibleItems = entry.items.filter(isItemVisible);
                        if (visibleItems.length === 0) return null;

                        const isExpanded = expandedGroups[entry.label] ?? false;
                        const groupHasActive = visibleItems.some(item =>
                            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
                        );

                        return (
                            <div key={entry.label} className="mt-3 first:mt-0">
                                <button
                                    onClick={() => toggleGroup(entry.label)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${groupHasActive ? "text-primary-700" : "text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    <span className="shrink-0">{entry.icon}</span>
                                    <span className="flex-1 text-left">{entry.label}</span>
                                    <svg
                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>

                                <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                                    <div className="ml-2 pl-3 border-l border-gray-100 space-y-0.5 mt-0.5">
                                        {visibleItems.map((item) => {
                                            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                                        ? "bg-primary-50 text-primary-700"
                                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                                        }`}
                                                >
                                                    <span className={isActive ? "text-primary-600" : "text-gray-400"}>
                                                        {item.icon}
                                                    </span>
                                                    {item.name}
                                                    {item.badge === "uploadRequests" && pendingUploadCount > 0 && (
                                                        <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                                                            {pendingUploadCount}
                                                        </span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <Avatar src={userPhoto} initials={userInitials} size="md" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-gray-400 hover:text-gray-600"
                            title="Logout"
                            aria-label="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
