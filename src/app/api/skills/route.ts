import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

// GET - Fetch all skills for the school
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

        const skills = await prisma.psychomotorSkill.findMany({
            where: { schoolId },
            orderBy: { orderIndex: "asc" },
        });

        return NextResponse.json(skills);
    } catch (error: any) {
        console.error("Error fetching skills:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch skills" },
            { status: 500 }
        );
    }
}

// POST - Create a new skill
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
        const { name } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Skill name is required" },
                { status: 400 }
            );
        }

        // Get max order index to append to end
        const lastSkill = await prisma.psychomotorSkill.findFirst({
            where: { schoolId },
            orderBy: { orderIndex: "desc" },
        });

        const newOrderIndex = (lastSkill?.orderIndex ?? 0) + 1;

        const skill = await prisma.psychomotorSkill.create({
            data: {
                name,
                orderIndex: newOrderIndex,
                schoolId,
            },
        });

        return NextResponse.json(skill, { status: 201 });
    } catch (error: any) {
        console.error("Error creating skill:", error);
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "Skill with this name already exists" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: error.message || "Failed to create skill" },
            { status: 500 }
        );
    }
}

// PUT - Update a skill
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
        const { id, name, orderIndex, isActive } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Skill ID is required" },
                { status: 400 }
            );
        }

        const existingSkill = await prisma.psychomotorSkill.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });

        if (!existingSkill) {
            return NextResponse.json(
                { error: "Skill not found" },
                { status: 404 }
            );
        }

        const skill = await prisma.psychomotorSkill.update({
            where: { id: existingSkill.id },
            data: {
                name,
                orderIndex: orderIndex !== undefined ? parseInt(orderIndex) : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            },
        });

        return NextResponse.json(skill);
    } catch (error: any) {
        console.error("Error updating skill:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update skill" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a skill
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
                { error: "Skill ID is required" },
                { status: 400 }
            );
        }

        const existingSkill = await prisma.psychomotorSkill.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });

        if (!existingSkill) {
            return NextResponse.json(
                { error: "Skill not found" },
                { status: 404 }
            );
        }

        await prisma.psychomotorSkill.delete({
            where: { id: existingSkill.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting skill:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete skill" },
            { status: 500 }
        );
    }
}

