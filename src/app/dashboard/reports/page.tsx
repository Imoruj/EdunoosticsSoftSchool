import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import ReportsClient from "@/components/reports/ReportsClient";
import { Session, ClassArm } from "@/components/reports/types";

type SessionMap = Record<string, string[]>;

async function getSessionIdsForClassArm(
    schoolId: string,
    classArmId: string,
    currentSessionId: string | null
): Promise<string[]> {
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

    const sessionIds = new Set<string>(sessionTerms.map((term) => term.sessionId));

    if (currentSessionId && hasActiveStudents) {
        sessionIds.add(currentSessionId);
    }

    return Array.from(sessionIds);
}

export default async function ReportCardsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
    }

    const user = session.user as any;
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
    const userId = typeof user.id === "string" ? user.id : "";
    const loginType = user.loginType;

    const isAdmin =
        roles.includes(UserRole.SUPER_ADMIN) ||
        roles.includes(UserRole.SCHOOL_ADMIN);
    const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);
    const isParent = loginType === "parent";
    const isStudent = loginType === "student" || roles.includes(UserRole.STUDENT);

    if (!schoolId) {
        redirect("/dashboard");
    }

    if (!isAdmin && !isClassTeacher && !isParent && !isStudent) {
        redirect("/dashboard");
    }

    // Parent/Student currently use a different flow and do not need class/session filters.
    if (isParent || isStudent) {
        return (
            <ReportsClient
                initialSessions={[]}
                initialClasses={[]}
                sessionIdsByClassArm={{}}
            />
        );
    }

    const currentSession = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true }
    });
    const currentSessionId = currentSession?.id ?? null;

    let initialSessions: Session[] = [];
    let initialClasses: ClassArm[] = [];
    let sessionIdsByClassArm: SessionMap = {};

    if (isAdmin) {
        const [dbSessions, dbClasses] = await Promise.all([
            prisma.academicSession.findMany({
                where: { schoolId },
                include: { terms: { orderBy: { termNumber: "asc" } } },
                orderBy: { startDate: "desc" }
            }),
            prisma.class.findMany({
                where: { schoolId },
                include: { arms: true },
                orderBy: { name: "asc" }
            })
        ]);

        initialSessions = dbSessions.map((s) => ({
            id: s.id,
            name: s.name,
            isCurrent: s.isCurrent,
            terms: s.terms.map((t) => ({ id: t.id, name: t.name, isCurrent: t.isCurrent }))
        }));

        initialClasses = dbClasses.flatMap((c) =>
            c.arms.map((a) => ({
                id: a.id,
                armName: a.armName,
                class: { id: c.id, name: c.name }
            }))
        );

        const allSessionIds = initialSessions.map((entry) => entry.id);
        sessionIdsByClassArm = {};
        initialClasses.forEach((classArm) => {
            sessionIdsByClassArm[classArm.id] = allSessionIds;
        });
    } else {
        const assignedArms = await prisma.classArm.findMany({
            where: {
                classTeacherId: userId,
                class: { schoolId }
            },
            select: {
                id: true,
                armName: true,
                class: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { class: { name: "asc" } },
                { armName: "asc" }
            ]
        });

        initialClasses = assignedArms.map((arm) => ({
            id: arm.id,
            armName: arm.armName,
            class: { id: arm.class.id, name: arm.class.name }
        }));

        const assignedClassArmIds = assignedArms.map((arm) => arm.id);

        const sessionMapEntries = await Promise.all(
            assignedClassArmIds.map(async (classArmId) => {
                const sessionIds = await getSessionIdsForClassArm(
                    schoolId,
                    classArmId,
                    currentSessionId
                );
                return [classArmId, sessionIds] as const;
            })
        );

        sessionIdsByClassArm = Object.fromEntries(sessionMapEntries);

        const allSessionIds = Array.from(
            new Set(
                Object.values(sessionIdsByClassArm).flatMap((sessionIds) => sessionIds)
            )
        );

        const dbSessions = allSessionIds.length > 0
            ? await prisma.academicSession.findMany({
                where: {
                    schoolId,
                    id: { in: allSessionIds }
                },
                include: { terms: { orderBy: { termNumber: "asc" } } },
                orderBy: { startDate: "desc" }
            })
            : [];

        initialSessions = dbSessions.map((s) => ({
            id: s.id,
            name: s.name,
            isCurrent: s.isCurrent,
            terms: s.terms.map((t) => ({ id: t.id, name: t.name, isCurrent: t.isCurrent }))
        }));
    }

    return (
        <ReportsClient
            initialSessions={initialSessions}
            initialClasses={initialClasses}
            sessionIdsByClassArm={sessionIdsByClassArm}
        />
    );
}
