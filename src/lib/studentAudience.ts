import { prisma } from "@/lib/prisma";
import { syncCurrentTerm } from "@/lib/currentTerm";

type AudienceStudent = {
    id: string;
    userId: string | null;
    parentUserId: string | null;
    classArmId: string | null;
};

function uniqueStrings(values: Array<string | null | undefined>) {
    return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)));
}

export async function getEffectiveTermIdForSchool(schoolId: string) {
    await syncCurrentTerm(schoolId);

    const currentTerm = await prisma.term.findFirst({
        where: {
            isCurrent: true,
            session: { schoolId },
        },
        select: { id: true },
    });

    if (currentTerm?.id) {
        return currentTerm.id;
    }

    const latestTerm = await prisma.term.findFirst({
        where: { session: { schoolId } },
        orderBy: [{ startDate: "desc" }, { termNumber: "desc" }],
        select: { id: true },
    });

    return latestTerm?.id ?? null;
}

export async function resolveAudienceStudents(params: {
    schoolId: string;
    assignedTo?: string[];
    classArmIds?: string[];
    subjectId?: string;
}) {
    const assignedTo = uniqueStrings(params.assignedTo ?? []);
    const classArmIds = uniqueStrings(params.classArmIds ?? []);
    const explicitAudienceIds = assignedTo.filter((value) => value !== "all");
    const includeFullClassAudience = assignedTo.includes("all") || explicitAudienceIds.length === 0;

    const studentsById = new Map<string, AudienceStudent>();

    if (explicitAudienceIds.length > 0) {
        const explicitStudents = await prisma.student.findMany({
            where: {
                schoolId: params.schoolId,
                isActive: true,
                OR: [
                    { id: { in: explicitAudienceIds } },
                    { userId: { in: explicitAudienceIds } },
                ],
            },
            select: {
                id: true,
                userId: true,
                classArmId: true,
                parent: { select: { userId: true } },
            },
        });

        explicitStudents.forEach((student) => {
            studentsById.set(student.id, {
                id: student.id,
                userId: student.userId,
                parentUserId: student.parent?.userId ?? null,
                classArmId: student.classArmId,
            });
        });
    }

    if (!includeFullClassAudience || classArmIds.length === 0) {
        return Array.from(studentsById.values());
    }

    const classStudents = await prisma.student.findMany({
        where: {
            schoolId: params.schoolId,
            isActive: true,
            classArmId: { in: classArmIds },
        },
        select: {
            id: true,
            userId: true,
            classArmId: true,
            parent: { select: { userId: true } },
        },
    });

    let armsWithEnrollmentRecords = new Set<string>();
    let activeEnrolledStudentIds = new Set<string>();

    if (params.subjectId) {
        const effectiveTermId = await getEffectiveTermIdForSchool(params.schoolId);

        if (effectiveTermId) {
            const enrollmentRows = await prisma.subjectEnrollment.findMany({
                where: {
                    subjectId: params.subjectId,
                    classArmId: { in: classArmIds },
                    termId: effectiveTermId,
                },
                select: {
                    studentId: true,
                    classArmId: true,
                    isActive: true,
                },
            });

            armsWithEnrollmentRecords = new Set(enrollmentRows.map((row) => row.classArmId));
            activeEnrolledStudentIds = new Set(
                enrollmentRows.filter((row) => row.isActive).map((row) => row.studentId)
            );
        }
    }

    classStudents.forEach((student) => {
        const classArmId = student.classArmId;
        const requiresEnrollment =
            !!params.subjectId &&
            !!classArmId &&
            armsWithEnrollmentRecords.has(classArmId);

        if (requiresEnrollment && !activeEnrolledStudentIds.has(student.id)) {
            return;
        }

        studentsById.set(student.id, {
            id: student.id,
            userId: student.userId,
            parentUserId: student.parent?.userId ?? null,
            classArmId,
        });
    });

    return Array.from(studentsById.values());
}

export async function resolveVisibleSubjectIdsForStudent(params: {
    schoolId: string;
    studentId: string;
    classArmId: string;
}) {
    const effectiveTermId = await getEffectiveTermIdForSchool(params.schoolId);

    const assignedSubjects = await prisma.subjectClassArm.findMany({
        where: { classArmId: params.classArmId },
        select: { subjectId: true },
        distinct: ["subjectId"],
    });

    if (!effectiveTermId) {
        return uniqueStrings(assignedSubjects.map((entry) => entry.subjectId));
    }

    const enrollmentRows = await prisma.subjectEnrollment.findMany({
        where: {
            classArmId: params.classArmId,
            termId: effectiveTermId,
        },
        select: {
            subjectId: true,
            studentId: true,
            isActive: true,
        },
    });

    const subjectsWithEnrollmentRecords = new Set(enrollmentRows.map((entry) => entry.subjectId));
    const studentActiveSubjectIds = new Set(
        enrollmentRows
            .filter((entry) => entry.studentId === params.studentId && entry.isActive)
            .map((entry) => entry.subjectId)
    );

    const visibleSubjectIds = new Set<string>(studentActiveSubjectIds);

    assignedSubjects.forEach((entry) => {
        if (!subjectsWithEnrollmentRecords.has(entry.subjectId)) {
            visibleSubjectIds.add(entry.subjectId);
        }
    });

    return Array.from(visibleSubjectIds);
}

export async function getStudentAndParentNotificationUserIds(studentIds: string[]) {
    const uniqueStudentIds = uniqueStrings(studentIds);
    if (uniqueStudentIds.length === 0) {
        return {
            studentUserIds: [] as string[],
            parentUserIds: [] as string[],
        };
    }

    const students = await prisma.student.findMany({
        where: { id: { in: uniqueStudentIds } },
        select: {
            userId: true,
            parent: { select: { userId: true } },
        },
    });

    return {
        studentUserIds: uniqueStrings(students.map((student) => student.userId)),
        parentUserIds: uniqueStrings(students.map((student) => student.parent?.userId ?? null)),
    };
}
