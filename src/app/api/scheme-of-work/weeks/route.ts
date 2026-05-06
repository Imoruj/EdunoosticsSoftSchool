import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// POST /api/scheme-of-work/weeks — create a week
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const body = await req.json();
        const { schemeOfWorkTermId, weekNumber, topic, content, objectives, resources, teachingMethods, assessment } = body;

        if (!schemeOfWorkTermId || !weekNumber || !topic?.trim()) {
            return NextResponse.json({ error: "schemeOfWorkTermId, weekNumber, and topic are required" }, { status: 400 });
        }

        // Resolve SOW through the term
        const sowTerm = await prisma.schemeOfWorkTerm.findFirst({
            where: { id: schemeOfWorkTermId },
            include: {
                schemeOfWork: {
                    include: { collaborators: { select: { userId: true } } },
                },
            },
        });
        if (!sowTerm || sowTerm.schemeOfWork.schoolId !== schoolId) {
            return NextResponse.json({ error: "Term not found" }, { status: 404 });
        }

        const sow = sowTerm.schemeOfWork;
        const isOwner = sow.ownerId === user.id;
        const isCollaborator = sow.collaborators.some((c) => c.userId === user.id);

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!isAdmin && sow.status !== SowStatus.DRAFT && sow.status !== SowStatus.REJECTED) {
            return NextResponse.json({ error: "Cannot edit a submitted or approved scheme of work" }, { status: 409 });
        }

        const week = await prisma.schemeOfWorkWeek.create({
            data: {
                schemeOfWorkTermId,
                weekNumber: parseInt(weekNumber),
                topic: topic.trim(),
                content: content || null,
                objectives: objectives || null,
                resources: resources || null,
                teachingMethods: teachingMethods || null,
                assessment: assessment || null,
            },
        });

        // Touch the SOW updatedAt
        await prisma.schemeOfWork.update({ where: { id: sow.id }, data: { updatedAt: new Date() } });

        return NextResponse.json({ week }, { status: 201 });
    } catch (error: any) {
        console.error("[SOW weeks] POST error:", error);
        if (error.code === "P2002") {
            return NextResponse.json({ error: "Week number already exists in this term" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create week" }, { status: 500 });
    }
}

