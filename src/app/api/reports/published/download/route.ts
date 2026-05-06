import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isStudentSessionUser, resolveStudentRecordIdForUser } from "@/lib/student-session";
import { generateReportCardData, generateReportCardStream } from "@/services/reportService";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

function toClientReportType(reportType?: string | null): "halfTerm" | "endOfTerm" {
    return reportType === "HALF_TERM" ? "halfTerm" : "endOfTerm";
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const activeSchoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN") || roles.includes("PROPRIETOR");
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        const { searchParams } = new URL(req.url);
        const reportCardId = searchParams.get("reportCardId");
        if (!reportCardId) {
            return NextResponse.json({ error: "reportCardId is required" }, { status: 400 });
        }

        const reportCard = await prisma.reportCard.findUnique({
            where: { id: reportCardId },
            include: {
                student: {
                    select: {
                        id: true,
                        admissionNumber: true,
                        classArmId: true,
                    },
                },
                term: {
                    select: { id: true, name: true },
                },
                classArm: {
                    select: {
                        id: true,
                        classTeacherId: true,
                        class: { select: { schoolId: true } },
                    },
                },
            },
        });

        if (!reportCard) {
            return NextResponse.json({ error: "Report card not found" }, { status: 404 });
        }

        const schoolId = reportCard.classArm.class.schoolId;
        if (activeSchoolId && activeSchoolId !== schoolId && !isAdmin) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (isStudentSessionUser(user) && !isAdmin) {
            const viewerStudentId = await resolveStudentRecordIdForUser(user);
            if (!viewerStudentId || viewerStudentId !== reportCard.studentId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        } else if (user.loginType === "parent") {
            const parent = await prisma.parent.findUnique({
                where: { userId: user.id },
                include: {
                    students: {
                        where: { id: reportCard.studentId },
                        select: { id: true },
                    },
                },
            });
            if (!parent || parent.students.length === 0) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        } else if (!isAdmin && isClassTeacher) {
            if (reportCard.classArm.classTeacherId !== user.id) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        }

        if (!reportCard.isPublished && !isAdmin) {
            return NextResponse.json({ error: "Report card is not published" }, { status: 403 });
        }

        const publishedWorkflow = await prisma.studentReportWorkflow.findFirst({
            where: {
                studentId: reportCard.studentId,
                termId: reportCard.termId,
                status: "PUBLISHED",
            },
            orderBy: { downloadExpiresAt: "desc" },
            select: {
                reportType: true,
                downloadExpiresAt: true,
                publishedAt: true,
            },
        });

        const fallbackExpiry = reportCard.publishedAt
            ? new Date(reportCard.publishedAt.getTime() + 3 * 24 * 60 * 60 * 1000)
            : null;
        const downloadExpiresAt = publishedWorkflow?.downloadExpiresAt || fallbackExpiry;

        if (
            !isAdmin &&
            (isStudentSessionUser(user) || user.loginType === "parent") &&
            downloadExpiresAt
        ) {
            if (new Date() > downloadExpiresAt) {
                return NextResponse.json(
                    { error: "Download window has expired for this report card." },
                    { status: 403 }
                );
            }
        }

        const reportType = toClientReportType(publishedWorkflow?.reportType || null);
        const reportData = await generateReportCardData(
            reportCard.studentId,
            reportCard.termId,
            reportType
        );
        const stream = await generateReportCardStream(reportData);

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=\"Report_${reportCard.student.admissionNumber}_${reportCard.term.name}.pdf\"`,
            },
        });
    } catch (error) {
        console.error("Failed to download published report:", error);
        return NextResponse.json({ error: "Failed to download report" }, { status: 500 });
    }
}

