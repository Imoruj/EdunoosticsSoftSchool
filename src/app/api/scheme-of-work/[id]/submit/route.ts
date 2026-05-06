import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;

        const sow = await prisma.schemeOfWork.findFirst({
            where: { id: id, schoolId },
            include: { terms: { include: { weeks: { select: { id: true } } } } },
        });
        if (!sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (sow.ownerId !== user.id) {
            return NextResponse.json({ error: "Only the owner can submit for review" }, { status: 403 });
        }

        if (sow.status !== SowStatus.DRAFT && sow.status !== SowStatus.REJECTED) {
            return NextResponse.json({ error: "Only draft or rejected SOWs can be submitted" }, { status: 409 });
        }

        const totalWeeks = sow.terms.reduce((sum, t) => sum + t.weeks.length, 0);
        if (totalWeeks === 0) {
            return NextResponse.json({ error: "Add at least one week before submitting for review" }, { status: 400 });
        }

        const updated = await prisma.schemeOfWork.update({
            where: { id: id },
            data: { status: SowStatus.SUBMITTED, submittedAt: new Date(), adminNote: null },
        });

        return NextResponse.json({ schemeOfWork: updated });
    } catch (error) {
        console.error("[SOW] submit error:", error);
        return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
    }
}
