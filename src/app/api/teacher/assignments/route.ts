import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
        const userId = typeof user.id === "string" ? user.id : "";

        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found in session" }, { status: 400 });
        }

        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        const isSubjectTeacher = roles.includes("SUBJECT_TEACHER");
        const isClassTeacher = roles.includes("CLASS_TEACHER");

        let classes: Array<{ id: string; name: string; arms: { id: string; armName: string }[] }> = [];
        let subjects: Array<{ id: string; name: string; code: string; classArmIds: string[] }> = [];

        if (isAdmin) {
            const [dbClasses, dbSubjects] = await Promise.all([
                prisma.class.findMany({
                    where: { schoolId },
                    include: { arms: { select: { id: true, armName: true } } },
                    orderBy: { name: "asc" }
                }),
                prisma.subject.findMany({
                    where: { schoolId },
                    include: { subjectClassArms: { select: { classArmId: true } } },
                    orderBy: { name: "asc" }
                })
            ]);

            classes = dbClasses.map(c => ({
                id: c.id,
                name: c.name,
                arms: c.arms
            }));

            subjects = dbSubjects.map(sub => ({
                id: sub.id,
                name: sub.name,
                code: sub.code || "",
                classArmIds: sub.subjectClassArms.map(sca => sca.classArmId)
            }));
        } else if (isSubjectTeacher) {
            const teacherAssignments = await prisma.teacherSubject.findMany({
                where: {
                    teacherId: userId,
                    classArm: { class: { schoolId } },
                    subject: { schoolId }
                },
                select: { subjectId: true, classArmId: true }
            });

            const assignedArmIds = Array.from(new Set(teacherAssignments.map(a => a.classArmId)));
            const assignedSubjectIds = Array.from(new Set(teacherAssignments.map(a => a.subjectId)));

            if (assignedArmIds.length > 0 && assignedSubjectIds.length > 0) {
                const [dbClasses, dbSubjects] = await Promise.all([
                    prisma.class.findMany({
                        where: { schoolId, arms: { some: { id: { in: assignedArmIds } } } },
                        include: { arms: { where: { id: { in: assignedArmIds } }, select: { id: true, armName: true } } },
                        orderBy: { name: "asc" }
                    }),
                    prisma.subject.findMany({
                        where: { schoolId, id: { in: assignedSubjectIds } },
                        include: { subjectClassArms: { where: { classArmId: { in: assignedArmIds } }, select: { classArmId: true } } },
                        orderBy: { name: "asc" }
                    })
                ]);

                classes = dbClasses.map(c => ({
                    id: c.id,
                    name: c.name,
                    arms: c.arms
                }));

                const assignmentMap = new Map<string, Set<string>>();
                for (const assignment of teacherAssignments) {
                    if (!assignmentMap.has(assignment.subjectId)) {
                        assignmentMap.set(assignment.subjectId, new Set<string>());
                    }
                    assignmentMap.get(assignment.subjectId)!.add(assignment.classArmId);
                }

                subjects = dbSubjects.map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    code: sub.code || "",
                    classArmIds: Array.from(assignmentMap.get(sub.id) || new Set(sub.subjectClassArms.map(sca => sca.classArmId)))
                }));
            }
        } else if (isClassTeacher) {
            const assignedArms = await prisma.classArm.findMany({
                where: { classTeacherId: userId, class: { schoolId } },
                select: {
                    id: true,
                    armName: true,
                    class: { select: { id: true, name: true } }
                },
                orderBy: [{ class: { name: "asc" } }, { armName: "asc" }]
            });

            const assignedArmIds = assignedArms.map(arm => arm.id);

            if (assignedArmIds.length > 0) {
                const dbSubjects = await prisma.subject.findMany({
                    where: { schoolId, subjectClassArms: { some: { classArmId: { in: assignedArmIds } } } },
                    include: {
                        subjectClassArms: { where: { classArmId: { in: assignedArmIds } }, select: { classArmId: true } }
                    },
                    orderBy: { name: "asc" }
                });

                const classesById = new Map<string, { id: string; name: string; arms: { id: string; armName: string }[] }>();
                for (const arm of assignedArms) {
                    const classId = arm.class.id;
                    if (!classesById.has(classId)) {
                        classesById.set(classId, { id: classId, name: arm.class.name, arms: [] });
                    }
                    classesById.get(classId)!.arms.push({ id: arm.id, armName: arm.armName });
                }

                classes = Array.from(classesById.values());
                subjects = dbSubjects.map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    code: sub.code || "",
                    classArmIds: sub.subjectClassArms.map(sca => sca.classArmId)
                }));
            }
        }

        return NextResponse.json({ classes, subjects });
    } catch (error) {
        console.error("Error fetching teacher assignments:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
