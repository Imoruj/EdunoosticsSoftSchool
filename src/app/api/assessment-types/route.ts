import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

// GET - Fetch all assessment types for the school
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

        const assessmentTypes = await prisma.assessmentType.findMany({
            where: { schoolId, isActive: true },
            orderBy: { order: "asc" },
        });

        return NextResponse.json(assessmentTypes);
    } catch (error: any) {
        console.error("Error fetching assessment types:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch assessment types" },
            { status: 500 }
        );
    }
}

// POST - Create a new assessment type
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
        const { name, shortName, maxScore, order } = body;

        if (!name || !maxScore) {
            return NextResponse.json(
                { error: "Name and max score are required" },
                { status: 400 }
            );
        }

        // Get the next order if not provided
        let assessmentOrder = order;
        if (assessmentOrder === undefined) {
            const lastAssessment = await prisma.assessmentType.findFirst({
                where: { schoolId },
                orderBy: { order: "desc" },
            });
            assessmentOrder = (lastAssessment?.order || 0) + 1;
        }

        const assessmentType = await prisma.assessmentType.create({
            data: {
                name,
                shortName: shortName || name,
                maxScore: parseInt(maxScore),
                order: assessmentOrder,
                schoolId,
            },
        });

        return NextResponse.json(assessmentType, { status: 201 });
    } catch (error: any) {
        console.error("Error creating assessment type:", error);
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "Assessment type with this name already exists" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: error.message || "Failed to create assessment type" },
            { status: 500 }
        );
    }
}

// PUT - Update an assessment type
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
        const { id, name, shortName, maxScore, order, isActive } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Assessment type ID is required" },
                { status: 400 }
            );
        }

        const assessmentType = await prisma.assessmentType.update({
            where: { id, schoolId },
            data: {
                name,
                shortName,
                maxScore: maxScore ? parseInt(maxScore) : undefined,
                order,
                isActive,
            },
        });

        return NextResponse.json(assessmentType);
    } catch (error: any) {
        console.error("Error updating assessment type:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update assessment type" },
            { status: 500 }
        );
    }
}

// DELETE - Delete an assessment type
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
                { error: "Assessment type ID is required" },
                { status: 400 }
            );
        }

        await prisma.assessmentType.delete({
            where: { id, schoolId },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting assessment type:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete assessment type" },
            { status: 500 }
        );
    }
}
