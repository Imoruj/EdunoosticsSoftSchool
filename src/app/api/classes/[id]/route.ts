
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// GET /api/classes/[id] - Get details for a single class
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const classId = id;
        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        const cls = await prisma.class.findUnique({
            where: {
                id: classId,
                schoolId: schoolId,
            },
            include: {
                arms: {
                    include: {
                        _count: {
                            select: { students: true },
                        },
                        classTeacher: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        subjectClassArms: {
                            include: {
                                subject: true,
                            },
                        },
                    },
                },
            },
        });

        if (!cls) {
            return NextResponse.json({ error: "Class not found" }, { status: 404 });
        }

        return NextResponse.json({ class: cls });
    } catch (error: any) {
        console.error("Error fetching class details:", error);
        return NextResponse.json(
            { error: "Failed to fetch class details" },
            { status: 500 }
        );
    }
}

// PATCH /api/classes/[id] - Update class details
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
        const { name, level } = body;

        if (!name || !level) {
            return NextResponse.json(
                { error: "Name and level are required" },
                { status: 400 }
            );
        }

        const classId = id;
        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        const updatedClass = await prisma.class.update({
            where: {
                id: classId,
                schoolId: schoolId,
            },
            data: {
                name,
                level,
            },
        });

        return NextResponse.json({ message: "Class updated successfully", class: updatedClass });
    } catch (error: any) {
        console.error("Error updating class:", error);
        return NextResponse.json(
            { error: "Failed to update class" },
            { status: 500 }
        );
    }
}
