import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { syncCurrentTerm } from "@/lib/currentTerm";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        await syncCurrentTerm(schoolId);

        const [classes, currentSession, latestSession] = await Promise.all([
            prisma.class.findMany({
                where: { schoolId },
                include: {
                    arms: {
                        orderBy: { armName: "asc" },
                        select: {
                            id: true,
                            armName: true,
                        },
                    },
                },
                orderBy: { name: "asc" },
            }),
            prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                include: {
                    terms: {
                        orderBy: { termNumber: "asc" },
                        select: {
                            id: true,
                            name: true,
                            isCurrent: true,
                        },
                    },
                },
            }),
            prisma.academicSession.findFirst({
                where: { schoolId },
                orderBy: { startDate: "desc" },
                include: {
                    terms: {
                        orderBy: { termNumber: "asc" },
                        select: {
                            id: true,
                            name: true,
                            isCurrent: true,
                        },
                    },
                },
            }),
        ]);

        const selectedSession = currentSession || latestSession;
        const selectedTerm = selectedSession?.terms.find((term) => term.isCurrent) || selectedSession?.terms[0] || null;

        return NextResponse.json({
            classes: classes.map((item) => ({
                id: item.id,
                name: item.name,
                arms: item.arms,
            })),
            currentSession: selectedSession
                ? {
                    id: selectedSession.id,
                    name: selectedSession.name,
                }
                : null,
            currentTerm: selectedTerm
                ? {
                    id: selectedTerm.id,
                    name: selectedTerm.name,
                }
                : null,
        });
    } catch (error) {
        console.error("Error fetching dummy sheet metadata:", error);
        return NextResponse.json(
            { error: "Failed to fetch dummy metadata" },
            { status: 500 }
        );
    }
}
