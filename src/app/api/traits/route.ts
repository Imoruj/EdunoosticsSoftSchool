import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// GET - Fetch all traits for the school (with class assignments)
export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        if (!schoolId) {
            return NextResponse.json(
                { error: "No school associated with user" },
                { status: 400 }
            );
        }

        const traits = await prisma.affectiveTrait.findMany({
            where: { schoolId },
            orderBy: { orderIndex: "asc" },
            include: {
                classes: {
                    select: { classId: true }
                }
            }
        });

        return NextResponse.json(
            traits.map((t) => ({
                ...t,
                classIds: t.classes.map((c) => c.classId),
                classes: undefined,
            }))
        );
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

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        if (!schoolId) {
            return NextResponse.json(
                { error: "No school associated with user" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { name, classIds } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Trait name is required" },
                { status: 400 }
            );
        }

        const lastTrait = await prisma.affectiveTrait.findFirst({
            where: { schoolId },
            orderBy: { orderIndex: "desc" },
        });

        const newOrderIndex = (lastTrait?.orderIndex ?? 0) + 1;

        const trait = await prisma.$transaction(async (tx: any) => {
            const created = await tx.affectiveTrait.create({
                data: {
                    name,
                    orderIndex: newOrderIndex,
                    schoolId,
                },
            });

            if (Array.isArray(classIds) && classIds.length > 0) {
                await tx.affectiveTraitClass.createMany({
                    data: classIds.map((classId: string) => ({ traitId: created.id, classId })),
                    skipDuplicates: true,
                });
            }

            return created;
        });

        return NextResponse.json({ ...trait, classIds: classIds ?? [] }, { status: 201 });
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

// PUT - Update a trait (name, orderIndex, isActive, classIds)
export async function PUT(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        const body = await req.json();
        const { id, name, orderIndex, isActive, classIds } = body;

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

        const trait = await prisma.$transaction(async (tx: any) => {
            const updated = await tx.affectiveTrait.update({
                where: { id: existingTrait.id },
                data: {
                    name,
                    orderIndex: orderIndex !== undefined ? parseInt(orderIndex) : undefined,
                    isActive: isActive !== undefined ? isActive : undefined,
                },
            });

            if (Array.isArray(classIds)) {
                await tx.affectiveTraitClass.deleteMany({ where: { traitId: updated.id } });
                if (classIds.length > 0) {
                    await tx.affectiveTraitClass.createMany({
                        data: classIds.map((classId: string) => ({ traitId: updated.id, classId })),
                        skipDuplicates: true,
                    });
                }
            }

            return updated;
        });

        const finalClassIds = Array.isArray(classIds)
            ? classIds
            : (await prisma.affectiveTraitClass.findMany({ where: { traitId: trait.id }, select: { classId: true } })).map((c) => c.classId);

        return NextResponse.json({ ...trait, classIds: finalClassIds });
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

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
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
