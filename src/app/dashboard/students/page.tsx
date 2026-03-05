import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import StudentsClient from "@/components/students/StudentsClient";
import { ClassOption, SessionOption, SubjectOption } from "@/components/students/types";

export default async function StudentsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
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
        redirect("/dashboard");
    }

    if (!isAdmin && !isClassTeacher) {
        redirect("/dashboard");
    }

    let assignedClassArmIds: string[] = [];
    if (!isAdmin && isClassTeacher && userId) {
        const assignedArms = await prisma.classArm.findMany({
            where: {
                classTeacherId: userId,
                class: { schoolId }
            },
            select: { id: true }
        });
        assignedClassArmIds = assignedArms.map((arm) => arm.id);
    }

    let scopedSessionIds: string[] | undefined = undefined;
    if (!isAdmin) {
        if (assignedClassArmIds.length === 0) {
            scopedSessionIds = [];
        } else {
            const [sessionTermsWithRecords, currentSession] = await Promise.all([
                prisma.term.findMany({
                    where: {
                        session: { schoolId },
                        OR: [
                            { reportCards: { some: { classArmId: { in: assignedClassArmIds } } } },
                            { subjectEnrollments: { some: { classArmId: { in: assignedClassArmIds } } } },
                            { scores: { some: { student: { classArmId: { in: assignedClassArmIds } } } } }
                        ]
                    },
                    select: { sessionId: true },
                    distinct: ["sessionId"]
                }),
                prisma.academicSession.findFirst({
                    where: { schoolId, isCurrent: true },
                    select: { id: true }
                })
            ]);

            const uniqueSessionIds = new Set<string>(
                sessionTermsWithRecords.map((term) => term.sessionId)
            );

            if (currentSession?.id) {
                uniqueSessionIds.add(currentSession.id);
            }

            scopedSessionIds = Array.from(uniqueSessionIds);
        }
    }

    const [dbSessions, dbClasses, dbSubjects] = await Promise.all([
        prisma.academicSession.findMany({
            where: {
                schoolId,
                ...(scopedSessionIds ? { id: { in: scopedSessionIds } } : {})
            },
            include: { terms: { orderBy: { termNumber: "asc" } } },
            orderBy: { startDate: "desc" }
        }),
        prisma.class.findMany({
            where: {
                schoolId,
                ...(!isAdmin ? { arms: { some: { id: { in: assignedClassArmIds } } } } : {})
            },
            include: {
                arms: !isAdmin
                    ? { where: { id: { in: assignedClassArmIds } } }
                    : true
            },
            orderBy: { name: "asc" }
        }),
        prisma.subject.findMany({
            where: {
                schoolId,
                ...(!isAdmin
                    ? {
                        subjectClassArms: {
                            some: { classArmId: { in: assignedClassArmIds } }
                        }
                    }
                    : {})
            },
            orderBy: { name: "asc" }
        })
    ]);

    const initialSessions: SessionOption[] = dbSessions.map((s) => ({
        id: s.id,
        name: s.name,
        isCurrent: s.isCurrent,
        terms: s.terms.map((t) => ({ id: t.id, name: t.name, isCurrent: t.isCurrent }))
    }));

    const initialClasses: ClassOption[] = dbClasses.map((c) => ({
        id: c.id,
        name: c.name,
        arms: c.arms.map((a) => ({ id: a.id, armName: a.armName }))
    }));

    const initialSubjects: SubjectOption[] = dbSubjects.map((sub) => ({
        id: sub.id,
        name: sub.name,
        code: sub.code || undefined
    }));

    return (
        <StudentsClient
            initialSessions={initialSessions}
            initialClasses={initialClasses}
            initialSubjects={initialSubjects}
        />
    );
}
