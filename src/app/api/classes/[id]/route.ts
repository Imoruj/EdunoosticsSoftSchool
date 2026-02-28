
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/classes/[id] - Get details for a single class
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const classId = params.id;
        const schoolId = (session.user as any).schoolId;

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
                    },
                },
                classSubjects: {
                    include: {
                        subject: true,
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
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, level } = body;

        if (!name || !level) {
            return NextResponse.json(
                { error: "Name and level are required" },
                { status: 400 }
            );
        }

        const classId = params.id;
        const schoolId = (session.user as any).schoolId;

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
