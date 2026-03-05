import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { schoolName, schoolAddress, schoolEmail, schoolPhone, adminFirstName, adminLastName, adminEmail, adminPassword } = body;

        // Validate required fields
        if (!schoolName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if admin email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 400 }
            );
        }

        // Check if school email exists
        if (schoolEmail) {
            const existingSchool = await prisma.school.findFirst({
                where: { email: schoolEmail },
            });

            if (existingSchool) {
                return NextResponse.json(
                    { error: "School email already registered" },
                    { status: 400 }
                );
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        // Create school and admin user in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Create school
            const school = await tx.school.create({
                data: {
                    name: schoolName,
                    slug: slugify(schoolName),
                    address: schoolAddress || null,
                    email: schoolEmail || null,
                    phone: schoolPhone || null,
                    isActive: true,
                },
            });

            // Create admin user
            const user = await tx.user.create({
                data: {
                    email: adminEmail,
                    firstName: adminFirstName,
                    lastName: adminLastName,
                    passwordHash,
                    roles: ["SCHOOL_ADMIN"],
                    schoolId: school.id,
                    isActive: true,
                    mustChangePassword: false,
                },
            });

            // Create default academic session
            const currentYear = new Date().getFullYear();
            const session = await tx.academicSession.create({
                data: {
                    name: `${currentYear}/${currentYear + 1}`,
                    startDate: new Date(`${currentYear}-09-01`),
                    endDate: new Date(`${currentYear + 1}-07-31`),
                    isCurrent: true,
                    schoolId: school.id,
                },
            });

            // Create first term
            await tx.term.create({
                data: {
                    name: "First Term",
                    termNumber: 1,
                    startDate: new Date(`${currentYear}-09-01`),
                    endDate: new Date(`${currentYear}-12-15`),
                    isCurrent: true,
                    sessionId: session.id,
                },
            });

            return { school, user };
        });

        return NextResponse.json({
            success: true,
            message: "School registered successfully",
            schoolId: result.school.id,
        });
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to register school" },
            { status: 500 }
        );
    }
}
