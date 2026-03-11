import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sanitizeCsv } from "@/lib/csvUtils";

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
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
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

        // Fetch assessment types for column headers
        const assessmentTypes = await prisma.assessmentType.findMany({
            where: { schoolId, isActive: true },
            orderBy: { order: "asc" },
        });

        // Map assessment types to score field names
        const caTypes = assessmentTypes
            .filter(t => !t.name.toLowerCase().includes("exam"))
            .sort((a, b) => a.order - b.order);
        const examType = assessmentTypes.find(t => t.name.toLowerCase().includes("exam"));

        // Build column list based on selection
        const requestedColumns = columns === "all"
            ? ["ca1", "ca2", "ca3", "exam"]
            : columns.split(",").map(c => c.trim());

        const columnHeaders: { field: string; label: string }[] = [];
        for (const col of requestedColumns) {
            if (col === "ca1" && caTypes[0]) {
                columnHeaders.push({ field: "ca1", label: `${caTypes[0].name} (${caTypes[0].maxScore})` });
            } else if (col === "ca2" && caTypes[1]) {
                columnHeaders.push({ field: "ca2", label: `${caTypes[1].name} (${caTypes[1].maxScore})` });
            } else if (col === "ca3" && caTypes[2]) {
                columnHeaders.push({ field: "ca3", label: `${caTypes[2].name} (${caTypes[2].maxScore})` });
            } else if (col === "exam" && examType) {
                columnHeaders.push({ field: "exam", label: `${examType.name} (${examType.maxScore})` });
            }
        }

        if (columnHeaders.length === 0) {
            return NextResponse.json(
                { error: "No valid score columns selected" },
                { status: 400 }
            );
        }

        // Determine if the selected term belongs to the current session
        const selectedTerm = await prisma.term.findUnique({
            where: { id: termId! },
            include: { session: { select: { id: true, isCurrent: true } } }
        });
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
        const headerRow = ["S/N", "Student Name", "Admission Number", ...columnHeaders.map(c => sanitizeCsv(c.label))];
        const csvLines = [headerRow.join(",")];

        students.forEach((student, index) => {
            const name = `${student.lastName} ${student.firstName}${student.otherNames ? " " + student.otherNames : ""}`;
            const row = [
                sanitizeCsv(index + 1),
                sanitizeCsv(name),
                sanitizeCsv(student.admissionNumber),
                ...columnHeaders.map(() => '""'),
            ];
            csvLines.push(row.join(","));
        });

        const csvContent = csvLines.join("\n");

        // Build file name
        const className = classArm ? `${classArm.class.name}_${classArm.armName}` : "Class";
        const subjectName = subject?.name || "Subject";
        const columnLabel = columns === "all" ? "ALL" : requestedColumns.join("_").toUpperCase();
        const fileName = `${className}_${subjectName}_${columnLabel}_template.csv`
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
