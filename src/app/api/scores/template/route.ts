import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sanitizeCsv } from "@/lib/csvUtils";
import { resolveSubjectScoreProfile } from "@/lib/composite-subjects";
import { mapAssessmentTypesToScoreFields } from "@/lib/assessment-types";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const subjectId = searchParams.get("subjectId");
        const termId = searchParams.get("termId");
        const columns = searchParams.get("columns") || "all"; // comma-separated: ca1,ca2,ca3,exam or "all"

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const userId = typeof user.id === "string" ? user.id : null;

        if (!classArmId || !subjectId || !termId) {
            return NextResponse.json(
                { error: "classArmId, subjectId, and termId are required" },
                { status: 400 }
            );
        }

        if (!schoolId) {
            return NextResponse.json({ error: "School context is required" }, { status: 400 });
        }

        // RBAC CHECK
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const isSubjectTeacher = await prisma.teacherSubject.findFirst({
                where: { teacherId: userId, subjectId, classArmId }
            });
            const isClassTeacher = await prisma.classArm.findFirst({
                where: { id: classArmId, classTeacherId: userId }
            });
            if (!isSubjectTeacher && !isClassTeacher) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        const selectedTerm = await prisma.term.findUnique({
            where: { id: termId },
            include: { session: { select: { id: true, isCurrent: true } } },
        });

        if (!selectedTerm?.session?.id) {
            return NextResponse.json({ error: "Invalid term" }, { status: 400 });
        }

        const { assessmentTypes, context } = await resolveSubjectScoreProfile(prisma, {
            schoolId,
            sessionId: selectedTerm.session.id,
            subjectId,
            classArmId,
        });

        if (context.mode === "COMPOSITE_PARENT") {
            return NextResponse.json(
                { error: "Templates cannot be generated for composite parent subjects. Enter scores on the component subjects instead." },
                { status: 400 }
            );
        }

        // Map all assessment types to positional score field keys (ca1, ca2, ..., exam)
        const mappedTypes = mapAssessmentTypesToScoreFields(assessmentTypes);
        const allFieldKeys = mappedTypes.map(t => t.field);

        // Build column list based on selection
        const requestedColumns = columns === "all"
            ? allFieldKeys
            : columns.split(",").map(c => c.trim()).filter(c => allFieldKeys.includes(c));

        const columnHeaders: { field: string; label: string }[] = requestedColumns
            .map(col => {
                const at = mappedTypes.find(t => t.field === col);
                return at ? { field: col, label: `${at.name} (${at.maxScore})` } : null;
            })
            .filter((h): h is { field: string; label: string } => h !== null);

        if (columnHeaders.length === 0) {
            return NextResponse.json(
                { error: "No valid score columns selected" },
                { status: 400 }
            );
        }

        const isCurrentSession = selectedTerm?.session?.isCurrent ?? true;

        // Fetch enrolled students (same logic as scores API)
        const enrollmentCount = await prisma.subjectEnrollment.count({
            where: { subjectId, classArmId, termId },
        });
        const hasEnrollments = enrollmentCount > 0;

        let studentFilter: any = { schoolId };

        if (isCurrentSession) {
            studentFilter.classArmId = classArmId;
            studentFilter.isActive = true;
        } else {
            // Past session: only include students with historical records for this class arm
            const sessionTerms = await prisma.term.findMany({
                where: { sessionId: selectedTerm!.session.id },
                select: { id: true }
            });
            const sessionTermIds = sessionTerms.map(t => t.id);

            const [rcStudents, seStudents] = await Promise.all([
                prisma.reportCard.findMany({
                    where: { termId: { in: sessionTermIds }, classArmId },
                    select: { studentId: true },
                    distinct: ['studentId']
                }),
                prisma.subjectEnrollment.findMany({
                    where: { termId: { in: sessionTermIds }, classArmId },
                    select: { studentId: true },
                    distinct: ['studentId']
                })
            ]);

            const historicalStudentIds = Array.from(new Set([
                ...rcStudents.map(s => s.studentId),
                ...seStudents.map(s => s.studentId)
            ]));

            studentFilter.id = { in: historicalStudentIds };
        }

        if (hasEnrollments) {
            const enrolledStudentIds = await prisma.subjectEnrollment.findMany({
                where: { subjectId, classArmId, termId, isActive: true },
                select: { studentId: true },
            });
            const enrolledIds = enrolledStudentIds.map(e => e.studentId);

            if (studentFilter.id) {
                const existingSet = new Set((studentFilter.id as any).in as string[]);
                studentFilter.id = { in: enrolledIds.filter(id => existingSet.has(id)) };
            } else {
                studentFilter.id = { in: enrolledIds };
            }
        }

        const students = await prisma.student.findMany({
            where: studentFilter,
            orderBy: { lastName: "asc" },
        });

        if (students.length === 0) {
            return NextResponse.json(
                { error: "No students enrolled for this subject" },
                { status: 400 }
            );
        }

        // Fetch class arm name for file naming
        const classArm = await prisma.classArm.findUnique({
            where: { id: classArmId },
            include: { class: true },
        });

        const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
        });

        // Build CSV content
        const includeScores = searchParams.get("includeScores") === "true";
        let scoreMap = new Map<string, any>();

        if (includeScores) {
            const studentIds = students.map(s => s.id);
            const scores = await prisma.score.findMany({
                where: {
                    subjectId,
                    termId,
                    studentId: { in: studentIds }
                }
            });
            scores.forEach(s => scoreMap.set(s.studentId, s));
        }

        const headerRow = ["S/N", "Student Name", "Admission Number", ...columnHeaders.map(c => sanitizeCsv(c.label))];
        const csvLines = [headerRow.join(",")];

        students.forEach((student, index) => {
            const name = `${student.lastName} ${student.firstName}${student.otherNames ? " " + student.otherNames : ""}`;
            const studentScores = scoreMap.get(student.id) || {};
            const row = [
                sanitizeCsv(index + 1),
                sanitizeCsv(name),
                sanitizeCsv(student.admissionNumber),
                ...columnHeaders.map((c) => {
                    if (includeScores) {
                        const sv = (studentScores.scoreValues ?? {}) as Record<string, unknown>;
                        const val = sv[c.field];
                        if (val != null) {
                           return typeof (val as any).toNumber === "function" ? (val as any).toNumber() : Number(val);
                        }
                    }
                    return '""';
                }),
            ];
            csvLines.push(row.join(","));
        });

        const csvContent = csvLines.join("\n");

        // Build file name
        const className = classArm ? `${classArm.class.name}_${classArm.armName}` : "Class";
        const subjectName = subject?.name || "Subject";
        const columnLabel = columns === "all" ? "ALL" : requestedColumns.join("_").toUpperCase();
        const exportSuffix = includeScores ? "scores_export" : "template";
        const fileName = `${className}_${subjectName}_${columnLabel}_${exportSuffix}.csv`
            .replace(/\s+/g, "_");

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });

    } catch (error: any) {
        console.error("Error generating template:", error);
        return NextResponse.json(
            { error: "Failed to generate template" },
            { status: 500 }
        );
    }
}

