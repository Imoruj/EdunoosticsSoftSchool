import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// GET - Fetch all skills for the school (with class assignments)
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

        const skills = await prisma.psychomotorSkill.findMany({
            where: { schoolId },
            orderBy: { orderIndex: "asc" },
            include: {
                classes: {
                    select: { classId: true }
                }
            }
        });

        return NextResponse.json(
            skills.map((s) => ({
                ...s,
                classIds: s.classes.map((c) => c.classId),
                classes: undefined,
            }))
        );
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
                { error: "Skill name is required" },
                { status: 400 }
            );
        }

        const lastSkill = await prisma.psychomotorSkill.findFirst({
            where: { schoolId },
            orderBy: { orderIndex: "desc" },
        });

        const newOrderIndex = (lastSkill?.orderIndex ?? 0) + 1;

        const skill = await prisma.$transaction(async (tx: any) => {
            const created = await tx.psychomotorSkill.create({
                data: {
                    name,
                    orderIndex: newOrderIndex,
                    schoolId,
                },
            });

            if (Array.isArray(classIds) && classIds.length > 0) {
                await tx.psychomotorSkillClass.createMany({
                    data: classIds.map((classId: string) => ({ skillId: created.id, classId })),
                    skipDuplicates: true,
                });
            }

            return created;
        });

        return NextResponse.json({ ...skill, classIds: classIds ?? [] }, { status: 201 });
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

// PUT - Update a skill (name, orderIndex, isActive, classIds)
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

        const skill = await prisma.$transaction(async (tx: any) => {
            const updated = await tx.psychomotorSkill.update({
                where: { id: existingSkill.id },
                data: {
                    name,
                    orderIndex: orderIndex !== undefined ? parseInt(orderIndex) : undefined,
                    isActive: isActive !== undefined ? isActive : undefined,
                },
            });

            if (Array.isArray(classIds)) {
                await tx.psychomotorSkillClass.deleteMany({ where: { skillId: updated.id } });
                if (classIds.length > 0) {
                    await tx.psychomotorSkillClass.createMany({
                        data: classIds.map((classId: string) => ({ skillId: updated.id, classId })),
                        skipDuplicates: true,
                    });
                }
            }

            return updated;
        });

        const finalClassIds = Array.isArray(classIds)
            ? classIds
            : (await prisma.psychomotorSkillClass.findMany({ where: { skillId: skill.id }, select: { classId: true } })).map((c) => c.classId);

        return NextResponse.json({ ...skill, classIds: finalClassIds });
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

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
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
