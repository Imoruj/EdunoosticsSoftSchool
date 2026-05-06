
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requireSchoolAdmin } from "@/lib/rbac";
import { SubjectKind, UserRole } from "@prisma/client";
import { apiError, clampLimit } from "@/lib/apiError";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

const CreateTeacherSchema = z.object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    email: z.string().email("Invalid email address"),
    phone: z.string().max(20).optional(),
    roles: z.array(z.string()).min(1, "At least one role is required"),
    classArmIds: z.array(z.string()).optional(),
    subjectAssignments: z.array(z.object({ subjectId: z.string(), classArmId: z.string() })).optional(),
    subjectIds: z.array(z.string()).optional(),
    subjectClassArmIds: z.array(z.string()).optional(),
});

const STAFF_MANAGEMENT_ROLES: UserRole[] = [
    UserRole.PROPRIETOR,
    UserRole.SUBJECT_TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.SCHOOL_ADMIN,
];

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

        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
        const limit = clampLimit(searchParams.get("limit") ?? "500");
        const teacherWhere = {
            schoolId,
            roles: { hasSome: ["CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_ADMIN", "PROPRIETOR"] as UserRole[] },
        };

        const [teachers, total] = await Promise.all([
          prisma.user.findMany({
            where: teacherWhere,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                roles: true,
                isActive: true,
                canSwitchBranches: true,
                branches: { where: { isActive: true }, select: { schoolId: true } },
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
                        subject: {
                            select: {
                                name: true,
                                subjectKind: true,
                                defaultParentSubject: {
                                    select: { name: true }
                                }
                            }
                        },
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
          }),
          prisma.user.count({ where: teacherWhere }),
        ]);

        // Format for frontend
        const formattedTeachers = teachers.map((t: any) => ({
            ...t,
            canSwitchBranches: t.canSwitchBranches ?? true,
            branchCount: (t.branches?.length ?? 0) + 1, // +1 for primary school
            assignedClass: t.classArms[0] ? `${t.classArms[0].class.name} ${t.classArms[0].armName}` : null,
            assignedClasses: t.classArms.map((ca: any) => ({
                id: ca.id,
                name: `${ca.class.name} ${ca.armName}`
            })),
            subjects: Array.from(new Set(t.teacherSubjects.map((ts: any) =>
                ts.subject.subjectKind === "COMPOSITE_COMPONENT" && ts.subject.defaultParentSubject?.name
                    ? `${ts.subject.name} (Component of ${ts.subject.defaultParentSubject.name})`
                    : ts.subject.name
            ))),
            classArmIds: t.classArms.map((ca: any) => ca.id),
            subjectIds: Array.from(new Set(t.teacherSubjects.map((ts: any) => ts.subjectId).filter(Boolean))),
            subjectAssignments: t.teacherSubjects.map((ts: any) => ({
                id: ts.id,
                subjectId: ts.subjectId,
                classArmId: ts.classArmId,
                subjectName:
                    ts.subject.subjectKind === "COMPOSITE_COMPONENT" && ts.subject.defaultParentSubject?.name
                        ? `${ts.subject.name} (Component of ${ts.subject.defaultParentSubject.name})`
                        : ts.subject.name,
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
            where: {
                schoolId,
                isActive: true,
                subjectKind: { not: SubjectKind.COMPOSITE_PARENT },
            },
            select: {
                id: true,
                name: true,
                subjectKind: true,
                defaultParentSubject: {
                    select: { name: true }
                }
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
                subjectName:
                    ts.subject.subjectKind === "COMPOSITE_COMPONENT" && ts.subject.defaultParentSubject?.name
                        ? `${ts.subject.name} (Component of ${ts.subject.defaultParentSubject.name})`
                        : ts.subject.name,
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
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            metadata: {
                classes: availableClasses.map((c: any) => ({
                    id: c.id,
                    name: `${c.class.name} ${c.armName}`,
                    classTeacherId: c.classTeacherId,
                    classId: c.class.id // Keep for backwards compatibility
                })),
                subjects: availableSubjects.map((subject: any) => ({
                    id: subject.id,
                    name:
                        subject.subjectKind === "COMPOSITE_COMPONENT" && subject.defaultParentSubject?.name
                            ? `${subject.name} (Component of ${subject.defaultParentSubject.name})`
                            : subject.name,
                    subjectKind: subject.subjectKind,
                    parentSubjectName: subject.defaultParentSubject?.name || null,
                })),
                subjectAssignments: existingSubjectAssignments,
                subjectClassArms: subjectClassArms.map((sca: any) => ({
                    classArmId: sca.classArmId,
                    subjectId: sca.subjectId
                }))
            }
        });
    } catch (error: any) {
        return apiError("Failed to fetch staff", 500, error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const user = session.user as any;

        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const parsed = CreateTeacherSchema.safeParse(await req.json());
        if (!parsed.success) {
            return apiError(parsed.error.issues.map(e => e.message).join(", "), 422);
        }
        const {
            firstName,
            lastName,
            email,
            phone,
            roles,
            classArmIds,
            subjectAssignments: rawSubjectAssignments,
            subjectIds: rawSubjectIds,
            subjectClassArmIds: rawSubjectClassArmIds,
        } = parsed.data;

        const normalizedSubjectAssignments = resolveSubjectAssignments(
            rawSubjectAssignments,
            rawSubjectIds,
            rawSubjectClassArmIds
        );
        const normalizedRoles = Array.isArray(roles)
            ? Array.from(new Set(
                roles
                    .filter((role: unknown): role is string => typeof role === "string")
                    .map((role) => role.trim().toUpperCase())
                    .filter(Boolean)
            ))
            : [];

        if (normalizedRoles.length === 0) {
            return NextResponse.json(
                { error: "At least one valid staff role is required." },
                { status: 400 }
            );
        }

        const invalidRoles = normalizedRoles.filter((role) => !STAFF_MANAGEMENT_ROLES.includes(role as UserRole));
        if (invalidRoles.length > 0) {
            return NextResponse.json(
                { error: `Unsupported staff role(s): ${invalidRoles.join(", ")}` },
                { status: 400 }
            );
        }

        if (normalizedRoles.includes("SUBJECT_TEACHER") && normalizedSubjectAssignments.length === 0) {
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
                    roles: normalizedRoles as UserRole[],
                    passwordHash,
                    schoolId,
                    isActive: true
                }
            });

            // Handle Class Assignments if CLASS_TEACHER role is present
            if (normalizedRoles.includes("CLASS_TEACHER") && (classArmIds?.length ?? 0) > 0) {
                await tx.classArm.updateMany({
                    where: { id: { in: classArmIds }, class: { schoolId } },
                    data: { classTeacherId: user.id }
                });
            }

            // Handle Subject Assignments if SUBJECT_TEACHER role is present
            if (normalizedRoles.includes("SUBJECT_TEACHER")) {
                const subjectIds = Array.from(new Set(normalizedSubjectAssignments.map((a) => a.subjectId)));
                const classArmAssignmentIds = Array.from(new Set(normalizedSubjectAssignments.map((a) => a.classArmId)));

                const [subjects, classArms] = await Promise.all([
                    tx.subject.findMany({
                        where: { id: { in: subjectIds }, schoolId },
                        select: { id: true, name: true, subjectKind: true }
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
                if (subjects.some((subject: any) => subject.subjectKind === SubjectKind.COMPOSITE_PARENT)) {
                    throw new Error("Composite parent subjects cannot be assigned directly to subject teachers.");
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
            message: "Staff account created and assigned successfully."
        });

    } catch (error: any) {
        console.error("Error creating staff member:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create staff member" },
            { status: 500 }
        );
    }
}

