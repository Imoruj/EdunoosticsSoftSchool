import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateReportCardData, generateReportCardStream } from "@/services/reportService";

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

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const termId = searchParams.get("termId");
        const reportType = (searchParams.get("reportType") as "halfTerm" | "endOfTerm") || "endOfTerm";

        if (!studentId || !termId) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
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
                { error: "Unauthorized: Only admin and class teachers can generate reports." },
                { status: 403 }
            );
        }

        const [student, term] = await Promise.all([
            prisma.student.findFirst({
                where: { id: studentId, schoolId },
                select: { id: true, classArmId: true, admissionNumber: true }
            }),
            prisma.term.findFirst({
                where: { id: termId, session: { schoolId } },
                select: { id: true, name: true, sessionId: true }
            })
        ]);

        if (!student || !term) {
            return NextResponse.json({ error: "Invalid student or term selection." }, { status: 400 });
        }

        if (!isAdmin && isClassTeacher) {
            if (!student.classArmId) {
                return NextResponse.json(
                    { error: "Student is not assigned to a class arm." },
                    { status: 400 }
                );
            }

            const classArm = await prisma.classArm.findFirst({
                where: {
                    id: student.classArmId,
                    classTeacherId: userId,
                    class: { schoolId }
                },
                select: { id: true }
            });

            if (!classArm) {
                return NextResponse.json(
                    { error: "Unauthorized: You are not assigned to this student's class." },
                    { status: 403 }
                );
            }

            const currentSession = await prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true }
            });

            const allowedSessionIds = await resolveAllowedSessionIdsForClassArm(
                schoolId,
                student.classArmId,
                currentSession?.id ?? null
            );

            if (!allowedSessionIds.has(term.sessionId)) {
                return NextResponse.json(
                    { error: "Unauthorized: Selected term session is not available for this class assignment." },
                    { status: 403 }
                );
            }
        }

        const reportData = await generateReportCardData(student.id, term.id, reportType);
        const stream = await generateReportCardStream(reportData);

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Report_${student.admissionNumber}_${term.name}.pdf"`
            }
        });
    } catch (error: any) {
        console.error("Error generating report:", error);
        return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
    }
}
