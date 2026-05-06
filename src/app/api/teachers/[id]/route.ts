
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requireSchoolAdmin } from "@/lib/rbac";
import { SubjectKind, UserRole } from "@prisma/client";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

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

async function getOrgSchoolIds(schoolId: string): Promise<string[]> {
    const activeSchool = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { organizationId: true },
    });
    if (!activeSchool?.organizationId) return [schoolId];

    const orgSchools = await prisma.school.findMany({
        where: { organizationId: activeSchool.organizationId, isActive: true },
        select: { id: true },
    });
    return orgSchools.map((school) => school.id);
}

/** GET /api/teachers/[id]?branchId=X
 *  Returns the teacher's class arm and subject assignments scoped to a specific branch.
 *  Used by the Edit Staff modal when the admin switches branches.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const actor = session.user as any;
        const schoolId = (await getActiveSchoolId(actor.schoolId)) as string | null;
        if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

        const allowedSchoolIds = await getOrgSchoolIds(schoolId);
        const { searchParams } = new URL(req.url);
        const branchId = searchParams.get("branchId") || schoolId;

        if (!allowedSchoolIds.includes(branchId)) {
            return NextResponse.json({ error: "Branch not in your organisation" }, { status: 403 });
        }

        const [classArmRows, subjectRows] = await Promise.all([
            prisma.classArm.findMany({
                where: { classTeacherId: id, class: { schoolId: branchId } },
                select: { id: true, armName: true, class: { select: { name: true } } },
            }),
            prisma.teacherSubject.findMany({
                where: { teacherId: id, classArm: { class: { schoolId: branchId } } },
                select: {
                    subjectId: true,
                    classArmId: true,
                    subject: { select: { name: true } },
                    classArm: { select: { armName: true, class: { select: { name: true } } } },
                },
            }),
        ]);

        return NextResponse.json({
            classArmIds: classArmRows.map((r) => r.id),
            subjectAssignments: subjectRows.map((r) => ({
                subjectId: r.subjectId,
                classArmId: r.classArmId,
                subjectName: r.subject.name,
                className: r.classArm.class.name,
                classArmName: r.classArm.armName,
            })),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to load teacher assignments" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const actor = session.user as any;

        const schoolId = (await getActiveSchoolId(actor.schoolId)) as string | null;
        if (!schoolId) {
            return NextResponse.json({ error: "School context is required" }, { status: 400 });
        }
        const allowedSchoolIds = await getOrgSchoolIds(schoolId);
        const teacherId = id;
        const body = await req.json();
        const {
            firstName,
            lastName,
            email,
            phone,
            branchId,
            roles,
            isActive,
            classArmIds,
            subjectAssignments: rawSubjectAssignments,
            subjectIds: rawSubjectIds,
            subjectClassArmIds: rawSubjectClassArmIds
        } = body;
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
            : null;
        const shouldSyncSubjectAssignments =
            Array.isArray(rawSubjectAssignments) ||
            Array.isArray(rawSubjectIds) ||
            Array.isArray(rawSubjectClassArmIds);

        // Verify the teacher belongs to the same school
        const existingTeacher = await prisma.user.findFirst({
            where: { id: teacherId, schoolId: { in: allowedSchoolIds } }
        });

        if (!existingTeacher) {
            return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        if (branchId && !allowedSchoolIds.includes(branchId)) {
            return NextResponse.json({ error: "Selected branch is not available to your organization." }, { status: 400 });
        }
        const targetSchoolId = branchId || existingTeacher.schoolId;
        if (!targetSchoolId) {
            return NextResponse.json({ error: "Branch is required for staff updates." }, { status: 400 });
        }

        if (normalizedRoles) {
            const invalidRoles = normalizedRoles.filter((role) => !STAFF_MANAGEMENT_ROLES.includes(role as UserRole));
            if (invalidRoles.length > 0) {
                return NextResponse.json(
                    { error: `Unsupported staff role(s): ${invalidRoles.join(", ")}` },
                    { status: 400 }
                );
            }
        }

        const effectiveRoles: string[] = normalizedRoles || existingTeacher.roles || [];
        if (effectiveRoles.includes("SUBJECT_TEACHER") && shouldSyncSubjectAssignments && normalizedSubjectAssignments.length === 0) {
            return NextResponse.json(
                { error: "Subject teachers must have at least one subject-class assignment." },
                { status: 400 }
            );
        }

        const updatedTeacher = await prisma.$transaction(async (tx: any) => {
            const user = await tx.user.update({
                where: { id: teacherId },
                data: {
                    firstName: firstName ?? undefined,
                    lastName: lastName ?? undefined,
                    email: email ?? undefined,
                    phone: phone ?? undefined,
                    schoolId: targetSchoolId,
                    roles: normalizedRoles ? (normalizedRoles as UserRole[]) : undefined,
                    isActive: isActive !== undefined ? isActive : undefined
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    roles: true,
                    isActive: true
                }
            });

            await tx.userBranch.upsert({
                where: { userId_schoolId: { userId: user.id, schoolId: targetSchoolId } },
                create: {
                    userId: user.id,
                    schoolId: targetSchoolId,
                    roles: effectiveRoles as UserRole[],
                    isActive: true,
                    assignedById: actor.id,
                },
                update: {
                    roles: effectiveRoles as UserRole[],
                    isActive: true,
                },
            });

            // If CLASS_TEACHER role is removed, unassign class teacher records.
            if (normalizedRoles && !normalizedRoles.includes("CLASS_TEACHER")) {
                await tx.classArm.updateMany({
                    where: { classTeacherId: user.id, class: { schoolId: targetSchoolId } },
                    data: { classTeacherId: null }
                });
            }

            // Sync Class Assignments only when provided.
            if (effectiveRoles.includes("CLASS_TEACHER") && classArmIds) {
                await tx.classArm.updateMany({
                    where: { classTeacherId: user.id, class: { schoolId: targetSchoolId } },
                    data: { classTeacherId: null }
                });
                if (classArmIds.length > 0) {
                    await tx.classArm.updateMany({
                        where: { id: { in: classArmIds }, class: { schoolId: targetSchoolId } },
                        data: { classTeacherId: user.id }
                    });
                }
            }

            // If SUBJECT_TEACHER role is removed, clear all subject assignments.
            if (normalizedRoles && !normalizedRoles.includes("SUBJECT_TEACHER")) {
                await tx.teacherSubject.deleteMany({
                    where: { teacherId: user.id, classArm: { class: { schoolId: targetSchoolId } } }
                });
            }

            // Sync Subject Assignments only when provided.
            if (effectiveRoles.includes("SUBJECT_TEACHER") && shouldSyncSubjectAssignments) {
                const subjectIds = Array.from(new Set(normalizedSubjectAssignments.map((a) => a.subjectId)));
                const classArmAssignmentIds = Array.from(new Set(normalizedSubjectAssignments.map((a) => a.classArmId)));

                const [subjects, classArms] = await Promise.all([
                    tx.subject.findMany({
                        where: { id: { in: subjectIds }, schoolId: targetSchoolId },
                        select: { id: true, name: true, subjectKind: true }
                    }),
                    tx.classArm.findMany({
                        where: { id: { in: classArmAssignmentIds }, class: { schoolId: targetSchoolId } },
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

                await tx.teacherSubject.deleteMany({
                    where: { teacherId: user.id, classArm: { class: { schoolId: targetSchoolId } } }
                });

                if (normalizedSubjectAssignments.length > 0) {
                    await tx.teacherSubject.createMany({
                        data: normalizedSubjectAssignments.map((assignment) => ({
                            teacherId: user.id,
                            subjectId: assignment.subjectId,
                            classArmId: assignment.classArmId
                        }))
                    });
                }
            }

            return user;
        });

        return NextResponse.json({
            success: true,
            teacher: updatedTeacher,
            message: "Staff member updated successfully"
        });

    } catch (error: any) {
        console.error("Error updating staff member:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update staff member" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const actor = session.user as any;

        const schoolId = actor.schoolId;
        const teacherId = id;

        // Verify the teacher belongs to the same school
        const existingTeacher = await prisma.user.findFirst({
            where: { id: teacherId, schoolId }
        });

        if (!existingTeacher) {
            return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
        }

        // Instead of hard delete, we usually deactivate
        await prisma.user.update({
            where: { id: teacherId },
            data: { isActive: false }
        });

        return NextResponse.json({
            success: true,
            message: "Staff member deactivated successfully"
        });
    } catch (error: any) {
        console.error("Error deactivating staff member:", error);
        return NextResponse.json(
            { error: "Failed to deactivate staff member" },
            { status: 500 }
        );
    }
}
