"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { handleUnauthorizedApiResponse } from "@/lib/client-session";

interface Branch {
    id: string;
    name: string;
    branchCode: string | null;
    logoUrl: string | null;
}

interface HeaderNotification {
    id: string;
    title: string;
    message: string;
    time: string;
    href?: string;
    createdAt: string;
}

interface HeaderProps {
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    findPageTitle: () => string;
    topBarRef: React.RefObject<HTMLElement | null>;
}

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
}

export function Header({ setSidebarOpen, findPageTitle, topBarRef }: HeaderProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationItems, setNotificationItems] = useState<HeaderNotification[]>([]);
    const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
    const [currentTermInfo, setCurrentTermInfo] = useState<{ session: string, term: string } | null>(null);
    const notificationItemsRef = useRef<HeaderNotification[]>([]);
    const hasLoadedNotificationsRef = useRef(false);
    const notificationsRequestInFlightRef = useRef(false);
    const notificationStreamRetryRef = useRef<number | null>(null);

    // Branch switcher
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchMenuOpen, setBranchMenuOpen] = useState(false);
    const [switchingBranch, setSwitchingBranch] = useState(false);
    const branchMenuRef = useRef<HTMLDivElement>(null);
    const [activeBranchId, setActiveBranchId] = useState<string | null>(
        () => getCookie("active_branch_id") ?? ((session?.user as any)?.activeBranchId as string | null) ?? null
    );
    // Optimistic branch name — set immediately from the switch API response so the label
    // updates before the branches list re-fetches after router.refresh()
    const [optimisticBranchName, setOptimisticBranchName] = useState<string | null>(null);
    const activeBranch = branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null;

    // Sync activeBranchId from cookie on mount (cookie may not be readable during SSR init)
    useEffect(() => {
        const cookie = getCookie("active_branch_id");
        if (cookie) setActiveBranchId(cookie);
    }, []);

    // Fetch branches accessible to this user; clear optimistic label once list arrives
    useEffect(() => {
        if (!session?.user) return;
        fetch("/api/user/branches")
            .then((r) => r.ok ? r.json() : { branches: [] })
            .then((data) => {
                setBranches(data.branches ?? []);
                setOptimisticBranchName(null);
            })
            .catch(() => {});
    }, [session?.user]);

    // Close branch menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
                setBranchMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleBranchSwitch = async (branchId: string) => {
        if (branchId === activeBranchId || switchingBranch) return;
        setSwitchingBranch(true);
        setBranchMenuOpen(false);
        try {
            const res = await fetch("/api/session/switch-branch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchId }),
            });
            if (!res.ok) {
                toast.error("Could not switch branch");
                setSwitchingBranch(false);
                return;
            }
            const data = await res.json();
            // Cookie is now set by the server. All API routes read active_branch_id via
            // getActiveSchoolId() so a full page reload will serve the new branch's data.
            // Hard navigation is required because dashboard pages are client components
            // whose useEffect data-fetches don't re-run on router.refresh().
            if (data.branchName) setOptimisticBranchName(data.branchName);
            window.location.replace(window.location.pathname);
        } catch {
            toast.error("Could not switch branch");
        } finally {
            setSwitchingBranch(false);
        }
    };

    const userId = (session?.user as any)?.id || "anonymous";
    const notificationStorageKey = `dashboard-read-notifications:${userId}`;

    const notifications = notificationItems.map((notification) => ({
        ...notification,
        read: readNotificationIds.includes(notification.id),
    }));

    const unreadCount = notifications.filter((notification) => !notification.read).length;

    useEffect(() => {
        try {
            const stored = localStorage.getItem(notificationStorageKey);
            if (!stored) {
                setReadNotificationIds([]);
                return;
            }
            const parsed = JSON.parse(stored);
            setReadNotificationIds(Array.isArray(parsed) ? parsed : []);
        } catch {
            setReadNotificationIds([]);
        }
    }, [notificationStorageKey]);

    useEffect(() => {
        localStorage.setItem(notificationStorageKey, JSON.stringify(readNotificationIds));
    }, [notificationStorageKey, readNotificationIds]);

    const publishPendingUploadCount = useCallback((count: number) => {
        window.dispatchEvent(new CustomEvent<number>("dashboard-pending-upload-count", { detail: count }));
    }, []);

    useEffect(() => {
        notificationItemsRef.current = notificationItems;
    }, [notificationItems]);

    const fetchNotifications = useCallback(async (options?: { announceNew?: boolean }) => {
        if (!session?.user) {
            publishPendingUploadCount(0);
            return;
        }

        if (notificationsRequestInFlightRef.current) {
            return;
        }

        notificationsRequestInFlightRef.current = true;
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch("/api/notifications?limit=8", {
                cache: "no-store",
                signal: controller.signal,
            });
            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }
            if (!response.ok) throw new Error("Failed to fetch notifications");
            const data = await response.json();
            const nextNotifications = data?.notifications || [];

            if (options?.announceNew && hasLoadedNotificationsRef.current) {
                const knownIds = new Set(notificationItemsRef.current.map((item) => item.id));
                const newestNotification = nextNotifications.find((item: HeaderNotification) => !knownIds.has(item.id));

                if (newestNotification) {
                    toast.success(newestNotification.title, {
                        id: `notification:${newestNotification.id}`,
                    });
                }
            }

            publishPendingUploadCount(data?.pendingUploadCount || 0);
            setNotificationItems(nextNotifications);
            hasLoadedNotificationsRef.current = true;
            window.dispatchEvent(new CustomEvent("dashboard-notifications-updated"));
        } catch {
            publishPendingUploadCount(0);
            setNotificationItems([]);
        } finally {
            window.clearTimeout(timeoutId);
            notificationsRequestInFlightRef.current = false;
        }
    }, [session, publishPendingUploadCount]);

    const fetchTermInfo = useCallback(async () => {
        try {
            const res = await fetch("/api/sessions/current");
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setCurrentTermInfo({
                    session: data.sessionName,
                    term: data.termName
                });
            }
        } catch (e) {
            console.error("Failed to fetch term info", e);
        }
    }, []);

    useEffect(() => {
        void fetchNotifications();
        const intervalId = setInterval(() => {
            if (document.visibilityState === "visible") {
                void fetchNotifications();
            }
        }, 60000);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    useEffect(() => {
        if (!session?.user || typeof window === "undefined") return;

        let stream: EventSource | null = null;
        let cancelled = false;
        const handleNotification = () => {
            void fetchNotifications({ announceNew: true });
        };

        const clearRetry = () => {
            if (notificationStreamRetryRef.current !== null) {
                window.clearTimeout(notificationStreamRetryRef.current);
                notificationStreamRetryRef.current = null;
            }
        };

        const disconnectStream = () => {
            if (!stream) return;
            stream.removeEventListener("notification", handleNotification);
            stream.close();
            stream = null;
        };

        const connectStream = () => {
            if (cancelled || document.visibilityState !== "visible") {
                return;
            }

            clearRetry();
            disconnectStream();

            stream = new EventSource("/api/notifications/stream");
            stream.addEventListener("notification", handleNotification);
            stream.onerror = () => {
                disconnectStream();

                if (!cancelled) {
                    notificationStreamRetryRef.current = window.setTimeout(() => {
                        connectStream();
                    }, 60000);
                }
            };
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                connectStream();
                void fetchNotifications();
                return;
            }

            clearRetry();
            disconnectStream();
        };

        connectStream();
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            clearRetry();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            disconnectStream();
        };
    }, [session, fetchNotifications]);

    useEffect(() => {
        fetchTermInfo();
    }, [fetchTermInfo, pathname]);

    useEffect(() => {
        const handleTermUpdated = () => {
            fetchTermInfo();
        };

        window.addEventListener("term-updated", handleTermUpdated);
        return () => {
            window.removeEventListener("term-updated", handleTermUpdated);
        };
    }, [fetchTermInfo]);

    useEffect(() => {
        setShowNotifications(false);
    }, [pathname]);

    const markAsRead = (id: string) => {
        setReadNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    const markAllAsRead = () => {
        setReadNotificationIds((prev) => {
            const merged = new Set(prev);
            notifications.forEach((notification) => merged.add(notification.id));
            return Array.from(merged);
        });
    };

    const openNotification = (notification: HeaderNotification & { read: boolean }) => {
        markAsRead(notification.id);
        setShowNotifications(false);
        if (notification.href) {
            router.push(notification.href);
        }
    };

    return (
        <header
            ref={topBarRef}
            className="fixed top-0 left-0 right-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur lg:left-64"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
                <div className="flex min-w-0 items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
                        aria-label="Open navigation menu"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Breadcrumb / Page Title */}
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-gray-900">
                            {findPageTitle()}
                        </h2>
                        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-gray-500">
                            <span className="truncate">
                                {currentTermInfo ? `${currentTermInfo.session} - ${currentTermInfo.term}` : "Loading term info..."}
                            </span>
                            {(session?.user as any)?.assignedClass && (
                                <span className="hidden md:flex items-center gap-1 bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md font-medium text-xs border border-primary-100">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {(session?.user as any)?.assignedClass}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Branch switcher — only when user has multiple branches and switching is enabled */}
                {branches.length > 1 && (session?.user as any)?.canSwitchBranches !== false && (
                    <div className="relative" ref={branchMenuRef}>
                        <button
                            onClick={() => setBranchMenuOpen((v) => !v)}
                            disabled={switchingBranch}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60 max-w-[180px]"
                            aria-label="Switch branch"
                        >
                            <svg className="w-4 h-4 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="truncate">{activeBranch?.branchCode ?? activeBranch?.name ?? optimisticBranchName ?? "Branch"}</span>
                            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {branchMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setBranchMenuOpen(false)} />
                                <div className="absolute left-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
                                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Switch Branch</p>
                                    </div>
                                    {branches.map((branch) => (
                                        <button
                                            key={branch.id}
                                            onClick={() => handleBranchSwitch(branch.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${branch.id === activeBranchId ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-700"}`}
                                        >
                                            <svg className={`w-4 h-4 shrink-0 ${branch.id === activeBranchId ? "text-primary-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <div className="min-w-0">
                                                <p className="truncate">{branch.name}</p>
                                                {branch.branchCode && (
                                                    <p className="text-xs text-gray-400">{branch.branchCode}</p>
                                                )}
                                            </div>
                                            {branch.id === activeBranchId && (
                                                <svg className="w-4 h-4 text-primary-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3 lg:gap-4">
                    {/* Search */}
                    <div className="hidden md:flex items-center">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search students, classes..."
                                className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications((prev) => !prev)}
                            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Open notifications"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500">No new notifications</div>
                                        ) : (
                                            notifications.map((notification) => (
                                                <div
                                                    key={notification.id}
                                                    onClick={() => openNotification(notification)}
                                                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-primary-50/50' : ''}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        {!notification.read && (
                                                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500"></span>
                                                        )}
                                                        <div className={!notification.read ? '' : 'ml-5'}>
                                                            <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                                {notification.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                                                            <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
