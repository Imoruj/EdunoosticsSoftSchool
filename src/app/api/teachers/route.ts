
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requireSchoolAdmin } from "@/lib/rbac";

type SubjectAssignmentInput = {
    subjectId: string;
    classArmId: string;
};

function normalizeSubjectAssignments(raw: any): SubjectAssignmentInput[] {
    if (!Array.isArray(raw)) return [];

    const seen = new Set<string>();
    const normalized: SubjectAssignmentInput[] = [];

    for (const item of raw) {
        const subjectId = typeof item?.subjectId === "string" ? item.subjectId.trim() : "";
        const classArmId = typeof item?.classArmId === "string" ? item.classArmId.trim() : "";
        if (!subjectId || !classArmId) continue;

        const key = `${subjectId}:${classArmId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        normalized.push({ subjectId, classArmId });
    }

    return normalized;
}

function normalizeIdList(raw: any): string[] {
    if (!Array.isArray(raw)) return [];
    return Array.from(
        new Set(
            raw
                .filter((item) => typeof item === "string")
                .map((item) => item.trim())
                .filter(Boolean)
        )
    );
}

function resolveSubjectAssignments(
    rawSubjectAssignments: any,
    rawSubjectIds: any,
    rawSubjectClassArmIds: any
): SubjectAssignmentInput[] {
    const explicitAssignments = normalizeSubjectAssignments(rawSubjectAssignments);
    if (explicitAssignments.length > 0) {
        return explicitAssignments;
    }

    const subjectIds = normalizeIdList(rawSubjectIds);
    const classArmIds = normalizeIdList(rawSubjectClassArmIds);
    if (subjectIds.length === 0 || classArmIds.length === 0) {
        return [];
    }

    const generatedAssignments = subjectIds.flatMap((subjectId) =>
        classArmIds.map((classArmId) => ({ subjectId, classArmId }))
    );
    return normalizeSubjectAssignments(generatedAssignments);
}

// GET /api/teachers - List all teachers in the school
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const actorRoles = user.roles || [];
        const isAdmin = actorRoles.includes("SUPER_ADMIN") || actorRoles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const schoolId = user.schoolId;

        const teachers = await prisma.user.findMany({
            where: {
                schoolId,
                roles: {
                    hasSome: ["CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"]
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                roles: true,
                isActive: true,
                classArms: {
                    select: {
                        id: true,
                        armName: true,
                        class: { select: { name: true } }
                    }
                },
                teacherSubjects: {
                    select: {
                        id: true,
                        subjectId: true,
                        classArmId: true,
                        subject: { select: { name: true } },
                        classArm: {
                            select: {
                                armName: true,
                                class: { select: { name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { firstName: "asc" },
                { lastName: "asc" }
            ]
        });

        // Format for frontend
        const formattedTeachers = teachers.map((t: any) => ({
            ...t,
            assignedClass: t.classArms[0] ? `${t.classArms[0].class.name} ${t.classArms[0].armName}` : null,
            assignedClasses: t.classArms.map((ca: any) => ({
                id: ca.id,
                name: `${ca.class.name} ${ca.armName}`
            })),
            subjects: Array.from(new Set(t.teacherSubjects.map((ts: any) => ts.subject.name))),
            classArmIds: t.classArms.map((ca: any) => ca.id),
            subjectIds: Array.from(new Set(t.teacherSubjects.map((ts: any) => ts.subjectId).filter(Boolean))),
            subjectAssignments: t.teacherSubjects.map((ts: any) => ({
                id: ts.id,
                subjectId: ts.subjectId,
                classArmId: ts.classArmId,
                subjectName: ts.subject.name,
                className: ts.classArm?.class?.name || "",
                classArmName: ts.classArm?.armName || ""
            }))
        }));

        // Fetch active metadata for the form
        const availableClasses = await prisma.classArm.findMany({
            where: {
                class: { schoolId }
            },
            select: {
                id: true,
                armName: true,
                classTeacherId: true,
                class: { select: { id: true, name: true } }
            }
        });

        const availableSubjects = await prisma.subject.findMany({
            where: { schoolId, isActive: true },
            select: {
                id: true,
                name: true
            },
            orderBy: {
                name: "asc"
            }
        });

        const existingSubjectAssignments = teachers.flatMap((t: any) =>
            t.teacherSubjects.map((ts: any) => ({
                teacherId: t.id,
                teacherName: `${t.firstName} ${t.lastName}`,
                subjectId: ts.subjectId,
                classArmId: ts.classArmId,
                subjectName: ts.subject.name,
                className: ts.classArm?.class?.name || "",
                classArmName: ts.classArm?.armName || ""
            }))
        );

        // Fetch SubjectClassArm data to know which subjects are offered in which class arms
        const subjectClassArms = await prisma.subjectClassArm.findMany({
            where: {
                classArm: {
                    class: { schoolId }
                }
            },
            select: {
                classArmId: true,
                subjectId: true
            }
        });

        return NextResponse.json({
            teachers: formattedTeachers,
            metadata: {
                classes: availableClasses.map((c: any) => ({
                    id: c.id,
                    name: `${c.class.name} ${c.armName}`,
                    classTeacherId: c.classTeacherId,
                    classId: c.class.id // Keep for backwards compatibility
                })),
                subjects: availableSubjects,
                subjectAssignments: existingSubjectAssignments,
                subjectClassArms: subjectClassArms.map((sca: any) => ({
                    classArmId: sca.classArmId,
                    subjectId: sca.subjectId
                }))
            }
        });
    } catch (error: any) {
        console.error("Error fetching teachers:", error);
        return NextResponse.json(
            { error: "Failed to fetch teachers" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const user = session.user as any;

        const schoolId = user.schoolId;
        const body = await req.json();
        const {
            firstName,
            lastName,
            email,
            phone,
            roles,
            classArmIds,
            subjectAssignments: rawSubjectAssignments,
            subjectIds: rawSubjectIds,
            subjectClassArmIds: rawSubjectClassArmIds
        } = body;

        if (!firstName || !lastName || !email || !roles || roles.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const normalizedSubjectAssignments = resolveSubjectAssignments(
            rawSubjectAssignments,
            rawSubjectIds,
            rawSubjectClassArmIds
        );

        if (roles.includes("SUBJECT_TEACHER") && normalizedSubjectAssignments.length === 0) {
            return NextResponse.json(
                { error: "Subject teachers must have at least one subject-class assignment." },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 400 }
            );
        }

        const passwordHash = await bcrypt.hash("1234", 12);

        const newTeacher = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    phone,
                    roles: roles as any,
                    passwordHash,
                    schoolId,
                    isActive: true
                }
            });

            // Handle Class Assignments if CLASS_TEACHER role is present
            if (roles.includes("CLASS_TEACHER") && classArmIds?.length > 0) {
                await tx.classArm.updateMany({
                    where: { id: { in: classArmIds }, class: { schoolId } },
                    data: { classTeacherId: user.id }
                });
            }

            // Handle Subject Assignments if SUBJECT_TEACHER role is present
            if (roles.includes("SUBJECT_TEACHER")) {
                const subjectIds = Array.from(new Set(normalizedSubjectAssignments.map((a) => a.subjectId)));
                const classArmAssignmentIds = Array.from(new Set(normalizedSubjectAssignments.map((a) => a.classArmId)));

                const [subjects, classArms] = await Promise.all([
                    tx.subject.findMany({
                        where: { id: { in: subjectIds }, schoolId },
                        select: { id: true, name: true }
                    }),
                    tx.classArm.findMany({
                        where: { id: { in: classArmAssignmentIds }, class: { schoolId } },
                        select: {
                            id: true,
                            armName: true,
                            class: { select: { id: true, name: true } }
                        }
                    })
                ]);

                if (subjects.length !== subjectIds.length) {
                    throw new Error("One or more selected subjects are invalid.");
                }
                if (classArms.length !== classArmAssignmentIds.length) {
                    throw new Error("One or more selected classes are invalid.");
                }

                const allowedSubjectClassArms = await tx.subjectClassArm.findMany({
                    where: {
                        classArmId: { in: classArmAssignmentIds },
                        subjectId: { in: subjectIds }
                    },
                    select: { subjectId: true, classArmId: true }
                });

                const allowedPairSet = new Set(
                    allowedSubjectClassArms.map((pair: any) => `${pair.subjectId}:${pair.classArmId}`)
                );

                const invalidAssignments = normalizedSubjectAssignments.filter((assignment) => {
                    return !allowedPairSet.has(`${assignment.subjectId}:${assignment.classArmId}`);
                });

                if (invalidAssignments.length > 0) {
                    throw new Error("Some subject assignments do not match the subject offerings for the selected classes.");
                }

                const conflicts = await tx.teacherSubject.findMany({
                    where: {
                        teacherId: { not: user.id },
                        OR: normalizedSubjectAssignments.map((assignment) => ({
                            subjectId: assignment.subjectId,
                            classArmId: assignment.classArmId
                        }))
                    },
                    include: {
                        teacher: { select: { firstName: true, lastName: true } },
                        subject: { select: { name: true } },
                        classArm: {
                            select: {
                                armName: true,
                                class: { select: { name: true } }
                            }
                        }
                    }
                });

                if (conflicts.length > 0) {
                    const conflict = conflicts[0];
                    throw new Error(
                        `${conflict.subject.name} for ${conflict.classArm.class.name} ${conflict.classArm.armName} is already assigned to ${conflict.teacher.firstName} ${conflict.teacher.lastName}.`
                    );
                }

                await tx.teacherSubject.createMany({
                    data: normalizedSubjectAssignments.map((assignment) => ({
                        teacherId: user.id,
                        subjectId: assignment.subjectId,
                        classArmId: assignment.classArmId
                    }))
                });
            }

            return user;
        });

        return NextResponse.json({
            success: true,
            teacher: newTeacher,
            message: "Teacher account created and assigned successfully."
        });

    } catch (error: any) {
        console.error("Error creating teacher:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create teacher" },
            { status: 500 }
        );
    }
}

