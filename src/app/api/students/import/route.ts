import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const ADMISSION_SEQUENCE_PAD_LENGTH = 4;

const VALID_GENDERS = ["MALE", "FEMALE"];
const TRUTHY_VALUES = new Set(["true", "1", "yes", "active", "enabled"]);
const FALSY_VALUES = new Set(["false", "0", "no", "inactive", "disabled"]);

function parseBooleanCell(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (TRUTHY_VALUES.has(normalized)) return true;
    if (FALSY_VALUES.has(normalized)) return false;
    return defaultValue;
}

function normalizeHeader(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findColumnIndex(normalizedHeaders: string[], aliases: string[]): number {
    const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
    return normalizedHeaders.findIndex((header) =>
        normalizedAliases.some((alias) => header === alias || header.includes(alias))
    );
}

function extractAdmissionSequence(admissionNumber: string): number | null {
    const parts = admissionNumber.split("/");
    if (parts.length < 3) return null;
    const parsed = parseInt(parts[2], 10);
    if (isNaN(parsed) || parsed < 1) return null;
    return parsed;
}

async function createAdmissionNumberGenerator(schoolId: string, prefix?: string, sessionId?: string): Promise<() => Promise<string>> {
    const targetSession = await prisma.academicSession.findFirst({
        where: sessionId ? { schoolId, id: sessionId } : { schoolId, isCurrent: true },
        select: { name: true, startDate: true },
    });

    const yearMatch = targetSession?.name?.match(/\b(19|20)\d{2}\b/);
    const currentYear = yearMatch
        ? parseInt(yearMatch[0], 10)
        : (targetSession?.startDate?.getFullYear() || new Date().getFullYear());
    const yearPrefix = prefix || "SCH";

    const admissionsInYear = await prisma.student.findMany({
        where: {
            schoolId,
            admissionNumber: {
                startsWith: `${yearPrefix}/${currentYear}/`,
            },
        },
        select: { admissionNumber: true },
    });

    let nextNumber = 1;
    let maxSerial = 0;
    for (const record of admissionsInYear) {
        const serial = extractAdmissionSequence(record.admissionNumber);
        if (serial && serial > maxSerial) {
            maxSerial = serial;
        }
    }
    if (maxSerial > 0) {
        nextNumber = maxSerial + 1;
    }

    return async () => {
        const paddedNumber = nextNumber.toString().padStart(ADMISSION_SEQUENCE_PAD_LENGTH, "0");
        nextNumber += 1;
        return `${yearPrefix}/${currentYear}/${paddedNumber}`;
    };
}

// Helper to generate acronym from school name
function getSchoolAcronym(name: string): string {
    if (!name) return "SCH";

    // Remove special characters and keep alphanumeric and spaces
    const cleanName = name.replace(/[^a-zA-Z0-9 ]/g, "");
    const words = cleanName.split(" ").filter(w => w.length > 0);

    if (words.length === 1) {
        return words[0].substring(0, 3).toUpperCase();
    }

    // Take first letter of first 3 words
    return words.slice(0, 3).map(w => w[0]).join("").toUpperCase();
}

const existingStudentInclude = {
    user: true,
    parent: {
        include: {
            user: true,
        },
    },
} as const;

function normalizeOptionalValue(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function normalizeComparable(value: string | null | undefined): string {
    return normalizeOptionalValue(value)?.toLowerCase() || "";
}

function sameCalendarDate(left: Date | null | undefined, right: Date | null | undefined): boolean {
    if (!left || !right) {
        return false;
    }

    return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

async function ensureUniqueUserEmail(client: any, baseEmail: string): Promise<string> {
    let finalEmail = baseEmail;
    const existingUser = await client.user.findUnique({
        where: { email: finalEmail },
    });

    if (existingUser) {
        const suffix = Date.now().toString(36);
        const [localPart, domain = "edunostics.local"] = finalEmail.split("@");
        finalEmail = `${localPart}-${suffix}@${domain}`;
    }

    return finalEmail;
}

async function findExistingParentUser(client: any, phone?: string, email?: string) {
    if (phone) {
        const parentByPhone = await client.user.findFirst({
            where: { phone, roles: { has: UserRole.PARENT } },
            include: { parent: true },
        });

        if (parentByPhone) {
            return parentByPhone;
        }
    }

    if (email) {
        return client.user.findFirst({
            where: { email, roles: { has: UserRole.PARENT } },
            include: { parent: true },
        });
    }

    return null;
}

async function findExistingStudentForImport(params: {
    schoolId: string;
    classArmId: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    admissionNumber?: string;
    parsedDOB?: Date;
    parentPhone?: string;
    parentEmail?: string;
}): Promise<{ student: any | null; ambiguous: boolean }> {
    const {
        schoolId,
        classArmId,
        firstName,
        lastName,
        otherNames,
        admissionNumber,
        parsedDOB,
        parentPhone,
        parentEmail,
    } = params;

    if (admissionNumber) {
        const student = await prisma.student.findFirst({
            where: {
                schoolId,
                admissionNumber,
            },
            include: existingStudentInclude,
        });
        return { student, ambiguous: false };
    }

    const candidates = await prisma.student.findMany({
        where: {
            schoolId,
            classArmId,
            firstName: { equals: firstName, mode: "insensitive" },
            lastName: { equals: lastName, mode: "insensitive" },
        },
        include: existingStudentInclude,
        take: 10,
    });

    if (candidates.length === 0) {
        return { student: null, ambiguous: false };
    }

    let filtered = candidates;
    const normalizedOtherNames = normalizeComparable(otherNames);

    if (normalizedOtherNames) {
        const matchingOtherNames = filtered.filter((student) =>
            normalizeComparable(student.otherNames) === normalizedOtherNames
        );
        if (matchingOtherNames.length > 0) {
            filtered = matchingOtherNames;
        }
    }

    if (parsedDOB) {
        const matchingDob = filtered.filter((student) => sameCalendarDate(student.dateOfBirth, parsedDOB));
        if (matchingDob.length === 1) {
            return { student: matchingDob[0], ambiguous: false };
        }
        if (matchingDob.length > 0) {
            filtered = matchingDob;
        }
    }

    if (parentPhone) {
        const matchingPhone = filtered.filter((student) => normalizeComparable(student.parentPhone) === normalizeComparable(parentPhone));
        if (matchingPhone.length === 1) {
            return { student: matchingPhone[0], ambiguous: false };
        }
        if (matchingPhone.length > 0) {
            filtered = matchingPhone;
        }
    }

    if (parentEmail) {
        const matchingEmail = filtered.filter((student) => normalizeComparable(student.parentEmail) === normalizeComparable(parentEmail));
        if (matchingEmail.length === 1) {
            return { student: matchingEmail[0], ambiguous: false };
        }
        if (matchingEmail.length > 0) {
            filtered = matchingEmail;
        }
    }

    if (filtered.length === 1) {
        return { student: filtered[0], ambiguous: false };
    }

    if (filtered.length > 1) {
        return { student: null, ambiguous: true };
    }

    return { student: null, ambiguous: false };
}

interface ImportResult {
    success: number;
    failed: number;
    skipped: number;
    errors: string[];
    dryRun?: boolean;
    createLoginAccounts?: boolean;
    legacyMode?: boolean;
}

// POST /api/students/import - Import students from CSV
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roles: string[] = (session.user as any).roles || [];
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);

        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden: Only admins can import student records." },
                { status: 403 }
            );
        }

        const schoolId = (session.user as any).schoolId;

        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        // Parse the form data
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const dryRun = formData.get("dryRun") === "true";
        const createLoginAccounts = formData.get("createLoginAccounts") !== "false";
        const legacyMode = formData.get("legacyMode") === "true";
        const sessionId = (formData.get("sessionId") as string) || undefined;

        const targetSession = await prisma.academicSession.findFirst({
            where: sessionId ? { id: sessionId, schoolId } : { schoolId, isCurrent: true },
            select: { id: true, startDate: true },
        });

        if (sessionId && !targetSession) {
            return NextResponse.json(
                { error: "Invalid sessionId supplied for student import." },
                { status: 400 }
            );
        }

        const defaultAdmissionDate = targetSession?.startDate;

        // Get school information for generating admission numbers
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true },
        });

        const schoolPrefix = school ? getSchoolAcronym(school.name) : "SCH";
        const getNextAdmissionNumber = await createAdmissionNumberGenerator(schoolId, schoolPrefix, sessionId);

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

        const headers = parseCSVLine(lines[0]);
        const normalizedHeaders = headers.map((h) => normalizeHeader(h));

        const columnIndexes = {
            firstName: findColumnIndex(normalizedHeaders, ["first name", "firstname"]),
            lastName: findColumnIndex(normalizedHeaders, ["last name", "lastname", "surname"]),
            otherNames: findColumnIndex(normalizedHeaders, ["other names", "othernames", "middle name"]),
            admissionNumber: findColumnIndex(normalizedHeaders, ["admission number", "admission no", "admission"]),
            gender: findColumnIndex(normalizedHeaders, ["gender"]),
            dateOfBirth: findColumnIndex(normalizedHeaders, ["date of birth", "dob"]),
            className: findColumnIndex(normalizedHeaders, ["class"]),
            stateOfOrigin: findColumnIndex(normalizedHeaders, ["state of origin"]),
            religion: findColumnIndex(normalizedHeaders, ["religion"]),
            bloodGroup: findColumnIndex(normalizedHeaders, ["blood group", "bloodgroup"]),
            parentName: findColumnIndex(normalizedHeaders, ["parent name", "guardian name"]),
            parentPhone: findColumnIndex(normalizedHeaders, ["parent phone", "guardian phone", "phone"]),
            parentEmail: findColumnIndex(normalizedHeaders, ["parent email", "guardian email"]),
            address: findColumnIndex(normalizedHeaders, ["address", "home address"]),
            admissionDate: findColumnIndex(normalizedHeaders, ["admission date", "date admitted"]),
            status: findColumnIndex(normalizedHeaders, ["status", "is active", "active"]),
        };

        if (
            columnIndexes.firstName === -1 ||
            columnIndexes.lastName === -1 ||
            columnIndexes.gender === -1 ||
            columnIndexes.className === -1
        ) {
            return NextResponse.json(
                {
                    error:
                        "CSV headers are invalid. Required columns: First Name, Last Name, Gender, Class.",
                },
                { status: 400 }
            );
        }

        // Get all class arms for this school to map class names to IDs
        const classArms = await prisma.classArm.findMany({
            where: {
                class: {
                    schoolId,
                },
            },
            include: {
                class: true,
            },
        });

        // Create a map for class lookup: "ClassName ArmName" -> classArmId
        const classMap = new Map(
            classArms.map((arm) => [
                `${arm.class.name} ${arm.armName}`.toLowerCase(),
                arm.id,
            ])
        );

        // Also try matching with just the full name
        classArms.forEach((arm) => {
            classMap.set(`${arm.class.name}${arm.armName}`.toLowerCase().replace(/\s+/g, ""), arm.id);
        });

        const result: ImportResult = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            dryRun,
            createLoginAccounts,
            legacyMode,
        };

        const stagedAdmissionNumbers = new Set<string>();

        // Skip header row (index 0) and instruction row (index 1, if present)
        // Start from line 2 if line 1 contains "Required", otherwise start from line 1
        const startIndex = lines[1]?.toLowerCase().includes("required") ? 2 : 1;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            const values = parseCSVLine(line);

            // Skip empty rows
            if (values.every((v) => !v)) continue;

            const getValue = (index: number) => (index >= 0 ? values[index]?.trim() : "");

            const firstName = getValue(columnIndexes.firstName);
            const lastName = getValue(columnIndexes.lastName);
            const otherNames = getValue(columnIndexes.otherNames);
            const admissionNumber = getValue(columnIndexes.admissionNumber);
            const gender = getValue(columnIndexes.gender);
            const dateOfBirth = getValue(columnIndexes.dateOfBirth);
            const className = getValue(columnIndexes.className);
            const stateOfOrigin = getValue(columnIndexes.stateOfOrigin);
            const religion = getValue(columnIndexes.religion);
            const bloodGroup = getValue(columnIndexes.bloodGroup);
            const parentName = getValue(columnIndexes.parentName);
            const parentPhone = getValue(columnIndexes.parentPhone);
            const parentEmail = getValue(columnIndexes.parentEmail);
            const address = getValue(columnIndexes.address);
            const admissionDate = getValue(columnIndexes.admissionDate);
            const status = getValue(columnIndexes.status);

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

            if (!gender || !gender.trim()) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Gender is required for "${firstName} ${lastName}"`);
                continue;
            }

            const upperGender = gender.trim().toUpperCase();
            if (!VALID_GENDERS.includes(upperGender)) {
                result.failed++;
                result.errors.push(
                    `Row ${i + 1}: Invalid gender "${gender}" for "${firstName} ${lastName}". Valid values: MALE, FEMALE`
                );
                continue;
            }

            if (!className || !className.trim()) {
                result.failed++;
                result.errors.push(`Row ${i + 1}: Class is required for "${firstName} ${lastName}"`);
                continue;
            }

            // Find the class arm
            const classArmId = classMap.get(className.toLowerCase()) ||
                               classMap.get(className.toLowerCase().replace(/\s+/g, ""));

            if (!classArmId) {
                result.failed++;
                result.errors.push(
                    `Row ${i + 1}: Class "${className}" not found for "${firstName} ${lastName}". Use the full class name with arm (e.g., "Primary 1 A" or "Primary 1A")`
                );
                continue;
            }

            const trimmedFirstName = firstName.trim();
            const trimmedLastName = lastName.trim();
            const trimmedOtherNames = normalizeOptionalValue(otherNames);
            const trimmedAdmissionNumber = normalizeOptionalValue(admissionNumber);
            const trimmedStateOfOrigin = normalizeOptionalValue(stateOfOrigin);
            const trimmedReligion = normalizeOptionalValue(religion);
            const trimmedBloodGroup = normalizeOptionalValue(bloodGroup);
            const trimmedParentName = normalizeOptionalValue(parentName);
            const trimmedParentPhone = normalizeOptionalValue(parentPhone);
            const trimmedParentEmail = normalizeOptionalValue(parentEmail);
            const trimmedAddress = normalizeOptionalValue(address);

            // Parse date of birth if provided
            let parsedDOB: Date | undefined;
            if (dateOfBirth && dateOfBirth.trim()) {
                parsedDOB = new Date(dateOfBirth.trim());
                if (isNaN(parsedDOB.getTime())) {
                    result.errors.push(
                        `Row ${i + 1}: Warning - Invalid date of birth format for "${trimmedFirstName} ${trimmedLastName}". Value ignored.`
                    );
                    parsedDOB = undefined;
                }
            }

            let parsedAdmissionDate: Date | undefined;
            if (admissionDate && admissionDate.trim()) {
                parsedAdmissionDate = new Date(admissionDate.trim());
                if (isNaN(parsedAdmissionDate.getTime())) {
                    result.errors.push(
                        `Row ${i + 1}: Warning - Invalid admission date format for "${trimmedFirstName} ${trimmedLastName}". Value ignored.`
                    );
                    parsedAdmissionDate = undefined;
                }
            }
            if (!parsedAdmissionDate && defaultAdmissionDate) {
                parsedAdmissionDate = defaultAdmissionDate;
            }

            const existingStudentMatch = await findExistingStudentForImport({
                schoolId,
                classArmId,
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                otherNames: trimmedOtherNames,
                admissionNumber: trimmedAdmissionNumber,
                parsedDOB,
                parentPhone: trimmedParentPhone,
                parentEmail: trimmedParentEmail,
            });

            if (existingStudentMatch.ambiguous) {
                result.failed++;
                result.errors.push(
                    `Row ${i + 1}: Multiple existing students match "${trimmedFirstName} ${trimmedLastName}". Include admission number, date of birth, or parent contact to update the correct record.`
                );
                continue;
            }

            const existingStudent = existingStudentMatch.student;

            let finalAdmissionNumber = existingStudent?.admissionNumber || trimmedAdmissionNumber;

            if (!finalAdmissionNumber) {
                finalAdmissionNumber = await getNextAdmissionNumber();
            }

            if (stagedAdmissionNumbers.has(finalAdmissionNumber.toLowerCase())) {
                result.failed++;
                result.errors.push(
                    `Row ${i + 1}: Admission number "${finalAdmissionNumber}" is duplicated in this CSV file`
                );
                continue;
            }

            if (existingStudent && legacyMode) {
                result.skipped++;
                stagedAdmissionNumbers.add(finalAdmissionNumber.toLowerCase());
                continue;
            }

            stagedAdmissionNumbers.add(finalAdmissionNumber.toLowerCase());

            try {
                const isActive = parseBooleanCell(status, legacyMode ? false : true);

                if (dryRun) {
                    result.success++;
                    continue;
                }

                const hasParentContact = Boolean(trimmedParentPhone || trimmedParentEmail);
                const hasParentData = Boolean(trimmedParentName || trimmedParentPhone || trimmedParentEmail);

                if (!createLoginAccounts && hasParentContact && !existingStudent?.parentId) {
                    result.errors.push(
                        `Row ${i + 1}: Note - Parent account creation skipped because login account creation is disabled.`
                    );
                }

                await prisma.$transaction(async (tx) => {
                    let parentId = existingStudent?.parentId || null;

                    if (createLoginAccounts && hasParentData && !parentId) {
                        const existingParentUser = await findExistingParentUser(tx, trimmedParentPhone, trimmedParentEmail);

                        if ((existingParentUser as any)?.parent?.id) {
                            parentId = (existingParentUser as any).parent.id;
                        } else if (hasParentContact) {
                            const cleanAdmission = finalAdmissionNumber.replace(/[^a-zA-Z0-9]/g, "-");
                            const parentFirstName = trimmedParentName ? trimmedParentName.split(" ")[0] : trimmedFirstName;
                            const parentLastName = trimmedParentName
                                ? trimmedParentName.split(" ").slice(1).join(" ") || trimmedLastName
                                : trimmedLastName;
                            const parentEmailSeed = trimmedParentEmail || `parent-${cleanAdmission}@parent.edunostics.local`;
                            const parentEmailFinal = await ensureUniqueUserEmail(tx, parentEmailSeed);
                            const parentPasswordHash = await bcrypt.hash("1234", 10);

                            const createdParent = await tx.parent.create({
                                data: {
                                    occupation: null,
                                    relationship: "guardian",
                                    user: {
                                        create: {
                                            email: parentEmailFinal,
                                            passwordHash: parentPasswordHash,
                                            firstName: parentFirstName,
                                            lastName: parentLastName,
                                            phone: trimmedParentPhone || null,
                                            roles: [UserRole.PARENT],
                                            schoolId,
                                            isActive,
                                        },
                                    },
                                },
                                select: { id: true },
                            });

                            parentId = createdParent.id;
                        }
                    }

                    let studentUserId = existingStudent?.userId || null;

                    if (!studentUserId && createLoginAccounts) {
                        const defaultPin = "1234";
                        const passwordHash = await bcrypt.hash(defaultPin, 10);
                        const cleanAdmission = finalAdmissionNumber.replace(/[^a-zA-Z0-9]/g, "-");
                        const studentEmailSeed = `${cleanAdmission}@student.edunostics.local`;
                        const studentEmailFinal = await ensureUniqueUserEmail(tx, studentEmailSeed);

                        const createdStudentUser = await tx.user.create({
                            data: {
                                email: studentEmailFinal,
                                passwordHash,
                                firstName: trimmedFirstName,
                                lastName: trimmedLastName,
                                roles: [UserRole.STUDENT],
                                schoolId,
                                isActive,
                            },
                            select: { id: true },
                        });

                        studentUserId = createdStudentUser.id;
                    } else if (studentUserId) {
                        await tx.user.update({
                            where: { id: studentUserId },
                            data: {
                                firstName: trimmedFirstName,
                                lastName: trimmedLastName,
                                isActive,
                            },
                        });
                    }

                    const studentData: any = {
                        firstName: trimmedFirstName,
                        lastName: trimmedLastName,
                        otherNames: trimmedOtherNames || null,
                        admissionNumber: finalAdmissionNumber,
                        gender: upperGender as "MALE" | "FEMALE",
                        dateOfBirth: parsedDOB || null,
                        admissionDate: parsedAdmissionDate || null,
                        classArmId,
                        stateOfOrigin: trimmedStateOfOrigin || null,
                        religion: trimmedReligion || null,
                        bloodGroup: trimmedBloodGroup || null,
                        parentName: trimmedParentName || null,
                        parentPhone: trimmedParentPhone || null,
                        parentEmail: trimmedParentEmail || null,
                        address: trimmedAddress || null,
                        isActive,
                        parentId,
                        userId: studentUserId,
                    };

                    if (existingStudent) {
                        await tx.student.update({
                            where: { id: existingStudent.id },
                            data: studentData,
                        });
                    } else {
                        await tx.student.create({
                            data: {
                                ...studentData,
                                schoolId,
                            },
                        });
                    }

                    if (parentId && hasParentData) {
                        const parentRecord = await tx.parent.findUnique({
                            where: { id: parentId },
                            include: { user: true },
                        });

                        if (parentRecord?.user) {
                            await tx.user.update({
                                where: { id: parentRecord.userId },
                                data: {
                                    phone: trimmedParentPhone || undefined,
                                    email: trimmedParentEmail || undefined,
                                    firstName: trimmedParentName ? trimmedParentName.split(" ")[0] : undefined,
                                    lastName: trimmedParentName
                                        ? trimmedParentName.split(" ").slice(1).join(" ") || trimmedLastName
                                        : undefined,
                                },
                            });
                        }

                        await tx.student.updateMany({
                            where: existingStudent
                                ? {
                                    parentId,
                                    id: { not: existingStudent.id },
                                }
                                : { parentId },
                            data: {
                                parentName: trimmedParentName || null,
                                parentPhone: trimmedParentPhone || null,
                                parentEmail: trimmedParentEmail || null,
                            },
                        });
                    }
                });

                result.success++;
            } catch (error: any) {
                result.failed++;
                result.errors.push(
                    `Row ${i + 1}: Failed to process student "${trimmedFirstName} ${trimmedLastName}" - ${error.message}`
                );
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error importing students:", error);
        return NextResponse.json(
            { error: "Failed to import students" },
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

