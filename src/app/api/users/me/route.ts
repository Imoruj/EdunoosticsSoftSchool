export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
                signatureUrl: true,
                roles: true,
                school: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error: any) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { firstName, lastName, phone, avatarUrl, signatureUrl, currentPassword, newPassword } = body;

        // validation
        if (!session.user.id) {
            return NextResponse.json({ error: "User ID missing from session" }, { status: 400 });
        }

        // Check if password update is requested
        if (currentPassword && newPassword) {
            // Fetch user to get password hash
            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isPasswordValid) {
                return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await prisma.user.update({
                where: { id: session.user.id },
                data: { passwordHash: hashedPassword, mustChangePassword: false }
            });

            // If only password update, return here (or continue to update other fields if provided)
            // Let's allow updating both or either.
        }

        // Update other fields
        const updateData: any = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (phone !== undefined) updateData.phone = phone; // Allow empty string to clear?
        if (avatarUrl) updateData.avatarUrl = avatarUrl;
        if (signatureUrl) updateData.signatureUrl = signatureUrl;

        if (Object.keys(updateData).length > 0) {
            const updatedUser = await prisma.user.update({
                where: { id: session.user.id },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    avatarUrl: true,
                    signatureUrl: true,
                    roles: true
                }
            });
            return NextResponse.json({ message: "Profile updated successfully", user: updatedUser });
        }

        return NextResponse.json({ message: "Password updated successfully" }); // Fallback if only password was updated

    } catch (error: any) {
        console.error("Error updating user profile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
