import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { createUserNotification } from "@/lib/userNotifications";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// POST /api/scheme-of-work/terms/[termId]/reject
// Admin rejects a term with a required reason. Teacher can revise and resubmit.
export async function POST(req: NextRequest, { params }: { params: Promise<{ termId: string }> }) {
    const { termId } = await params;
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const roles: string[] = user.roles || [];
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;

        if (!roles.includes(UserRole.SUPER_ADMIN) && !roles.includes(UserRole.SCHOOL_ADMIN)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const term = await prisma.schemeOfWorkTerm.findFirst({
            where: { id: termId },
            include: {
                schemeOfWork: { select: { id: true, schoolId: true, ownerId: true, title: true } },
                term: { select: { name: true } },
            },
        });

        if (!term || term.schemeOfWork.schoolId !== schoolId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (term.status !== SowStatus.SUBMITTED) {
            return NextResponse.json({ error: "Only submitted terms can be rejected" }, { status: 409 });
        }

        const body = await req.json();
        const { adminNote } = body;

        if (!adminNote?.trim()) {
            return NextResponse.json({ error: "A reason is required when rejecting" }, { status: 400 });
        }

        const updated = await prisma.schemeOfWorkTerm.update({
            where: { id: termId },
            data: {
                status: SowStatus.REJECTED,
                adminNote: adminNote.trim(),
                approvedAt: null,
                approvedById: null,
                approvedSnapshot: undefined,
            },
        });

        if (term.schemeOfWork.ownerId && term.schemeOfWork.ownerId !== user.id) {
            await createUserNotification({
                userId: term.schemeOfWork.ownerId,
                schoolId,
                type: "APPROVAL_REJECTED",
                title: "Scheme Of Work Rejected",
                message: `${term.schemeOfWork.title} (${term.term?.name || `Term ${term.termNumber}`}) was rejected. ${adminNote.trim()}`.trim(),
                href: `/dashboard/scheme-of-work/${term.schemeOfWork.id}?term=${term.termNumber}`,
                metadata: {
                    schemeOfWorkId: term.schemeOfWork.id,
                    termId: term.id,
                    termNumber: term.termNumber,
                    note: adminNote.trim(),
                },
            });
        }

        return NextResponse.json({ term: updated });
    } catch (error) {
        console.error("[SOW term] reject error:", error);
        return NextResponse.json({ error: "Failed to reject term" }, { status: 500 });
    }
}
