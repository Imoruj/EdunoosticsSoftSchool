import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkGenerateReportCardData } from "@/services/reportService";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

async function resolveAllowedSessionIdsForClassArm(
    schoolId: string,
    classArmId: string,
    currentSessionId: string | null
): Promise<Set<string>> {
    const [sessionTerms, hasActiveStudents] = await Promise.all([
        prisma.term.findMany({
            where: {
                session: { schoolId },
                OR: [
                    { reportCards: { some: { classArmId } } },
                    { subjectEnrollments: { some: { classArmId } } },
                    { scores: { some: { student: { classArmId } } } }
                ]
            },
            select: { sessionId: true },
            distinct: ["sessionId"]
        }),
        prisma.student.findFirst({
            where: { schoolId, classArmId, isActive: true },
            select: { id: true }
        })
    ]);

    const allowedSessionIds = new Set<string>(sessionTerms.map((term) => term.sessionId));
    if (currentSessionId && hasActiveStudents) {
        allowedSessionIds.add(currentSessionId);
    }

    return allowedSessionIds;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { studentIds, termId, reportType = "endOfTerm" } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !termId) {
            return NextResponse.json({ error: "Missing studentIds or termId" }, { status: 400 });
        }

        const reportTypeEnum: "halfTerm" | "endOfTerm" =
            reportType === "halfTerm" ? "halfTerm" : "endOfTerm";

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const userId = typeof user.id === "string" ? user.id : "";
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);
        const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json(
                { error: "Unauthorized: Only admin and class teachers can access report previews." },
                { status: 403 }
            );
        }

        const [term, students] = await Promise.all([
            prisma.term.findFirst({
                where: { id: termId, session: { schoolId } },
                select: { id: true, sessionId: true }
            }),
            prisma.student.findMany({
                where: { id: { in: studentIds }, schoolId },
                select: { id: true, classArmId: true }
            })
        ]);

        if (!term) {
            return NextResponse.json({ error: "Invalid term selection." }, { status: 400 });
        }

        if (students.length !== studentIds.length) {
            return NextResponse.json(
                { error: "One or more selected students are invalid for your school." },
                { status: 400 }
            );
        }

        if (!isAdmin && isClassTeacher) {
            const assignedArms = await prisma.classArm.findMany({
                where: {
                    classTeacherId: userId,
                    class: { schoolId }
                },
                select: { id: true }
            });
            const assignedArmIds = new Set(assignedArms.map((arm) => arm.id));

            if (assignedArmIds.size === 0) {
                return NextResponse.json(
                    { error: "Unauthorized: You do not have an assigned class." },
                    { status: 403 }
                );
            }

            const classArmIdsInRequest = Array.from(
                new Set(
                    students
                        .map((student) => student.classArmId)
                        .filter((classArmId): classArmId is string => !!classArmId)
                )
            );

            const hasUnauthorizedClass = students.some(
                (student) => !student.classArmId || !assignedArmIds.has(student.classArmId)
            );
            if (hasUnauthorizedClass) {
                return NextResponse.json(
                    { error: "Unauthorized: One or more selected students are outside your assigned class." },
                    { status: 403 }
                );
            }

            const currentSession = await prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true }
            });

            for (const classArmId of classArmIdsInRequest) {
                const allowedSessionIds = await resolveAllowedSessionIdsForClassArm(
                    schoolId,
                    classArmId,
                    currentSession?.id ?? null
                );
                if (!allowedSessionIds.has(term.sessionId)) {
                    return NextResponse.json(
                        { error: "Unauthorized: Selected term session is not available for this class assignment." },
                        { status: 403 }
                    );
                }
            }
        }

        const reports = await bulkGenerateReportCardData(
            students.map((student) => student.id),
            termId,
            reportTypeEnum,
            false
        );

        return NextResponse.json({ reports });
    } catch (error: any) {
        console.error("Report Data Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

