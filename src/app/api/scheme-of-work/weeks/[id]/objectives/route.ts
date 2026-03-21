import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { Prisma, UserRole } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { normalizeObjectivePayload } from "@/lib/sowObjectiveSegments";

async function resolveWeekAccess(weekId: string, userId: string, schoolId: string) {
    const week = await prisma.schemeOfWorkWeek.findFirst({
        where: { id: weekId },
        include: {
            schemeOfWorkTerm: {
                include: {
                    schemeOfWork: {
                        include: { collaborators: { select: { userId: true } } },
                    },
                },
            },
        },
    });
    if (!week) return { week: null, sow: null, isOwner: false, isCollaborator: false };

    const sow = week.schemeOfWorkTerm.schemeOfWork;
    if (sow.schoolId !== schoolId) return { week: null, sow: null, isOwner: false, isCollaborator: false };

    const isOwner = sow.ownerId === userId;
    const isCollaborator = sow.collaborators.some((c) => c.userId === userId);
    return { week, sow, isOwner, isCollaborator };
}

// PUT /api/scheme-of-work/weeks/[id]/objectives — save objectives fields
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(params.id, user.id, user.schoolId);
        if (!week || !sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const body = await req.json();
        const { objectives, waecObjectives, jambObjectives, igcseObjectives, objectivesApproved } = body;
        const normalized = normalizeObjectivePayload({
            objectives,
            waecObjectives,
            jambObjectives,
            igcseObjectives,
        });

        const updated = await prisma.schemeOfWorkWeek.update({
            where: { id: params.id },
            data: {
                objectives: objectives !== undefined ? normalized.objectives : undefined,
                waecObjectives: waecObjectives !== undefined ? normalized.waecObjectives : undefined,
                jambObjectives: jambObjectives !== undefined ? normalized.jambObjectives : undefined,
                igcseObjectives: igcseObjectives !== undefined ? normalized.igcseObjectives : undefined,
                objectiveSegments: normalized.objectiveSegments as unknown as Prisma.InputJsonValue,
                objectivesApproved: objectivesApproved !== undefined ? objectivesApproved : undefined,
            },
        });

        await prisma.schemeOfWork.update({ where: { id: sow.id }, data: { updatedAt: new Date() } });

        return NextResponse.json({ week: updated });
    } catch (error) {
        console.error("[SOW objectives] PUT error:", error);
        return NextResponse.json({ error: "Failed to save objectives" }, { status: 500 });
    }
}
