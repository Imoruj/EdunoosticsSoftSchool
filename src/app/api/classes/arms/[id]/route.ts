
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// PATCH /api/classes/arms/[id] - Update arm details (teacher assignment, name)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { armName, classTeacherId } = body;

        if (!armName) {
            return NextResponse.json(
                { error: "Arm name is required" },
                { status: 400 }
            );
        }

        const armId = id;
        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        if (classTeacherId) {
            const teacher = await prisma.user.findFirst({
                where: {
                    id: classTeacherId,
                    schoolId,
                    isActive: true,
                    roles: {
                        hasSome: ["CLASS_TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"],
                    },
                },
                select: { id: true },
            });

            if (!teacher) {
                return NextResponse.json(
                    { error: "Selected class teacher is invalid for this school." },
                    { status: 400 }
                );
            }
        }

        // Verify arm belongs to school through class
        const arm = await prisma.classArm.findUnique({
            where: { id: armId },
            include: { class: true }
        });

        if (!arm || arm.class.schoolId !== schoolId) {
            return NextResponse.json({ error: "Arm not found" }, { status: 404 });
        }

        const updatedArm = await prisma.classArm.update({
            where: { id: armId },
            data: {
                armName,
                classTeacherId: classTeacherId || null,
            },
            include: {
                classTeacher: {
                    select: { firstName: true, lastName: true }
                }
            }
        });

        return NextResponse.json({ message: "Arm updated successfully", arm: updatedArm });
    } catch (error: any) {
        console.error("Error updating arm:", error);
        return NextResponse.json(
            { error: "Failed to update arm" },
            { status: 500 }
        );
    }
}

// DELETE /api/classes/arms/[id] - Remove an arm
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const armId = id;
        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        const arm = await prisma.classArm.findUnique({
            where: { id: armId },
            include: {
                class: true,
                _count: { select: { students: true } }
            }
        });

        if (!arm || arm.class.schoolId !== schoolId) {
            return NextResponse.json({ error: "Arm not found" }, { status: 404 });
        }

        if (arm._count.students > 0) {
            return NextResponse.json(
                { error: "Cannot delete arm with enrolled students" },
                { status: 400 }
            );
        }

        await prisma.classArm.delete({
            where: { id: armId }
        });

        return NextResponse.json({ message: "Arm deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting arm:", error);
        return NextResponse.json(
            { error: "Failed to delete arm" },
            { status: 500 }
        );
    }
}
