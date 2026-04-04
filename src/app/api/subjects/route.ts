import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSchoolAdmin } from "@/lib/rbac";
import { isCompositeReportVisible } from "@/lib/composite-subjects";
import { getSafeServerSession } from "@/lib/server-session";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";

function busyDatabaseResponse(action: string) {
    return NextResponse.json(
        { error: `The database is temporarily busy and could not ${action}. Please retry.` },
        { status: 503 }
    );
}

// GET /api/subjects - List all subjects
export async function GET(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/subjects");

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles = user.roles || [];

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const sessionId = searchParams.get("sessionId");
        const classId = searchParams.get("classId");
        const includeComponents = searchParams.get("includeComponents") === "true";
        const includeEnrollmentStatus = searchParams.get("includeEnrollmentStatus") === "true";
        const requestedTermId = searchParams.get("termId");

        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        const where: any = {
            schoolId,
        };

        if (!includeComponents) {
            where.subjectKind = { not: "COMPOSITE_COMPONENT" };
        }

        if (category && category !== "All") {
            where.category = category;
        }

        // If subject teacher, also include component subjects that inherit from assigned parent subjects.
        if (!isAdmin && roles.includes("SUBJECT_TEACHER")) {
            const teacherSubjectAssignments = await prisma.teacherSubject.findMany({
                where: { teacherId: user.id },
                select: { subjectId: true }
            });

            const assignedSubjectIds = Array.from(new Set(teacherSubjectAssignments.map(ts => ts.subjectId)));

            if (assignedSubjectIds.length > 0) {
                let effectiveSubjectIds = assignedSubjectIds;

                if (typeof (prisma as any).compositeSubjectConfig?.findMany === "function") {
                    try {
                        const inheritedComponents = await (prisma as any).compositeSubjectConfig.findMany({
                            where: {
                                schoolId,
                                isActive: true,
                                parentSubjectId: { in: assignedSubjectIds },
                            },
                            select: {
                                components: {
                                    select: {
                                        componentSubjectId: true,
                                    },
                                },
                            },
                        });

                        effectiveSubjectIds = Array.from(
                            new Set([
                                ...assignedSubjectIds,
                                ...inheritedComponents.flatMap((config: any) =>
                                    config.components.map((component: any) => component.componentSubjectId)
                                ),
                            ])
                        );
                    } catch (compositeError) {
                        console.warn("Composite subject metadata unavailable for subject teacher filter:", compositeError);
                    }
                }

                where.id = { in: effectiveSubjectIds };
            } else {
                // Teacher has no subject assignments, return empty array
                return NextResponse.json({ subjects: [] });
            }
        }

        const subjects = await prisma.subject.findMany({
            where,
            orderBy: { name: "asc" },
            include: {
                subjectClassArms: {
                    select: {
                        classArmId: true,
                        classArm: {
                            select: {
                                id: true,
                                armName: true,
                                class: {
                                    select: {
                                        id: true,
                                        name: true,
                                        level: true,
                                        orderIndex: true,
                                    },
                                },
                            },
                        },
                    }
                },
                ...(isAdmin
                    ? {
                        teacherSubjects: {
                            select: {
                                classArmId: true,
                teacher: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        isActive: true,
                    },
                },
            },
                        },
                    }
                    : {}),
            }
        });

        const allOfferingClassArmIds = Array.from(
            new Set(
                subjects.flatMap((subject: any) =>
                    (subject.subjectClassArms || []).map((offering: any) => offering.classArmId)
                )
            )
        );
        const listedSubjectIds = new Set(subjects.map((subject: any) => subject.id));

        let enrollmentContext: {
            termId: string;
            termName: string;
            sessionId: string;
            sessionName: string;
        } | null = null;
        const enrolledStudentIdsBySubjectArm = new Map<string, Set<string>>();

        if (isAdmin && includeEnrollmentStatus) {
            let resolvedTerm:
                | {
                    id: string;
                    name: string;
                    session: {
                        id: string;
                        name: string;
                    };
                }
                | null = null;

            if (requestedTermId) {
                resolvedTerm = await withPrismaRetry("/api/subjects GET term context", () =>
                    prisma.term.findFirst({
                        where: {
                            id: requestedTermId,
                            session: {
                                schoolId,
                            },
                        },
                        select: {
                            id: true,
                            name: true,
                            session: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    })
                );
            } else {
                const currentSession = await withPrismaRetry("/api/subjects GET current term", () =>
                    prisma.academicSession.findFirst({
                        where: {
                            schoolId,
                            isCurrent: true,
                        },
                        select: {
                            id: true,
                            name: true,
                            terms: {
                                where: { isCurrent: true },
                                take: 1,
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    })
                );

                const currentTerm = currentSession?.terms?.[0];
                resolvedTerm = currentSession && currentTerm
                    ? {
                        id: currentTerm.id,
                        name: currentTerm.name,
                        session: {
                            id: currentSession.id,
                            name: currentSession.name,
                        },
                    }
                    : null;
            }

            if (resolvedTerm && subjects.length > 0 && allOfferingClassArmIds.length > 0) {
                enrollmentContext = {
                    termId: resolvedTerm.id,
                    termName: resolvedTerm.name,
                    sessionId: resolvedTerm.session.id,
                    sessionName: resolvedTerm.session.name,
                };
            }
        }

        let compositeConfigs: any[] = [];

        if (typeof (prisma as any).compositeSubjectConfig?.findMany === "function") {
            try {
                compositeConfigs = await (prisma as any).compositeSubjectConfig.findMany({
                    where: {
                        schoolId,
                        isActive: true,
                        ...(sessionId ? { sessionId } : {}),
                        ...(classId ? { classId } : {}),
                    },
                    select: {
                        classId: true,
                        parentSubjectId: true,
                        components: {
                            select: {
                                componentSubjectId: true,
                                componentSubject: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            }
                        }
                    }
                });
            } catch (compositeError) {
                console.warn("Composite subject metadata unavailable for subjects listing:", compositeError);
            }
        }

        const defaultParentIds = Array.from(
            new Set([
                ...subjects
                    .map((subject: any) => subject.defaultParentSubjectId)
                    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0),
                ...compositeConfigs
                    .map((config: any) => config.parentSubjectId)
                    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0),
            ])
        );
        const compositeParentIds = Array.from(
            new Set([
                ...subjects
                    .filter((subject: any) => subject.subjectKind === "COMPOSITE_PARENT")
                    .map((subject: any) => subject.id),
                ...defaultParentIds,
                ...compositeConfigs
                    .map((config: any) => config.parentSubjectId)
                    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0),
            ])
        );

        const defaultParentSubjects = defaultParentIds.length > 0
            ? await prisma.subject.findMany({
                where: {
                    id: { in: defaultParentIds },
                },
                select: {
                    id: true,
                    name: true,
                },
            })
            : [];

        const defaultParentMap = new Map(
            defaultParentSubjects.map((subject: any) => [subject.id, subject])
        );

        const compositeParentMap = new Map<string, { id: string; name: string }>();
        compositeConfigs.forEach((config: any) => {
            const parentSubject = defaultParentMap.get(config.parentSubjectId);
            if (parentSubject) {
                compositeParentMap.set(config.parentSubjectId, parentSubject);
            }
        });
        const defaultLinkedComponents = compositeParentIds.length > 0
            ? await prisma.subject.findMany({
                where: {
                    schoolId,
                    defaultParentSubjectId: { in: compositeParentIds },
                },
                select: {
                    id: true,
                    name: true,
                    defaultParentSubjectId: true,
                },
            })
            : [];
        const componentParentMap = new Map<string, { id: string; name: string }>();
        compositeConfigs.forEach((config: any) => {
            config.components.forEach((component: any) => {
                const parentSubject = defaultParentMap.get(config.parentSubjectId);
                if (parentSubject) {
                    componentParentMap.set(component.componentSubjectId, parentSubject);
                }
            });
        });
        defaultLinkedComponents.forEach((component: any) => {
            const parentSubject = defaultParentMap.get(component.defaultParentSubjectId || "");
            if (parentSubject && !componentParentMap.has(component.id)) {
                componentParentMap.set(component.id, parentSubject);
            }
        });
        const compositeComponentIdsByParentClassKey = new Map<string, string[]>();
        const compositeComponentsByParentClassKey = new Map<
            string,
            Array<{ subjectId: string; subjectName: string }>
        >();
        compositeConfigs.forEach((config: any) => {
            compositeComponentIdsByParentClassKey.set(
                `${config.classId}:${config.parentSubjectId}`,
                config.components.map((component: any) => component.componentSubjectId)
            );
            compositeComponentsByParentClassKey.set(
                `${config.classId}:${config.parentSubjectId}`,
                config.components.map((component: any) => ({
                    subjectId: component.componentSubjectId,
                    subjectName: component.componentSubject?.name || "Component subject",
                }))
            );
        });
        const defaultComponentSubjectsByParentId = new Map<
            string,
            Array<{ subjectId: string; subjectName: string }>
        >();
        defaultLinkedComponents.forEach((component: any) => {
            const parentId = component.defaultParentSubjectId;
            if (!parentId) {
                return;
            }

            const existing = defaultComponentSubjectsByParentId.get(parentId) || [];
            existing.push({
                subjectId: component.id,
                subjectName: component.name || "Component subject",
            });
            defaultComponentSubjectsByParentId.set(parentId, existing);
        });
        const referencedComponentSubjectIds = Array.from(
            new Set([
                ...Array.from(compositeComponentIdsByParentClassKey.values()).flat(),
                ...Array.from(defaultComponentSubjectsByParentId.values()).flatMap((components) =>
                    components.map((component) => component.subjectId)
                ),
            ])
        );

        if (enrollmentContext && allOfferingClassArmIds.length > 0) {
            const enrollmentSubjectIds = Array.from(
                new Set([
                    ...Array.from(listedSubjectIds),
                    ...referencedComponentSubjectIds,
                ])
            );

            if (enrollmentSubjectIds.length > 0) {
                const enrollmentRows = await withPrismaRetry("/api/subjects GET enrollment status", () =>
                    prisma.subjectEnrollment.findMany({
                        where: {
                            termId: enrollmentContext!.termId,
                            isActive: true,
                            classArmId: { in: allOfferingClassArmIds },
                            subjectId: { in: enrollmentSubjectIds },
                        },
                        select: {
                            subjectId: true,
                            classArmId: true,
                            studentId: true,
                        },
                    })
                );

                enrollmentRows.forEach((enrollment) => {
                    const key = `${enrollment.subjectId}:${enrollment.classArmId}`;
                    const studentIds = enrolledStudentIdsBySubjectArm.get(key) || new Set<string>();
                    studentIds.add(enrollment.studentId);
                    enrolledStudentIdsBySubjectArm.set(key, studentIds);
                });
            }
        }

        const supplementalParentAssignmentSubjectIds = defaultParentIds.filter((subjectId) => !listedSubjectIds.has(subjectId));
        const supplementalComponentAssignmentSubjectIds = referencedComponentSubjectIds.filter(
            (subjectId) => !listedSubjectIds.has(subjectId)
        );
        const supplementalParentTeacherAssignments = isAdmin && supplementalParentAssignmentSubjectIds.length > 0
            ? await prisma.teacherSubject.findMany({
                where: {
                    subjectId: { in: supplementalParentAssignmentSubjectIds },
                    classArm: {
                        class: { schoolId },
                    },
                },
                select: {
                    subjectId: true,
                    classArmId: true,
                    teacher: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            isActive: true,
                        },
                    },
                },
            })
            : [];
        const supplementalComponentTeacherAssignments = isAdmin && supplementalComponentAssignmentSubjectIds.length > 0
            ? await prisma.teacherSubject.findMany({
                where: {
                    subjectId: { in: supplementalComponentAssignmentSubjectIds },
                    classArm: {
                        class: { schoolId },
                    },
                },
                select: {
                    subjectId: true,
                    classArmId: true,
                    teacher: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            isActive: true,
                        },
                    },
                },
            })
            : [];

        const schoolTeacherAssignmentMap = new Map<string, any>();
        if (isAdmin) {
            subjects.forEach((subject: any) => {
                (subject.teacherSubjects || []).forEach((assignment: any) => {
                    schoolTeacherAssignmentMap.set(
                        `${subject.id}:${assignment.classArmId}`,
                        assignment.teacher
                    );
                });
            });

            supplementalParentTeacherAssignments.forEach((assignment: any) => {
                schoolTeacherAssignmentMap.set(
                    `${assignment.subjectId}:${assignment.classArmId}`,
                    assignment.teacher
                );
            });

            supplementalComponentTeacherAssignments.forEach((assignment: any) => {
                schoolTeacherAssignmentMap.set(
                    `${assignment.subjectId}:${assignment.classArmId}`,
                    assignment.teacher
                );
            });
        }

        const toTeacherPayload = (teacher: any) => (
            teacher
                ? {
                    id: teacher.id,
                    firstName: teacher.firstName,
                    lastName: teacher.lastName,
                    fullName: `${teacher.firstName} ${teacher.lastName}`.trim(),
                    email: teacher.email,
                    phone: teacher.phone,
                    isActive: teacher.isActive,
                }
                : null
        );

        // Transform response to include classArmIds array (for backwards compatibility, we'll also call it classIds)
        const transformedSubjects = subjects.map((subject: any) => {
            const {
                subjectClassArms,
                teacherSubjects,
                ...subjectFields
            } = subject;
            const teacherAssignmentMap = new Map<string, any>(
                (teacherSubjects || []).map((assignment: any) => [
                    assignment.classArmId,
                    assignment.teacher,
                ])
            );
            const parentSubjectId =
                defaultParentMap.get(subject.defaultParentSubjectId || "")?.id ||
                componentParentMap.get(subject.id)?.id ||
                null;
            const parentSubjectName =
                defaultParentMap.get(subject.defaultParentSubjectId || "")?.name ||
                componentParentMap.get(subject.id)?.name ||
                null;
            const effectiveSubjectKind =
                compositeParentMap.has(subject.id) || subject.subjectKind === "COMPOSITE_PARENT"
                    ? "COMPOSITE_PARENT"
                    : parentSubjectId || subject.subjectKind === "COMPOSITE_COMPONENT"
                        ? "COMPOSITE_COMPONENT"
                        : "STANDARD";

            const offerings = isAdmin
                ? subjectClassArms
                    .map((offering: any) => {
                        const directTeacher = teacherAssignmentMap.get(offering.classArmId) || null;
                        const inheritedTeacher =
                            !directTeacher &&
                            effectiveSubjectKind === "COMPOSITE_COMPONENT" &&
                            parentSubjectId
                                ? schoolTeacherAssignmentMap.get(`${parentSubjectId}:${offering.classArmId}`) || null
                                : null;
                        const configuredComponentSubjects =
                            effectiveSubjectKind === "COMPOSITE_PARENT"
                                ? compositeComponentsByParentClassKey.get(`${offering.classId}:${subject.id}`) || []
                                : [];
                        const fallbackComponentSubjects =
                            effectiveSubjectKind === "COMPOSITE_PARENT"
                                ? defaultComponentSubjectsByParentId.get(subject.id) || []
                                : [];
                        const componentSubjects =
                            effectiveSubjectKind === "COMPOSITE_PARENT"
                                ? (configuredComponentSubjects.length > 0
                                    ? configuredComponentSubjects
                                    : fallbackComponentSubjects)
                                : [];
                        const componentSubjectIds = componentSubjects.map((component) => component.subjectId);
                        const componentAssignments =
                            subject.subjectKind === "COMPOSITE_PARENT"
                                ? componentSubjects.map((component) => {
                                    const componentTeacher =
                                        schoolTeacherAssignmentMap.get(`${component.subjectId}:${offering.classArmId}`) || null;

                                    return {
                                        subjectId: component.subjectId,
                                        subjectName: component.subjectName,
                                        teacher: toTeacherPayload(componentTeacher),
                                        isAssigned: Boolean(componentTeacher),
                                    };
                                })
                                : [];
                        const componentTeachers = Array.from(
                            new Map(
                                componentSubjectIds
                                    .map((componentSubjectId) =>
                                        schoolTeacherAssignmentMap.get(`${componentSubjectId}:${offering.classArmId}`)
                                    )
                                    .filter(Boolean)
                                    .map((teacher: any) => [teacher.id, teacher])
                            ).values()
                        );
                        const teacher =
                            directTeacher ||
                            inheritedTeacher ||
                            (componentTeachers.length === 1 ? componentTeachers[0] : null);
                        const assignmentSource = directTeacher
                            ? "DIRECT"
                            : inheritedTeacher
                                ? "PARENT_SUBJECT"
                                : componentTeachers.length > 0
                                    ? "COMPONENT_SUBJECTS"
                                    : null;
                        const enrolledStudentIds = new Set<string>();
                        const directEnrollmentStudentIds =
                            enrolledStudentIdsBySubjectArm.get(`${subject.id}:${offering.classArmId}`) || new Set<string>();

                        directEnrollmentStudentIds.forEach((studentId) => enrolledStudentIds.add(studentId));

                        if (effectiveSubjectKind === "COMPOSITE_PARENT") {
                            componentSubjectIds.forEach((componentSubjectId) => {
                                const componentEnrollmentStudentIds =
                                    enrolledStudentIdsBySubjectArm.get(`${componentSubjectId}:${offering.classArmId}`) || new Set<string>();
                                componentEnrollmentStudentIds.forEach((studentId) => enrolledStudentIds.add(studentId));
                            });
                        }

                        return {
                            classArmId: offering.classArmId,
                            classArmName: offering.classArm.armName,
                            classId: offering.classArm.class.id,
                            className: offering.classArm.class.name,
                            level: offering.classArm.class.level,
                            classOrderIndex: offering.classArm.class.orderIndex ?? 0,
                            assignmentSource,
                            inheritedFromSubjectId: assignmentSource === "PARENT_SUBJECT" ? parentSubjectId : null,
                            inheritedFromSubjectName: assignmentSource === "PARENT_SUBJECT" ? parentSubjectName : null,
                            effectiveTeachers: componentTeachers.map((entry: any) => toTeacherPayload(entry)),
                            componentAssignments,
                            missingComponentAssignments: componentAssignments.filter((entry: any) => !entry.isAssigned),
                            teacher: toTeacherPayload(teacher),
                            enrollmentCount: enrolledStudentIds.size,
                            hasEnrolledStudents: enrolledStudentIds.size > 0,
                        };
                    })
                    .sort((left: any, right: any) => {
                        if (left.classOrderIndex !== right.classOrderIndex) {
                            return left.classOrderIndex - right.classOrderIndex;
                        }

                        return (
                            left.className.localeCompare(right.className, undefined, {
                                numeric: true,
                                sensitivity: "base",
                            }) ||
                            left.classArmName.localeCompare(right.classArmName, undefined, {
                                numeric: true,
                                sensitivity: "base",
                            })
                        );
                    })
                    .map(({ classOrderIndex, ...offering }: any) => offering)
                : undefined;

            const assignedOfferings =
                offerings?.filter(
                    (offering: any) =>
                        offering.teacher ||
                        (offering.effectiveTeachers || []).length > 0 ||
                        (offering.componentAssignments || []).some((component: any) => component.isAssigned)
                ).length || 0;
            const uniqueTeacherIds = new Set(
                (offerings || [])
                    .flatMap((offering: any) => [
                        offering.teacher?.id,
                        ...(offering.effectiveTeachers || []).map((teacher: any) => teacher.id),
                        ...(offering.componentAssignments || []).map((component: any) => component.teacher?.id),
                    ])
                    .filter((teacherId: unknown): teacherId is string => typeof teacherId === "string" && teacherId.length > 0)
            );
            const uniqueClassIds = new Set(
                (offerings || [])
                    .map((offering: any) => offering.classId)
                    .filter((classId: unknown): classId is string => typeof classId === "string" && classId.length > 0)
            );

            return {
                ...subjectFields,
                subjectKind: effectiveSubjectKind,
                classIds: subjectClassArms.map((c: any) => c.classArmId),
                classArmIds: subjectClassArms.map((c: any) => c.classArmId),
                offerings,
                assignmentSummary: offerings
                    ? {
                        totalOfferings: offerings.length,
                        assignedOfferings,
                        unassignedOfferings: offerings.length - assignedOfferings,
                        classesCount: uniqueClassIds.size,
                        teachersCount: uniqueTeacherIds.size,
                    }
                    : undefined,
                parentSubjectId,
                parentSubjectName,
                isCompositeConfigured:
                    compositeParentMap.has(subject.id) ||
                    componentParentMap.has(subject.id),
                isReportVisible: isCompositeReportVisible({ subjectKind: effectiveSubjectKind }),
                isScoreEntryEditable: effectiveSubjectKind !== "COMPOSITE_PARENT",
            };
        });

        return NextResponse.json({
            subjects: transformedSubjects,
            enrollmentContext,
        });
    } catch (error: any) {
        console.error("Error fetching subjects:", error);
        return NextResponse.json(
            { error: "Failed to fetch subjects" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/subjects");

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isSchoolAdmin(session.user as any)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        const { id, name, code, category, classIds, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
        }

        const schoolId = (session.user as any).schoolId;

        // Verify ownership
        const existingSubject = await withPrismaRetry(
            "/api/subjects PUT verify",
            () =>
                prisma.subject.findFirst({
                    where: { id, schoolId },
                })
        );

        if (!existingSubject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        // Update transaction
        const updatedSubject = await withPrismaRetry(
            "/api/subjects PUT update",
            () =>
                prisma.$transaction(async (tx: any) => {
                    // Update basic info
                    const subject = await tx.subject.update({
                        where: { id },
                        data: {
                            name,
                            code,
                            category,
                            isActive,
                        },
                    });

                    // Update class arm assignments if provided
                    if (classIds && Array.isArray(classIds)) {
                        // Delete existing assignments
                        await tx.subjectClassArm.deleteMany({
                            where: { subjectId: id },
                        });

                        // Create new assignments (classIds now contains classArmIds)
                        if (classIds.length > 0) {
                            await tx.subjectClassArm.createMany({
                                data: classIds.map((classArmId: string) => ({
                                    classArmId,
                                    subjectId: id,
                                })),
                            });
                        }
                    }

                    return subject;
                })
        );

        return NextResponse.json({ subject: updatedSubject });
    } catch (error: any) {
        if (isTransientPrismaError(error)) {
            console.warn("Transient database error updating subject:", error);
            return busyDatabaseResponse("update the subject");
        }

        console.error("Error updating subject:", error);
        return NextResponse.json(
            { error: "Failed to update subject" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/subjects");

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isSchoolAdmin(session.user as any)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        const { name, code, category, classIds } = body;

        if (!name || !category) {
            return NextResponse.json(
                { error: "Name and category are required" },
                { status: 400 }
            );
        }

        const schoolId = (session.user as any).schoolId;

        // Check if subject name already exists
        const existingSubject = await withPrismaRetry(
            "/api/subjects POST verify",
            () =>
                prisma.subject.findFirst({
                    where: {
                        name,
                        schoolId,
                    },
                })
        );

        if (existingSubject) {
            return NextResponse.json(
                { error: "Subject name already exists" },
                { status: 400 }
            );
        }

        // Create subject and optionally link to classes
        const subject = await prisma.$transaction(async (tx: any) => {
            const newSubject = await tx.subject.create({
                data: {
                    name,
                    code: code || name.substring(0, 3).toUpperCase(),
                    category,
                    schoolId,
                    isActive: true,
                },
            });

            if (classIds && Array.isArray(classIds) && classIds.length > 0) {
                await tx.subjectClassArm.createMany({
                    data: classIds.map((classArmId: string) => ({
                        classArmId,
                        subjectId: newSubject.id,
                    })),
                });
            }

            return newSubject;
        });

        return NextResponse.json({ subject }, { status: 201 });
    } catch (error: any) {
        if (isTransientPrismaError(error)) {
            console.warn("Transient database error creating subject:", error);
            return busyDatabaseResponse("create the subject");
        }

        console.error("Error creating subject:", error);
        return NextResponse.json(
            { error: "Failed to create subject" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/subjects");

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isSchoolAdmin(session.user as any)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Subject ID is required" },
                { status: 400 }
            );
        }

        const schoolId = (session.user as any).schoolId;

        // Verify subject belongs to school
        const existingSubject = await prisma.subject.findFirst({
            where: {
                id,
                schoolId,
            },
        });

        if (!existingSubject) {
            return NextResponse.json(
                { error: "Subject not found" },
                { status: 404 }
            );
        }

        await prisma.subject.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Subject deleted successfully" });
    } catch (error: any) {
        if (isTransientPrismaError(error)) {
            console.warn("Transient database error deleting subject:", error);
            return busyDatabaseResponse("delete the subject");
        }

        console.error("Error deleting subject:", error);
        return NextResponse.json(
            { error: "Failed to delete subject" },
            { status: 500 }
        );
    }
}

