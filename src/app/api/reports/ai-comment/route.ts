
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateTeacherComment, generatePrincipalComment } from "@/services/aiService";
import { formatAttendancePoints } from "@/lib/attendance-points";
import { buildReportCommentPayload } from "@/lib/reportPayloadBuilder";

const bodySchema = z.object({
    studentId:  z.string().trim().min(1).max(100),
    termId:     z.string().trim().min(1).max(100),
    classArmId: z.string().trim().min(1).max(100),
    type:       z.enum(["teacher", "principal"]),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = user.schoolId as string | undefined;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        const parsed = bodySchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const { studentId, termId, classArmId, type } = parsed.data;

        if (!isAdmin && type === "principal") {
            return NextResponse.json({ error: "Only admins can generate principal comments." }, { status: 403 });
        }

        if (!isAdmin) {
            const classArm = await prisma.classArm.findFirst({
                where: { id: classArmId, classTeacherId: user.id, class: { schoolId } }
            });
            if (!classArm) {
                return NextResponse.json({ error: "Access denied. You are not the class teacher." }, { status: 403 });
            }
        }

        // Fetch student and report data
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                schoolId: true,
                classArmId: true,
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        if (student.schoolId !== schoolId || student.classArmId !== classArmId) {
            return NextResponse.json({ error: "Invalid student/class selection." }, { status: 400 });
        }

        // Fetch current report card stats if any
        const reportCard = await prisma.reportCard.findFirst({
            where: { studentId, termId },
            include: {
                affectiveRatings: { include: { trait: true } },
                psychomotorRatings: { include: { skill: true } }
            }
        });

        const term = await prisma.term.findFirst({
            where: {
                id: termId,
                session: { schoolId },
            },
            select: { name: true },
        });

        const traitsSummary = reportCard ? [
            ...reportCard.affectiveRatings.map(r => `${r.trait.name}: ${r.rating}`),
            ...reportCard.psychomotorRatings.map(r => `${r.skill.name}: ${r.rating}`)
        ].join(", ") : "";

        const scores = await prisma.score.findMany({
            where: { studentId, termId },
            include: { subject: true }
        });

        // Get AI settings for comment config
        const aiSettings = await prisma.aiSettings.findUnique({
            where: { schoolId }
        });

        const payload = await buildReportCommentPayload({
            prisma,
            studentData: {
                id: student.id,
                studentId: student.id,
                termId,
                name: `${student.firstName} ${student.lastName}`,
                firstName: student.firstName,
                lastName: student.lastName,
                gender: student.gender,
                term: term?.name || "",
                schoolId,
                reportType: "endOfTerm", // Default to end of term for now
                termNumber: term?.termNumber || 1,
                attendance: reportCard ? formatAttendancePoints(reportCard.daysPresent, reportCard.totalSchoolDays) : "N/A",
                traits: traitsSummary,
                average: reportCard?.average || 0,
                position: reportCard?.classPosition || 0,
            },
            reportCard,
            term: { termNumber: term?.termNumber || 1, name: term?.name || "" },
            scores: scores.map(s => ({
                ca1: s.ca1,
                ca2: s.ca2,
                ca3: s.ca3,
                exam: s.exam,
                total: s.total,
                subject: s.subject,
            })),
            classArmId: student.classArmId,
            commentConfig: aiSettings?.commentConfig as any,
        });

        let comment = "";
        if (type === "teacher") {
            comment = await generateTeacherComment(schoolId, payload);
        } else {
            comment = await generatePrincipalComment(schoolId, payload);
        }

        return NextResponse.json({ comment });

    } catch (error: any) {
        console.error("AI Comment Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate comment" }, { status: 500 });
    }
}

