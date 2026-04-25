import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";

const VALID_TYPES = ["TEXT", "IMAGE", "AUDIO", "YOUTUBE", "FILE", "GOOGLE_DRIVE"];

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

// GET /api/scheme-of-work/weeks/[id]/references
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(id, user.id, user.schoolId);
        if (!week || !sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const references = await prisma.schemeOfWorkWeekReference.findMany({
            where: { weekId: id },
            orderBy: { sortOrder: "asc" },
        });

        return NextResponse.json({ references });
    } catch (error) {
        console.error("[SOW references] GET error:", error);
        return NextResponse.json({ error: "Failed to fetch references" }, { status: 500 });
    }
}

// POST /api/scheme-of-work/weeks/[id]/references
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { week, sow, isOwner, isCollaborator } = await resolveWeekAccess(id, user.id, user.schoolId);
        if (!week || !sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const body = await req.json();
        const { type, title, url, fileKey, description, sortOrder } = body;

        if (!type || !VALID_TYPES.includes(type)) {
            return NextResponse.json({ error: "Invalid reference type" }, { status: 400 });
        }
        if (!title?.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }
        if (!url && !fileKey) {
            return NextResponse.json({ error: "URL or file is required" }, { status: 400 });
        }

        const reference = await prisma.schemeOfWorkWeekReference.create({
            data: {
                weekId: id,
                type,
                title: title.trim(),
                url: url ?? null,
                fileKey: fileKey ?? null,
                description: description?.trim() ?? null,
                sortOrder: sortOrder ?? 0,
            },
        });

        await prisma.schemeOfWork.update({ where: { id: sow.id }, data: { updatedAt: new Date() } });

        return NextResponse.json({ reference }, { status: 201 });
    } catch (error) {
        console.error("[SOW references] POST error:", error);
        return NextResponse.json({ error: "Failed to create reference" }, { status: 500 });
    }
}
