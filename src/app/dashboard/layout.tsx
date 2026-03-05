import React from "react";
import DashboardLayoutClient from "@/components/dashboard/layout/DashboardLayoutClient";

export const metadata = {
    title: "Dashboard - Report Card CMS",
    description: "School management dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
