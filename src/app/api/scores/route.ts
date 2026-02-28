
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET: Fetch scores for a class arm and subject
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classId = searchParams.get("classId"); // This is actually the classArmId
        const subjectId = searchParams.get("subjectId");
        let termId = searchParams.get("termId");

        if (!classId || !subjectId) {
            return NextResponse.json(
                { error: "Class and Subject are required" },
                { status: 400 }
            );
        }

        // If no termId provided, fetch the current active term
        if (!termId) {
            const currentTerm = await prisma.term.findFirst({
                where: {
                    isCurrent: true,
                    // Optionally filter by sessionId if available
                },
            });
            termId = currentTerm?.id || null;
        }

        if (!termId) {
            return NextResponse.json(
                { error: "No active term found. Please configure terms." },
                { status: 400 }
            );
        }

        // Fetch students in this class arm
        const students = await prisma.student.findMany({
            where: {
                classArmId: classId,
                isActive: true,
                schoolId: (session.user as any).schoolId,
            },
            include: {
                scores: {
                    where: {
                        subjectId: subjectId,
                        termId: termId,
                    },
                },
            },
            orderBy: { lastName: "asc" },
        });

        // Map to a cleaner format for the frontend
        const data = students.map((student: any) => {
            const score = student.scores[0]; // Should be only one score per subject/term
            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                admissionNumber: student.admissionNumber,
                // Score fields
                ca1: score?.ca1 ? Number(score.ca1) : 0,
                ca2: score?.ca2 ? Number(score.ca2) : 0,
                ca3: score?.ca3 ? Number(score.ca3) : 0,
                exam: score?.exam ? Number(score.exam) : 0,
                total: score?.total ? Number(score.total) : 0,
                grade: score?.grade || "-",
                remark: score?.remark || "-",
            };
        });

        return NextResponse.json({
            students: data,
            termId: termId
        });

    } catch (error: any) {
        console.error("Error fetching scores:", error);
        return NextResponse.json(
            { error: "Failed to fetch scores" },
            { status: 500 }
        );
    }
}

// Helper for Grade Calculation using dynamic rules
function calculateGrade(total: number, rules: any[]) {
    const rule = rules.find(r => total >= r.minScore && total <= r.maxScore);
    if (rule) {
        return { grade: rule.grade, remark: rule.remark };
    }
    return { grade: "-", remark: "-" };
}

// POST: Save scores (Bulk Upsert)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { scores, subjectId, termId } = body;

        if (!scores || !Array.isArray(scores) || !subjectId || !termId) {
            return NextResponse.json(
                { error: "Invalid payload" },
                { status: 400 }
            );
        }

        const userId = (session.user as any).id;
        const schoolId = (session.user as any).schoolId;

        // Fetch grading rules for this school
        const gradingRules = await prisma.gradingRule.findMany({
            where: { schoolId },
            orderBy: { minScore: "desc" }
        });

        // Execute queries in a transaction
        // Loop through scores and upsert each one
        await prisma.$transaction(
            scores.map((item: any) => {
                const total =
                    (Number(item.ca1) || 0) +
                    (Number(item.ca2) || 0) +
                    (Number(item.ca3) || 0) +
                    (Number(item.exam) || 0);

                const { grade, remark } = calculateGrade(total, gradingRules);

                return prisma.score.upsert({
                    where: {
                        studentId_subjectId_termId: {
                            studentId: item.studentId || item.id, // Handle both id and studentId
                            subjectId: subjectId,
                            termId: termId,
                        },
                    },
                    update: {
                        ca1: Number(item.ca1) || 0,
                        ca2: Number(item.ca2) || 0,
                        ca3: Number(item.ca3) || 0,
                        exam: Number(item.exam) || 0,
                        total,
                        grade,
                        remark,
                        updatedById: userId,
                    },
                    create: {
                        studentId: item.studentId || item.id,
                        subjectId: subjectId,
                        termId: termId,
                        ca1: Number(item.ca1) || 0,
                        ca2: Number(item.ca2) || 0,
                        ca3: Number(item.ca3) || 0,
                        exam: Number(item.exam) || 0,
                        total,
                        grade,
                        remark,
                        createdById: userId,
                        updatedById: userId,
                    },
                });
            })
        );

        return NextResponse.json({ message: "Scores saved successfully" });

    } catch (error: any) {
        console.error("Error saving scores:", error);
        return NextResponse.json(
            { error: "Failed to save scores" },
            { status: 500 }
        );
    }
}
