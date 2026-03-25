import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limit: 5 password changes per user per 15 minutes
        const allowed = rateLimit("change-password", session.user.id, { limit: 5, windowMs: 15 * 60 * 1000 });
        if (!allowed) {
            return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
        }

        const body = await req.json();
        const { newPassword, confirmPassword } = body;

        if (!newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: "New password and confirmation are required" },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: "Passwords do not match" },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Prevent setting password to the default "1234"
        if (newPassword === "1234") {
            return NextResponse.json(
                { error: "Please choose a different password" },
                { status: 400 }
            );
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                passwordHash,
                mustChangePassword: false,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error: any) {
        console.error("Error changing password:", error);
        return NextResponse.json(
            { error: "Failed to change password" },
            { status: 500 }
        );
    }
}

