
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { ReportType } from "@prisma/client";

function toReportType(value?: string | null): ReportType {
    if (!value) return "END_TERM";
    if (value === "halfTerm" || value === "HALF_TERM") return "HALF_TERM";
    return "END_TERM";
}

// GET /api/reports/comment?studentId=...&termId=...
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const userId = typeof user.id === "string" ? user.id : null;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN") || roles.includes("PROPRIETOR");
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        if (!userId || !schoolId) {
            return NextResponse.json({ error: "Invalid session context" }, { status: 400 });
        }

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const termId = searchParams.get("termId");
        const reportType = toReportType(searchParams.get("reportType"));

        if (!studentId || !termId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const studentContext = await prisma.student.findFirst({
            where: { id: studentId, schoolId },
            select: { classArmId: true },
        });

        if (!studentContext) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        if (!isAdmin) {
            if (!studentContext.classArmId) {
                return NextResponse.json({ error: "Student class assignment is required" }, { status: 400 });
            }

            const classArm = await prisma.classArm.findFirst({
                where: {
                    id: studentContext.classArmId,
                    classTeacherId: userId,
                    class: { schoolId },
                },
                select: { id: true },
            });

            if (!classArm) {
                return NextResponse.json({ error: "Access denied. You are not the class teacher." }, { status: 403 });
            }
        }

        const reportCard = await prisma.reportCard.findFirst({
            where: { studentId, termId, student: { schoolId } },
            include: {
                student: {
                    select: { firstName: true, lastName: true, admissionNumber: true }
                }
            }
        });

        let workflow: any = null;
        const workflowClassArmId = reportCard?.classArmId || studentContext?.classArmId;
        if (workflowClassArmId) {
            const classWorkflow = await prisma.classReportWorkflow.findUnique({
                where: {
                    termId_classArmId_reportType: {
                        termId,
                        classArmId: workflowClassArmId,
                        reportType,
                    },
                },
                select: { id: true },
            });

            if (classWorkflow) {
                workflow = await prisma.studentReportWorkflow.findUnique({
                    where: {
                        classReportWorkflowId_studentId: {
                            classReportWorkflowId: classWorkflow.id,
                            studentId,
                        },
                    },
                    select: {
                        classTeacherComment: true,
                        principalComment: true,
                        status: true,
                        adminReviewNote: true,
                    },
                });
            }
        }

        if (reportCard) {
            return NextResponse.json({
                ...reportCard,
                teacherComment: workflow?.classTeacherComment ?? reportCard.classTeacherComment,
                principalComment: workflow?.principalComment ?? reportCard.principalComment,
                workflowStatus: workflow?.status || null,
                workflowNote: workflow?.adminReviewNote || null,
            });
        }

        return NextResponse.json({
            classTeacherComment: workflow?.classTeacherComment || "",
            principalComment: workflow?.principalComment || "",
            teacherComment: workflow?.classTeacherComment || "",
            workflowStatus: workflow?.status || null,
            workflowNote: workflow?.adminReviewNote || null,
            average: 0,
            classPosition: 0,
            classSize: 0
        });

    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch report info" }, { status: 500 });
    }
}

// PUT /api/reports/comment - Update comments
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const userId = typeof user.id === "string" ? user.id : null;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN") || roles.includes("PROPRIETOR");
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        if (!userId || !schoolId) {
            return NextResponse.json({ error: "Invalid session context" }, { status: 400 });
        }

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { studentId, termId, teacherComment, principalComment, reportType: reportTypeInput } = await req.json();
        const reportType = toReportType(reportTypeInput);

        if (!studentId || !termId) {
            return NextResponse.json({ error: "studentId and termId are required" }, { status: 400 });
        }

        const student = await prisma.student.findFirst({
            where: { id: studentId, schoolId },
            select: { classArmId: true, schoolId: true },
        });
        if (!student || !student.classArmId) {
            return NextResponse.json({ error: "Student class assignment is required" }, { status: 400 });
        }

        if (!isAdmin) {
            const classArm = await prisma.classArm.findFirst({
                where: {
                    id: student.classArmId,
                    classTeacherId: userId,
                    class: { schoolId },
                },
                select: { id: true },
            });
            if (!classArm) {
                return NextResponse.json({ error: "Access denied. You are not the class teacher." }, { status: 403 });
            }
        }

        const classWorkflow = await prisma.classReportWorkflow.upsert({
            where: {
                termId_classArmId_reportType: {
                    termId,
                    classArmId: student.classArmId,
                    reportType,
                },
            },
            update: {},
            create: {
                schoolId: student.schoolId,
                termId,
                classArmId: student.classArmId,
                reportType,
            },
        });

        if (classWorkflow.status === "WAITING_SUBJECT_BROADCAST") {
            return NextResponse.json(
                { error: "Broadcast class result before editing comments." },
                { status: 400 }
            );
        }

        const existingStudentWorkflow = await prisma.studentReportWorkflow.findUnique({
            where: {
                classReportWorkflowId_studentId: {
                    classReportWorkflowId: classWorkflow.id,
                    studentId,
                },
            },
            select: { id: true, status: true },
        });

        if (existingStudentWorkflow) {
            await prisma.studentReportWorkflow.update({
                where: { id: existingStudentWorkflow.id },
                data: {
                    classTeacherComment: teacherComment !== undefined ? teacherComment : undefined,
                    principalComment: principalComment !== undefined ? principalComment : undefined,
                    ...(existingStudentWorkflow.status === "COMMENTS_PENDING" ? { status: "COMMENTS_READY" } : {}),
                },
            });
        } else {
            await prisma.studentReportWorkflow.create({
                data: {
                    classReportWorkflowId: classWorkflow.id,
                    schoolId: student.schoolId,
                    termId,
                    classArmId: student.classArmId,
                    studentId,
                    reportType,
                    classTeacherComment: teacherComment || "",
                    principalComment: principalComment || "",
                    status: "COMMENTS_READY",
                },
            });
        }

        // Upsert report card status
        const reportCard = await prisma.reportCard.findFirst({
            where: { studentId, termId }
        });

        if (reportCard) {
            await prisma.reportCard.update({
                where: { id: reportCard.id },
                data: {
                    classTeacherComment: teacherComment !== undefined ? teacherComment : reportCard.classTeacherComment,
                    principalComment: principalComment !== undefined ? principalComment : reportCard.principalComment,
                }
            });
        } else {
            // Create a basic record if doesn't exist
            await prisma.reportCard.create({
                data: {
                    studentId,
                    termId,
                    classArmId: student.classArmId,
                    classTeacherComment: teacherComment || "",
                    principalComment: principalComment || "",
                }
            });
        }

        return NextResponse.json({ message: "Comments saved successfully" });

    } catch (error: any) {
        console.error("Save Comment Error:", error);
        return NextResponse.json({ error: "Failed to save comments" }, { status: 500 });
    }
}

