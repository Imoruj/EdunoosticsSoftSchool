
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const actor = session.user as any;

        const schoolId = actor.schoolId;
        const teacherId = params.id;
        const body = await req.json();
        const {
            firstName,
            lastName,
            email,
            phone,
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
        const shouldSyncSubjectAssignments =
            Array.isArray(rawSubjectAssignments) ||
            Array.isArray(rawSubjectIds) ||
            Array.isArray(rawSubjectClassArmIds);

        // Verify the teacher belongs to the same school
        const existingTeacher = await prisma.user.findFirst({
            where: { id: teacherId, schoolId }
        });

        if (!existingTeacher) {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        const effectiveRoles: string[] = roles || existingTeacher.roles || [];
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
                    roles: roles ? (roles as any) : undefined,
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

            // If CLASS_TEACHER role is removed, unassign class teacher records.
            if (roles && !roles.includes("CLASS_TEACHER")) {
                await tx.classArm.updateMany({
                    where: { classTeacherId: user.id },
                    data: { classTeacherId: null }
                });
            }

            // Sync Class Assignments only when provided.
            if (effectiveRoles.includes("CLASS_TEACHER") && classArmIds) {
                await tx.classArm.updateMany({
                    where: { classTeacherId: user.id },
                    data: { classTeacherId: null }
                });
                if (classArmIds.length > 0) {
                    await tx.classArm.updateMany({
                        where: { id: { in: classArmIds }, class: { schoolId } },
                        data: { classTeacherId: user.id }
                    });
                }
            }

            // If SUBJECT_TEACHER role is removed, clear all subject assignments.
            if (roles && !roles.includes("SUBJECT_TEACHER")) {
                await tx.teacherSubject.deleteMany({
                    where: { teacherId: user.id }
                });
            }

            // Sync Subject Assignments only when provided.
            if (effectiveRoles.includes("SUBJECT_TEACHER") && shouldSyncSubjectAssignments) {
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

                await tx.teacherSubject.deleteMany({
                    where: { teacherId: user.id }
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
            message: "Teacher updated successfully"
        });

    } catch (error: any) {
        console.error("Error updating teacher:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update teacher" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const actor = session.user as any;

        const schoolId = actor.schoolId;
        const teacherId = params.id;

        // Verify the teacher belongs to the same school
        const existingTeacher = await prisma.user.findFirst({
            where: { id: teacherId, schoolId }
        });

        if (!existingTeacher) {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        // Instead of hard delete, we usually deactivate
        await prisma.user.update({
            where: { id: teacherId },
            data: { isActive: false }
        });

        return NextResponse.json({
            success: true,
            message: "Teacher deactivated successfully"
        });
    } catch (error: any) {
        console.error("Error deleting teacher:", error);
        return NextResponse.json(
            { error: "Failed to deactivate teacher" },
            { status: 500 }
        );
    }
}
