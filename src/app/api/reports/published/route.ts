import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStudentSessionUser, resolveStudentRecordIdForUser } from "@/lib/student-session";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get("studentId");
    let studentIds: string[] = [];

    // For students, force their own ID (matches dashboard reports page: student login or STUDENT role)
    if (isStudentSessionUser(user) && !isAdmin) {
        const resolved = await resolveStudentRecordIdForUser(user);
        studentId = resolved ?? undefined;
        if (resolved) {
            studentIds = [resolved];
        }
    }

    // For parents, validate the student belongs to them
    if (user.loginType === "parent") {
        const parent = await prisma.parent.findUnique({
            where: { userId: user.id },
            include: {
                students: {
                    select: { id: true },
                },
            },
        });

        if (!parent || parent.students.length === 0) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (studentId) {
            const ownsStudent = parent.students.some((student) => student.id === studentId);
            if (!ownsStudent) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
            studentIds = [studentId];
        } else {
            studentIds = parent.students.map((student) => student.id);
        }
    }

    if (studentIds.length === 0 && studentId) {
        studentIds = [studentId];
    }

    if (studentIds.length === 0) {
        return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const reportCards = await prisma.reportCard.findMany({
        where: {
            studentId: { in: studentIds },
            isPublished: true
        },
        include: {
            student: {
                select: {
                    firstName: true,
                    lastName: true,
                    otherNames: true,
                },
            },
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
            studentId: { in: studentIds },
            status: "PUBLISHED",
        },
        select: {
            studentId: true,
            termId: true,
            reportType: true,
            publishedAt: true,
            downloadExpiresAt: true,
        },
    });

    const workflowByTerm = new Map<string, { reportType: string; publishedAt: Date | null; downloadExpiresAt: Date | null }>();
    workflowMeta.forEach((meta) => {
        const workflowKey = `${meta.studentId}:${meta.termId}`;
        const existing = workflowByTerm.get(workflowKey);
        if (!existing) {
            workflowByTerm.set(workflowKey, {
                reportType: meta.reportType,
                publishedAt: meta.publishedAt,
                downloadExpiresAt: meta.downloadExpiresAt,
            });
            return;
        }

        const existingTime = existing.downloadExpiresAt?.getTime() || 0;
        const nextTime = meta.downloadExpiresAt?.getTime() || 0;
        if (nextTime > existingTime) {
            workflowByTerm.set(workflowKey, {
                reportType: meta.reportType,
                publishedAt: meta.publishedAt,
                downloadExpiresAt: meta.downloadExpiresAt,
            });
        }
    });

    const formatted = reportCards
        .map((rc) => {
            const workflow = workflowByTerm.get(`${rc.studentId}:${rc.termId}`);
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
                studentName: [rc.student.lastName, rc.student.firstName, rc.student.otherNames].filter(Boolean).join(" "),
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
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });

    return NextResponse.json({ reportCards: formatted });
}

