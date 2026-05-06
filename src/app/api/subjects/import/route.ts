import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/server-session";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

const VALID_CATEGORIES = ["CORE", "SCIENCE", "ARTS", "COMMERCIAL", "VOCATIONAL", "LANGUAGE"];

interface ImportResult {
    success: number;
    failed: number;
    errors: string[];
}

// POST /api/subjects/import - Import subjects from CSV
export async function POST(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/subjects/import");

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        // Parse the form data
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!file.name.endsWith(".csv")) {
            return NextResponse.json({ error: "File must be a CSV" }, { status: 400 });
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

        // Get all classes for this school and their arms to map class names to classArm IDs
        const classes = await prisma.class.findMany({
            where: { schoolId },
            include: { arms: { select: { id: true } } },
        });

        const classMap = new Map<string, string[]>();
        classes.forEach((c) => {
            classMap.set(c.name.toLowerCase(), c.arms.map(a => a.id));
        });

        const result: ImportResult = {
            success: 0,
            failed: 0,
            errors: [],
        };

        // Skip header row (index 0) and instruction row (index 1, if present)
        // Start from line 2 if line 1 contains "Required", otherwise start from line 1
        const startIndex = lines[1]?.includes("Required") ? 2 : 1;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            const values = parseCSVLine(line);

            // Skip empty rows
            if (values.every((v) => !v)) continue;

            const [name, code, category, classNames] = values;

            // Validate required fields
            if (!name || !name.trim()) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Subject name is required`);
                continue;
            }

            if (!category || !category.trim()) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Category is required for "${name}"`);
                continue;
            }

            const upperCategory = category.trim().toUpperCase();
            if (!VALID_CATEGORIES.includes(upperCategory)) {
                result.failed++;
                result.errors.push(
                    `Row ${i + 1}: Invalid category "${category}" for "${name}". Valid categories: ${VALID_CATEGORIES.join(", ")}`
                );
                continue;
            }

            // Check if subject already exists
            const existingSubject = await prisma.subject.findFirst({
                where: {
                    name: name.trim(),
                    schoolId,
                },
            });

            if (existingSubject) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Subject "${name}" already exists`);
                continue;
            }

            try {
                // Parse class names
                const classArmIds: string[] = [];
                if (classNames && classNames.trim()) {
                    const classNameList = classNames.split(";").map((cn) => cn.trim());
                    for (const className of classNameList) {
                        if (className) {
                            const ids = classMap.get(className.toLowerCase());
                            if (ids && ids.length > 0) {
                                classArmIds.push(...ids);
                            } else {
                                result.errors.push(
                                    `Row ${i + 1}: Warning - Class "${className}" not found or has no arms for subject "${name}"`
                                );
                            }
                        }
                    }
                }

                // Create subject with class assignments
                await prisma.$transaction(async (tx: any) => {
                    const subject = await tx.subject.create({
                        data: {
                            name: name.trim(),
                            code: code?.trim() || name.trim().substring(0, 3).toUpperCase(),
                            category: upperCategory,
                            schoolId,
                            isActive: true,
                        },
                    });

                    // Create class assignments if any
                    if (classArmIds.length > 0) {
                        await tx.subjectClassArm.createMany({
                            data: classArmIds.map((classArmId) => ({
                                classArmId,
                                subjectId: subject.id,
                            })),
                        });
                    }
                });

                result.success++;
            } catch (error: any) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Failed to create subject "${name}" - ${error.message}`);
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error importing subjects:", error);
        return NextResponse.json(
            { error: "Failed to import subjects" },
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

