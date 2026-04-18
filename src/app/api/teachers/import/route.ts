import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole } from "@prisma/client";

function generateTempPassword(): string {
    return randomBytes(6).toString("base64url");
}

const VALID_ROLES: UserRole[] = [
    UserRole.PROPRIETOR,
    UserRole.SUBJECT_TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.SCHOOL_ADMIN
];

interface ImportResult {
    success: number;
    failed: number;
    errors: string[];
    dryRun?: boolean;
}

// POST /api/teachers/import - Import teachers from CSV
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const schoolId = user.schoolId;

        // Parse the form data
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const isDryRun = formData.get("dryRun") === "true";
        const isCreateLoginAccounts = formData.get("createLoginAccounts") !== "false"; // Default to true if not provided

        if (!file.name.endsWith(".csv")) {
            return NextResponse.json({ error: "File must be a CSV" }, { status: 400 });
        }

        const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_CSV_SIZE) {
            return NextResponse.json({ error: "File must be 5MB or less" }, { status: 400 });
        }

        // Read the file content
        const content = await file.text();
        const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);

        if (lines.length < 2) {
            return NextResponse.json(
                { error: "CSV file is empty or invalid" },
                { status: 400 }
            );
        }

        const result: ImportResult = {
            success: 0,
            failed: 0,
            errors: [],
            dryRun: isDryRun,
        };

        // Skip header row (index 0) and instruction row (index 1, if present)
        // Start from line 2 if line 1 contains "Required", otherwise start from line 1
        const startIndex = lines[1]?.includes("Required") ? 2 : 1;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            const values = parseCSVLine(line);

            // Skip empty rows
            if (values.every((v) => !v)) continue;

            const [firstName, lastName, email, phone, rolesStr] = values;

            // Validate required fields
            if (!firstName || !firstName.trim()) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: First name is required`);
                continue;
            }

            if (!lastName || !lastName.trim()) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Last name is required for "${firstName}"`);
                continue;
            }

            if (!email || !email.trim()) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Email is required for "${firstName} ${lastName}"`);
                continue;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Invalid email format for "${firstName} ${lastName}"`);
                continue;
            }

            if (!rolesStr || !rolesStr.trim()) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: At least one role is required for "${firstName} ${lastName}"`);
                continue;
            }

            // Parse and validate roles (use `teacherRoles` to avoid shadowing the outer `roles` auth variable)
            const parsedRoles = rolesStr.split(";").map((r) => r.trim().toUpperCase()).filter(Boolean);
            const invalidRoles = parsedRoles.filter((r) => !VALID_ROLES.includes(r as UserRole));
            const teacherRoles = parsedRoles.filter((r): r is UserRole => VALID_ROLES.includes(r as UserRole));
            if (invalidRoles.length > 0) {
                result.failed++;
                result.errors.push(
                    `Row ${i + 1}: Invalid role(s) "${invalidRoles.join(", ")}" for "${firstName} ${lastName}". Valid roles: ${VALID_ROLES.join(", ")}`
                );
                continue;
            }

            if (teacherRoles.length === 0) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: At least one valid role is required for "${firstName} ${lastName}"`);
                continue;
            }

            // Check if email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: email.trim() },
            });

            if (existingUser) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Email "${email}" already exists`);
                continue;
            }

            try {
                if (!isDryRun) {
                    // Generate a secure random temp password (user must change on first login)
                    const defaultPassword = generateTempPassword();
                    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

                    // Create teacher user
                    await prisma.user.create({
                        data: {
                            firstName: firstName.trim(),
                            lastName: lastName.trim(),
                            email: email.trim(),
                            phone: phone?.trim() || null,
                            passwordHash: hashedPassword,
                            roles: teacherRoles,
                            schoolId,
                            isActive: isCreateLoginAccounts,
                            mustChangePassword: true,
                        },
                    });
                }

                result.success++;
            } catch (error: any) {
                result.failed++;
                result.errors.push(
                    `Row ${i + 1}: Failed to create staff member "${firstName} ${lastName}" - ${error.message}`
                );
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error importing teachers:", error);
        return NextResponse.json(
            { error: "Failed to import teachers" },
            { status: 500 }
        );
    }
}

// Helper function to parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

