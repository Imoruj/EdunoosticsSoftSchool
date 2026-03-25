import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";

// GET /api/scheme-of-work/[id]/collaborators
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const sow = await prisma.schemeOfWork.findFirst({ where: { id: params.id, schoolId } });
        if (!sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && sow.ownerId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const collaborators = await prisma.schemeOfWorkCollaborator.findMany({
            where: { schemeOfWorkId: params.id },
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json({ collaborators });
    } catch (error) {
        console.error("[SOW] collaborators GET error:", error);
        return NextResponse.json({ error: "Failed to fetch collaborators" }, { status: 500 });
    }
}

// POST /api/scheme-of-work/[id]/collaborators — add collaborator
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const sow = await prisma.schemeOfWork.findFirst({ where: { id: params.id, schoolId } });
        if (!sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && sow.ownerId !== user.id) {
            return NextResponse.json({ error: "Only the owner can add collaborators" }, { status: 403 });
        }

        const { userId } = await req.json();
        if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

        if (userId === sow.ownerId) {
            return NextResponse.json({ error: "Owner is already the creator" }, { status: 400 });
        }

        // Validate user belongs to same school and is a teacher
        const targetUser = await prisma.user.findFirst({
            where: {
                id: userId,
                schoolId,
                roles: { hasSome: [UserRole.SUBJECT_TEACHER, UserRole.CLASS_TEACHER, UserRole.SCHOOL_ADMIN] },
            },
            select: { id: true, firstName: true, lastName: true, email: true },
        });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found or not a teacher in this school" }, { status: 400 });
        }

        const collaborator = await prisma.schemeOfWorkCollaborator.create({
            data: { schemeOfWorkId: params.id, userId, invitedById: user.id },
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
        });

        return NextResponse.json({ collaborator }, { status: 201 });
    } catch (error: any) {
        console.error("[SOW] collaborators POST error:", error);
        if (error.code === "P2002") {
            return NextResponse.json({ error: "User is already a collaborator" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to add collaborator" }, { status: 500 });
    }
}

// DELETE /api/scheme-of-work/[id]/collaborators?userId=xxx
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

        const sow = await prisma.schemeOfWork.findFirst({ where: { id: params.id, schoolId } });
        if (!sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && sow.ownerId !== user.id) {
            return NextResponse.json({ error: "Only the owner can remove collaborators" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        if (!userId) return NextResponse.json({ error: "userId query param required" }, { status: 400 });

        await prisma.schemeOfWorkCollaborator.deleteMany({
            where: { schemeOfWorkId: params.id, userId },
        });

        return NextResponse.json({ message: "Collaborator removed" });
    } catch (error) {
        console.error("[SOW] collaborators DELETE error:", error);
        return NextResponse.json({ error: "Failed to remove collaborator" }, { status: 500 });
    }
}
