import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
    resolveCompositeSubjectContext,
    syncCompositeEnrollments,
} from "@/lib/composite-subjects";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// GET: Fetch enrollment status for a class arm / subject / term
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const subjectId = searchParams.get("subjectId");
        const termId = searchParams.get("termId");

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const userId = typeof user.id === "string" ? user.id : null;

        if (!classArmId || !subjectId || !termId) {
            return NextResponse.json(
                { error: "classArmId, subjectId, and termId are required" },
                { status: 400 }
            );
        }

        if (!schoolId) {
            return NextResponse.json({ error: "School context is required" }, { status: 400 });
        }

        // RBAC CHECK
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const isSubjectTeacher = await prisma.teacherSubject.findFirst({
                where: { teacherId: userId, subjectId, classArmId }
            });
            const isClassTeacher = await prisma.classArm.findFirst({
                where: { id: classArmId, classTeacherId: userId }
            });
            if (!isSubjectTeacher && !isClassTeacher) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        // Determine if the selected term belongs to the current session
        const selectedTerm = await prisma.term.findUnique({
            where: { id: termId! },
            include: { session: { select: { id: true, isCurrent: true } } }
        });
        const selectedSessionId = selectedTerm?.session?.id ?? null;
        const isCurrentSession = selectedTerm?.session?.isCurrent ?? true;

        if (!selectedSessionId) {
            return NextResponse.json({ error: "Invalid term" }, { status: 400 });
        }

        const subjectContext = await resolveCompositeSubjectContext(prisma, {
            schoolId,
            sessionId: selectedSessionId,
            subjectId,
            classArmId,
        });

        let studentFilter: any = { schoolId };

        if (isCurrentSession) {
            // Current session: show all active students currently in the class arm
            studentFilter.classArmId = classArmId;
            studentFilter.isActive = true;
        } else {
            // Past session: only show students with historical records for this class arm
            const sessionTerms = await prisma.term.findMany({
                where: { sessionId: selectedTerm!.session.id },
                select: { id: true }
            });
            const sessionTermIds = sessionTerms.map(t => t.id);

            const [rcStudents, seStudents] = await Promise.all([
                prisma.reportCard.findMany({
                    where: { termId: { in: sessionTermIds }, classArmId },
                    select: { studentId: true },
                    distinct: ['studentId']
                }),
                prisma.subjectEnrollment.findMany({
                    where: { termId: { in: sessionTermIds }, classArmId },
                    select: { studentId: true },
                    distinct: ['studentId']
                })
            ]);

            const historicalStudentIds = Array.from(new Set([
                ...rcStudents.map(s => s.studentId),
                ...seStudents.map(s => s.studentId)
            ]));

            studentFilter.id = { in: historicalStudentIds };
        }

        // Fetch students based on session context
        const students = await prisma.student.findMany({
            where: studentFilter,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
            },
            orderBy: { lastName: "asc" },
        });

        // Fetch existing enrollments for this subject/classArm/term
        const enrollments = await prisma.subjectEnrollment.findMany({
            where: { subjectId, classArmId, termId },
            select: { studentId: true, isActive: true },
        });

        const enrollmentMap = new Map(
            enrollments.map(e => [e.studentId, e.isActive])
        );

        const hasEnrollments = enrollments.length > 0;

        const data = students.map(student => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
            isEnrolled: hasEnrollments ? (enrollmentMap.get(student.id) === true) : false,
        }));

        return NextResponse.json({
            students: data,
            hasEnrollments,
            totalStudents: students.length,
            enrolledCount: hasEnrollments
                ? data.filter(s => s.isEnrolled).length
                : 0,
            subjectKind: subjectContext.mode,
            parentSubjectId: subjectContext.parentSubjectId,
            parentSubjectName: subjectContext.parentSubjectName,
        });
    } catch (error: any) {
        console.error("Error fetching enrollments:", error);
        return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
    }
}

// POST: Enroll or unenroll students
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { studentIds, subjectId, classArmId, termId, action } = body;

        if (!subjectId || !classArmId || !termId || !action) {
            return NextResponse.json(
                { error: "subjectId, classArmId, termId, and action are required" },
                { status: 400 }
            );
        }

        if (!["enroll", "unenroll", "enrollAll"].includes(action)) {
            return NextResponse.json(
                { error: "action must be 'enroll', 'unenroll', or 'enrollAll'" },
                { status: 400 }
            );
        }

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const userId = typeof user.id === "string" ? user.id : null;

        if (!schoolId) {
            return NextResponse.json({ error: "School context is required" }, { status: 400 });
        }

        // RBAC CHECK
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const isSubjectTeacher = await prisma.teacherSubject.findFirst({
                where: { teacherId: userId, subjectId, classArmId }
            });
            const isClassTeacher = await prisma.classArm.findFirst({
                where: { id: classArmId, classTeacherId: userId }
            });
            if (!isSubjectTeacher && !isClassTeacher) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        const selectedTerm = await prisma.term.findUnique({
            where: { id: termId },
            include: { session: { select: { id: true } } },
        });
        const selectedSessionId = selectedTerm?.session?.id ?? null;

        if (!selectedSessionId) {
            return NextResponse.json({ error: "Invalid term" }, { status: 400 });
        }

        const subjectContext = await resolveCompositeSubjectContext(prisma, {
            schoolId,
            sessionId: selectedSessionId,
            subjectId,
            classArmId,
        });

        if (subjectContext.mode === "COMPOSITE_COMPONENT") {
            return NextResponse.json(
                { error: "Enrollment is managed on the parent subject" },
                { status: 400 }
            );
        }

        if (action === "enrollAll") {
            // Enroll all students in the class arm
            const allStudents = await prisma.student.findMany({
                where: { classArmId, isActive: true, schoolId },
                select: { id: true },
            });

            const ids = allStudents.map(s => s.id);

            await prisma.$transaction(
                ids.map(studentId =>
                    prisma.subjectEnrollment.upsert({
                        where: {
                            studentId_subjectId_termId: { studentId, subjectId, termId }
                        },
                        update: { isActive: true, classArmId },
                        create: { studentId, subjectId, classArmId, termId, isActive: true },
                    })
                )
            );

            if (subjectContext.mode === "COMPOSITE_PARENT") {
                await syncCompositeEnrollments(prisma, {
                    schoolId,
                    sessionId: selectedSessionId,
                    classArmId,
                    termId,
                    parentSubjectId: subjectId,
                });
            }

            return NextResponse.json({
                message: `All ${ids.length} students enrolled successfully`,
                enrolledCount: ids.length,
            });
        }

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: "studentIds array is required for enroll/unenroll" },
                { status: 400 }
            );
        }

        if (action === "enroll") {
            await prisma.$transaction(
                studentIds.map((studentId: string) =>
                    prisma.subjectEnrollment.upsert({
                        where: {
                            studentId_subjectId_termId: { studentId, subjectId, termId }
                        },
                        update: { isActive: true, classArmId },
                        create: { studentId, subjectId, classArmId, termId, isActive: true },
                    })
                )
            );

            if (subjectContext.mode === "COMPOSITE_PARENT") {
                await syncCompositeEnrollments(prisma, {
                    schoolId,
                    sessionId: selectedSessionId,
                    classArmId,
                    termId,
                    parentSubjectId: subjectId,
                });
            }

            return NextResponse.json({
                message: `${studentIds.length} student(s) enrolled successfully`,
            });
        }

        if (action === "unenroll") {
            await prisma.$transaction(
                studentIds.map((studentId: string) =>
                    prisma.subjectEnrollment.upsert({
                        where: {
                            studentId_subjectId_termId: { studentId, subjectId, termId }
                        },
                        update: { isActive: false },
                        create: { studentId, subjectId, classArmId, termId, isActive: false },
                    })
                )
            );

            if (subjectContext.mode === "COMPOSITE_PARENT") {
                await syncCompositeEnrollments(prisma, {
                    schoolId,
                    sessionId: selectedSessionId,
                    classArmId,
                    termId,
                    parentSubjectId: subjectId,
                });
            }

            return NextResponse.json({
                message: `${studentIds.length} student(s) unenrolled successfully`,
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("Error managing enrollment:", error);
        return NextResponse.json({ error: "Failed to manage enrollment" }, { status: 500 });
    }
}

