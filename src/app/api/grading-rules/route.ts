import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

// GET - Fetch grading rules for the school, optionally filtered by category
export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (session.user as any).schoolId;

        if (!schoolId) {
            return NextResponse.json(
                { error: "No school associated with user" },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category"); // e.g. "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY" | null

        const where: any = { schoolId };
        if (category) {
            where.schoolCategory = category;
        }

        const gradingRules = await prisma.gradingRule.findMany({
            where,
            orderBy: { minScore: "desc" },
        });

        return NextResponse.json(gradingRules);
    } catch (error: any) {
        console.error("Error fetching grading rules:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch grading rules" },
            { status: 500 }
        );
    }
}

// POST - Create a new grading rule
export async function POST(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (session.user as any).schoolId;

        if (!schoolId) {
            return NextResponse.json(
                { error: "No school associated with user" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { grade, minScore, maxScore, remark, schoolCategory } = body;

        if (!grade || minScore === undefined || maxScore === undefined || !remark) {
            return NextResponse.json(
                { error: "Grade, min score, max score, and remark are required" },
                { status: 400 }
            );
        }

        const gradingRule = await prisma.gradingRule.create({
            data: {
                grade,
                minScore: parseInt(minScore),
                maxScore: parseInt(maxScore),
                remark,
                schoolId,
                schoolCategory: schoolCategory || null,
            },
        });

        return NextResponse.json(gradingRule, { status: 201 });
    } catch (error: any) {
        console.error("Error creating grading rule:", error);
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "A grading rule with this grade already exists for the selected category" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: error.message || "Failed to create grading rule" },
            { status: 500 }
        );
    }
}

// PUT - Update a grading rule
export async function PUT(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (session.user as any).schoolId;
        const body = await req.json();
        const { id, grade, minScore, maxScore, remark, schoolCategory } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Grading rule ID is required" },
                { status: 400 }
            );
        }

        const existingRule = await prisma.gradingRule.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });

        if (!existingRule) {
            return NextResponse.json(
                { error: "Grading rule not found" },
                { status: 404 }
            );
        }

        const gradingRule = await prisma.gradingRule.update({
            where: { id: existingRule.id },
            data: {
                grade,
                minScore: minScore !== undefined ? parseInt(minScore) : undefined,
                maxScore: maxScore !== undefined ? parseInt(maxScore) : undefined,
                remark,
                // Only update schoolCategory if explicitly provided
                ...(schoolCategory !== undefined
                    ? { schoolCategory: schoolCategory || null }
                    : {}),
            },
        });

        return NextResponse.json(gradingRule);
    } catch (error: any) {
        console.error("Error updating grading rule:", error);
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "A grading rule with this grade already exists for the selected category" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: error.message || "Failed to update grading rule" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a grading rule
export async function DELETE(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (session.user as any).schoolId;
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Grading rule ID is required" },
                { status: 400 }
            );
        }

        const existingRule = await prisma.gradingRule.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });

        if (!existingRule) {
            return NextResponse.json(
                { error: "Grading rule not found" },
                { status: 404 }
            );
        }

        await prisma.gradingRule.delete({
            where: { id: existingRule.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting grading rule:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete grading rule" },
            { status: 500 }
        );
    }
}

