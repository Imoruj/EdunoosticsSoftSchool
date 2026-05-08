"use client";

import { useEffect, useState } from "react";
import AdminWelcomeBanner from "./_components/AdminWelcomeBanner";
import PlatformControls from "./_components/PlatformControls";
import PendingSchoolsList, { PendingSchool } from "./_components/PendingSchoolsList";
import AdminStatsOverview from "./_components/AdminStatsOverview";
import SchoolBreakdownTable from "./_components/SchoolBreakdownTable";
import RejectSchoolModal from "./_components/RejectSchoolModal";

interface RecentSchool {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    createdAt: string;
    isActive: boolean;
    _count: { students: number; users: number; classes: number; subjects: number };
}

interface SchoolBreakdown {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    _count: { students: number; users: number; classes: number; subjects: number; gradingRules: number };
}

interface Stats {
    totalSchools: number;
    activeSchools: number;
    totalStudents: number;
    totalUsers: number;
    totalClasses: number;
    totalSubjects: number;
    totalScores: number;
    recentSchools: RecentSchool[];
    schoolBreakdown: SchoolBreakdown[];
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    // Platform settings
    const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
    const [darkModeEnabled, setDarkModeEnabled] = useState<boolean | null>(null);
    const [togglingSignup, setTogglingSignup] = useState(false);
    const [togglingDarkMode, setTogglingDarkMode] = useState(false);

    // Pending schools
    const [pendingSchools, setPendingSchools] = useState<PendingSchool[]>([]);
    const [actioning, setActioning] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<{ schoolId: string; schoolName: string } | null>(null);

    useEffect(() => {
        fetch("/api/admin/stats")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { setStats(d); setLoading(false); })
            .catch(() => setLoading(false));

        fetch("/api/admin/platform-settings")
            .then((r) => r.ok ? r.json() : null)
            .then((d) => {
                if (!d) return;
                setSignupEnabled(d.signupEnabled);
                setDarkModeEnabled(d.darkModeEnabled);
            })
            .catch(() => {});

        fetch("/api/admin/schools")
            .then((r) => r.ok ? r.json() : [])
            .then((d: PendingSchool[]) => setPendingSchools(d.filter((s) => s.registrationStatus === "PENDING")))
            .catch(() => {});
    }, []);

    const toggleSignup = async () => {
        if (signupEnabled === null) return;
        setTogglingSignup(true);
        try {
            const res = await fetch("/api/admin/platform-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signupEnabled: !signupEnabled }),
            });
            if (res.ok) {
                const d = await res.json();
                setSignupEnabled(d.signupEnabled);
            }
        } finally {
            setTogglingSignup(false);
        }
    };

    const toggleDarkMode = async () => {
        if (darkModeEnabled === null) return;
        setTogglingDarkMode(true);
        try {
            const res = await fetch("/api/admin/platform-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ darkModeEnabled: !darkModeEnabled }),
            });
            if (res.ok) {
                const d = await res.json();
                setDarkModeEnabled(d.darkModeEnabled);
                window.dispatchEvent(new Event("school-features-updated"));
            }
        } finally {
            setTogglingDarkMode(false);
        }
    };

    const approveSchool = async (schoolId: string) => {
        setActioning(schoolId);
        try {
            const res = await fetch("/api/admin/schools", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId, action: "approve" }),
            });
            if (res.ok) {
                setPendingSchools((prev) => prev.filter((s) => s.id !== schoolId));
                setStats((prev) => prev ? { ...prev, activeSchools: prev.activeSchools + 1 } : prev);
            }
        } finally {
            setActioning(null);
        }
    };

    const openRejectModal = (school: PendingSchool) => {
        setRejectModal({ schoolId: school.id, schoolName: school.name });
    };

    const confirmReject = async (rejectionReason: string) => {
        if (!rejectModal) return;
        setActioning(rejectModal.schoolId);
        try {
            const res = await fetch("/api/admin/schools", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schoolId: rejectModal.schoolId, action: "reject", rejectionReason }),
            });
            if (res.ok) {
                setPendingSchools((prev) => prev.filter((s) => s.id !== rejectModal.schoolId));
            }
        } finally {
            setActioning(null);
            setRejectModal(null);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl">
            <AdminWelcomeBanner />

            <PlatformControls 
                signupEnabled={signupEnabled}
                darkModeEnabled={darkModeEnabled}
                togglingSignup={togglingSignup}
                togglingDarkMode={togglingDarkMode}
                toggleSignup={toggleSignup}
                toggleDarkMode={toggleDarkMode}
                pendingSchoolsCount={pendingSchools.length}
            />

            <PendingSchoolsList 
                pendingSchools={pendingSchools}
                actioning={actioning}
                approveSchool={approveSchool}
                openRejectModal={openRejectModal}
            />

            <AdminStatsOverview stats={stats} loading={loading} />

            <SchoolBreakdownTable stats={stats} loading={loading} />

            {rejectModal && (
                <RejectSchoolModal 
                    schoolName={rejectModal.schoolName}
                    isBusy={actioning === rejectModal.schoolId}
                    onConfirm={confirmReject}
                    onClose={() => setRejectModal(null)}
                />
            )}
        </div>
    );
}
