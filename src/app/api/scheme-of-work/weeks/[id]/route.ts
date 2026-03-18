import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";

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

// PUT /api/scheme-of-work/weeks/[id] — update a week
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(params.id, user.id, schoolId);
        if (!week || !sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!isAdmin && sow.status !== SowStatus.DRAFT && sow.status !== SowStatus.REJECTED) {
            return NextResponse.json({ error: "Cannot edit a submitted or approved scheme of work" }, { status: 409 });
        }

        const body = await req.json();
        const { topic, content, objectives, resources, teachingMethods, assessment } = body;

        const updated = await prisma.schemeOfWorkWeek.update({
            where: { id: params.id },
            data: {
                topic: topic !== undefined ? topic.trim() : undefined,
                content: content !== undefined ? content : undefined,
                objectives: objectives !== undefined ? objectives : undefined,
                resources: resources !== undefined ? resources : undefined,
                teachingMethods: teachingMethods !== undefined ? teachingMethods : undefined,
                assessment: assessment !== undefined ? assessment : undefined,
            },
        });

        await prisma.schemeOfWork.update({ where: { id: sow.id }, data: { updatedAt: new Date() } });

        return NextResponse.json({ week: updated });
    } catch (error) {
        console.error("[SOW weeks] PUT error:", error);
        return NextResponse.json({ error: "Failed to update week" }, { status: 500 });
    }
}

// DELETE /api/scheme-of-work/weeks/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(params.id, user.id, schoolId);
        if (!week || !sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!isAdmin && sow.status !== SowStatus.DRAFT && sow.status !== SowStatus.REJECTED) {
            return NextResponse.json({ error: "Cannot delete from a submitted or approved scheme of work" }, { status: 409 });
        }

        await prisma.schemeOfWorkWeek.delete({ where: { id: params.id } });
        await prisma.schemeOfWork.update({ where: { id: sow.id }, data: { updatedAt: new Date() } });

        return NextResponse.json({ message: "Week deleted" });
    } catch (error) {
        console.error("[SOW weeks] DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete week" }, { status: 500 });
    }
}
