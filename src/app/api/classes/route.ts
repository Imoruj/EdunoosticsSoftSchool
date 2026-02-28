
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/classes - List all classes with arms
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const classes = await prisma.class.findMany({
            where: {
                schoolId: (session.user as any).schoolId,
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
                            },
                        },
                    },
                },
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ classes });
    } catch (error: any) {
        console.error("Error fetching classes:", error);
        return NextResponse.json(
            { error: "Failed to fetch classes" },
            { status: 500 }
        );
    }
}

// POST /api/classes - Create a new class or add arms to existing class
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, level, arms } = body;

        if (!name || !level) {
            return NextResponse.json(
                { error: "Name and level are required" },
                { status: 400 }
            );
        }

        const schoolId = (session.user as any).schoolId;

        // Split names by comma to support bulk creation/update
        const classNames = name.split(",").map((n: string) => n.trim()).filter((n: string) => n);

        if (classNames.length === 0) {
            return NextResponse.json(
                { error: "Invalid class name" },
                { status: 400 }
            );
        }

        const processedClasses: any[] = [];

        // Process each class name in a transaction
        await prisma.$transaction(async (tx: any) => {
            for (const clsName of classNames) {
                // Check if class exists
                let cls = await tx.class.findFirst({
                    where: {
                        name: clsName,
                        schoolId: schoolId,
                    },
                });

                // If not exists, create it
                if (!cls) {
                    cls = await tx.class.create({
                        data: {
                            name: clsName,
                            level,
                            schoolId: schoolId,
                        },
                    });
                }

                // Add arms if provided
                if (arms && Array.isArray(arms) && arms.length > 0) {
                    // Filter out arms that might already exist for this class to avoid duplicates
                    // For massive bulk inserts this might be slow, but for Class setup it's fine.
                    const existingArms = await tx.classArm.findMany({
                        where: {
                            classId: cls.id,
                            armName: { in: arms }
                        },
                        select: { armName: true }
                    });

                    const existingArmNames = new Set(existingArms.map((a: any) => a.armName));
                    const newArms = arms.filter((a: string) => !existingArmNames.has(a));

                    if (newArms.length > 0) {
                        await tx.classArm.createMany({
                            data: newArms.map((armName: string) => ({
                                armName,
                                classId: cls.id,
                            })),
                        });
                    }
                }

                // Fetch complete object for specific class response
                const completeClass = await tx.class.findUnique({
                    where: { id: cls.id },
                    include: {
                        arms: {
                            include: {
                                _count: { select: { students: true } },
                                classTeacher: { select: { firstName: true, lastName: true } }
                            }
                        }
                    }
                });

                processedClasses.push(completeClass);
            }
        });

        return NextResponse.json({ classes: processedClasses }, { status: 201 });

    } catch (error: any) {
        console.error("Error creating/updating classes:", error);
        return NextResponse.json(
            { error: "Failed to process class request" },
            { status: 500 }
        );
    }
}

// DELETE /api/classes - Delete a class or remove specific arm? 
// Currently deletes entire class
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
        }

        await prisma.class.delete({
            where: {
                id,
                schoolId: (session.user as any).schoolId,
            },
        });

        return NextResponse.json({ message: "Class deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting class:", error);
        return NextResponse.json(
            { error: "Failed to delete class" },
            { status: 500 }
        );
    }
}
