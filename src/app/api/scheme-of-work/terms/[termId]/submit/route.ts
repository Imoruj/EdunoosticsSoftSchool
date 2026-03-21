import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";

// POST /api/scheme-of-work/terms/[termId]/submit
// Owner submits a specific term for admin review (independent of other terms).
export async function POST(req: NextRequest, { params }: { params: { termId: string } }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId as string | undefined;

        const term = await prisma.schemeOfWorkTerm.findFirst({
            where: { id: params.termId },
            include: {
                schemeOfWork: { select: { id: true, schoolId: true, ownerId: true } },
                weeks: { select: { id: true } },
            },
        });

        if (!term || term.schemeOfWork.schoolId !== schoolId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (term.schemeOfWork.ownerId !== user.id) {
            return NextResponse.json({ error: "Only the SOW owner can submit terms for review" }, { status: 403 });
        }

        if (term.status !== SowStatus.DRAFT && term.status !== SowStatus.REJECTED) {
            return NextResponse.json({ error: "Only draft or rejected terms can be submitted" }, { status: 409 });
        }

        if (term.weeks.length === 0) {
            return NextResponse.json({ error: "Add at least one week before submitting for review" }, { status: 400 });
        }

        const updated = await prisma.schemeOfWorkTerm.update({
            where: { id: params.termId },
            data: { status: SowStatus.SUBMITTED, submittedAt: new Date(), adminNote: null },
        });

        return NextResponse.json({ term: updated });
    } catch (error) {
        console.error("[SOW term] submit error:", error);
        return NextResponse.json({ error: "Failed to submit term" }, { status: 500 });
    }
}
