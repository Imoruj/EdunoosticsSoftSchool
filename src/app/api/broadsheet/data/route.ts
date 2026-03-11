import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateBroadsheetData } from "@/services/broadsheetService";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { classArmId, termId, reportType = "endOfTerm" } = body;

        if (!classArmId || !termId) {
            return NextResponse.json(
                { error: "Missing classArmId or termId" },
                { status: 400 }
            );
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
                { error: "Unauthorized: Only admin and class teachers can access broadsheet." },
                { status: 403 }
            );
        }

        const [classArm, term, currentSession] = await Promise.all([
            prisma.classArm.findFirst({
                where: { id: classArmId, class: { schoolId } },
                select: { id: true, classTeacherId: true }
            }),
            prisma.term.findFirst({
                where: { id: termId, session: { schoolId } },
                select: { id: true, sessionId: true }
            }),
            prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true }
            })
        ]);

        if (!classArm || !term) {
            return NextResponse.json(
                { error: "Invalid class or term selection." },
                { status: 400 }
            );
        }

        if (!isAdmin && isClassTeacher) {
            if (classArm.classTeacherId !== userId) {
                return NextResponse.json(
                    { error: "Unauthorized: You are not assigned to this class." },
                    { status: 403 }
                );
            }

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

            const allowedSessionIds = new Set<string>(sessionTerms.map((t) => t.sessionId));
            if (currentSession?.id && hasActiveStudents) {
                allowedSessionIds.add(currentSession.id);
            }

            if (!allowedSessionIds.has(term.sessionId)) {
                return NextResponse.json(
                    { error: "Unauthorized: Selected session is not available for this class assignment." },
                    { status: 403 }
                );
            }
        }

        const data = await generateBroadsheetData(classArmId, termId, reportType);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Broadsheet Data Fetch Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch broadsheet data" },
            { status: 500 }
        );
    }
}
