
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// PATCH /api/teachers/[id] - Update teacher profile or status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (session.user as any).schoolId;
        const teacherId = params.id;
        const body = await req.json();
        const { firstName, lastName, email, phone, roles, isActive, classArmIds, subjectIds } = body;

        // Verify the teacher belongs to the same school
        const existingTeacher = await prisma.user.findFirst({
            where: { id: teacherId, schoolId }
        });

        if (!existingTeacher) {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        const updatedTeacher = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.update({
                where: { id: teacherId },
                data: {
                    firstName: firstName ?? undefined,
                    lastName: lastName ?? undefined,
                    email: email ?? undefined,
                    phone: phone ?? undefined,
                    roles: roles ? (roles as any) : undefined,
                    isActive: isActive !== undefined ? isActive : undefined
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    roles: true,
                    isActive: true
                }
            });

            // Sync Class Assignments if roles provided
            if (roles && roles.includes("CLASS_TEACHER") && classArmIds) {
                // Clear old assignments (optional or specific arm update)
                await tx.classArm.updateMany({
                    where: { teacherId: user.id },
                    data: { teacherId: null }
                });
                if (classArmIds.length > 0) {
                    await tx.classArm.updateMany({
                        where: { id: { in: classArmIds }, class: { schoolId } },
                        data: { teacherId: user.id }
                    });
                }
            }

            // Sync Subject Assignments if roles provided
            if (roles && roles.includes("SUBJECT_TEACHER") && subjectIds) {
                await tx.teacherSubject.deleteMany({
                    where: { teacherId: user.id }
                });
                if (subjectIds.length > 0) {
                    await tx.teacherSubject.createMany({
                        data: subjectIds.map((subjectId: string) => ({
                            teacherId: user.id,
                            subjectId
                        }))
                    });
                }
            }

            return user;
        });

        return NextResponse.json({
            success: true,
            teacher: updatedTeacher,
            message: "Teacher updated successfully"
        });

    } catch (error: any) {
        console.error("Error updating teacher:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update teacher" },
            { status: 500 }
        );
    }
}

// DELETE /api/teachers/[id] - Delete or Deactivate a teacher
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (session.user as any).schoolId;
        const teacherId = params.id;

        // Verify the teacher belongs to the same school
        const existingTeacher = await prisma.user.findFirst({
            where: { id: teacherId, schoolId }
        });

        if (!existingTeacher) {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        // Instead of hard delete, we usually deactivate
        await prisma.user.update({
            where: { id: teacherId },
            data: { isActive: false }
        });

        return NextResponse.json({
            success: true,
            message: "Teacher deactivated successfully"
        });
    } catch (error: any) {
        console.error("Error deleting teacher:", error);
        return NextResponse.json(
            { error: "Failed to deactivate teacher" },
            { status: 500 }
        );
    }
}
