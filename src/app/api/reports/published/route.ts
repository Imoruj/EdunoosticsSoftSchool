import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get("studentId");

    // For students, force their own ID
    if (user.loginType === "student") {
        studentId = user.loginProfileId;
    }

    // For parents, validate the student belongs to them
    if (user.loginType === "parent") {
        if (!studentId) {
            return NextResponse.json({ error: "studentId required" }, { status: 400 });
        }
        const parent = await prisma.parent.findUnique({
            where: { userId: user.id },
            include: { students: { where: { id: studentId }, select: { id: true } } }
        });
        if (!parent || parent.students.length === 0) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
    }

    if (!studentId) {
        return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const reportCards = await prisma.reportCard.findMany({
        where: {
            studentId,
            isPublished: true
        },
        include: {
            term: {
                include: {
                    session: true
                }
            },
            classArm: {
                include: {
                    class: true
                }
            }
        }
    });

    const workflowMeta = await prisma.studentReportWorkflow.findMany({
        where: {
            studentId,
            status: "PUBLISHED",
        },
        select: {
            termId: true,
            reportType: true,
            publishedAt: true,
            downloadExpiresAt: true,
        },
    });

    const workflowByTerm = new Map<string, { reportType: string; publishedAt: Date | null; downloadExpiresAt: Date | null }>();
    workflowMeta.forEach((meta) => {
        const existing = workflowByTerm.get(meta.termId);
        if (!existing) {
            workflowByTerm.set(meta.termId, {
                reportType: meta.reportType,
                publishedAt: meta.publishedAt,
                downloadExpiresAt: meta.downloadExpiresAt,
            });
            return;
        }

        const existingTime = existing.downloadExpiresAt?.getTime() || 0;
        const nextTime = meta.downloadExpiresAt?.getTime() || 0;
        if (nextTime > existingTime) {
            workflowByTerm.set(meta.termId, {
                reportType: meta.reportType,
                publishedAt: meta.publishedAt,
                downloadExpiresAt: meta.downloadExpiresAt,
            });
        }
    });

    const formatted = reportCards
        .map((rc) => {
            const workflow = workflowByTerm.get(rc.termId);
            const expiresAt = workflow?.downloadExpiresAt || (rc.publishedAt ? new Date(rc.publishedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null);
            const now = Date.now();
            const canDownload = !!expiresAt && expiresAt.getTime() >= now;

            return {
                id: rc.id,
                termId: rc.termId,
                termName: rc.term.name,
                termNumber: rc.term.termNumber,
                sessionId: rc.term.sessionId,
                sessionName: rc.term.session.name,
                average: rc.average?.toNumber() ?? null,
                classPosition: rc.classPosition,
                classSize: rc.classSize,
                publishedAt: rc.publishedAt?.toISOString() ?? rc.createdAt.toISOString(),
                className: `${rc.classArm.class.name} ${rc.classArm.armName}`,
                reportType: workflow?.reportType === "HALF_TERM" ? "halfTerm" : "endOfTerm",
                downloadExpiresAt: expiresAt ? expiresAt.toISOString() : null,
                canDownload,
            };
        })
        .sort((a, b) => {
            const sessionCompare = b.sessionName.localeCompare(a.sessionName);
            if (sessionCompare !== 0) return sessionCompare;
            return b.termNumber - a.termNumber;
        });

    return NextResponse.json({ reportCards: formatted });
}
