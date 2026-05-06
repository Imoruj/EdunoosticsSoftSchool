import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { resolveVisibleSubjectIdsForStudent } from "@/lib/studentAudience";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

const SOW_FULL_INCLUDE = {
    terms: {
        orderBy: { termNumber: "asc" as const },
        include: {
            term: { select: { id: true, name: true, termNumber: true, startDate: true, endDate: true } },
            weeks: {
                    orderBy: { weekNumber: "asc" as const },
                    include: {
                        references: { orderBy: { sortOrder: "asc" as const } },
                        sdgMappings: { orderBy: { sdgNumber: "asc" as const } },
                    },
                },
        },
    },
    subject: { select: { id: true, name: true, code: true } },
    class: { select: { id: true, name: true } },
    classArms: {
        include: { classArm: { select: { id: true, armName: true } } },
        orderBy: { createdAt: "asc" as const },
    },
    session: { select: { id: true, name: true, startDate: true, endDate: true } },
    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    approvedBy: { select: { id: true, firstName: true, lastName: true } },
    collaborators: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" as const },
    },
};

type SchemeOfWorkTermForResponse = {
    status: SowStatus;
    submittedAt: Date | null;
    approvedAt: Date | null;
    approvedById: string | null;
    approvedSnapshot: unknown;
    adminNote: string | null;
    weeks: unknown[];
};

function normalizeTermApprovalState<T extends SchemeOfWorkTermForResponse>(term: T): T {
    const isLegacyEmptyApprovedTerm =
        term.status === SowStatus.APPROVED &&
        term.weeks.length === 0 &&
        !term.submittedAt &&
        !term.approvedSnapshot;

    if (!isLegacyEmptyApprovedTerm) return term;

    return {
        ...term,
        status: SowStatus.DRAFT,
        approvedAt: null,
        approvedById: null,
        adminNote: null,
    };
}

function normalizeSchemeOfWorkForResponse<T extends { terms: SchemeOfWorkTermForResponse[] }>(schemeOfWork: T): T {
    return {
        ...schemeOfWork,
        terms: schemeOfWork.terms.map(normalizeTermApprovalState),
    };
}

async function resolveAccess(sowId: string, userId: string, schoolId: string) {
    if (!schoolId) return { sow: null, isOwner: false, isCollaborator: false };

    const sow = await prisma.schemeOfWork.findFirst({
        where: { id: sowId, schoolId },
        include: { collaborators: { select: { userId: true } } },
    });
    if (!sow) return { sow: null, isOwner: false, isCollaborator: false };
    const isOwner = sow.ownerId === userId;
    const isCollaborator = sow.collaborators.some((c) => c.userId === userId);
    return { sow, isOwner, isCollaborator };
}

// GET /api/scheme-of-work/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);
        const isStudent = roles.includes(UserRole.STUDENT) || user.loginType === "student";
        if (!schoolId) return NextResponse.json({ error: "No school associated" }, { status: 400 });

        const { id } = await params;
        const sowId = id?.trim();
        if (!sowId) {
            return NextResponse.json({ error: "Scheme of work id is required" }, { status: 400 });
        }

        const full = await prisma.schemeOfWork.findFirst({
            where: { id: sowId, schoolId },
            include: SOW_FULL_INCLUDE,
        });
        if (!full) return NextResponse.json({ error: "Scheme of work not found" }, { status: 404 });

        const isOwner = full.ownerId === user.id;
        const isCollaborator = full.collaborators.some((c) => c.userId === user.id);

        if (isStudent) {
            const studentProfile = await prisma.student.findUnique({
                where: { userId: user.id },
                select: {
                    id: true,
                    classArmId: true,
                    classArm: { select: { classId: true } },
                },
            });

            const visibleSubjectIds = new Set(
                studentProfile?.id && studentProfile.classArmId
                    ? await resolveVisibleSubjectIdsForStudent({
                        schoolId,
                        studentId: studentProfile.id,
                        classArmId: studentProfile.classArmId,
                    })
                    : []
            );
            const hasArmRestriction = full.classArms.length > 0;
            const matchesClass =
                !!studentProfile?.classArm?.classId &&
                full.class.id === studentProfile.classArm.classId;
            const matchesArm =
                !hasArmRestriction ||
                full.classArms.some((entry) => entry.classArm.id === studentProfile?.classArmId);

            if (
                full.status !== SowStatus.APPROVED ||
                !matchesClass ||
                !matchesArm ||
                !visibleSubjectIds.has(full.subject.id)
            ) {
                return NextResponse.json({ error: "Not found" }, { status: 404 });
            }
        }

        // Non-admin teachers must be owner or collaborator
        if (!isAdmin && !isStudent && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ schemeOfWork: normalizeSchemeOfWorkForResponse(full) });
    } catch (error: any) {
        console.error("[SOW] GET/:id error:", error);
        return NextResponse.json({
            error: "Failed to fetch scheme of work",
            detail: process.env.NODE_ENV === "development" ? String(error?.message || error) : undefined,
        }, { status: 500 });
    }
}

// PUT /api/scheme-of-work/[id] — update title or objectives
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { id } = await params;
        const { sow, isOwner, isCollaborator } = await resolveAccess(id, user.id, schoolId);
        if (!sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner && !isCollaborator) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { title, adminNote } = body;

        const updateData: any = {};
        if (title !== undefined) updateData.title = title.trim();
        // Only admin can set/clear adminNote
        if (adminNote !== undefined && isAdmin) updateData.adminNote = adminNote;

        const updated = await prisma.schemeOfWork.update({
            where: { id },
            data: updateData,
            include: SOW_FULL_INCLUDE,
        });

        return NextResponse.json({ schemeOfWork: normalizeSchemeOfWorkForResponse(updated) });
    } catch (error) {
        console.error("[SOW] PUT error:", error);
        return NextResponse.json({ error: "Failed to update scheme of work" }, { status: 500 });
    }
}

// DELETE /api/scheme-of-work/[id] — owner only, DRAFT only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);

        const { id } = await params;
        const { sow, isOwner } = await resolveAccess(id, user.id, schoolId);
        if (!sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        if (!isAdmin && sow.status !== SowStatus.DRAFT) {
            return NextResponse.json({ error: "Only draft schemes of work can be deleted" }, { status: 409 });
        }

        await prisma.schemeOfWork.delete({ where: { id } });

        return NextResponse.json({ message: "Scheme of work deleted" });
    } catch (error) {
        console.error("[SOW] DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete scheme of work" }, { status: 500 });
    }
}
