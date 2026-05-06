import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ScoresClient from "@/components/scores/ScoresClient";
import { AssessmentType, ClassLink, GradingRule, Subject, Session } from "@/components/scores/types";
import { ensureAssessmentTypeColumns } from "@/lib/assessment-types-server";
import { getActiveBranchProfile } from "@/lib/activeBranchProfile";

function toScoreSubject(subject: {
    id: string;
    name: string;
    code: string | null;
    subjectKind: "STANDARD" | "COMPOSITE_PARENT" | "COMPOSITE_COMPONENT";
    defaultParentSubject?: { id: string; name: string } | null;
    subjectClassArms?: Array<{ classArmId: string }>;
}, classArmIds?: string[]): Subject {
    const parentSubjectName = subject.defaultParentSubject?.name || null;
    const baseName =
        subject.subjectKind === "COMPOSITE_COMPONENT" && parentSubjectName
            ? `${subject.name} (Component of ${parentSubjectName})`
            : subject.name;

    return {
        id: subject.id,
        name: baseName,
        code: subject.code || "",
        classArmIds: classArmIds || subject.subjectClassArms?.map((sca) => sca.classArmId) || [],
        subjectKind: subject.subjectKind,
        parentSubjectId: subject.defaultParentSubject?.id || null,
        parentSubjectName,
        isCompositeConfigured: subject.subjectKind !== "STANDARD",
        isReportVisible: subject.subjectKind !== "COMPOSITE_COMPONENT",
        isScoreEntryEditable: subject.subjectKind !== "COMPOSITE_PARENT",
    };
}

export default async function ScoreEntryPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
    }

    const user = session.user as any;
    const activeProfile = await getActiveBranchProfile(user);
    const roles: string[] = activeProfile.roles;
    const schoolId = activeProfile.schoolId as any;
    const userId = activeProfile.userId || "";

    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
    const isSubjectTeacher = roles.includes("SUBJECT_TEACHER");
    const isClassTeacher = roles.includes("CLASS_TEACHER");
    const isTeacher = isSubjectTeacher || isClassTeacher;

    if (!schoolId) {
        redirect("/auth/login");
    }

    if (!isAdmin && !isTeacher) {
        redirect("/dashboard");
    }

    await ensureAssessmentTypeColumns(prisma);

    const [dbAssessmentTypes, dbGradingRules, dbSessions] = await Promise.all([
        prisma.assessmentType.findMany({
            where: { schoolId, isActive: true },
            orderBy: { order: "asc" },
            include: { components: { orderBy: { order: "asc" } } }
        }),
        prisma.gradingRule.findMany({
            where: { schoolId },
            orderBy: { minScore: "desc" }
        }),
        prisma.academicSession.findMany({
            where: { schoolId },
            include: { terms: { orderBy: { termNumber: "asc" } } },
            orderBy: { startDate: "desc" }
        })
    ]);

    let initialClasses: ClassLink[] = [];
    let initialSubjects: Subject[] = [];

    if (isAdmin) {
        const [dbClasses, dbSubjects] = await Promise.all([
            prisma.class.findMany({
                where: { schoolId },
                include: { arms: true },
                orderBy: { name: "asc" }
            }),
            prisma.subject.findMany({
                where: { schoolId },
                include: {
                    defaultParentSubject: {
                        select: { id: true, name: true },
                    },
                    subjectClassArms: { select: { classArmId: true } },
                },
                orderBy: { name: "asc" }
            })
        ]);

        initialClasses = dbClasses.map((c) => ({
            id: c.id,
            name: c.name,
            arms: c.arms.map((a) => ({ id: a.id, armName: a.armName, level: c.level }))
        }));

        initialSubjects = dbSubjects.map((sub) => toScoreSubject(sub));
    } else if (!userId) {
        initialClasses = [];
        initialSubjects = [];
    } else if (isSubjectTeacher) {
        const teacherAssignments = await prisma.teacherSubject.findMany({
            where: {
                teacherId: userId,
                classArm: {
                    class: { schoolId }
                },
                subject: {
                    schoolId
                }
            },
            select: {
                subjectId: true,
                classArmId: true
            }
        });

        const assignedArmIds = Array.from(new Set(teacherAssignments.map((a) => a.classArmId)));
        const assignedSubjectIds = Array.from(new Set(teacherAssignments.map((a) => a.subjectId)));

        if (assignedArmIds.length > 0 && assignedSubjectIds.length > 0) {
            const [dbClasses, dbSubjects] = await Promise.all([
                prisma.class.findMany({
                    where: {
                        schoolId,
                        arms: { some: { id: { in: assignedArmIds } } }
                    },
                    include: {
                        arms: {
                            where: { id: { in: assignedArmIds } }
                        }
                    },
                    orderBy: { name: "asc" }
                }),
                prisma.subject.findMany({
                    where: {
                        schoolId,
                        id: { in: assignedSubjectIds },
                        subjectKind: { not: "COMPOSITE_PARENT" },
                    },
                    include: {
                        defaultParentSubject: {
                            select: { id: true, name: true },
                        },
                        subjectClassArms: {
                            where: { classArmId: { in: assignedArmIds } },
                            select: { classArmId: true }
                        }
                    },
                    orderBy: { name: "asc" }
                })
            ]);

            initialClasses = dbClasses.map((c) => ({
                id: c.id,
                name: c.name,
                arms: c.arms.map((a) => ({ id: a.id, armName: a.armName, level: c.level }))
            }));

            const assignmentMap = new Map<string, Set<string>>();
            for (const assignment of teacherAssignments) {
                if (!assignmentMap.has(assignment.subjectId)) {
                    assignmentMap.set(assignment.subjectId, new Set<string>());
                }
                assignmentMap.get(assignment.subjectId)!.add(assignment.classArmId);
            }

            initialSubjects = dbSubjects.map((sub) =>
                toScoreSubject(
                    sub,
                    Array.from(
                        assignmentMap.get(sub.id) ||
                        new Set(sub.subjectClassArms.map((sca) => sca.classArmId))
                    )
                )
            );
        }
    } else if (isClassTeacher) {
        const assignedArms = await prisma.classArm.findMany({
            where: {
                classTeacherId: userId,
                class: { schoolId }
            },
            select: {
                id: true,
                armName: true,
                class: {
                    select: {
                        id: true,
                        name: true,
                        level: true
                    }
                }
            },
            orderBy: [
                { class: { name: "asc" } },
                { armName: "asc" }
            ]
        });

        const assignedArmIds = assignedArms.map((arm) => arm.id);

        if (assignedArmIds.length > 0) {
            const dbSubjects = await prisma.subject.findMany({
                where: {
                    schoolId,
                    subjectClassArms: {
                        some: { classArmId: { in: assignedArmIds } }
                    }
                },
                include: {
                    defaultParentSubject: {
                        select: { id: true, name: true },
                    },
                    subjectClassArms: {
                        where: { classArmId: { in: assignedArmIds } },
                        select: { classArmId: true }
                    }
                },
                orderBy: { name: "asc" }
            });

            const classesById = new Map<string, ClassLink>();
            for (const arm of assignedArms) {
                const classId = arm.class.id;
                if (!classesById.has(classId)) {
                    classesById.set(classId, {
                        id: classId,
                        name: arm.class.name,
                        arms: []
                    });
                }
                classesById.get(classId)!.arms.push({
                    id: arm.id,
                    armName: arm.armName,
                    level: arm.class.level
                });
            }

            initialClasses = Array.from(classesById.values());
            initialSubjects = dbSubjects.map((sub) => toScoreSubject(sub));
        }
    }

    const initialAssessmentTypes: AssessmentType[] = dbAssessmentTypes.map((a) => ({
        id: a.id,
        name: a.name,
        shortName: a.shortName,
        maxScore: a.maxScore,
        order: a.order,
        includeInTotal: a.includeInTotal,
        components: (a.components || []).map(c => ({ id: c.id, name: c.name, maxScore: c.maxScore, order: c.order })),
    }));

    const initialGradingRules: GradingRule[] = dbGradingRules.map((g) => ({
        id: g.id,
        minScore: g.minScore,
        maxScore: g.maxScore,
        grade: g.grade,
        remark: g.remark,
        schoolCategory: g.schoolCategory
    }));

    const initialSessions: Session[] = dbSessions.map((s) => ({
        id: s.id,
        name: s.name,
        isCurrent: s.isCurrent,
        terms: s.terms.map((t) => ({ id: t.id, name: t.name, isCurrent: t.isCurrent }))
    }));

    return (
        <ScoresClient
            initialClasses={initialClasses}
            initialSubjects={initialSubjects}
            initialAssessmentTypes={initialAssessmentTypes}
            initialGradingRules={initialGradingRules}
            initialSessions={initialSessions}
        />
    );
}
