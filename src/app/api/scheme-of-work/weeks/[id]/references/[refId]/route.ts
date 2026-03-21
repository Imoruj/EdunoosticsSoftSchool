import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";

async function resolveWeekAccess(weekId: string, userId: string, schoolId: string) {
    const week = await prisma.schemeOfWorkWeek.findFirst({
        where: { id: weekId },
        include: {
            schemeOfWorkTerm: {
                include: {
                    schemeOfWork: { include: { collaborators: { select: { userId: true } } } },
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

// DELETE /api/scheme-of-work/weeks/[id]/references/[refId]
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string; refId: string } }
) {
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
        const ref = await prisma.schemeOfWorkWeekReference.findFirst({
            where: { id: params.refId, weekId: params.id },
        });
        if (!ref) return NextResponse.json({ error: "Reference not found" }, { status: 404 });

        await prisma.schemeOfWorkWeekReference.delete({ where: { id: params.refId } });
        await prisma.schemeOfWork.update({ where: { id: sow.id }, data: { updatedAt: new Date() } });

        return NextResponse.json({ message: "Reference deleted" });
    } catch (error) {
        console.error("[SOW references] DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete reference" }, { status: 500 });
    }
}
