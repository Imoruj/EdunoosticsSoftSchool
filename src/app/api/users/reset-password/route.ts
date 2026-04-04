import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { generateStudentDefaultPasswordHash } from "@/lib/studentLoginCredentials";

const DEFAULT_RESET_PASSWORD = "1234";

export async function POST(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized: Admin access required" },
                { status: 403 }
            );
        }

        const actor = session.user as {
            schoolId?: string | null;
            roles?: string[];
        };

        const body = await req.json();
        const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

        if (!userId) {
            return NextResponse.json(
                { error: "userId is required" },
                { status: 400 }
            );
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                schoolId: true,
                roles: true,
            },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const actorRoles = actor.roles || [];
        const isSuperAdmin = actorRoles.includes("SUPER_ADMIN");
        const actorSchoolId = typeof actor.schoolId === "string" ? actor.schoolId : null;

        if (!isSuperAdmin) {
            if (!actorSchoolId || targetUser.schoolId !== actorSchoolId) {
                return NextResponse.json(
                    { error: "You can only reset passwords for users in your school." },
                    { status: 403 }
                );
            }

            if (targetUser.roles.includes("SUPER_ADMIN")) {
                return NextResponse.json(
                    { error: "You cannot reset a super admin account." },
                    { status: 403 }
                );
            }
        }

        let temporaryPassword = DEFAULT_RESET_PASSWORD;
        let passwordHash = await bcrypt.hash(DEFAULT_RESET_PASSWORD, 12);
        let mustChangePassword = !targetUser.roles.includes("STUDENT");

        if (targetUser.roles.includes("STUDENT")) {
            const studentRecord = await prisma.student.findFirst({
                where: { userId: targetUser.id },
                select: {
                    firstName: true,
                    lastName: true,
                    admissionNumber: true,
                    school: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            if (!studentRecord) {
                return NextResponse.json(
                    { error: "Student record not found for this account." },
                    { status: 404 }
                );
            }

            const generated = await generateStudentDefaultPasswordHash({
                firstName: studentRecord.firstName,
                lastName: studentRecord.lastName,
                admissionNumber: studentRecord.admissionNumber,
                schoolName: studentRecord.school.name,
            });

            temporaryPassword = generated.password;
            passwordHash = generated.passwordHash;
            mustChangePassword = true;
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                mustChangePassword,
            },
        });

        return NextResponse.json({
            success: true,
            message: `Password reset successfully for ${targetUser.firstName} ${targetUser.lastName}.`,
            temporaryPassword,
            mustChangePassword,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to reset password";
        console.error("Error resetting user password:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

