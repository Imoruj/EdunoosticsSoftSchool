import { prisma } from "@/lib/prisma";
import { DummySheetData } from "@/components/dummy/types";
import ReactPDF from "@react-pdf/renderer";
import React from "react";
import DummySheetDocument from "@/components/dummy/DummySheetDocument";

type MaybeDefaultExport<T> = T | { default: MaybeDefaultExport<T> };

function resolvePdfComponent<T>(moduleValue: MaybeDefaultExport<T>): T {
    let current: MaybeDefaultExport<T> = moduleValue;

    while (
        current &&
        typeof current === "object" &&
        "default" in current &&
        current.default
    ) {
        current = current.default;
    }

    return current as T;
}

function getStudentFullName(student: {
    lastName: string;
    firstName: string;
    otherNames?: string | null;
}) {
    return [student.lastName, student.firstName, student.otherNames].filter(Boolean).join(" ");
}

function sortStudentsByName<T extends { lastName: string; firstName: string }>(students: T[]) {
    return [...students].sort((a, b) => {
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
    });
}

export async function generateDummySheetData(
    classArmId: string,
    termId: string
): Promise<DummySheetData> {
    const classArm = await prisma.classArm.findUnique({
        where: { id: classArmId },
        include: {
            classTeacher: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
            class: {
                include: {
                    school: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            logoUrl: true,
                        },
                    },
                },
            },
        },
    });

    if (!classArm) {
        throw new Error("Class arm not found");
    }

    const term = await prisma.term.findUnique({
        where: { id: termId },
        include: {
            session: {
                select: {
                    id: true,
                    name: true,
                    schoolId: true,
                },
            },
        },
    });

    if (!term) {
        throw new Error("Term not found");
    }

    const school = classArm.class.school;
    if (!school) {
        throw new Error("School not found");
    }

    if (term.session.schoolId !== school.id) {
        throw new Error("Selected term does not belong to this class arm's school");
    }

    const enrollments = await prisma.subjectEnrollment.findMany({
            where: {
                classArmId,
                termId,
                isActive: true,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        admissionNumber: true,
                        firstName: true,
                        lastName: true,
                        otherNames: true,
                    },
                },
                subject: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        subjectKind: true,
                        defaultParentSubject: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
            },
    });

    const effectiveSubjectMap = new Map<string, { id: string; name: string; code?: string | null }>();
    const studentIdsBySubject = new Map<string, Set<string>>();
    const studentMap = new Map<string, {
        id: string;
        admissionNumber: string;
        firstName: string;
        lastName: string;
        otherNames?: string | null;
    }>();

    enrollments.forEach((enrollment) => {
        const effectiveSubject =
            enrollment.subject.subjectKind === "COMPOSITE_PARENT"
                ? null
                : enrollment.subject;

        if (!effectiveSubject) {
            return;
        }

        effectiveSubjectMap.set(effectiveSubject.id, {
            id: effectiveSubject.id,
            name: effectiveSubject.name,
            code: effectiveSubject.code || undefined,
        });

        if (!studentIdsBySubject.has(effectiveSubject.id)) {
            studentIdsBySubject.set(effectiveSubject.id, new Set<string>());
        }
        studentIdsBySubject.get(effectiveSubject.id)?.add(enrollment.studentId);

        if (!studentMap.has(enrollment.student.id)) {
            studentMap.set(enrollment.student.id, enrollment.student);
        }
    });

    const subjects = Array.from(effectiveSubjectMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((subject) => {
            const enrolledStudentIds = Array.from(studentIdsBySubject.get(subject.id) || []);
            const subjectStudents = sortStudentsByName(
                enrolledStudentIds
                    .map((studentId) => studentMap.get(studentId))
                    .filter((student): student is NonNullable<typeof student> => Boolean(student))
            );

            return {
                subjectId: subject.id,
                subjectName: subject.name,
                subjectCode: subject.code || undefined,
                students: subjectStudents.map((student, index) => ({
                    id: student.id,
                    serialNumber: index + 1,
                    admissionNumber: student.admissionNumber,
                    fullName: getStudentFullName(student),
                    ca1: "",
                    ca2: "",
                    exam: "",
                    total: "",
                })),
            };
        })
        .filter((subject) => subject.students.length > 0);

    return {
        school: {
            name: school.name,
            address: school.address || undefined,
            logoUrl: school.logoUrl || undefined,
        },
        session: {
            id: term.session.id,
            name: term.session.name,
        },
        term: {
            id: term.id,
            name: term.name,
        },
        classArm: {
            id: classArm.id,
            classId: classArm.classId,
            className: classArm.class.name,
            armName: classArm.armName,
            classTeacherName: classArm.classTeacher
                ? `${classArm.classTeacher.firstName} ${classArm.classTeacher.lastName}`
                : undefined,
        },
        subjects,
        generatedAt: new Date().toISOString(),
    };
}

export async function generateDummySheetStream(data: DummySheetData): Promise<NodeJS.ReadableStream> {
    const ResolvedDummySheetDocument = resolvePdfComponent<
        React.ComponentType<{ data: DummySheetData }>
    >(DummySheetDocument as MaybeDefaultExport<React.ComponentType<{ data: DummySheetData }>>);
    const documentElement = React.createElement(
        ResolvedDummySheetDocument as React.ComponentType<any>,
        { data }
    ) as React.ReactElement;

    return await ReactPDF.renderToStream(
        documentElement as any
    ) as NodeJS.ReadableStream;
}
