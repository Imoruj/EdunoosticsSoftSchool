import { Suspense } from "react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Award, BookOpen, FileText, TrendingUp } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncCurrentTerm } from "@/lib/currentTerm";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";
import { BirthdayWidgetAsync } from "@/components/dashboard/overview/BirthdayWidgetAsync";
import { ProprietorDashboardAsync } from "@/components/dashboard/overview/ProprietorDashboardAsync";
import { TeacherDashboardAsync } from "@/components/dashboard/overview/TeacherDashboardAsync";
import { ParentDashboardAsync } from "@/components/dashboard/overview/ParentDashboardAsync";
import { StudentInfo } from "@/components/dashboard/overview/StudentInfo";
import { StudentAssignmentsPanel } from "@/components/assignments/student/StudentAssignmentsPanel";
import { RecentActivityAsync } from "@/components/dashboard/overview/RecentActivityAsync";
import { GradesSummary } from "@/components/analytics/student/GradesSummary";
import { ProgressChart } from "@/components/analytics/student/ProgressChart";
import { RecentActivityList } from "@/components/analytics/student/RecentActivityList";

type DashboardSearchParams = {
    sessionId?: string | string[];
    termId?: string | string[];
    classArmId?: string | string[];
    section?: string | string[];
};

function SkeletonCard({ h = "h-32" }: { h?: string }) {
    return <div className={`animate-pulse bg-white border border-gray-100 shadow-sm rounded-xl w-full ${h}`} />;
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams?: DashboardSearchParams;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
    }

    const { loginType, roles = [], id: userId, schoolId, loginProfileId } = session.user as any;
    const isParent = loginType === "parent";
    const isStudent = loginType === "student";
    const isAdmin = loginType === "admin";
    const isProprietor = roles.includes(UserRole.PROPRIETOR);
    const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);
    const isSubjectTeacher = roles.includes(UserRole.SUBJECT_TEACHER);
    const isSuperOrSchoolAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);
    const isExecutiveViewer = isSuperOrSchoolAdmin || isProprietor;
    const greeting = isParent
        ? "Parent"
        : isStudent
            ? "Student"
            : isProprietor
                ? "Proprietor"
                : isSuperOrSchoolAdmin
                    ? "Admin"
                    : "Teacher";

    const dashboardUnavailableMessage =
        "Some live dashboard data is temporarily unavailable because the database connection could not be established. Please try again shortly.";

    let dashboardWarning: string | null = null;
    const markTransientDashboardFailure = (error: unknown, label: string) => {
        if (!isTransientPrismaError(error)) {
            throw error;
        }

        console.warn(`Dashboard data unavailable during ${label}.`, error);
        dashboardWarning ??= dashboardUnavailableMessage;
    };

    let displayName = session.user.name || "User";
    try {
        const dbUser = await withPrismaRetry("dashboard user lookup", () =>
            prisma.user.findUnique({
                where: { id: userId },
                select: { firstName: true, lastName: true },
            })
        );

        if (dbUser) {
            displayName = `${dbUser.firstName} ${dbUser.lastName}`;
        }
    } catch (error) {
        markTransientDashboardFailure(error, "user lookup");
    }

    let studentClassArmId: string | null = null;
    let studentAdmissionNumber: string | null = null;
    let studentClassLabel: string | null = null;
    if (isStudent) {
        try {
            const studentProfile = await withPrismaRetry("dashboard student profile lookup", () =>
                prisma.student.findUnique({
                    where: { userId },
                    select: {
                        classArmId: true,
                        admissionNumber: true,
                        classArm: {
                            select: {
                                armName: true,
                                class: { select: { name: true } },
                            },
                        },
                    },
                })
            );
            studentClassArmId = studentProfile?.classArmId ?? null;
            studentAdmissionNumber = studentProfile?.admissionNumber ?? null;
            studentClassLabel = studentProfile?.classArm
                ? `${studentProfile.classArm.class.name} ${studentProfile.classArm.armName}`
                : null;
        } catch (error) {
            markTransientDashboardFailure(error, "student profile lookup");
        }
    }

    if (schoolId) {
        try {
            await withPrismaRetry("dashboard current term sync", () => syncCurrentTerm(schoolId));
        } catch (error) {
            markTransientDashboardFailure(error, "current term sync");
        }
    }

    let currentTermName = "No active term";
    let currentSessionName = "No active session";
    if (schoolId) {
        try {
            const currentSession = await withPrismaRetry("dashboard current session lookup", () =>
                prisma.academicSession.findFirst({
                    where: { schoolId, isCurrent: true },
                    include: { terms: { where: { isCurrent: true } } },
                })
            );

            currentTermName = currentSession?.terms[0]?.name || "No active term";
            currentSessionName = currentSession?.name || "No active session";
        } catch (error) {
            currentTermName = "Temporarily unavailable";
            currentSessionName = "Temporarily unavailable";
            markTransientDashboardFailure(error, "current session lookup");
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {dashboardWarning && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                    {dashboardWarning}
                </div>
            )}

            <div className="card border-0 bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white shadow-lg shadow-primary-900/10">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <h2 className="mb-1 text-2xl font-bold">Welcome back, {displayName}</h2>
                        <p className="text-sm font-medium text-primary-100 opacity-90">
                            Here&apos;s what&apos;s happening in your {greeting.toLowerCase()} account today.
                        </p>
                    </div>
                    <div className="hidden items-center gap-3 md:flex">
                        <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-md">
                            <p className="text-xs font-bold uppercase tracking-wider text-primary-100">Current Term</p>
                            <p className="mt-0.5 text-sm font-bold text-white">
                                {currentSessionName} - {currentTermName}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {schoolId && !isStudent && !isParent && (
                <Suspense fallback={<SkeletonCard h="h-40" />}>
                    <BirthdayWidgetAsync schoolId={schoolId} />
                </Suspense>
            )}

            {isStudent && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-700">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-slate-500">Assigned learning</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">Assignments, quizzes, and lessons</p>
                            <p className="mt-2 text-sm text-slate-500">Use the sidebar to move between your classwork quickly.</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                                <Award className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-slate-500">Results</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">Published report cards</p>
                            <p className="mt-2 text-sm text-slate-500">View, print, and follow released academic records.</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="inline-flex rounded-2xl bg-orange-50 p-3 text-orange-700">
                                <FileText className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-slate-500">Class coverage</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">Scheme of work</p>
                            <p className="mt-2 text-sm text-slate-500">Check what your class should be covering this term.</p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="inline-flex rounded-2xl bg-purple-50 p-3 text-purple-700">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-slate-500">Performance</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">Track your progress</p>
                            <p className="mt-2 text-sm text-slate-500">See completed work, grades, and recent performance trends.</p>
                        </div>
                    </div>

                    <StudentInfo
                        session={session}
                        admissionNumber={studentAdmissionNumber}
                        classLabel={studentClassLabel}
                        currentSessionName={currentSessionName}
                        currentTermName={currentTermName}
                    />

                    <GradesSummary />

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <div className="space-y-6 xl:col-span-2">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                                        Student Workspace
                                    </p>
                                    <h3 className="mt-2 text-xl font-semibold text-slate-900">Focus on what needs attention</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Your active assignments and class performance are organised below.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href="/dashboard/assignments"
                                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Open Assignments
                                    </Link>
                                    <Link
                                        href="/dashboard/reports"
                                        className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
                                    >
                                        Open Reports
                                    </Link>
                                </div>
                            </div>

                            {loginProfileId && (
                                <StudentAssignmentsPanel
                                    studentProfileId={loginProfileId}
                                    studentUserId={userId}
                                    studentClassArmId={studentClassArmId}
                                    limit={5}
                                    showViewAll
                                    title="My Assignments"
                                    description="Upcoming and active tasks assigned to you."
                                />
                            )}

                            <ProgressChart />
                        </div>
                        <div className="space-y-6 xl:col-span-1">
                            <RecentActivityList />
                        </div>
                    </div>
                </div>
            )}

            {isParent && (
                <Suspense fallback={<SkeletonCard h="h-64" />}>
                    <ParentDashboardAsync userId={userId} />
                </Suspense>
            )}

            {(isAdmin || (!isParent && !isStudent)) && isExecutiveViewer && schoolId && (
                <Suspense fallback={<SkeletonCard h="h-[40rem]" />}>
                    <ProprietorDashboardAsync
                        schoolId={schoolId}
                        userId={userId}
                        searchParams={searchParams}
                    />
                </Suspense>
            )}

            {(isAdmin || (!isParent && !isStudent)) && !isExecutiveViewer && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        {(isClassTeacher || isSubjectTeacher) && (
                            <Suspense fallback={<SkeletonCard h="h-64" />}>
                                <TeacherDashboardAsync
                                    userId={userId}
                                    isClassTeacher={isClassTeacher}
                                    isSubjectTeacher={isSubjectTeacher}
                                    schoolId={schoolId}
                                />
                            </Suspense>
                        )}
                    </div>
                    <div className="space-y-6 border-l border-gray-100 xl:col-span-1 xl:pl-6">
                        <Suspense fallback={<SkeletonCard h="h-96" />}>
                            <RecentActivityAsync
                                schoolId={schoolId}
                                userId={userId}
                                isAdmin={false}
                                isTeacher={isClassTeacher || isSubjectTeacher}
                            />
                        </Suspense>
                    </div>
                </div>
            )}
        </div>
    );
}
