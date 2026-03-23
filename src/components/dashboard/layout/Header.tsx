"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

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
    topBarRef: React.RefObject<HTMLElement>;
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

        try {
            const response = await fetch("/api/notifications?limit=8", { cache: "no-store" });
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
        }
    }, [session, publishPendingUploadCount]);

    const fetchTermInfo = useCallback(async () => {
        try {
            const res = await fetch("/api/sessions/current");
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
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 60000);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    useEffect(() => {
        if (!session?.user || typeof window === "undefined") return;

        const stream = new EventSource("/api/notifications/stream");
        const handleNotification = () => {
            fetchNotifications({ announceNew: true });
        };

        stream.addEventListener("notification", handleNotification);
        stream.onerror = () => {
            // Keep the existing poll fallback if the realtime stream disconnects.
        };

        return () => {
            stream.removeEventListener("notification", handleNotification);
            stream.close();
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
            className="fixed top-0 left-0 right-0 lg:left-64 z-30 bg-white border-b border-gray-200"
        >
            <div className="flex items-center justify-between px-4 py-3 lg:px-8">
                <div className="flex items-center gap-4">
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
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {findPageTitle()}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>
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

                <div className="flex items-center gap-4">
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
                                                            <span className="mt-1.5 w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></span>
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
