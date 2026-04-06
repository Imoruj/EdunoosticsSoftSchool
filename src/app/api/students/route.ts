import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { clampLimit } from "@/lib/apiError";
import { checkCsrf } from "@/lib/csrf";
import { createUserNotifications, getSchoolAdminUserIds } from "@/lib/userNotifications";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";
import { calculateEndOfTermScoreTotals, getAssessmentTypeForField } from "@/lib/assessment-types";
import {
    applyStudentUpdateTransaction,
    buildStudentChangeSummary,
    createStudentSnapshot,
    getChangedStudentData,
    getStudentClassLabel,
    isPhotoOnlyUpdate,
    normalizeStudentUpdatePayload,
} from "@/lib/students/changeRequests";
import {
    ensureUniqueStudentEmail,
    generateStudentDefaultPasswordHash,
} from "@/lib/studentLoginCredentials";

const ADMISSION_SEQUENCE_PAD_LENGTH = 4;

function extractAdmissionYearFromSession(sessionName: string, startDate: Date): number {
    const nameMatch = sessionName.match(/\b(19|20)\d{2}\b/);
    if (nameMatch) {
        return parseInt(nameMatch[0], 10);
    }
    return startDate.getFullYear();
}

function extractAdmissionSequence(admissionNumber: string): number | null {
    const parts = admissionNumber.split("/");
    if (parts.length < 3) {
        return null;
    }
    const parsed = parseInt(parts[2], 10);
    if (isNaN(parsed) || parsed < 1) {
        return null;
    }
    return parsed;
}

async function resolveAdmissionYear(schoolId: string, sessionId?: string | null): Promise<number> {
    if (sessionId) {
        const selectedSession = await prisma.academicSession.findFirst({
            where: { id: sessionId, schoolId },
            select: { name: true, startDate: true },
        });
        if (selectedSession) {
            return extractAdmissionYearFromSession(selectedSession.name, selectedSession.startDate);
        }
    }

    const currentSession = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
        select: { name: true, startDate: true },
    });
    if (currentSession) {
        return extractAdmissionYearFromSession(currentSession.name, currentSession.startDate);
    }

    return new Date().getFullYear();
}

// Generate next admission number for a school
async function generateAdmissionNumber(schoolId: string, prefix?: string, admissionYear?: number): Promise<string> {
    const targetYear = admissionYear || new Date().getFullYear();
    const yearPrefix = prefix || "SCH";

    // Find all admissions for the session year, then compute the max numeric serial.
    const admissionsInYear = await prisma.student.findMany({
        where: {
            schoolId,
            admissionNumber: {
                startsWith: `${yearPrefix}/${targetYear}/`,
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

    // Format as SCH/2026/0001 (with leading zeros)
    const paddedNumber = nextNumber.toString().padStart(ADMISSION_SEQUENCE_PAD_LENGTH, "0");
    return `${yearPrefix}/${targetYear}/${paddedNumber}`;
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

async function getAssignedClassArmIds(userId: string, schoolId: string) {
    if (!userId || !schoolId) return [];

    const classArms = await prisma.classArm.findMany({
        where: {
            classTeacherId: userId,
            class: { schoolId },
        },
        select: { id: true },
    });

    return classArms.map((arm) => arm.id);
}

async function findStudentForManagement(params: {
    studentId: string;
    schoolId: string;
    isAdmin: boolean;
    assignedClassArmIds?: string[];
}) {
    const { studentId, schoolId, isAdmin, assignedClassArmIds = [] } = params;

    return prisma.student.findFirst({
        where: {
            id: studentId,
            schoolId,
            ...(!isAdmin ? { classArmId: { in: assignedClassArmIds } } : {}),
        },
        include: {
            classArm: {
                include: {
                    class: true,
                },
            },
        },
    });
}

// GET /api/students - List students with pagination and filters
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles: string[] = user.roles || [];
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);
        const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json(
                { error: "Unauthorized: Only admin and class teachers can access students." },
                { status: 403 }
            );
        }

        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = clampLimit(searchParams.get("limit"));
        const search = searchParams.get("search") || "";
        const classArmId = searchParams.get("classArmId");
        const gender = searchParams.get("gender");
        const sessionId = searchParams.get("sessionId");
        const getNextAdmissionNumber = searchParams.get("getNextAdmissionNumber");

        let assignedClassArmIds: string[] = [];
        if (!isAdmin && isClassTeacher) {
            const assignedClassArms = await prisma.classArm.findMany({
                where: {
                    classTeacherId: user.id,
                    class: { schoolId },
                },
                select: { id: true },
            });
            assignedClassArmIds = assignedClassArms.map((arm) => arm.id);

            if (assignedClassArmIds.length === 0) {
                return NextResponse.json({
                    students: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                    },
                });
            }

            if (classArmId && !assignedClassArmIds.includes(classArmId)) {
                return NextResponse.json(
                    { error: "Unauthorized: You are not assigned to this class." },
                    { status: 403 }
                );
            }
        }

        // If requesting next admission number only
        if (getNextAdmissionNumber === "true") {
            if (sessionId) {
                const selectedSession = await prisma.academicSession.findFirst({
                    where: { id: sessionId, schoolId },
                    select: { id: true },
                });

                if (!selectedSession) {
                    return NextResponse.json(
                        { error: "Invalid session selection." },
                        { status: 400 }
                    );
                }
            }

            // Use school name to generate default prefix
            const schoolName = (session.user as any).schoolName;
            const defaultPrefix = getSchoolAcronym(schoolName);

            const prefix = searchParams.get("prefix") || defaultPrefix;
            const admissionYear = await resolveAdmissionYear(schoolId, sessionId);

            const nextAdmissionNumber = await generateAdmissionNumber(
                schoolId,
                prefix,
                admissionYear
            );
            return NextResponse.json({ nextAdmissionNumber });
        }

        const where: any = {
            schoolId,
        };

        let historicalStudentIds: string[] | null = null;

        if (sessionId) {
            const selectedSession = await prisma.academicSession.findFirst({
                where: { id: sessionId, schoolId },
                select: { id: true, name: true, startDate: true, endDate: true }
            });

            if (!selectedSession) {
                return NextResponse.json(
                    { error: "Invalid session selection." },
                    { status: 400 }
                );
            }

            const sessionTerms = await prisma.term.findMany({
                where: { sessionId: selectedSession.id },
                select: { id: true }
            });
            const sessionTermIds = sessionTerms.map((term) => term.id);
            const sessionYear = extractAdmissionYearFromSession(
                selectedSession.name,
                selectedSession.startDate
            );

            const historicalClassFilter: any = {};
            if (classArmId) {
                historicalClassFilter.classArmId = classArmId;
            } else if (!isAdmin && isClassTeacher) {
                historicalClassFilter.classArmId = { in: assignedClassArmIds };
            }

            let rcStudents: { studentId: string }[] = [];
            let seStudents: { studentId: string }[] = [];
            let scoreStudents: { studentId: string }[] = [];

            if (sessionTermIds.length > 0) {
                const scoreWhere: any = {
                    termId: { in: sessionTermIds },
                };
                if (classArmId) {
                    scoreWhere.student = { classArmId };
                } else if (!isAdmin && isClassTeacher) {
                    scoreWhere.student = { classArmId: { in: assignedClassArmIds } };
                }

                [rcStudents, seStudents, scoreStudents] = await Promise.all([
                    prisma.reportCard.findMany({
                        where: { termId: { in: sessionTermIds }, ...historicalClassFilter },
                        select: { studentId: true },
                        distinct: ["studentId"]
                    }),
                    prisma.subjectEnrollment.findMany({
                        where: { termId: { in: sessionTermIds }, ...historicalClassFilter },
                        select: { studentId: true },
                        distinct: ["studentId"]
                    }),
                    prisma.score.findMany({
                        where: scoreWhere,
                        select: { studentId: true },
                        distinct: ["studentId"]
                    })
                ]);
            }

            const [admissionDateStudents, admissionYearStudents] = await Promise.all([
                prisma.student.findMany({
                    where: {
                        schoolId,
                        admissionDate: {
                            gte: selectedSession.startDate,
                            lte: selectedSession.endDate,
                        },
                        ...(classArmId
                            ? { classArmId }
                            : (!isAdmin && isClassTeacher)
                                ? { classArmId: { in: assignedClassArmIds } }
                                : {}),
                    },
                    select: { id: true },
                }),
                prisma.student.findMany({
                    where: {
                        schoolId,
                        admissionNumber: { contains: `/${sessionYear}/` },
                        ...(classArmId
                            ? { classArmId }
                            : (!isAdmin && isClassTeacher)
                                ? { classArmId: { in: assignedClassArmIds } }
                                : {}),
                    },
                    select: { id: true },
                }),
            ]);

            historicalStudentIds = Array.from(new Set([
                ...rcStudents.map((record) => record.studentId),
                ...seStudents.map((record) => record.studentId),
                ...scoreStudents.map((record) => record.studentId),
                ...admissionDateStudents.map((record) => record.id),
                ...admissionYearStudents.map((record) => record.id),
            ]));
        }

        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { admissionNumber: { contains: search, mode: "insensitive" } },
            ];
        }

        if (historicalStudentIds !== null) {
            where.id = { in: historicalStudentIds };
        } else if (!isAdmin && isClassTeacher) {
            where.classArmId = classArmId
                ? classArmId
                : { in: assignedClassArmIds };
        } else if (classArmId) {
            where.classArmId = classArmId;
        }

        if (gender) {
            where.gender = gender;
        }

        const termId = searchParams.get("termId");

        // Prepare include object
        const include: any = {
            classArm: {
                include: {
                    class: true,
                },
            },
        };

        // If termId is provided, fetch specific report card data
        if (termId) {
            include.reportCards = {
                where: { termId },
                select: {
                    id: true,
                    totalScore: true,
                    average: true,
                    classPosition: true,
                    isPublished: true,
                    termId: true
                }
            };
        }

        // Build a where without the gender filter for accurate gender breakdown counts
        const whereForGenderCounts: any = { ...where };
        delete whereForGenderCounts.gender;

        const [students, total, femaleCount, maleCount, activeCount] = await Promise.all([
            prisma.student.findMany({
                where,
                include,
                orderBy: { lastName: "asc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.student.count({ where }),
            prisma.student.count({ where: { ...whereForGenderCounts, gender: 'FEMALE' } }),
            prisma.student.count({ where: { ...whereForGenderCounts, gender: 'MALE' } }),
            prisma.student.count({ where: { ...whereForGenderCounts, isActive: true } }),
        ]);

        if (termId) {
            const reportType = (searchParams.get("reportType") as "halfTerm" | "endOfTerm") || "endOfTerm";
            const studentIds = students.map((student) => student.id);
            const assessmentTypes = await getResolvedAssessmentTypesForClassContext(prisma, {
                schoolId,
                classArmId: classArmId ?? null,
            });

            const scores = await prisma.score.findMany({
                where: {
                    termId,
                    studentId: { in: studentIds },
                    subject: { subjectKind: { not: "COMPOSITE_COMPONENT" } },
                },
                select: {
                    studentId: true,
                    ca1: true,
                    ca2: true,
                    ca3: true,
                    exam: true,
                },
            });

            const scoreTotalsByStudent = new Map<string, number[]>();
            for (const score of scores) {
                if (!scoreTotalsByStudent.has(score.studentId)) {
                    scoreTotalsByStudent.set(score.studentId, []);
                }

                if (reportType === "halfTerm") {
                    const ca1Type = getAssessmentTypeForField(assessmentTypes, "ca1");
                    const maxPerSubject = Number(ca1Type?.maxScore) > 0 ? Number(ca1Type.maxScore) : 10;
                    const ca1 = typeof (score.ca1 as any)?.toNumber === "function" ? (score.ca1 as any).toNumber() : Number(score.ca1 || 0);
                    const percent = maxPerSubject > 0 ? (ca1 / maxPerSubject) * 100 : 0;
                    scoreTotalsByStudent.get(score.studentId)!.push(percent);
                    continue;
                }

                const values = {
                    ca1: typeof (score.ca1 as any)?.toNumber === "function" ? (score.ca1 as any).toNumber() : Number(score.ca1 || 0),
                    ca2: typeof (score.ca2 as any)?.toNumber === "function" ? (score.ca2 as any).toNumber() : Number(score.ca2 || 0),
                    ca3: typeof (score.ca3 as any)?.toNumber === "function" ? (score.ca3 as any).toNumber() : Number(score.ca3 || 0),
                    exam: typeof (score.exam as any)?.toNumber === "function" ? (score.exam as any).toNumber() : Number(score.exam || 0),
                };
                const metrics = calculateEndOfTermScoreTotals(values, assessmentTypes as any);
                scoreTotalsByStudent.get(score.studentId)!.push(metrics.adjustedTotal);
            }

            const computedAverageByStudent = new Map<string, number>();
            for (const [studentId, totals] of scoreTotalsByStudent.entries()) {
                const avg = totals.length > 0 ? totals.reduce((acc, curr) => acc + curr, 0) / totals.length : 0;
                computedAverageByStudent.set(studentId, Number(avg.toFixed(1)));
            }

            for (const student of students as any[]) {
                const computedAverage = computedAverageByStudent.get(student.id);
                if (!student.reportCards || student.reportCards.length === 0) continue;
                if (computedAverage === undefined) continue;
                student.reportCards = student.reportCards.map((reportCard: any) => ({
                    ...reportCard,
                    average: computedAverage,
                }));
            }
        }

        return NextResponse.json({
            students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                femaleCount,
                maleCount,
                activeCount,
            },
        });
    } catch (error: any) {
        console.error("[API] Error fetching students:", error);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}

// POST /api/students - Create a new student
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);
        const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json(
                { error: "Unauthorized: Only admin and class teachers can add students." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            firstName,
            lastName,
            otherNames,
            admissionNumber,
            gender,
            dateOfBirth,
            admissionDate,
            classArmId,
            stateOfOrigin,
            address,
            parentName,
            parentPhone,
            parentEmail,
            sessionId,
            autoGenerate, // Flag to auto-generate admission number
            prefix, // Custom prefix for admission number (default: SCH)
            photoUrl,
        } = body;

        // Validate required fields
        if (!firstName || !lastName || !gender || !classArmId) {
            return NextResponse.json(
                { error: "Missing required fields: firstName, lastName, gender, classArmId" },
                { status: 400 }
            );
        }

        const schoolId = user.schoolId;

        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school. Please contact your administrator." },
                { status: 400 }
            );
        }

        let resolvedAdmissionDate: Date | null = null;
        if (admissionDate) {
            const parsedAdmissionDate = new Date(admissionDate);
            if (isNaN(parsedAdmissionDate.getTime())) {
                return NextResponse.json(
                    { error: "Invalid admissionDate. Use a valid date format." },
                    { status: 400 }
                );
            }
            resolvedAdmissionDate = parsedAdmissionDate;
        } else {
            const admissionSession = await prisma.academicSession.findFirst({
                where: sessionId
                    ? { id: sessionId, schoolId }
                    : { schoolId, isCurrent: true },
                select: { startDate: true },
            });

            if (sessionId && !admissionSession) {
                return NextResponse.json(
                    { error: "Invalid sessionId supplied for student creation." },
                    { status: 400 }
                );
            }

            resolvedAdmissionDate = admissionSession?.startDate || null;
        }

        let finalAdmissionNumber = admissionNumber;
        const admissionYear = await resolveAdmissionYear(schoolId, sessionId);

        // Auto-generate admission number if not provided or flag is set
        if (!admissionNumber || autoGenerate) {
            const schoolName = user.schoolName;
            const defaultPrefix = getSchoolAcronym(schoolName);
            const usePrefix = prefix || defaultPrefix;

            finalAdmissionNumber = await generateAdmissionNumber(schoolId, usePrefix, admissionYear);
        }

        // Check if admission number already exists
        const existingStudent = await prisma.student.findFirst({
            where: {
                admissionNumber: finalAdmissionNumber,
                schoolId,
            },
        });

        if (existingStudent) {
            // If auto-generated number exists (race condition), try again
            if (!admissionNumber || autoGenerate) {
                const schoolName = user.schoolName;
                const defaultPrefix = getSchoolAcronym(schoolName);
                const usePrefix = prefix || defaultPrefix;

                finalAdmissionNumber = await generateAdmissionNumber(schoolId, usePrefix, admissionYear);
            } else {
                return NextResponse.json(
                    { error: "Admission number already exists" },
                    { status: 400 }
                );
            }
        }

        // Verify the classArmId exists
        const classArm = await prisma.classArm.findFirst({
            where: {
                id: classArmId,
                ...(!isAdmin && isClassTeacher ? { classTeacherId: user.id } : {}),
                class: { schoolId },
            },
            include: { class: true },
        });

        if (!classArm) {
            return NextResponse.json(
                {
                    error: !isAdmin && isClassTeacher
                        ? "Unauthorized: You can only add students to your assigned class."
                        : "Invalid class/arm selected. Please select a valid class."
                },
                { status: !isAdmin && isClassTeacher ? 403 : 400 }
            );
        }

        // Generate default password hash (PIN: 1234)
        const studentEmail = await ensureUniqueStudentEmail(prisma, {
            firstName,
            lastName,
            schoolName: user.schoolName || "",
        });
        const { passwordHash } = await generateStudentDefaultPasswordHash({
            firstName,
            lastName,
            admissionNumber: finalAdmissionNumber,
            schoolName: user.schoolName || "",
        });

        // Generate dummy email for student user — add timestamp to avoid collisions


        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                otherNames: otherNames || null,
                admissionNumber: finalAdmissionNumber,
                gender,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                admissionDate: resolvedAdmissionDate,
                classArm: { connect: { id: classArmId } },
                stateOfOrigin: stateOfOrigin || null,
                address: address || null,
                parentName: parentName || null,
                parentPhone: parentPhone || null,
                parentEmail: parentEmail || null,
                photoUrl: photoUrl || null,
                school: { connect: { id: schoolId } },
                isActive: true,
                user: {
                    create: {
                        email: studentEmail,
                        passwordHash,
                        firstName,
                        lastName,
                        roles: [UserRole.STUDENT],
                        school: { connect: { id: schoolId } },
                        isActive: true,
                        mustChangePassword: true,
                    }
                }
            },
            include: {
                classArm: {
                    include: { class: true },
                },
                user: true
            },
        });

        return NextResponse.json({
            student,
            generatedAdmissionNumber: finalAdmissionNumber
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating student:", error);

        // Return descriptive error messages based on Prisma error codes
        let errorMessage = "Failed to create student";
        if (error.code === "P2002") {
            const target = error.meta?.target;
            if (target?.includes("admissionNumber")) {
                errorMessage = "A student with this admission number already exists.";
            } else if (target?.includes("email")) {
                errorMessage = "A user account with this email already exists.";
            } else {
                errorMessage = `Duplicate entry detected: ${target?.join(", ") || "unknown field"}`;
            }
        } else if (error.code === "P2003") {
            errorMessage = "Invalid reference: the selected class or arm does not exist.";
        } else if (error.code === "P2025") {
            errorMessage = "A required related record was not found.";
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

// PUT /api/students - Update a student
export async function PUT(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);
        const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const id = typeof body?.id === "string" ? body.id : "";

        if (!id) {
            return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
        }

        const schoolId = typeof user.schoolId === "string" ? user.schoolId : "";
        if (!schoolId) {
            return NextResponse.json({ error: "Your account is not associated with a school." }, { status: 400 });
        }

        const assignedClassArmIds = !isAdmin
            ? await getAssignedClassArmIds(user.id, schoolId)
            : [];

        if (!isAdmin && assignedClassArmIds.length === 0) {
            return NextResponse.json({ error: "You are not assigned to any class." }, { status: 403 });
        }

        const existingStudent = await findStudentForManagement({
            studentId: id,
            schoolId,
            isAdmin,
            assignedClassArmIds,
        });

        if (!existingStudent) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        const normalizedData = normalizeStudentUpdatePayload(body);

        if (body.firstName === "" || body.lastName === "" || body.gender === "" || body.classArmId === "") {
            return NextResponse.json({ error: "Required fields cannot be empty" }, { status: 400 });
        }

        if (normalizedData.dateOfBirth) {
            const parsedDate = new Date(normalizedData.dateOfBirth);
            if (isNaN(parsedDate.getTime())) {
                return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
            }
        }

        let requestedClassLabel: string | null = null;
        if (normalizedData.classArmId !== undefined) {
            if (!normalizedData.classArmId) {
                return NextResponse.json(
                    { error: "Invalid class/arm selected. Please select a valid class." },
                    { status: 400 }
                );
            }

            const classArm = await prisma.classArm.findFirst({
                where: {
                    id: normalizedData.classArmId,
                    class: { schoolId },
                    ...(!isAdmin ? { id: { in: assignedClassArmIds } } : {}),
                },
                include: {
                    class: {
                        select: { name: true },
                    },
                },
            });

            if (!classArm) {
                return NextResponse.json(
                    {
                        error: !isAdmin
                            ? "You can only assign students within your class scope."
                            : "Invalid class/arm selected. Please select a valid class."
                    },
                    { status: !isAdmin ? 403 : 400 }
                );
            }

            requestedClassLabel = `${classArm.class.name} ${classArm.armName}`.trim();
        }

        const changedData = getChangedStudentData(existingStudent, normalizedData);

        if (Object.keys(changedData).length === 0) {
            return NextResponse.json({ error: "No changes were detected." }, { status: 400 });
        }

        if (!isAdmin) {
            if (isPhotoOnlyUpdate(changedData)) {
                const student = await prisma.$transaction((tx) =>
                    applyStudentUpdateTransaction(tx, id, changedData)
                );

                return NextResponse.json({
                    student,
                    message: "Student photo updated successfully.",
                });
            }

            const pendingRequest = await prisma.studentChangeRequest.findFirst({
                where: {
                    schoolId,
                    studentId: id,
                    status: "PENDING",
                },
                select: { id: true },
            });

            if (pendingRequest) {
                return NextResponse.json(
                    { error: "There is already a pending approval request for this student." },
                    { status: 409 }
                );
            }

            const actorName = typeof user.name === "string" && user.name.trim().length > 0
                ? user.name
                : "Class teacher";
            const studentName = `${existingStudent.firstName} ${existingStudent.lastName}`.trim();
            const request = await prisma.studentChangeRequest.create({
                data: {
                    schoolId,
                    studentId: existingStudent.id,
                    requesterId: user.id,
                    action: "EDIT",
                    studentName,
                    admissionNumber: existingStudent.admissionNumber,
                    classLabel: requestedClassLabel || getStudentClassLabel(existingStudent),
                    currentData: createStudentSnapshot(existingStudent),
                    requestedData: {
                        ...changedData,
                        ...(requestedClassLabel ? { classLabel: requestedClassLabel } : {}),
                    },
                    summary: buildStudentChangeSummary({
                        action: "EDIT",
                        changedData,
                        requestedClassLabel,
                    }),
                },
                select: { id: true },
            });

            const adminIds = await getSchoolAdminUserIds(schoolId, user.id);
            await createUserNotifications(adminIds, {
                schoolId,
                type: "APPROVAL_REQUESTED",
                title: "Student Update Needs Approval",
                message: `${actorName} requested changes for ${studentName} (${existingStudent.admissionNumber}).`,
                href: "/dashboard/students?requests=true",
                metadata: {
                    requestId: request.id,
                    studentId: existingStudent.id,
                    action: "EDIT",
                },
            });

            return NextResponse.json(
                { message: "Student update submitted for admin approval." },
                { status: 202 }
            );
        }

        const student = await prisma.$transaction((tx) =>
            applyStudentUpdateTransaction(tx, id, changedData)
        );

        return NextResponse.json({ student, message: "Student updated successfully." });
    } catch (error: any) {
        console.error("Error updating student:", error);
        return NextResponse.json(
            { error: "Failed to update student" },
            { status: 500 }
        );
    }
}

// DELETE /api/students - Delete a student
export async function DELETE(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);
        const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Student ID is required" },
                { status: 400 }
            );
        }

        const schoolId = typeof user.schoolId === "string" ? user.schoolId : "";
        if (!schoolId) {
            return NextResponse.json({ error: "Your account is not associated with a school." }, { status: 400 });
        }

        const assignedClassArmIds = !isAdmin
            ? await getAssignedClassArmIds(user.id, schoolId)
            : [];

        if (!isAdmin && assignedClassArmIds.length === 0) {
            return NextResponse.json({ error: "You are not assigned to any class." }, { status: 403 });
        }

        const existingStudent = await findStudentForManagement({
            studentId: id,
            schoolId,
            isAdmin,
            assignedClassArmIds,
        });

        if (!existingStudent) {
            return NextResponse.json(
                { error: "Student not found" },
                { status: 404 }
            );
        }

        if (!isAdmin) {
            const pendingRequest = await prisma.studentChangeRequest.findFirst({
                where: {
                    schoolId,
                    studentId: id,
                    status: "PENDING",
                },
                select: { id: true },
            });

            if (pendingRequest) {
                return NextResponse.json(
                    { error: "There is already a pending approval request for this student." },
                    { status: 409 }
                );
            }

            const studentName = `${existingStudent.firstName} ${existingStudent.lastName}`.trim();
            const actorName = typeof user.name === "string" && user.name.trim().length > 0
                ? user.name
                : "Class teacher";

            const request = await prisma.studentChangeRequest.create({
                data: {
                    schoolId,
                    studentId: existingStudent.id,
                    requesterId: user.id,
                    action: "DELETE",
                    studentName,
                    admissionNumber: existingStudent.admissionNumber,
                    classLabel: getStudentClassLabel(existingStudent),
                    currentData: createStudentSnapshot(existingStudent),
                    summary: buildStudentChangeSummary({ action: "DELETE" }),
                },
                select: { id: true },
            });

            const adminIds = await getSchoolAdminUserIds(schoolId, user.id);
            await createUserNotifications(adminIds, {
                schoolId,
                type: "APPROVAL_REQUESTED",
                title: "Student Deletion Needs Approval",
                message: `${actorName} requested deletion of ${studentName} (${existingStudent.admissionNumber}).`,
                href: "/dashboard/students?requests=true",
                metadata: {
                    requestId: request.id,
                    studentId: existingStudent.id,
                    action: "DELETE",
                },
            });

            return NextResponse.json(
                { message: "Student deletion submitted for admin approval." },
                { status: 202 }
            );
        }

        await prisma.student.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Student deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting student:", error);
        return NextResponse.json(
            { error: "Failed to delete student" },
            { status: 500 }
        );
    }
}

