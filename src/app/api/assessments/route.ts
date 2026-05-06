
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { syncCurrentTerm } from "@/lib/currentTerm";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

type SessionUser = {
    id?: string;
    schoolId?: string;
    roles?: string[];
};

type NormalizedUpdate = {
    studentId: string;
    ratings: Record<string, number>;
};

async function resolveAllowedSessionIdsForClassArm(
    schoolId: string,
    classArmId: string,
    currentSessionId: string | null
): Promise<Set<string>> {
    const [sessionTerms, hasActiveStudents] = await Promise.all([
        prisma.term.findMany({
            where: {
                session: { schoolId },
                OR: [
                    { reportCards: { some: { classArmId } } },
                    { subjectEnrollments: { some: { classArmId } } },
                    { scores: { some: { student: { classArmId } } } }
                ]
            },
            select: { sessionId: true },
            distinct: ["sessionId"]
        }),
        prisma.student.findFirst({
            where: { schoolId, classArmId, isActive: true },
            select: { id: true }
        })
    ]);

    const allowedSessionIds = new Set<string>(sessionTerms.map((term) => term.sessionId));
    if (currentSessionId && hasActiveStudents) {
        allowedSessionIds.add(currentSessionId);
    }

    return allowedSessionIds;
}

// GET: Fetch assessment data (students, traits, skills, current ratings)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const requestedTermId = searchParams.get("termId");

        if (!classArmId) {
            return NextResponse.json({ error: "Class Arm ID is required" }, { status: 400 });
        }

        const user = session.user as SessionUser;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const userId = typeof user.id === "string" ? user.id : "";
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json(
                { error: "Unauthorized: Only admin and class teachers can access assessments." },
                { status: 403 }
            );
        }

        // Auto-sync current term based on date ranges
        if (schoolId) await syncCurrentTerm(schoolId);

        const [classArm, explicitTerm, currentTerm, currentSession] = await Promise.all([
            prisma.classArm.findFirst({
                where: {
                    id: classArmId,
                    class: { schoolId }
                },
                select: { id: true, classTeacherId: true }
            }),
            requestedTermId
                ? prisma.term.findFirst({
                    where: {
                        id: requestedTermId,
                        session: { schoolId }
                    },
                    select: { id: true, sessionId: true }
                })
                : Promise.resolve(null),
            prisma.term.findFirst({
                where: { isCurrent: true, session: { schoolId } },
                select: { id: true, sessionId: true }
            }),
            prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true }
            })
        ]);

        if (!classArm) {
            return NextResponse.json({ error: "Invalid class selection." }, { status: 400 });
        }

        if (!isAdmin && classArm.classTeacherId !== userId) {
            return NextResponse.json(
                { error: "Access denied. You are not the class teacher for this class." },
                { status: 403 }
            );
        }

        if (requestedTermId && !explicitTerm) {
            return NextResponse.json({ error: "Invalid term selection." }, { status: 400 });
        }

        const selectedTerm = explicitTerm || currentTerm;
        if (!selectedTerm) {
            return NextResponse.json({ error: "No active term found." }, { status: 400 });
        }

        if (!isAdmin && isClassTeacher) {
            const allowedSessionIds = await resolveAllowedSessionIdsForClassArm(
                schoolId,
                classArmId,
                currentSession?.id ?? null
            );

            if (!allowedSessionIds.has(selectedTerm.sessionId)) {
                return NextResponse.json(
                    { error: "Unauthorized: Selected session is not available for this class assignment." },
                    { status: 403 }
                );
            }
        }

        // Fetch Metadata (Traits & Skills)
        const [traits, skills] = await Promise.all([
            prisma.affectiveTrait.findMany({
                where: { schoolId, isActive: true },
                orderBy: { orderIndex: "asc" }
            }),
            prisma.psychomotorSkill.findMany({
                where: { schoolId, isActive: true },
                orderBy: { orderIndex: "asc" }
            })
        ]);

        // Fetch Students and their Report Cards for this term
        const students = await prisma.student.findMany({
            where: {
                classArmId,
                schoolId,
                isActive: true
            },
            orderBy: { lastName: "asc" },
            include: {
                reportCards: {
                    where: { termId: selectedTerm.id },
                    include: {
                        affectiveRatings: true,
                        psychomotorRatings: true
                    }
                }
            }
        });

        // Format response
        const studentData = students.map(student => {
            const report = student.reportCards[0]; // Active term report
            const ratings: Record<string, number> = {};

            // Flatten ratings into a map: "trait_<id>" or "skill_<id>" -> rating
            if (report) {
                report.affectiveRatings.forEach(r => {
                    ratings[`trait_${r.traitId}`] = r.rating;
                });
                report.psychomotorRatings.forEach(r => {
                    ratings[`skill_${r.skillId}`] = r.rating;
                });
            }

            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                admissionNumber: student.admissionNumber,
                ratings
            };
        });

        return NextResponse.json({
            traits,
            skills,
            students: studentData,
            termId: selectedTerm.id
        });

    } catch (error: unknown) {
        console.error("Error fetching assessments:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

// POST: Save Ratings
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const classArmId = typeof body?.classArmId === "string" ? body.classArmId : "";
        const termId = typeof body?.termId === "string" ? body.termId : "";
        const rawUpdates = Array.isArray(body?.updates) ? body.updates : null;
        // updates: [{ studentId, ratings: { "trait_xyz": 5, "skill_abc": 4 } }]

        if (!classArmId || !termId || !rawUpdates) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const user = session.user as SessionUser;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const userId = typeof user.id === "string" ? user.id : "";
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json(
                { error: "Unauthorized: Only admin and class teachers can save assessments." },
                { status: 403 }
            );
        }

        const [classArm, term, currentSession] = await Promise.all([
            prisma.classArm.findFirst({
                where: {
                    id: classArmId,
                    class: { schoolId }
                },
                select: {
                    id: true,
                    classTeacherId: true
                }
            }),
            prisma.term.findFirst({
                where: {
                    id: termId,
                    session: { schoolId }
                },
                select: {
                    id: true,
                    sessionId: true
                }
            }),
            prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true }
            })
        ]);

        if (!classArm || !term) {
            return NextResponse.json({ error: "Invalid class or term selection." }, { status: 400 });
        }

        if (!isAdmin && classArm.classTeacherId !== userId) {
            return NextResponse.json(
                { error: "Unauthorized: You are not assigned to this class." },
                { status: 403 }
            );
        }

        if (!isAdmin && isClassTeacher) {
            const allowedSessionIds = await resolveAllowedSessionIdsForClassArm(
                schoolId,
                classArmId,
                currentSession?.id ?? null
            );
            if (!allowedSessionIds.has(term.sessionId)) {
                return NextResponse.json(
                    { error: "Unauthorized: Selected session is not available for this class assignment." },
                    { status: 403 }
                );
            }
        }

        const normalizedUpdates: NormalizedUpdate[] = [];
        const traitIds = new Set<string>();
        const skillIds = new Set<string>();

        for (const update of rawUpdates) {
            if (!update || typeof update !== "object") {
                return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
            }

            const studentId = typeof (update as { studentId?: unknown }).studentId === "string"
                ? (update as { studentId: string }).studentId
                : "";
            if (!studentId) {
                return NextResponse.json({ error: "Invalid student in update payload." }, { status: 400 });
            }

            const ratingsRaw = (update as { ratings?: unknown }).ratings;
            if (!ratingsRaw || typeof ratingsRaw !== "object" || Array.isArray(ratingsRaw)) {
                return NextResponse.json({ error: "Invalid ratings payload." }, { status: 400 });
            }

            const normalizedRatings: Record<string, number> = {};
            for (const [key, value] of Object.entries(ratingsRaw as Record<string, unknown>)) {
                if (!key.startsWith("trait_") && !key.startsWith("skill_")) {
                    return NextResponse.json({ error: "Invalid rating key." }, { status: 400 });
                }

                const numericValue = Number(value);
                if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 5) {
                    return NextResponse.json({ error: "Ratings must be integers between 1 and 5." }, { status: 400 });
                }

                if (key.startsWith("trait_")) {
                    const traitId = key.replace("trait_", "");
                    if (!traitId) {
                        return NextResponse.json({ error: "Invalid trait reference." }, { status: 400 });
                    }
                    traitIds.add(traitId);
                } else {
                    const skillId = key.replace("skill_", "");
                    if (!skillId) {
                        return NextResponse.json({ error: "Invalid skill reference." }, { status: 400 });
                    }
                    skillIds.add(skillId);
                }

                normalizedRatings[key] = numericValue;
            }

            normalizedUpdates.push({
                studentId,
                ratings: normalizedRatings
            });
        }

        const studentIds = Array.from(new Set(normalizedUpdates.map((update) => update.studentId)));

        if (studentIds.length === 0) {
            return NextResponse.json({ message: "No assessment updates to save." });
        }

        const [classStudents, dbTraits, dbSkills] = await Promise.all([
            prisma.student.findMany({
                where: {
                    id: { in: studentIds },
                    schoolId,
                    classArmId
                },
                select: { id: true }
            }),
            traitIds.size > 0
                ? prisma.affectiveTrait.findMany({
                    where: {
                        id: { in: Array.from(traitIds) },
                        schoolId
                    },
                    select: { id: true }
                })
                : Promise.resolve([]),
            skillIds.size > 0
                ? prisma.psychomotorSkill.findMany({
                    where: {
                        id: { in: Array.from(skillIds) },
                        schoolId
                    },
                    select: { id: true }
                })
                : Promise.resolve([])
        ]);

        if (classStudents.length !== studentIds.length) {
            return NextResponse.json(
                { error: "One or more students are outside the selected class." },
                { status: 400 }
            );
        }

        if (dbTraits.length !== traitIds.size || dbSkills.length !== skillIds.size) {
            return NextResponse.json(
                { error: "Invalid trait or skill references found in ratings." },
                { status: 400 }
            );
        }

        // Process updates in transaction
        await prisma.$transaction(async (tx) => {
            for (const update of normalizedUpdates) {
                const { studentId, ratings } = update;

                // 1. Ensure ReportCard exists
                // We use upsert to create if missing. 
                // Note: ReportCard unique constraint is [studentId, termId]
                // We also need classArmId when creating.

                // First find or create report card
                let reportCard = await tx.reportCard.findUnique({
                    where: { studentId_termId: { studentId, termId } }
                });

                if (!reportCard) {
                    reportCard = await tx.reportCard.create({
                        data: {
                            studentId,
                            termId,
                            classArmId,
                        }
                    });
                }

                // 2. Update Ratings
                // entries are like "trait_<id>": 5 or "skill_<id>": 3
                for (const [key, value] of Object.entries(ratings)) {
                    const ratingValue = Number(value);
                    if (key.startsWith("trait_")) {
                        const traitId = key.replace("trait_", "");
                        await tx.affectiveRating.upsert({
                            where: {
                                reportCardId_traitId: {
                                    reportCardId: reportCard.id,
                                    traitId
                                }
                            },
                            create: {
                                reportCardId: reportCard.id,
                                traitId,
                                rating: ratingValue
                            },
                            update: {
                                rating: ratingValue
                            }
                        });
                    } else if (key.startsWith("skill_")) {
                        const skillId = key.replace("skill_", "");
                        await tx.psychomotorRating.upsert({
                            where: {
                                reportCardId_skillId: {
                                    reportCardId: reportCard.id,
                                    skillId
                                }
                            },
                            create: {
                                reportCardId: reportCard.id,
                                skillId,
                                rating: ratingValue
                            },
                            update: {
                                rating: ratingValue
                            }
                        });
                    }
                }
            }
        });

        return NextResponse.json({ message: "Assessments saved successfully" });

    } catch (error: unknown) {
        console.error("Error saving assessments:", error);
        return NextResponse.json({ error: "Failed to save assessments" }, { status: 500 });
    }
}

