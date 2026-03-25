import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { createUserNotifications, getSchoolAdminUserIds } from "@/lib/userNotifications";

// POST /api/scheme-of-work/terms/[termId]/submit
// Owner submits a term for admin review. Works for DRAFT, REJECTED, and APPROVED terms
// (APPROVED → re-submission lets admin review any post-approval edits).
export async function POST(req: NextRequest, { params }: { params: { termId: string } }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId as string | undefined;
        const actorName = (user.name as string) || "A teacher";

        const term = await prisma.schemeOfWorkTerm.findFirst({
            where: { id: params.termId },
            include: {
                schemeOfWork: { select: { id: true, schoolId: true, ownerId: true, title: true } },
                term: { select: { name: true } },
                weeks: { select: { id: true } },
            },
        });

        if (!term || term.schemeOfWork.schoolId !== schoolId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (term.schemeOfWork.ownerId !== user.id) {
            return NextResponse.json({ error: "Only the SOW owner can submit terms for review" }, { status: 403 });
        }

        if (term.status === SowStatus.SUBMITTED) {
            return NextResponse.json({ error: "Term is already under review" }, { status: 409 });
        }

        if (term.weeks.length === 0) {
            return NextResponse.json({ error: "Add at least one week before submitting for review" }, { status: 400 });
        }

        const updated = await prisma.schemeOfWorkTerm.update({
            where: { id: params.termId },
            data: { status: SowStatus.SUBMITTED, submittedAt: new Date(), adminNote: null },
        });

        const adminIds = await getSchoolAdminUserIds(schoolId, user.id);
        await createUserNotifications(adminIds, {
            schoolId,
            type: "APPROVAL_REQUESTED",
            title: "Scheme Of Work Needs Review",
            message: `${actorName} requested review for ${term.schemeOfWork.title} (${term.term?.name || `Term ${term.termNumber}`}).`,
            href: `/dashboard/scheme-of-work/${term.schemeOfWork.id}?term=${term.termNumber}`,
            metadata: {
                schemeOfWorkId: term.schemeOfWork.id,
                termId: term.id,
                termNumber: term.termNumber,
            },
        });

        return NextResponse.json({ term: updated });
    } catch (error) {
        console.error("[SOW term] submit error:", error);
        return NextResponse.json({ error: "Failed to submit term" }, { status: 500 });
    }
}
