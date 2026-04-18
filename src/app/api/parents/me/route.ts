export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkCsrf } from "@/lib/csrf";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const isParent = user.loginType === "parent";

        if (!isParent) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const parent = await prisma.parent.findUnique({
            where: { userId: user.id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatarUrl: true,
                        school: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                students: {
                    include: {
                        classArm: {
                            include: {
                                class: true
                            }
                        }
                    }
                }
            }
        });

        if (!parent) {
            return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
        }

        return NextResponse.json(parent);

    } catch (error) {
        console.error("Error fetching parent profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const isParent = user.loginType === "parent";

        if (!isParent) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const { phone, email, occupation, avatarUrl } = body;

        // Start a transaction to ensure both models are updated
        const updatedParent = await prisma.$transaction(async (tx) => {
            // Update User model
            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: {
                    phone: phone || undefined,
                    email: email || undefined,
                    avatarUrl: avatarUrl || undefined,
                }
            });

            // Update Parent model
            const parent = await tx.parent.update({
                where: { userId: user.id },
                data: {
                    occupation: occupation || undefined,
                },
                include: {
                    user: true
                }
            });

            // Sync denormalized fields in Student records
            await tx.student.updateMany({
                where: { parentId: parent.id },
                data: {
                    parentPhone: phone || undefined,
                    parentEmail: email || undefined,
                    parentName: `${parent.user.firstName} ${parent.user.lastName}`
                }
            });

            return await tx.parent.findUnique({
                where: { id: parent.id },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            school: {
                                select: { name: true }
                            }
                        }
                    },
                    students: {
                        include: {
                            classArm: {
                                include: {
                                    class: true
                                }
                            }
                        }
                    }
                }
            });
        });

        return NextResponse.json(updatedParent);

    } catch (error: any) {
        console.error("Error updating parent profile:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

