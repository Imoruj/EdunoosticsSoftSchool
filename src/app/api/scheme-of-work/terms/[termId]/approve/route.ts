import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { createUserNotification } from "@/lib/userNotifications";

// POST /api/scheme-of-work/terms/[termId]/approve
// Admin approves a term. Takes a frozen snapshot of all week data for lesson building.
// After approval the teacher can still freely edit the live week data.
export async function POST(req: NextRequest, { params }: { params: { termId: string } }) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const roles: string[] = user.roles || [];
        const schoolId = user.schoolId as string | undefined;

        if (!roles.includes(UserRole.SUPER_ADMIN) && !roles.includes(UserRole.SCHOOL_ADMIN)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const term = await prisma.schemeOfWorkTerm.findFirst({
            where: { id: params.termId },
            include: {
                schemeOfWork: { select: { id: true, schoolId: true, ownerId: true, title: true } },
                term: { select: { name: true } },
                weeks: {
                    orderBy: { weekNumber: "asc" },
                    include: {
                        references: { orderBy: { sortOrder: "asc" } },
                        sdgMappings: { where: { approved: true }, select: { sdgNumber: true } },
                    },
                },
            },
        });

        if (!term || term.schemeOfWork.schoolId !== schoolId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (term.status !== SowStatus.SUBMITTED) {
            return NextResponse.json({ error: "Only submitted terms can be approved" }, { status: 409 });
        }

        const body = await req.json().catch(() => ({}));
        const adminNote = body.adminNote?.trim() || null;

        // Build frozen snapshot of week data
        const approvedSnapshot = {
            snapshotAt: new Date().toISOString(),
            weeks: term.weeks.map((w) => ({
                weekId: w.id,
                weekNumber: w.weekNumber,
                topic: w.topic,
                content: w.content,
                objectives: w.objectives,
                waecObjectives: w.waecObjectives,
                jambObjectives: w.jambObjectives,
                igcseObjectives: w.igcseObjectives,
                objectiveSegments: w.objectiveSegments,
                references: w.references.map((r) => ({
                    id: r.id,
                    type: r.type,
                    title: r.title,
                    url: r.url,
                    fileKey: r.fileKey,
                    description: r.description,
                    sortOrder: r.sortOrder,
                })),
                sdgNumbers: w.sdgMappings.map((s) => s.sdgNumber),
            })),
        };

        const updated = await prisma.schemeOfWorkTerm.update({
            where: { id: params.termId },
            data: {
                status: SowStatus.APPROVED,
                approvedAt: new Date(),
                approvedById: user.id,
                adminNote,
                approvedSnapshot,
            },
        });

        // Also bump the SOW-level status to APPROVED if not already, so list views reflect it
        await prisma.schemeOfWork.update({
            where: { id: term.schemeOfWork.id },
            data: { status: SowStatus.APPROVED, approvedAt: new Date(), approvedById: user.id },
        });

        if (term.schemeOfWork.ownerId && term.schemeOfWork.ownerId !== user.id) {
            await createUserNotification({
                userId: term.schemeOfWork.ownerId,
                schoolId,
                type: "APPROVAL_APPROVED",
                title: "Scheme Of Work Approved",
                message: `${term.schemeOfWork.title} (${term.term?.name || `Term ${term.termNumber}`}) was approved.`,
                href: `/dashboard/scheme-of-work/${term.schemeOfWork.id}?term=${term.termNumber}`,
                metadata: {
                    schemeOfWorkId: term.schemeOfWork.id,
                    termId: term.id,
                    termNumber: term.termNumber,
                },
            });
        }

        return NextResponse.json({ term: updated });
    } catch (error) {
        console.error("[SOW term] approve error:", error);
        return NextResponse.json({ error: "Failed to approve term" }, { status: 500 });
    }
}
