
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/teachers - List all teachers in the school
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (session.user as any).schoolId;

        const teachers = await prisma.user.findMany({
            where: {
                schoolId,
                roles: {
                    hasSome: ["CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"]
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                roles: true,
                isActive: true,
                classArms: {
                    select: {
                        id: true,
                        armName: true,
                        class: { select: { name: true } }
                    }
                },
                teacherSubjects: {
                    select: {
                        subject: { select: { name: true } }
                    }
                }
            },
            orderBy: [
                { firstName: "asc" },
                { lastName: "asc" }
            ]
        });

        // Format for frontend
        const formattedTeachers = teachers.map((t: any) => ({
            ...t,
            assignedClass: t.classArms[0] ? `${t.classArms[0].class.name} ${t.classArms[0].armName}` : null,
            subjects: Array.from(new Set(t.teacherSubjects.map((ts: any) => ts.subject.name)))
        }));

        // Fetch active metadata for the form
        const availableClasses = await prisma.classArm.findMany({
            where: {
                class: { schoolId }
            },
            select: {
                id: true,
                armName: true,
                class: { select: { name: true } }
            }
        });

        const availableSubjects = await prisma.subject.findMany({
            where: { schoolId },
            select: {
                id: true,
                name: true
            }
        });

        return NextResponse.json({
            teachers: formattedTeachers,
            metadata: {
                classes: availableClasses.map((c: any) => ({
                    id: c.id,
                    name: `${c.class.name} ${c.armName}`
                })),
                subjects: availableSubjects
            }
        });
    } catch (error: any) {
        console.error("Error fetching teachers:", error);
        return NextResponse.json(
            { error: "Failed to fetch teachers" },
            { status: 500 }
        );
    }
}

// POST /api/teachers - Create a new teacher
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (session.user as any).schoolId;
        const body = await req.json();
        const { firstName, lastName, email, phone, roles, classArmIds, subjectIds } = body;

        if (!firstName || !lastName || !email || !roles || roles.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 400 }
            );
        }

        const passwordHash = await bcrypt.hash("Teacher123!", 12);

        const newTeacher = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    roles: roles as any,
                    passwordHash,
                    schoolId,
                    isActive: true
                }
            });

            // Handle Class Assignments if CLASS_TEACHER role is present
            if (roles.includes("CLASS_TEACHER") && classArmIds?.length > 0) {
                await tx.classArm.updateMany({
                    where: { id: { in: classArmIds }, class: { schoolId } },
                    data: { teacherId: user.id }
                });
            }

            // Handle Subject Assignments if SUBJECT_TEACHER role is present
            if (roles.includes("SUBJECT_TEACHER") && subjectIds?.length > 0) {
                await tx.teacherSubject.createMany({
                    data: subjectIds.map((subjectId: string) => ({
                        teacherId: user.id,
                        subjectId
                    }))
                });
            }

            return user;
        });

        return NextResponse.json({
            success: true,
            teacher: newTeacher,
            message: "Teacher account created and assigned successfully."
        });

    } catch (error: any) {
        console.error("Error creating teacher:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create teacher" },
            { status: 500 }
        );
    }
}
