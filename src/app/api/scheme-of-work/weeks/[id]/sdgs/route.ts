import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
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

// GET /api/scheme-of-work/weeks/[id]/sdgs
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

        const sdgs = await prisma.schemeOfWorkWeekSdg.findMany({
            where: { weekId: params.id },
            orderBy: { sdgNumber: "asc" },
        });

        return NextResponse.json({ sdgs });
    } catch (error) {
        console.error("[SOW sdgs] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch SDGs" }, { status: 500 });
    }
}

// POST /api/scheme-of-work/weeks/[id]/sdgs — upsert an SDG entry
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
        const { sdgNumber, aiSuggested, approved } = body;

        if (!sdgNumber || sdgNumber < 1 || sdgNumber > 17) {
            return NextResponse.json({ error: "SDG number must be 1–17" }, { status: 400 });
        }

        const sdg = await prisma.schemeOfWorkWeekSdg.upsert({
            where: { weekId_sdgNumber: { weekId: params.id, sdgNumber } },
            create: {
                weekId: params.id,
                sdgNumber,
                aiSuggested: aiSuggested ?? false,
                approved: approved ?? false,
            },
            update: {
                aiSuggested: aiSuggested !== undefined ? aiSuggested : undefined,
                approved: approved !== undefined ? approved : undefined,
            },
        });

        return NextResponse.json({ sdg }, { status: 201 });
    } catch (error) {
        console.error("[SOW sdgs] POST error:", error);
        return NextResponse.json({ error: "Failed to save SDG" }, { status: 500 });
    }
}

// DELETE /api/scheme-of-work/weeks/[id]/sdgs?sdgNumber=N
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
        const sdgNumber = parseInt(new URL(req.url).searchParams.get("sdgNumber") ?? "0");
        if (!sdgNumber || sdgNumber < 1 || sdgNumber > 17) {
            return NextResponse.json({ error: "Invalid SDG number" }, { status: 400 });
        }

        await prisma.schemeOfWorkWeekSdg.deleteMany({
            where: { weekId: params.id, sdgNumber },
        });

        return NextResponse.json({ message: "SDG removed" });
    } catch (error) {
        console.error("[SOW sdgs] DELETE error:", error);
        return NextResponse.json({ error: "Failed to remove SDG" }, { status: 500 });
    }
}
