import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkGenerateReportCardData, generateReportCardStream } from "@/services/reportService";
import archiver from "archiver";
import fs from "fs";
import path from "path";

async function resolveAllowedSessionIdsForClassArm(
    schoolId: string,
    classArmId: string,
    currentSessionId: string | null
): Promise<Set<string>> {
    const [sessionTerms, hasActiveStudents] = await Promise.all([
        prisma.term.findMany({
            where: {
                session: { schoolId },
                OR: [
                    { reportCards: { some: { classArmId } } },
                    { subjectEnrollments: { some: { classArmId } } },
                    { scores: { some: { student: { classArmId } } } }
                ]
            },
            select: { sessionId: true },
            distinct: ["sessionId"]
        }),
        prisma.student.findFirst({
            where: { schoolId, classArmId, isActive: true },
            select: { id: true }
        })
    ]);

    const allowedSessionIds = new Set<string>(sessionTerms.map((term) => term.sessionId));
    if (currentSessionId && hasActiveStudents) {
        allowedSessionIds.add(currentSessionId);
    }

    return allowedSessionIds;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { classArmId, termId, studentIds, reportType = "endOfTerm" } = body;

        if (!classArmId || !termId) {
            return NextResponse.json({ error: "Missing classArmId or termId" }, { status: 400 });
        }

        const typedReportType: "halfTerm" | "endOfTerm" =
            reportType === "halfTerm" ? "halfTerm" : "endOfTerm";

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const userId = typeof user.id === "string" ? user.id : "";
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);
        const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json(
                { error: "Unauthorized: Only admin and class teachers can generate reports." },
                { status: 403 }
            );
        }

        const [classArm, term] = await Promise.all([
            prisma.classArm.findFirst({
                where: { id: classArmId, class: { schoolId } },
                select: { id: true, classTeacherId: true }
            }),
            prisma.term.findFirst({
                where: { id: termId, session: { schoolId } },
                select: { id: true, sessionId: true }
            })
        ]);

        if (!classArm || !term) {
            return NextResponse.json(
                { error: "Invalid class or term selection." },
                { status: 400 }
            );
        }

        if (!isAdmin && isClassTeacher) {
            if (classArm.classTeacherId !== userId) {
                return NextResponse.json(
                    { error: "Unauthorized: You are not assigned to this class." },
                    { status: 403 }
                );
            }

            const currentSession = await prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true }
            });

            const allowedSessionIds = await resolveAllowedSessionIdsForClassArm(
                schoolId,
                classArmId,
                currentSession?.id ?? null
            );

            if (!allowedSessionIds.has(term.sessionId)) {
                return NextResponse.json(
                    { error: "Unauthorized: Selected term session is not available for this class assignment." },
                    { status: 403 }
                );
            }
        }

        const whereClause: any = {
            schoolId,
            classArmId,
            isActive: true
        };

        const selectedIds = Array.isArray(studentIds) ? Array.from(new Set(studentIds)) : [];
        if (selectedIds.length > 0) {
            whereClause.id = { in: selectedIds };
        }

        const students = await prisma.student.findMany({
            where: whereClause,
            select: { id: true, admissionNumber: true, firstName: true, lastName: true }
        });

        if (selectedIds.length > 0 && students.length !== selectedIds.length) {
            return NextResponse.json(
                { error: "One or more selected students are invalid for this class." },
                { status: 400 }
            );
        }

        if (students.length === 0) {
            return NextResponse.json({ error: "No students found for this selection" }, { status: 404 });
        }

        const job = await prisma.backgroundJob.create({
            data: {
                type: "BULK_PDF_GENERATION",
                totalItems: students.length,
                status: "PROCESSING",
                schoolId,
                createdBy: userId,
            }
        });

        processBackgroundJob(job.id, students, termId, classArmId, typedReportType);

        return NextResponse.json({ jobId: job.id });
    } catch (error: any) {
        console.error("Bulk Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function processBackgroundJob(
    jobId: string,
    students: any[],
    termId: string,
    classArmId: string,
    reportType: "halfTerm" | "endOfTerm"
) {
    try {
        const downloadsDir = path.join(process.cwd(), "public", "downloads");
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        const fileName = `Reports_${classArmId}_${jobId}.zip`;
        const filePath = path.join(downloadsDir, fileName);
        const output = fs.createWriteStream(filePath);

        const archive = archiver("zip", {
            zlib: { level: 9 }
        });

        archive.pipe(output);

        const allReportData = await bulkGenerateReportCardData(
            students.map((s) => s.id),
            termId,
            reportType
        );

        let completedItems = 0;
        let failedItems = 0;

        for (const student of students) {
            try {
                const reportData = allReportData.find((r: any) => r.student.id === student.id);
                if (!reportData) throw new Error("Data not found for student");

                const pdfStream = await generateReportCardStream(reportData) as any;

                const safePdfName = `${student.firstName}_${student.lastName}_${student.admissionNumber}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_");
                archive.append(pdfStream, { name: safePdfName });

                completedItems++;
            } catch (err: any) {
                console.error(`Failed to generate report for student ${student.id}:`, err);
                archive.append(Buffer.from(`Failed to generate report: ${err.message}`), { name: `ERROR_${student.admissionNumber}.txt` });
                failedItems++;
                completedItems++;
            }

            if (completedItems % 5 === 0 || completedItems === students.length) {
                const progress = Math.round((completedItems / students.length) * 100);
                await prisma.backgroundJob.update({
                    where: { id: jobId },
                    data: { progress, failedItems }
                });
            }
        }

        await archive.finalize();

        output.on("close", async () => {
            await prisma.backgroundJob.update({
                where: { id: jobId },
                data: {
                    status: "COMPLETED",
                    progress: 100,
                    resultUrl: `/downloads/${fileName}`,
                    failedItems,
                }
            });
        });
    } catch (error: any) {
        console.error(`Job ${jobId} failed completely:`, error);
        await prisma.backgroundJob.update({
            where: { id: jobId },
            data: {
                status: "FAILED",
                error: error.message
            }
        });
    }
}

