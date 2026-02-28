import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/subjects - List all subjects
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");

        const where: any = {
            schoolId: (session.user as any).schoolId,
        };

        if (category && category !== "All") {
            where.category = category;
        }

        const subjects = await prisma.subject.findMany({
            where,
            orderBy: { name: "asc" },
            include: {
                classSubjects: {
                    select: {
                        classId: true
                    }
                }
            }
        });

        // Transform response to include classIds array
        const transformedSubjects = subjects.map((subject: any) => ({
            ...subject,
            classIds: subject.classSubjects.map((c: any) => c.classId)
        }));

        return NextResponse.json({ subjects: transformedSubjects });
    } catch (error: any) {
        console.error("Error fetching subjects:", error);
        return NextResponse.json(
            { error: "Failed to fetch subjects" },
            { status: 500 }
        );
    }
}

// PUT /api/subjects - Update a subject
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, name, code, category, classIds, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
        }

        const schoolId = (session.user as any).schoolId;

        // Verify ownership
        const existingSubject = await prisma.subject.findFirst({
            where: { id, schoolId },
        });

        if (!existingSubject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        // Update transaction
        const updatedSubject = await prisma.$transaction(async (tx: any) => {
            // Update basic info
            const subject = await tx.subject.update({
                where: { id },
                data: {
                    name,
                    code,
                    category,
                    isActive,
                },
            });

            // Update class assignments if provided
            if (classIds && Array.isArray(classIds)) {
                // Delete existing assignments
                await tx.classSubject.deleteMany({
                    where: { subjectId: id },
                });

                // Create new assignments
                if (classIds.length > 0) {
                    await tx.classSubject.createMany({
                        data: classIds.map((classId: string) => ({
                            classId,
                            subjectId: id,
                        })),
                    });
                }
            }

            return subject;
        });

        return NextResponse.json({ subject: updatedSubject });
    } catch (error: any) {
        console.error("Error updating subject:", error);
        return NextResponse.json(
            { error: "Failed to update subject" },
            { status: 500 }
        );
    }
}

// POST /api/subjects - Create a new subject
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, code, category, classIds } = body;

        if (!name || !category) {
            return NextResponse.json(
                { error: "Name and category are required" },
                { status: 400 }
            );
        }

        const schoolId = (session.user as any).schoolId;

        // Check if subject name already exists
        const existingSubject = await prisma.subject.findFirst({
            where: {
                name,
                schoolId,
            },
        });

        if (existingSubject) {
            return NextResponse.json(
                { error: "Subject name already exists" },
                { status: 400 }
            );
        }

        // Create subject and optionally link to classes
        const subject = await prisma.$transaction(async (tx: any) => {
            const newSubject = await tx.subject.create({
                data: {
                    name,
                    code: code || name.substring(0, 3).toUpperCase(),
                    category,
                    schoolId,
                    isActive: true,
                },
            });

            if (classIds && Array.isArray(classIds) && classIds.length > 0) {
                await tx.classSubject.createMany({
                    data: classIds.map((classId: string) => ({
                        classId,
                        subjectId: newSubject.id,
                    })),
                });
            }

            return newSubject;
        });

        return NextResponse.json({ subject }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating subject:", error);
        return NextResponse.json(
            { error: "Failed to create subject" },
            { status: 500 }
        );
    }
}

// DELETE /api/subjects - Delete a subject
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Subject ID is required" },
                { status: 400 }
            );
        }

        const schoolId = (session.user as any).schoolId;

        // Verify subject belongs to school
        const existingSubject = await prisma.subject.findFirst({
            where: {
                id,
                schoolId,
            },
        });

        if (!existingSubject) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        await prisma.subject.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Subject deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting subject:", error);
        return NextResponse.json(
            { error: "Failed to delete subject" },
            { status: 500 }
        );
    }
}
