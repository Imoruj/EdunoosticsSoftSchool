export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const isStudent = user.roles.includes("STUDENT");

        if (!isStudent) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Find the Student record linked to this User
        const student = await prisma.student.findUnique({
            where: { userId: user.id },
            include: {
                classArm: {
                    include: {
                        class: true
                    }
                }
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
        }

        return NextResponse.json(student);

    } catch (error: any) {
        console.error("Error fetching student profile:", error);
        return NextResponse.json({ error: "Failed to fetch student profile" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const isStudent = user.roles.includes("STUDENT");

        if (!isStudent) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const { address, otherNames, email, photoUrl } = body;

        // Start a transaction
        const updatedStudent = await prisma.$transaction(async (tx) => {
            // Update User model if email is provided
            if (email) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { email }
                });
            }

            // Update Student model
            return await tx.student.update({
                where: { userId: user.id },
                data: {
                    address: address || undefined,
                    otherNames: otherNames || undefined,
                    photoUrl: photoUrl || undefined,
                },
                include: {
                    classArm: {
                        include: {
                            class: true
                        }
                    },
                    user: {
                        select: {
                            email: true,
                            phone: true,
                            school: {
                                select: { name: true }
                            }
                        }
                    }
                }
            });
        });

        return NextResponse.json(updatedStudent);

    } catch (error: any) {
        console.error("Error updating student profile:", error);
        return NextResponse.json({ error: "Failed to update student profile" }, { status: 500 });
    }
}
