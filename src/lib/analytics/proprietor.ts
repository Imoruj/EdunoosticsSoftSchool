import {
    AttendanceStatus,
    ClassReportWorkflowStatus,
    MessageChannel,
    MessageStatus,
    ScoreUploadStatus,
    ScoreWorkflowStatus,
    SowStatus,
    StudentChangeRequestStatus,
    StudentReportWorkflowStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculatePercentage } from "@/lib/utils";
import { withPrismaRetry } from "@/lib/prisma-transient";

type SearchParamValue = string | string[] | undefined | null;

type FilterOption = {
    id: string;
    label: string;
};

type RankedMetric = {
    id: string;
    label: string;
    value: number;
    meta?: string;
    secondaryValue?: number;
};

type TrendPoint = {
    key: string;
    label: string;
    value: number;
    total: number;
};

type StatusCount = {
    status: string;
    label: string;
    count: number;
};

export type ProprietorInsightsSection =
    | "overview"
    | "enrollment"
    | "academics"
    | "attendance"
    | "finance"
    | "operations"
    | "communication";

export type ProprietorAnalyticsFilters = {
    sessionId?: SearchParamValue;
    termId?: SearchParamValue;
    classArmId?: SearchParamValue;
    section?: SearchParamValue;
};

export type ResolvedProprietorFilters = {
    sessions: FilterOption[];
    terms: FilterOption[];
    classArms: FilterOption[];
    selectedSessionId: string | null;
    selectedTermId: string | null;
    selectedClassArmId: string | null;
    selectedSessionLabel: string | null;
    selectedTermLabel: string | null;
    selectedClassArmLabel: string | null;
};

export type PriorityAlert = {
    id: string;
    title: string;
    description: string;
    severity: "high" | "medium" | "low";
    section: ProprietorInsightsSection;
};

export type ProprietorExecutiveMetrics = {
    activeStudents: number;
    activeTeachers: number;
    attendanceRate: number | null;
    reportPublicationRate: number | null;
    feeCollectionRate: number | null;
    openActionItems: number;
};

export type EnrollmentAnalytics = {
    activeStudents: number;
    inactiveStudents: number;
    newAdmissions: number;
    genderDistribution: Array<{ label: string; count: number }>;
    occupancy: Array<RankedMetric & { capacity: number; occupancyRate: number }>;
    largestClasses: RankedMetric[];
    smallestClasses: RankedMetric[];
};

export type AcademicAnalytics = {
    scoreWorkflowCompletionRate: number | null;
    publishedReports: number;
    totalReports: number;
    publishedReportRate: number | null;
    classPerformance: RankedMetric[];
    subjectPerformance: RankedMetric[];
    strongestClasses: RankedMetric[];
    weakestClasses: RankedMetric[];
    strongestSubjects: RankedMetric[];
    weakestSubjects: RankedMetric[];
};

export type AttendanceAnalytics = {
    snapshotLabel: string;
    attendanceRate: number | null;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    trend: TrendPoint[];
    termAverageRate: number | null;
    bestClasses: RankedMetric[];
    worstClasses: RankedMetric[];
    classesMissingAttendance: string[];
    chronicAbsentees: Array<{
        id: string;
        name: string;
        classLabel: string;
        attendanceRate: number;
    }>;
};

export type FinanceAnalytics = {
    billedAmount: number;
    collectedAmount: number;
    outstandingAmount: number;
    collectionRate: number | null;
    paymentMethods: Array<{
        label: string;
        amount: number;
        count: number;
    }>;
    bestCollections: RankedMetric[];
    weakestCollections: RankedMetric[];
};

export type OperationsAnalytics = {
    scoreUploadRequests: StatusCount[];
    scoreWorkflows: StatusCount[];
    classReportWorkflows: StatusCount[];
    studentReportWorkflows: StatusCount[];
    schemeOfWorkTerms: StatusCount[];
    studentChangeRequests: StatusCount[];
    pendingUploadRequests: number;
    rejectedUploadRequests: number;
    classTeacherGapCount: number;
    subjectTeacherGapCount: number;
    classTeacherGaps: string[];
    subjectTeacherGaps: string[];
};

export type CommunicationAnalytics = {
    totalMessages: number;
    sentMessages: number;
    failedMessages: number;
    pendingMessages: number;
    successRate: number | null;
    channels: Array<{
        channel: string;
        total: number;
        sent: number;
        failed: number;
        pending: number;
    }>;
};

export type ProprietorAnalyticsResult = {
    filters: ResolvedProprietorFilters;
    section: ProprietorInsightsSection;
    summary: ProprietorExecutiveMetrics;
    enrollment: EnrollmentAnalytics;
    academics: AcademicAnalytics;
    attendance: AttendanceAnalytics;
    finance: FinanceAnalytics;
    operations: OperationsAnalytics;
    communication: CommunicationAnalytics;
    priorityAlerts: PriorityAlert[];
};

function getStringParam(value: SearchParamValue): string | null {
    if (Array.isArray(value)) {
        return typeof value[0] === "string" && value[0].trim() ? value[0].trim() : null;
    }

    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown): number {
    if (typeof value === "number") return value;
    if (value === null || value === undefined) return 0;

    const converted = Number(value);
    return Number.isFinite(converted) ? converted : 0;
}

function roundOneDecimal(value: number): number {
    return Math.round(value * 10) / 10;
}

function humanizeEnum(value: string): string {
    return value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function normalizeLabel(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function buildSubjectClassKey(subjectId: string, classArmId: string): string {
    return `${subjectId}:${classArmId}`;
}

function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
}

function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function formatCompactDate(date: Date): string {
    return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
    });
}

function countByStatus<T extends string>(
    statuses: T[],
    preferredOrder?: readonly T[]
): StatusCount[] {
    const counts = new Map<string, number>();
    statuses.forEach((status) => {
        counts.set(status, (counts.get(status) || 0) + 1);
    });

    const order = preferredOrder?.length
        ? preferredOrder
        : (Array.from(counts.keys()) as T[]);

    return order
        .filter((status) => counts.has(status))
        .map((status) => ({
            status,
            label: humanizeEnum(status),
            count: counts.get(status) || 0,
        }));
}

function getStatusCount(rows: StatusCount[], status: string): number {
    return rows.find((row) => row.status === status)?.count || 0;
}

function normalizeSection(section: SearchParamValue): ProprietorInsightsSection {
    const value = getStringParam(section);

    switch (value) {
        case "enrollment":
        case "academics":
        case "attendance":
        case "finance":
        case "operations":
        case "communication":
            return value;
        default:
            return "overview";
    }
}

export function buildProprietorQueryString(
    filters: Pick<
        ResolvedProprietorFilters,
        "selectedSessionId" | "selectedTermId" | "selectedClassArmId"
    >,
    section?: ProprietorInsightsSection
): string {
    const params = new URLSearchParams();

    if (filters.selectedSessionId) {
        params.set("sessionId", filters.selectedSessionId);
    }
    if (filters.selectedTermId) {
        params.set("termId", filters.selectedTermId);
    }
    if (filters.selectedClassArmId) {
        params.set("classArmId", filters.selectedClassArmId);
    }
    if (section) {
        params.set("section", section);
    }

    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
}

async function resolveProprietorFilters(
    schoolId: string,
    rawFilters: ProprietorAnalyticsFilters
): Promise<{
    filters: ResolvedProprietorFilters;
    selectedSession: {
        id: string;
        name: string;
        startDate: Date;
        endDate: Date;
    } | null;
    selectedTerm: {
        id: string;
        name: string;
        startDate: Date;
        endDate: Date;
        totalSchoolDays: number | null;
    } | null;
    selectedClassArmId: string | null;
}> {
    return withPrismaRetry("resolve proprietor filters", async () => {
        const [sessions, classArms] = await prisma.$transaction([
            prisma.academicSession.findMany({
                where: { schoolId },
                orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
                include: {
                    terms: {
                        orderBy: [{ isCurrent: "desc" }, { termNumber: "asc" }],
                    },
                },
            }),
            prisma.classArm.findMany({
                where: { class: { schoolId } },
                select: {
                    id: true,
                    armName: true,
                    class: {
                        select: {
                            name: true,
                        },
                    },
                },
                orderBy: [{ armName: "asc" }],
            }),
        ]);

        const requestedSessionId = getStringParam(rawFilters.sessionId);
        const requestedTermId = getStringParam(rawFilters.termId);
        const requestedClassArmId = getStringParam(rawFilters.classArmId);

        const fallbackSession = sessions.find((session) => session.isCurrent) || sessions[0] || null;
        const selectedSession = sessions.find((session) => session.id === requestedSessionId) || fallbackSession;
        const selectedTerms = selectedSession?.terms || [];
        const fallbackTerm = selectedTerms.find((term) => term.isCurrent) || selectedTerms[0] || null;
        const selectedTerm = selectedTerms.find((term) => term.id === requestedTermId) || fallbackTerm;
        const selectedClassArm = classArms.find((classArm) => classArm.id === requestedClassArmId) || null;

        return {
            filters: {
                sessions: sessions.map((session) => ({
                    id: session.id,
                    label: session.name,
                })),
                terms: selectedTerms.map((term) => ({
                    id: term.id,
                    label: term.name,
                })),
                classArms: classArms.map((classArm) => ({
                    id: classArm.id,
                    label: `${classArm.class.name} ${classArm.armName}`,
                })),
                selectedSessionId: selectedSession?.id || null,
                selectedTermId: selectedTerm?.id || null,
                selectedClassArmId: selectedClassArm?.id || null,
                selectedSessionLabel: selectedSession?.name || null,
                selectedTermLabel: selectedTerm?.name || null,
                selectedClassArmLabel: selectedClassArm
                    ? `${selectedClassArm.class.name} ${selectedClassArm.armName}`
                    : null,
            },
            selectedSession: selectedSession
                ? {
                    id: selectedSession.id,
                    name: selectedSession.name,
                    startDate: selectedSession.startDate,
                    endDate: selectedSession.endDate,
                }
                : null,
            selectedTerm: selectedTerm
                ? {
                    id: selectedTerm.id,
                    name: selectedTerm.name,
                    startDate: selectedTerm.startDate,
                    endDate: selectedTerm.endDate,
                    totalSchoolDays: selectedTerm.totalSchoolDays ?? null,
                }
                : null,
            selectedClassArmId: selectedClassArm?.id || null,
        };
    });
}

function getMostRecentSchoolDay(
    startDate: Date,
    endDate: Date,
    holidayKeys: Set<string>
): Date {
    let cursor = startOfDay(endDate);
    const minimum = startOfDay(startDate);

    while (cursor >= minimum) {
        const key = formatDateKey(cursor);
        if (!isWeekend(cursor) && !holidayKeys.has(key)) {
            return cursor;
        }
        cursor = addDays(cursor, -1);
    }

    return minimum;
}

function getRecentSchoolDays(
    startDate: Date,
    endDate: Date,
    holidayKeys: Set<string>,
    limit = 30
): Date[] {
    const days: Date[] = [];
    let cursor = startOfDay(endDate);
    const minimum = startOfDay(startDate);

    while (cursor >= minimum && days.length < limit) {
        const key = formatDateKey(cursor);
        if (!isWeekend(cursor) && !holidayKeys.has(key)) {
            days.push(cursor);
        }
        cursor = addDays(cursor, -1);
    }

    return days.reverse();
}

function buildAverageRanking(
    aggregates: Map<string, { total: number; count: number }>,
    labelMap: Map<string, string>
): RankedMetric[] {
    return Array.from(aggregates.entries())
        .map(([id, aggregate]) => ({
            id,
            label: labelMap.get(id) || "Unknown",
            value: aggregate.count > 0 ? roundOneDecimal(aggregate.total / aggregate.count) : 0,
            meta: `${aggregate.count} scored entries`,
        }))
        .sort((left, right) => right.value - left.value);
}

export async function getProprietorAnalytics(
    filters: ProprietorAnalyticsFilters,
    schoolId: string
): Promise<ProprietorAnalyticsResult> {
    const resolved = await resolveProprietorFilters(schoolId, filters);
    const section = normalizeSection(filters.section);
    const { selectedSession, selectedTerm, selectedClassArmId } = resolved;

    return withPrismaRetry("proprietor analytics", async () => {
        const classArmWhere = selectedClassArmId ? { id: selectedClassArmId } : undefined;
        const schoolStudentFilter = {
            schoolId,
            ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
        };
        const selectedAttendanceEndDate = selectedTerm
            ? (selectedTerm.endDate < new Date() ? selectedTerm.endDate : new Date())
            : new Date();

        const [
            activeStudents,
            inactiveStudents,
            activeTeachers,
            genderCounts,
            classArms,
            subjects,
            compositeConfigs,
            studentChangeRequestRows,
            messageRows,
        ] = await prisma.$transaction([
            prisma.student.count({
                where: {
                    ...schoolStudentFilter,
                    isActive: true,
                },
            }),
            prisma.student.count({
                where: {
                    ...schoolStudentFilter,
                    isActive: false,
                },
            }),
            prisma.user.count({
                where: {
                    schoolId,
                    isActive: true,
                    roles: {
                        hasSome: ["CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_ADMIN", "PROPRIETOR"],
                    },
                },
            }),
            prisma.student.groupBy({
                by: ["gender"],
                where: {
                    ...schoolStudentFilter,
                    isActive: true,
                },
                _count: { gender: true },
                orderBy: { gender: "asc" },
            }),
            prisma.classArm.findMany({
                where: {
                    class: { schoolId },
                    ...(classArmWhere || {}),
                },
                select: {
                    id: true,
                    armName: true,
                    capacity: true,
                    classTeacherId: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            students: {
                                where: { isActive: true },
                            },
                        },
                    },
                    subjectClassArms: {
                        select: { subjectId: true },
                    },
                    teacherSubjects: {
                        select: {
                            subjectId: true,
                            classArmId: true,
                        },
                    },
                },
            }),
            prisma.subject.findMany({
                where: { schoolId },
                select: {
                    id: true,
                    name: true,
                    subjectKind: true,
                },
                orderBy: { name: "asc" },
            }),
            prisma.compositeSubjectConfig.findMany({
                where: {
                    schoolId,
                    isActive: true,
                    ...(selectedSession?.id ? { sessionId: selectedSession.id } : { id: "__none__" }),
                },
                select: {
                    classId: true,
                    parentSubjectId: true,
                    parentSubject: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    components: {
                        select: {
                            componentSubjectId: true,
                            componentSubject: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.studentChangeRequest.findMany({
                where: { schoolId },
                select: { status: true },
            }),
            prisma.message.findMany({
                where: {
                    schoolId,
                    createdAt: {
                        gte: addDays(new Date(), -30),
                    },
                },
                select: {
                    channel: true,
                    status: true,
                },
            }),
        ]);

        let reportCardTotal = 0;
        let reportCardPublished = 0;
        let scoreRows: Array<{
            total: unknown;
            subjectId: string;
            student: { classArmId: string | null };
        }> = [];
        let scoreWorkflowRows: Array<{ status: ScoreWorkflowStatus }> = [];
        let classReportWorkflowRows: Array<{ status: ClassReportWorkflowStatus }> = [];
        let studentReportWorkflowRows: Array<{ status: StudentReportWorkflowStatus }> = [];
        let scoreUploadRequestRows: Array<{ status: ScoreUploadStatus }> = [];
        let schemeOfWorkTermRows: Array<{ status: SowStatus }> = [];
        let subjectEnrollmentRows: Array<{
            subjectId: string;
            classArmId: string;
            isActive: boolean;
        }> = [];
        let feeStructureRows: Array<{ amount: unknown; classId: string }> = [];
        let feePaymentRows: Array<{
            amount: unknown;
            paymentMethod: string | null;
            student: { classArmId: string | null };
        }> = [];
        let attendanceRows: Array<{
            date: Date;
            status: AttendanceStatus;
            studentId: string;
            classArmId: string;
            student: {
                firstName: string;
                lastName: string;
                classArmId: string | null;
            };
        }> = [];
        let publicHolidays: Array<{ date: Date }> = [];

        if (selectedTerm) {
            const [
                termReportCardTotal,
                termReportCardPublished,
                termScoreRows,
                termScoreWorkflowRows,
                termClassReportWorkflowRows,
                termStudentReportWorkflowRows,
                termScoreUploadRequestRows,
                termSchemeOfWorkTermRows,
                termSubjectEnrollmentRows,
                termFeeStructureRows,
                termFeePaymentRows,
                termAttendanceRows,
                termPublicHolidays,
            ] = await prisma.$transaction([
                prisma.reportCard.count({
                    where: {
                        termId: selectedTerm.id,
                        student: {
                            schoolId,
                            ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                        },
                    },
                }),
                prisma.reportCard.count({
                    where: {
                        termId: selectedTerm.id,
                        isPublished: true,
                        student: {
                            schoolId,
                            ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                        },
                    },
                }),
                prisma.score.findMany({
                    where: {
                        termId: selectedTerm.id,
                        student: {
                            schoolId,
                            ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                        },
                    },
                    select: {
                        total: true,
                        subjectId: true,
                        student: {
                            select: {
                                classArmId: true,
                            },
                        },
                    },
                }),
                prisma.scoreSheetWorkflow.findMany({
                    where: {
                        schoolId,
                        termId: selectedTerm.id,
                        ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                    },
                    select: { status: true },
                }),
                prisma.classReportWorkflow.findMany({
                    where: {
                        schoolId,
                        termId: selectedTerm.id,
                        ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                    },
                    select: { status: true },
                }),
                prisma.studentReportWorkflow.findMany({
                    where: {
                        schoolId,
                        termId: selectedTerm.id,
                        ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                    },
                    select: { status: true },
                }),
                prisma.scoreUploadRequest.findMany({
                    where: {
                        schoolId,
                        termId: selectedTerm.id,
                        ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                    },
                    select: { status: true },
                }),
                prisma.schemeOfWorkTerm.findMany({
                    where: {
                        termId: selectedTerm.id,
                        schemeOfWork: {
                            schoolId,
                            ...(selectedClassArmId
                                ? { classArms: { some: { classArmId: selectedClassArmId } } }
                                : {}),
                        },
                    },
                    select: { status: true },
                }),
                prisma.subjectEnrollment.findMany({
                    where: {
                        termId: selectedTerm.id,
                        classArm: {
                            class: { schoolId },
                            ...(selectedClassArmId ? { id: selectedClassArmId } : {}),
                        },
                        student: {
                            schoolId,
                            isActive: true,
                        },
                    },
                    select: {
                        subjectId: true,
                        classArmId: true,
                        isActive: true,
                    },
                }),
                prisma.feeStructure.findMany({
                    where: {
                        schoolId,
                        termId: selectedTerm.id,
                        ...(selectedClassArmId ? { class: { arms: { some: { id: selectedClassArmId } } } } : {}),
                    },
                    select: {
                        amount: true,
                        classId: true,
                    },
                }),
                prisma.feePayment.findMany({
                    where: {
                        termId: selectedTerm.id,
                        student: {
                            schoolId,
                            ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                        },
                    },
                    select: {
                        amount: true,
                        paymentMethod: true,
                        student: {
                            select: {
                                classArmId: true,
                            },
                        },
                    },
                }),
                prisma.attendance.findMany({
                    where: {
                        classArm: {
                            class: { schoolId },
                            ...(selectedClassArmId ? { id: selectedClassArmId } : {}),
                        },
                        date: {
                            gte: startOfDay(selectedTerm.startDate),
                            lte: selectedAttendanceEndDate,
                        },
                    },
                    select: {
                        date: true,
                        status: true,
                        studentId: true,
                        classArmId: true,
                        student: {
                            select: {
                                firstName: true,
                                lastName: true,
                                classArmId: true,
                            },
                        },
                    },
                }),
                prisma.publicHoliday.findMany({
                    where: {
                        schoolId,
                        date: {
                            gte: startOfDay(selectedTerm.startDate),
                            lte: selectedAttendanceEndDate,
                        },
                    },
                    select: {
                        date: true,
                    },
                }),
            ]);

            reportCardTotal = termReportCardTotal;
            reportCardPublished = termReportCardPublished;
            scoreRows = termScoreRows;
            scoreWorkflowRows = termScoreWorkflowRows;
            classReportWorkflowRows = termClassReportWorkflowRows;
            studentReportWorkflowRows = termStudentReportWorkflowRows;
            scoreUploadRequestRows = termScoreUploadRequestRows;
            schemeOfWorkTermRows = termSchemeOfWorkTermRows;
            subjectEnrollmentRows = termSubjectEnrollmentRows;
            feeStructureRows = termFeeStructureRows;
            feePaymentRows = termFeePaymentRows;
            attendanceRows = termAttendanceRows;
            publicHolidays = termPublicHolidays;
        }

        const classArmLabelMap = new Map<string, string>();
        const classIdByArmId = new Map<string, string>();
        classArms.forEach((classArm) => {
            classIdByArmId.set(classArm.id, classArm.class.id);
            classArmLabelMap.set(classArm.id, normalizeLabel(`${classArm.class.name} ${classArm.armName}`));
        });
        const subjectMetaMap = new Map(subjects.map((subject) => [
            subject.id,
            {
                label: normalizeLabel(subject.name),
                subjectKind: subject.subjectKind,
            },
        ]));
        const subjectLabelMap = new Map(
            Array.from(subjectMetaMap.entries()).map(([subjectId, meta]) => [subjectId, meta.label])
        );

        const compositeComponentByClassSubjectKey = new Map<string, { parentSubjectId: string; parentLabel: string }>();
        const compositeParentComponentIdsByClassKey = new Map<string, Set<string>>();
        const compositeComponentLabelsByClassId = new Map<string, Set<string>>();
        compositeConfigs.forEach((config) => {
            const parentLabel = normalizeLabel(config.parentSubject.name);
            const parentKey = `${config.classId}:${config.parentSubjectId}`;
            const componentIds = new Set<string>();
            const componentLabels = compositeComponentLabelsByClassId.get(config.classId) || new Set<string>();

            config.components.forEach((component) => {
                const componentKey = `${config.classId}:${component.componentSubjectId}`;
                const componentLabel = normalizeLabel(component.componentSubject?.name || "Component Subject");

                compositeComponentByClassSubjectKey.set(componentKey, {
                    parentSubjectId: config.parentSubjectId,
                    parentLabel,
                });
                componentIds.add(component.componentSubjectId);
                componentLabels.add(componentLabel.toLowerCase());
            });

            compositeParentComponentIdsByClassKey.set(parentKey, componentIds);
            compositeComponentLabelsByClassId.set(config.classId, componentLabels);
        });

        const genderDistribution = [
            { label: "Male", count: 0 },
            { label: "Female", count: 0 },
        ];
        genderCounts.forEach((row) => {
            const count = row._count && typeof row._count === "object" && "gender" in row._count
                ? row._count.gender ?? 0
                : 0;

            if (row.gender === "MALE") genderDistribution[0].count = count;
            if (row.gender === "FEMALE") genderDistribution[1].count = count;
        });

        const newAdmissions = selectedSession
            ? await withPrismaRetry("proprietor new admissions", () =>
                prisma.student.count({
                    where: {
                        schoolId,
                        ...(selectedClassArmId ? { classArmId: selectedClassArmId } : {}),
                        admissionDate: {
                            gte: selectedSession.startDate,
                            lte: selectedSession.endDate,
                        },
                    },
                })
            )
            : 0;

        const occupancy = classArms
            .map((classArm) => {
                const students = classArm._count.students;
                const capacity = classArm.capacity;
                const occupancyRate = capacity > 0 ? roundOneDecimal((students / capacity) * 100) : 0;

                return {
                    id: classArm.id,
                    label: classArmLabelMap.get(classArm.id) || classArm.id,
                    value: students,
                    secondaryValue: capacity,
                    meta: `${students} / ${capacity} students`,
                    capacity,
                    occupancyRate,
                };
            })
            .sort((left, right) => right.occupancyRate - left.occupancyRate);

        const largestClasses = [...occupancy]
            .sort((left, right) => right.value - left.value)
            .slice(0, 5)
            .map(({ capacity, occupancyRate, ...item }) => item);
        const smallestClasses = [...occupancy]
            .sort((left, right) => left.value - right.value)
            .slice(0, 5)
            .map(({ capacity, occupancyRate, ...item }) => item);

        const classScoreAggregates = new Map<string, { total: number; count: number }>();
        const subjectScoreAggregates = new Map<string, { total: number; count: number }>();
        scoreRows.forEach((row) => {
            const total = toNumber(row.total);
            const classArmId = row.student.classArmId || "";
            if (classArmId) {
                const classAggregate = classScoreAggregates.get(classArmId) || { total: 0, count: 0 };
                classAggregate.total += total;
                classAggregate.count += 1;
                classScoreAggregates.set(classArmId, classAggregate);
            }

            const subjectAggregate = subjectScoreAggregates.get(row.subjectId) || { total: 0, count: 0 };
            subjectAggregate.total += total;
            subjectAggregate.count += 1;
            subjectScoreAggregates.set(row.subjectId, subjectAggregate);
        });

        const classPerformance = buildAverageRanking(classScoreAggregates, classArmLabelMap);
        const subjectPerformance = buildAverageRanking(subjectScoreAggregates, subjectLabelMap);

        const scoreWorkflowCounts = countByStatus(
            scoreWorkflowRows.map((row) => row.status),
            [
                ScoreWorkflowStatus.PENDING_REVIEW,
                ScoreWorkflowStatus.APPROVED,
                ScoreWorkflowStatus.REJECTED,
                ScoreWorkflowStatus.BROADCASTED,
            ]
        );
        const classReportWorkflowCounts = countByStatus(
            classReportWorkflowRows.map((row) => row.status),
            [
                ClassReportWorkflowStatus.WAITING_SUBJECT_BROADCAST,
                ClassReportWorkflowStatus.RESULT_BROADCASTED,
                ClassReportWorkflowStatus.COMMENTS_GENERATED,
                ClassReportWorkflowStatus.READY_FOR_ADMIN_REVIEW,
                ClassReportWorkflowStatus.PUBLISHED,
                ClassReportWorkflowStatus.UNPUBLISHED,
            ]
        );
        const studentReportWorkflowCounts = countByStatus(
            studentReportWorkflowRows.map((row) => row.status),
            [
                StudentReportWorkflowStatus.COMMENTS_PENDING,
                StudentReportWorkflowStatus.COMMENTS_READY,
                StudentReportWorkflowStatus.CLASS_APPROVED,
                StudentReportWorkflowStatus.ADMIN_APPROVED,
                StudentReportWorkflowStatus.ADMIN_REJECTED,
                StudentReportWorkflowStatus.PUBLISHED,
                StudentReportWorkflowStatus.UNPUBLISHED,
            ]
        );
        const scoreUploadCounts = countByStatus(
            scoreUploadRequestRows.map((row) => row.status),
            [
                ScoreUploadStatus.PENDING,
                ScoreUploadStatus.APPROVED,
                ScoreUploadStatus.REJECTED,
            ]
        );
        const schemeOfWorkCounts = countByStatus(
            schemeOfWorkTermRows.map((row) => row.status),
            [
                SowStatus.DRAFT,
                SowStatus.SUBMITTED,
                SowStatus.APPROVED,
                SowStatus.REJECTED,
            ]
        );
        const studentChangeCounts = countByStatus(
            studentChangeRequestRows.map((row) => row.status),
            [
                StudentChangeRequestStatus.PENDING,
                StudentChangeRequestStatus.APPROVED,
                StudentChangeRequestStatus.REJECTED,
            ]
        );

        const publishedReportRate = reportCardTotal > 0
            ? roundOneDecimal(calculatePercentage(reportCardPublished, reportCardTotal))
            : null;
        const completedScoreWorkflows =
            getStatusCount(scoreWorkflowCounts, ScoreWorkflowStatus.APPROVED) +
            getStatusCount(scoreWorkflowCounts, ScoreWorkflowStatus.BROADCASTED);
        const scoreWorkflowCompletionRate = scoreWorkflowRows.length > 0
            ? roundOneDecimal(calculatePercentage(completedScoreWorkflows, scoreWorkflowRows.length))
            : null;

        const feeTotalByClass = new Map<string, number>();
        feeStructureRows.forEach((feeStructure) => {
            feeTotalByClass.set(
                feeStructure.classId,
                (feeTotalByClass.get(feeStructure.classId) || 0) + toNumber(feeStructure.amount)
            );
        });

        const billedByClassArm = new Map<string, number>();
        classArms.forEach((classArm) => {
            const feeTotal = feeTotalByClass.get(classArm.class.id) || 0;
            billedByClassArm.set(classArm.id, feeTotal * classArm._count.students);
        });

        const collectedByClassArm = new Map<string, number>();
        const paymentMethodAggregates = new Map<string, { amount: number; count: number }>();
        let collectedAmount = 0;
        feePaymentRows.forEach((payment) => {
            const amount = toNumber(payment.amount);
            collectedAmount += amount;

            if (payment.student.classArmId) {
                collectedByClassArm.set(
                    payment.student.classArmId,
                    (collectedByClassArm.get(payment.student.classArmId) || 0) + amount
                );
            }

            const key = payment.paymentMethod || "UNSPECIFIED";
            const aggregate = paymentMethodAggregates.get(key) || { amount: 0, count: 0 };
            aggregate.amount += amount;
            aggregate.count += 1;
            paymentMethodAggregates.set(key, aggregate);
        });

        const billedAmount = Array.from(billedByClassArm.values()).reduce((sum, value) => sum + value, 0);
        const outstandingAmount = billedAmount - collectedAmount;
        const collectionRate = billedAmount > 0
            ? roundOneDecimal(calculatePercentage(collectedAmount, billedAmount))
            : null;

        const classCollectionRates = classArms.map((classArm) => {
            const billed = billedByClassArm.get(classArm.id) || 0;
            const collected = collectedByClassArm.get(classArm.id) || 0;
            const rate = billed > 0 ? roundOneDecimal(calculatePercentage(collected, billed)) : 0;

            return {
                id: classArm.id,
                label: classArmLabelMap.get(classArm.id) || classArm.id,
                value: rate,
                meta: `${classArm._count.students} active students`,
                secondaryValue: collected,
            };
        });

        const holidayKeys = new Set(publicHolidays.map((holiday) => formatDateKey(startOfDay(holiday.date))));
        const snapshotDate = selectedTerm
            ? getMostRecentSchoolDay(selectedTerm.startDate, selectedAttendanceEndDate, holidayKeys)
            : startOfDay(new Date());
        const snapshotKey = formatDateKey(snapshotDate);
        const schoolDays = selectedTerm
            ? getRecentSchoolDays(selectedTerm.startDate, snapshotDate, holidayKeys, 30)
            : [];

        const dailyAttendance = new Map<string, { total: number; attending: number; absent: number; late: number; excused: number; classArms: Set<string> }>();
        const studentAttendance = new Map<string, { name: string; classLabel: string; total: number; attending: number }>();
        const classAttendance = new Map<string, { label: string; total: number; attending: number }>();
        attendanceRows.forEach((row) => {
            const key = formatDateKey(startOfDay(row.date));
            const day = dailyAttendance.get(key) || {
                total: 0,
                attending: 0,
                absent: 0,
                late: 0,
                excused: 0,
                classArms: new Set<string>(),
            };

            day.total += 1;
            day.classArms.add(row.classArmId);
            if (row.status !== AttendanceStatus.ABSENT) day.attending += 1;
            if (row.status === AttendanceStatus.ABSENT) day.absent += 1;
            if (row.status === AttendanceStatus.LATE) day.late += 1;
            if (row.status === AttendanceStatus.EXCUSED) day.excused += 1;
            dailyAttendance.set(key, day);

            const classLabel = classArmLabelMap.get(row.student.classArmId || "") || "Unassigned";
            const student = studentAttendance.get(row.studentId) || {
                name: `${row.student.firstName} ${row.student.lastName}`,
                classLabel,
                total: 0,
                attending: 0,
            };
            student.total += 1;
            if (row.status !== AttendanceStatus.ABSENT) student.attending += 1;
            studentAttendance.set(row.studentId, student);

            const classArmAgg = classAttendance.get(row.classArmId) || {
                label: classLabel,
                total: 0,
                attending: 0,
            };
            classArmAgg.total += 1;
            if (row.status !== AttendanceStatus.ABSENT) classArmAgg.attending += 1;
            classAttendance.set(row.classArmId, classArmAgg);
        });

        let termTotalRecords = 0;
        let termAttendingRecords = 0;
        for (const data of dailyAttendance.values()) {
            termTotalRecords += data.total;
            termAttendingRecords += data.attending;
        }
        const termAverageRate = termTotalRecords > 0 
            ? roundOneDecimal(calculatePercentage(termAttendingRecords, termTotalRecords))
            : null;

        const classAttendanceRankings = Array.from(classAttendance.entries())
            .map(([id, agg]) => ({
                id,
                label: agg.label,
                value: agg.total > 0 ? roundOneDecimal(calculatePercentage(agg.attending, agg.total)) : 0,
                meta: `${agg.total} records`,
            }))
            .sort((left, right) => right.value - left.value);
            
        const bestClasses = classAttendanceRankings.slice(0, 5);
        const worstClasses = [...classAttendanceRankings].sort((left, right) => left.value - right.value).slice(0, 5);


        const activeClassArms = classArms.filter((classArm) => classArm._count.students > 0);

        const snapshotAttendance = dailyAttendance.get(snapshotKey);
        const attendanceRate = snapshotAttendance && snapshotAttendance.total > 0
            ? roundOneDecimal(calculatePercentage(snapshotAttendance.attending, snapshotAttendance.total))
            : null;
        const classesMissingAttendance = activeClassArms
            .filter((classArm) => !snapshotAttendance?.classArms.has(classArm.id))
            .map((classArm) => classArmLabelMap.get(classArm.id) || classArm.id);
        const trend = schoolDays.map((day) => {
            const key = formatDateKey(day);
            const aggregate = dailyAttendance.get(key);
            const value = aggregate && aggregate.total > 0
                ? roundOneDecimal(calculatePercentage(aggregate.attending, aggregate.total))
                : 0;

            return {
                key,
                label: formatCompactDate(day),
                value,
                total: aggregate?.total || 0,
            };
        });
        const chronicAbsentees = Array.from(studentAttendance.entries())
            .map(([id, student]) => ({
                id,
                name: student.name,
                classLabel: student.classLabel,
                attendanceRate: student.total > 0
                    ? roundOneDecimal(calculatePercentage(student.attending, student.total))
                    : 0,
            }))
            .filter((student) => student.attendanceRate < 75)
            .sort((left, right) => left.attendanceRate - right.attendanceRate)
            .slice(0, 5);

        const paymentMethods = Array.from(paymentMethodAggregates.entries())
            .map(([paymentMethod, aggregate]) => ({
                label: paymentMethod === "UNSPECIFIED" ? "Unspecified" : humanizeEnum(paymentMethod),
                amount: roundOneDecimal(aggregate.amount),
                count: aggregate.count,
            }))
            .sort((left, right) => right.amount - left.amount);

        const classTeacherGaps = activeClassArms
            .filter((classArm) => !classArm.classTeacherId)
            .map((classArm) => classArmLabelMap.get(classArm.id) || classArm.id);
        const explicitEnrollmentKeys = new Set<string>();
        const activeEnrollmentKeys = new Set<string>();
        subjectEnrollmentRows.forEach((enrollment) => {
            const key = buildSubjectClassKey(enrollment.subjectId, enrollment.classArmId);
            explicitEnrollmentKeys.add(key);
            if (enrollment.isActive) {
                activeEnrollmentKeys.add(key);
            }
        });

        const scoreCoverageKeys = new Set<string>();
        scoreRows.forEach((score) => {
            if (!score.student.classArmId) {
                return;
            }

            scoreCoverageKeys.add(buildSubjectClassKey(score.subjectId, score.student.classArmId));
        });
        const effectiveScoreCoverageKeys = new Set<string>(scoreCoverageKeys);
        scoreRows.forEach((score) => {
            if (!score.student.classArmId) {
                return;
            }

            const classId = classIdByArmId.get(score.student.classArmId);
            if (!classId) {
                return;
            }

            const compositeParent = compositeComponentByClassSubjectKey.get(`${classId}:${score.subjectId}`);
            if (compositeParent) {
                effectiveScoreCoverageKeys.add(
                    buildSubjectClassKey(compositeParent.parentSubjectId, score.student.classArmId)
                );
            }
        });

        const subjectTeacherGapOfferings = new Set<string>();
        const subjectTeacherGapSummary = new Map<string, { label: string; classLabels: string[] }>();
        activeClassArms.forEach((classArm) => {
            const classId = classIdByArmId.get(classArm.id) || classArm.class.id;
            const assignedPairs = new Set(
                classArm.teacherSubjects.map((assignment) => buildSubjectClassKey(assignment.subjectId, assignment.classArmId))
            );
            classArm.subjectClassArms.forEach((subjectClassArm) => {
                const subjectMeta = subjectMetaMap.get(subjectClassArm.subjectId);
                const subjectLabel = subjectMeta?.label || "Unknown subject";
                const compositeComponent = compositeComponentByClassSubjectKey.get(`${classId}:${subjectClassArm.subjectId}`);
                if (compositeComponent) {
                    return;
                }

                if (
                    subjectMeta?.subjectKind === "STANDARD" &&
                    compositeComponentLabelsByClassId.get(classId)?.has(subjectLabel.toLowerCase())
                ) {
                    return;
                }

                const key = buildSubjectClassKey(subjectClassArm.subjectId, classArm.id);
                const compositeComponentIds = compositeParentComponentIdsByClassKey.get(`${classId}:${subjectClassArm.subjectId}`);
                const compositeCoveredByComponentAssignments = compositeComponentIds
                    ? Array.from(compositeComponentIds).every((componentSubjectId) =>
                        assignedPairs.has(buildSubjectClassKey(componentSubjectId, classArm.id))
                    )
                    : false;

                if (assignedPairs.has(key) || compositeCoveredByComponentAssignments || effectiveScoreCoverageKeys.has(key)) {
                    return;
                }

                if (explicitEnrollmentKeys.has(key) && !activeEnrollmentKeys.has(key)) {
                    return;
                }

                subjectTeacherGapOfferings.add(key);

                const subjectKey = subjectLabel.toLowerCase();
                const classLabel = classArmLabelMap.get(classArm.id) || classArm.id;
                const summary = subjectTeacherGapSummary.get(subjectKey) || {
                    label: subjectLabel,
                    classLabels: [],
                };

                summary.classLabels.push(classLabel);
                subjectTeacherGapSummary.set(subjectKey, summary);
            });
        });
        const subjectTeacherGapOfferingCount = subjectTeacherGapOfferings.size;
        const subjectTeacherGaps = Array.from(subjectTeacherGapSummary.values())
            .map((summary) => {
                const uniqueClassLabels = Array.from(new Set(summary.classLabels));
                return {
                    label: summary.label,
                    affectedClassCount: uniqueClassLabels.length,
                };
            })
            .sort((left, right) => {
                if (right.affectedClassCount !== left.affectedClassCount) {
                    return right.affectedClassCount - left.affectedClassCount;
                }

                return left.label.localeCompare(right.label);
            })
            .map((summary) => {
                if (summary.affectedClassCount === 1) {
                    return summary.label;
                }

                return `${summary.label} (${summary.affectedClassCount} classes)`;
            });

        const pendingUploadRequests = getStatusCount(scoreUploadCounts, ScoreUploadStatus.PENDING);
        const rejectedUploadRequests = getStatusCount(scoreUploadCounts, ScoreUploadStatus.REJECTED);
        const pendingStudentChanges = getStatusCount(studentChangeCounts, StudentChangeRequestStatus.PENDING);
        const pendingStudentReportReviews =
            getStatusCount(studentReportWorkflowCounts, StudentReportWorkflowStatus.COMMENTS_PENDING) +
            getStatusCount(studentReportWorkflowCounts, StudentReportWorkflowStatus.COMMENTS_READY) +
            getStatusCount(studentReportWorkflowCounts, StudentReportWorkflowStatus.CLASS_APPROVED);
        const pendingClassReportReviews =
            getStatusCount(classReportWorkflowCounts, ClassReportWorkflowStatus.WAITING_SUBJECT_BROADCAST) +
            getStatusCount(classReportWorkflowCounts, ClassReportWorkflowStatus.RESULT_BROADCASTED) +
            getStatusCount(classReportWorkflowCounts, ClassReportWorkflowStatus.COMMENTS_GENERATED) +
            getStatusCount(classReportWorkflowCounts, ClassReportWorkflowStatus.READY_FOR_ADMIN_REVIEW);

        const totalMessages = messageRows.length;
        const sentMessages = messageRows.filter((row) => row.status === MessageStatus.SENT).length;
        const failedMessages = messageRows.filter((row) => row.status === MessageStatus.FAILED).length;
        const pendingMessages = messageRows.filter((row) => row.status === MessageStatus.PENDING).length;
        const successRate = totalMessages > 0
            ? roundOneDecimal(calculatePercentage(sentMessages, totalMessages))
            : null;

        const channelAggregates = new Map<MessageChannel, { total: number; sent: number; failed: number; pending: number }>();
        messageRows.forEach((message) => {
            const aggregate = channelAggregates.get(message.channel) || {
                total: 0,
                sent: 0,
                failed: 0,
                pending: 0,
            };

            aggregate.total += 1;
            if (message.status === MessageStatus.SENT) aggregate.sent += 1;
            if (message.status === MessageStatus.FAILED) aggregate.failed += 1;
            if (message.status === MessageStatus.PENDING) aggregate.pending += 1;
            channelAggregates.set(message.channel, aggregate);
        });

        const communicationChannels = [MessageChannel.SMS, MessageChannel.EMAIL, MessageChannel.IN_APP]
            .filter((channel) => channelAggregates.has(channel))
            .map((channel) => {
                const aggregate = channelAggregates.get(channel)!;
                return {
                    channel: humanizeEnum(channel),
                    total: aggregate.total,
                    sent: aggregate.sent,
                    failed: aggregate.failed,
                    pending: aggregate.pending,
                };
            });

        const openActionItems =
            pendingUploadRequests +
            rejectedUploadRequests +
            pendingStudentChanges +
            pendingStudentReportReviews +
            pendingClassReportReviews +
            classTeacherGaps.length +
            subjectTeacherGaps.length +
            classesMissingAttendance.length;

        const priorityAlerts: PriorityAlert[] = [];
        if (classTeacherGaps.length > 0) {
            priorityAlerts.push({
                id: "class-teacher-gaps",
                title: "Class teacher gaps",
                description: `${classTeacherGaps.length} class arm${classTeacherGaps.length === 1 ? '' : 's'} ${classTeacherGaps.length === 1 ? 'does' : 'do'} not have a class teacher assigned.`,
                severity: "high",
                section: "operations",
            });
        }
        if (subjectTeacherGaps.length > 0) {
            priorityAlerts.push({
                id: "subject-teacher-gaps",
                title: "Subject coverage gaps",
                description: subjectTeacherGapOfferingCount === subjectTeacherGaps.length
                    ? `${subjectTeacherGaps.length} subject${subjectTeacherGaps.length === 1 ? '' : 's'} ${subjectTeacherGaps.length === 1 ? 'still needs' : 'still need'} teacher coverage.`
                    : `${subjectTeacherGaps.length} subjects across ${subjectTeacherGapOfferingCount} class offering${subjectTeacherGapOfferingCount === 1 ? '' : 's'} still need teacher coverage.`,
                severity: "high",
                section: "operations",
            });
        }
        if (classesMissingAttendance.length > 0) {
            priorityAlerts.push({
                id: "attendance-missing",
                title: "Attendance not marked",
                description: `${classesMissingAttendance.length} class arm${classesMissingAttendance.length === 1 ? '' : 's'} ${classesMissingAttendance.length === 1 ? 'has' : 'have'} no attendance marked for ${formatCompactDate(snapshotDate)}.`,
                severity: "medium",
                section: "attendance",
            });
        }
        if (collectionRate !== null && collectionRate < 70) {
            priorityAlerts.push({
                id: "low-collections",
                title: "Fee collection is below target",
                description: `Only ${collectionRate}% of billed fees have been collected for the selected term.`,
                severity: "high",
                section: "finance",
            });
        }
        if (pendingUploadRequests > 0) {
            priorityAlerts.push({
                id: "pending-score-uploads",
                title: "Pending score upload reviews",
                description: `${pendingUploadRequests} score upload request(s) are awaiting review.`,
                severity: "medium",
                section: "operations",
            });
        }
        if (pendingStudentChanges > 0) {
            priorityAlerts.push({
                id: "student-change-requests",
                title: "Pending student change requests",
                description: `${pendingStudentChanges} student record change request(s) are still pending.`,
                severity: "low",
                section: "operations",
            });
        }
        if (publishedReportRate !== null && reportCardTotal > 0 && publishedReportRate < 100) {
            const unpublishedCount = reportCardTotal - reportCardPublished;
            priorityAlerts.push({
                id: "unpublished-reports",
                title: "Reports still unpublished",
                description: `${unpublishedCount} report card${unpublishedCount === 1 ? '' : 's'} ${unpublishedCount === 1 ? 'is' : 'are'} not published yet.`,
                severity: "medium",
                section: "academics",
            });
        }
        const severityOrder = { high: 0, medium: 1, low: 2 };
        priorityAlerts.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);

        return {
            filters: resolved.filters,
            section,
            summary: {
                activeStudents,
                activeTeachers,
                attendanceRate,
                reportPublicationRate: publishedReportRate,
                feeCollectionRate: collectionRate,
                openActionItems,
            },
            enrollment: {
                activeStudents,
                inactiveStudents,
                newAdmissions,
                genderDistribution,
                occupancy,
                largestClasses,
                smallestClasses,
            },
            academics: {
                scoreWorkflowCompletionRate,
                publishedReports: reportCardPublished,
                totalReports: reportCardTotal,
                publishedReportRate,
                classPerformance,
                subjectPerformance,
                strongestClasses: classPerformance.slice(0, 5),
                weakestClasses: [...classPerformance].sort((left, right) => left.value - right.value).slice(0, 5),
                strongestSubjects: subjectPerformance.slice(0, 5),
                weakestSubjects: [...subjectPerformance].sort((left, right) => left.value - right.value).slice(0, 5),
            },
            attendance: {
                snapshotLabel: snapshotDate.toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                }),
                attendanceRate,
                presentCount: snapshotAttendance?.attending || 0,
                absentCount: snapshotAttendance?.absent || 0,
                lateCount: snapshotAttendance?.late || 0,
                excusedCount: snapshotAttendance?.excused || 0,
                trend,
                termAverageRate,
                bestClasses,
                worstClasses,
                classesMissingAttendance,
                chronicAbsentees,
            },
            finance: {
                billedAmount: roundOneDecimal(billedAmount),
                collectedAmount: roundOneDecimal(collectedAmount),
                outstandingAmount: roundOneDecimal(outstandingAmount),
                collectionRate,
                paymentMethods,
                bestCollections: [...classCollectionRates].sort((left, right) => right.value - left.value).slice(0, 5),
                weakestCollections: [...classCollectionRates].sort((left, right) => left.value - right.value).slice(0, 5),
            },
            operations: {
                scoreUploadRequests: scoreUploadCounts,
                scoreWorkflows: scoreWorkflowCounts,
                classReportWorkflows: classReportWorkflowCounts,
                studentReportWorkflows: studentReportWorkflowCounts,
                schemeOfWorkTerms: schemeOfWorkCounts,
                studentChangeRequests: studentChangeCounts,
                pendingUploadRequests,
                rejectedUploadRequests,
                classTeacherGapCount: classTeacherGaps.length,
                subjectTeacherGapCount: subjectTeacherGaps.length,
                classTeacherGaps: classTeacherGaps.slice(0, 5),
                subjectTeacherGaps: subjectTeacherGaps.slice(0, 5),
            },
            communication: {
                totalMessages,
                sentMessages,
                failedMessages,
                pendingMessages,
                successRate,
                channels: communicationChannels,
            },
            priorityAlerts: priorityAlerts.slice(0, 6),
        };
    });
}
