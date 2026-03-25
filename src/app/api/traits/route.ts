import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

// GET - Fetch all traits for the school
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

        const traits = await prisma.affectiveTrait.findMany({
            where: { schoolId },
            orderBy: { orderIndex: "asc" },
        });

        return NextResponse.json(traits);
    } catch (error: any) {
        console.error("Error fetching traits:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch traits" },
            { status: 500 }
        );
    }
}

// POST - Create a new trait
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
                { error: "Trait name is required" },
                { status: 400 }
            );
        }

        // Get max order index to append to end
        const lastTrait = await prisma.affectiveTrait.findFirst({
            where: { schoolId },
            orderBy: { orderIndex: "desc" },
        });

        const newOrderIndex = (lastTrait?.orderIndex ?? 0) + 1;

        const trait = await prisma.affectiveTrait.create({
            data: {
                name,
                orderIndex: newOrderIndex,
                schoolId,
            },
        });

        return NextResponse.json(trait, { status: 201 });
    } catch (error: any) {
        console.error("Error creating trait:", error);
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "Trait with this name already exists" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: error.message || "Failed to create trait" },
            { status: 500 }
        );
    }
}

// PUT - Update a trait
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
                { error: "Trait ID is required" },
                { status: 400 }
            );
        }

        const existingTrait = await prisma.affectiveTrait.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });

        if (!existingTrait) {
            return NextResponse.json(
                { error: "Trait not found" },
                { status: 404 }
            );
        }

        const trait = await prisma.affectiveTrait.update({
            where: { id: existingTrait.id },
            data: {
                name,
                orderIndex: orderIndex !== undefined ? parseInt(orderIndex) : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            },
        });

        return NextResponse.json(trait);
    } catch (error: any) {
        console.error("Error updating trait:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update trait" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a trait
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
                { error: "Trait ID is required" },
                { status: 400 }
            );
        }

        const existingTrait = await prisma.affectiveTrait.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });

        if (!existingTrait) {
            return NextResponse.json(
                { error: "Trait not found" },
                { status: 404 }
            );
        }

        await prisma.affectiveTrait.delete({
            where: { id: existingTrait.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting trait:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete trait" },
            { status: 500 }
        );
    }
}

