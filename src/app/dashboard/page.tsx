import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { syncCurrentTerm } from "@/lib/currentTerm";

// Async Server Components
import { BirthdayWidgetAsync } from "@/components/dashboard/overview/BirthdayWidgetAsync";
import { AdminDashboardAsync } from "@/components/dashboard/overview/AdminDashboardAsync";
import { TeacherDashboardAsync } from "@/components/dashboard/overview/TeacherDashboardAsync";
import { ParentDashboardAsync } from "@/components/dashboard/overview/ParentDashboardAsync";
import { StudentInfo } from "@/components/dashboard/overview/StudentInfo";
import { RecentActivityAsync } from "@/components/dashboard/overview/RecentActivityAsync";

function SkeletonCard({ h = "h-32" }: { h?: string }) {
    return <div className={`animate-pulse bg-white border border-gray-100 shadow-sm rounded-xl w-full ${h}`} />;
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
    }

    const { loginType, roles = [], id: userId, schoolId } = session.user as any;

    const isParent = loginType === "parent";
    const isStudent = loginType === "student";
    const isAdmin = loginType === "admin";

    const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);
    const isSubjectTeacher = roles.includes(UserRole.SUBJECT_TEACHER);
    const isSuperOrSchoolAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

    const greeting = isParent ? "Parent" : isStudent ? "Student" : isSuperOrSchoolAdmin ? "Admin" : "Teacher";

    // ── Fetch dynamic user data (fast) ──
    const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true }
    });
    const displayName = dbUser ? `${dbUser.firstName} ${dbUser.lastName}` : session.user.name;

    // ── Auto-sync current term (fast) ──
    if (schoolId) await syncCurrentTerm(schoolId);

    // ── Fetch current term/session for display ──
    const currentSession = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
        include: { terms: { where: { isCurrent: true } } }
    });
    const currentTermName = currentSession?.terms[0]?.name || "No active term";
    const currentSessionName = currentSession?.name || "No active session";

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Welcome Banner */}
            <div className="card p-6 bg-gradient-to-r from-primary-600 to-primary-800 text-white border-0 shadow-lg shadow-primary-900/10">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Welcome back, {displayName} 👋</h2>
                        <p className="text-primary-100 text-sm font-medium opacity-90">
                            Here&apos;s what&apos;s happening in your {greeting.toLowerCase()} account today.
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                            <p className="text-xs font-bold text-primary-100 uppercase tracking-wider">Current Term</p>
                            <p className="text-sm font-bold text-white mt-0.5">{currentSessionName} • {currentTermName}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Birthdays Component (Global check) */}
            {schoolId && (
                <Suspense fallback={<SkeletonCard h="h-40" />}>
                    <BirthdayWidgetAsync schoolId={schoolId} />
                </Suspense>
            )}

            {/* Render Context-Aware Views */}
            {isStudent && <StudentInfo session={session} />}

            {isParent && (
                <Suspense fallback={<SkeletonCard h="h-64" />}>
                    <ParentDashboardAsync userId={userId} />
                </Suspense>
            )}

            {(isAdmin || (!isParent && !isStudent)) && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                        {isSuperOrSchoolAdmin && (
                            <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 gap-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}>
                                <AdminDashboardAsync schoolId={schoolId} isSuperOrSchoolAdmin={isSuperOrSchoolAdmin} />
                            </Suspense>
                        )}
                        {(isClassTeacher || isSubjectTeacher) && (
                            <Suspense fallback={<SkeletonCard h="h-64" />}>
                                <TeacherDashboardAsync userId={userId} isClassTeacher={isClassTeacher} isSubjectTeacher={isSubjectTeacher} schoolId={schoolId} />
                            </Suspense>
                        )}
                    </div>
                    <div className="xl:col-span-1 border-l border-gray-100 xl:pl-6 space-y-6">
                        <Suspense fallback={<SkeletonCard h="h-96" />}>
                            <RecentActivityAsync schoolId={schoolId} userId={userId} isAdmin={isSuperOrSchoolAdmin} isTeacher={isClassTeacher || isSubjectTeacher} />
                        </Suspense>
                    </div>
                </div>
            )}
        </div>
    );
}
