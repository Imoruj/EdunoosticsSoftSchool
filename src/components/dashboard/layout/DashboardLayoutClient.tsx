"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/layout/Sidebar";
import { Header } from "@/components/dashboard/layout/Header";
import { navigation, isGroup } from "@/components/dashboard/layout/navigation";

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const topBarRef = useRef<HTMLElement>(null);

    const loginType = (session?.user as any)?.loginType;

    // Helper: find page title from grouped navigation
    const findPageTitle = useCallback((): string => {
        if (pathname === "/dashboard") {
            return loginType === "parent" ? "My Wards" : "Dashboard";
        }
        for (const entry of navigation) {
            if (isGroup(entry)) {
                const found = entry.items.find(item => pathname.startsWith(item.href));
                if (found) return found.name;
            } else {
                if (pathname.startsWith(entry.href) && entry.href !== "/dashboard") return entry.name;
            }
        }
        return "Dashboard";
    }, [pathname, loginType]);

    useEffect(() => {
        const updateTopBarHeight = () => {
            const height = topBarRef.current?.offsetHeight || 64;
            document.documentElement.style.setProperty("--dashboard-topbar-height", `${height}px`);
        };

        updateTopBarHeight();
        const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateTopBarHeight) : null;
        if (resizeObserver && topBarRef.current) {
            resizeObserver.observe(topBarRef.current);
        }
        window.addEventListener("resize", updateTopBarHeight);

        return () => {
            window.removeEventListener("resize", updateTopBarHeight);
            resizeObserver?.disconnect();
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="lg:pl-64">
                <Header
                    setSidebarOpen={setSidebarOpen}
                    findPageTitle={findPageTitle}
                    topBarRef={topBarRef}
                />
                <main className="p-4 lg:p-8 pt-20 lg:pt-24">{children}</main>
            </div>
        </div>
    );
}
