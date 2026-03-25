export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
    SessionMap,
    getSessionIdsByClassArms,
} from "@/lib/classArmSessionMap";

type SessionUser = {
    id?: string;
    schoolId?: string;
    roles?: string[];
};

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as SessionUser;
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
                { error: "Unauthorized: Only admin and class teachers can access assessments." },
                { status: 403 }
            );
        }

        const currentSession = await prisma.academicSession.findFirst({
            where: { schoolId, isCurrent: true },
            select: { id: true }
        });
        const currentSessionId = currentSession?.id ?? null;

        if (isAdmin) {
            const [dbSessions, dbClasses] = await Promise.all([
                prisma.academicSession.findMany({
                    where: { schoolId },
                    orderBy: { startDate: "desc" },
                    include: {
                        terms: { orderBy: { termNumber: "asc" } }
                    }
                }),
                prisma.class.findMany({
                    where: { schoolId },
                    include: { arms: true },
                    orderBy: { name: "asc" }
                })
            ]);

            const sessions = dbSessions.map((s) => ({
                id: s.id,
                name: s.name,
                isCurrent: s.isCurrent,
                terms: s.terms.map((t) => ({
                    id: t.id,
                    name: t.name,
                    isCurrent: t.isCurrent
                }))
            }));

            const classes = dbClasses.flatMap((cls) =>
                cls.arms.map((arm) => ({
                    id: arm.id,
                    armName: arm.armName,
                    class: {
                        id: cls.id,
                        name: cls.name
                    }
                }))
            );

            const allSessionIds = sessions.map((s) => s.id);
            const sessionIdsByClassArm: SessionMap = {};
            classes.forEach((classArm) => {
                sessionIdsByClassArm[classArm.id] = allSessionIds;
            });

            return NextResponse.json({
                sessions,
                classes,
                sessionIdsByClassArm
            });
        }

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

        if (assignedArms.length === 0) {
            return NextResponse.json({
                sessions: [],
                classes: [],
                sessionIdsByClassArm: {}
            });
        }

        const sessionIdsByClassArm = await getSessionIdsByClassArms(
            schoolId,
            assignedArms.map((classArm) => classArm.id),
            currentSessionId
        );
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
                orderBy: { startDate: "desc" },
                include: {
                    terms: { orderBy: { termNumber: "asc" } }
                }
            })
            : [];

        const sessions = dbSessions.map((s) => ({
            id: s.id,
            name: s.name,
            isCurrent: s.isCurrent,
            terms: s.terms.map((t) => ({
                id: t.id,
                name: t.name,
                isCurrent: t.isCurrent
            }))
        }));

        const classes = assignedArms.map((classArm) => ({
            id: classArm.id,
            armName: classArm.armName,
            class: {
                id: classArm.class.id,
                name: classArm.class.name
            }
        }));

        return NextResponse.json({
            sessions,
            classes,
            sessionIdsByClassArm
        });
    } catch (error: unknown) {
        console.error("Error fetching assessment metadata:", error);
        return NextResponse.json(
            { error: "Failed to fetch assessment metadata" },
            { status: 500 }
        );
    }
}

