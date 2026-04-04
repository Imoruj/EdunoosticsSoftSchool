import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncCurrentTerm } from "@/lib/currentTerm";

type SessionUser = {
    id?: string;
    schoolId?: string;
    roles?: string[];
};

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as SessionUser;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : "";
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];

        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found in session" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const classArmIdsParam = searchParams.get("classArmIds");
        const subjectIdParam = searchParams.get("subjectId");
        const termIdParam = searchParams.get("termId");
        if (!classArmIdsParam) {
            return NextResponse.json({ students: [] });
        }

        const requestedClassArmIds = classArmIdsParam.split(",").filter(id => id.length > 0);
        if (requestedClassArmIds.length === 0) {
            return NextResponse.json({ students: [] });
        }

        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        const isSubjectTeacher = roles.includes("SUBJECT_TEACHER");
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        // Verify authorization for the requested class arms
        let authorizedClassArmIds = new Set<string>();

        if (isAdmin) {
            // Admins can see students in any class arm
            authorizedClassArmIds = new Set(requestedClassArmIds);
        } else {
            // Check teacher assignments
            if (isSubjectTeacher) {
                const teacherAssignments = await prisma.teacherSubject.findMany({
                    where: {
                        teacherId: user.id,
                        classArmId: { in: requestedClassArmIds },
                        classArm: { class: { schoolId } }
                    },
                    select: { classArmId: true }
                });
                teacherAssignments.forEach(a => authorizedClassArmIds.add(a.classArmId));
            }

            if (isClassTeacher) {
                const assignedArms = await prisma.classArm.findMany({
                    where: {
                        classTeacherId: user.id,
                        id: { in: requestedClassArmIds },
                        class: { schoolId }
                    },
                    select: { id: true }
                });
                assignedArms.forEach(a => authorizedClassArmIds.add(a.id));
            }
        }

        const allowedArmIds = Array.from(authorizedClassArmIds);

        if (allowedArmIds.length === 0) {
            // The teacher requested class arms they don't have access to
            return NextResponse.json({ students: [] });
        }

        // Determine effective term for subject filtering:
        // explicit term -> current term -> latest school term
        let effectiveTermId: string | null = null;

        if (termIdParam) {
            const explicitTerm = await prisma.term.findFirst({
                where: { id: termIdParam, session: { schoolId } },
                select: { id: true },
            });
            effectiveTermId = explicitTerm?.id ?? null;
        }

        if (!effectiveTermId) {
            await syncCurrentTerm(schoolId);
            const currentTerm = await prisma.term.findFirst({
                where: {
                    isCurrent: true,
                    session: { schoolId }
                },
                select: { id: true }
            });
            effectiveTermId = currentTerm?.id ?? null;
        }

        if (!effectiveTermId) {
            const latestTerm = await prisma.term.findFirst({
                where: { session: { schoolId } },
                orderBy: [{ startDate: "desc" }, { termNumber: "desc" }],
                select: { id: true },
            });
            effectiveTermId = latestTerm?.id ?? null;
        }

        let studentFilter: any = {
            schoolId,
            classArmId: { in: allowedArmIds },
            isActive: true
        };

        // If subjectId is provided, check if we need to filter by enrollments
        if (subjectIdParam && effectiveTermId) {
            const enrollmentRows = await prisma.subjectEnrollment.findMany({
                where: { subjectId: subjectIdParam, classArmId: { in: allowedArmIds }, termId: effectiveTermId },
                select: {
                    studentId: true,
                    classArmId: true,
                    isActive: true,
                },
            });

            if (enrollmentRows.length > 0) {
                // Enrollment usage can be mixed across arms. If one arm has enrollment rows and another
                // doesn't, we should only enforce active-subject enrollment for the enrolled arm and
                // fall back to the full active class list for the arm without enrollment rows.
                const armsWithEnrollmentRecords = new Set(enrollmentRows.map((row) => row.classArmId));
                const armsWithoutEnrollmentRecords = allowedArmIds.filter(
                    (armId) => !armsWithEnrollmentRecords.has(armId)
                );
                const activeEnrolledStudentIds = Array.from(
                    new Set(
                        enrollmentRows
                            .filter((row) => row.isActive)
                            .map((row) => row.studentId)
                    )
                );

                studentFilter = {
                    schoolId,
                    isActive: true,
                    OR: [
                        ...(armsWithoutEnrollmentRecords.length > 0
                            ? [{ classArmId: { in: armsWithoutEnrollmentRecords } }]
                            : []),
                        {
                            classArmId: { in: Array.from(armsWithEnrollmentRecords) },
                            id: { in: activeEnrolledStudentIds },
                        },
                    ],
                };
            }
        }

        // Fetch students in the authorized class arms (filtered by enrollment if applicable)
        const students = await prisma.student.findMany({
            where: studentFilter,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
                classArmId: true,
                classArm: {
                    select: {
                        id: true,
                        armName: true,
                        class: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: [
                { classArm: { class: { name: "asc" } } },
                { classArm: { armName: "asc" } },
                { lastName: "asc" }
            ]
        });

        // Map students for easy consumption
        const formattedStudents = students.map(s => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            admissionNumber: s.admissionNumber,
            classArmId: s.classArmId,
            classArmName: `${s.classArm?.class.name} ${s.classArm?.armName}`
        }));

        return NextResponse.json({ students: formattedStudents, termId: effectiveTermId });

    } catch (error) {
        console.error("Error fetching students by class arms:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

