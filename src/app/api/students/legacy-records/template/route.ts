import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sanitizeCsv } from "@/lib/csvUtils";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const subjectId = searchParams.get("subjectId");

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles = user.roles || [];

        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!classArmId) {
            return NextResponse.json(
                { error: "classArmId is required" },
                { status: 400 }
            );
        }

        // Fetch students in the class arm (include inactive for legacy records)
        const students = await prisma.student.findMany({
            where: {
                classArmId,
                schoolId,
            },
            orderBy: { lastName: "asc" },
        });

        if (students.length === 0) {
            return NextResponse.json(
                { error: "No students found in this class" },
                { status: 400 }
            );
        }

        // Fetch class arm name for file naming
        const classArm = await prisma.classArm.findUnique({
            where: { id: classArmId },
            include: { class: true },
        });

        let subjectName = "AllSubjects";
        if (subjectId) {
            const subject = await prisma.subject.findUnique({
                where: { id: subjectId },
            });
            if (subject) subjectName = subject.name;
        }

        // Fetch assessment types for column headers
        const assessmentTypes = await getResolvedAssessmentTypesForClassContext(prisma, {
            schoolId,
            classArmId,
        });

        const scoreColumns = assessmentTypes.map(t => `${t.name} (${t.maxScore})`);
        if (scoreColumns.length === 0) {
            scoreColumns.push("CA1", "CA2", "CA3", "Exam");
        }

        // Build CSV
        const headerRow = ["S/N", "Student Name", "Admission Number", ...scoreColumns.map(sanitizeCsv)];
        const csvLines = [headerRow.join(",")];

        students.forEach((student, index) => {
            const name = `${student.lastName} ${student.firstName}${student.otherNames ? " " + student.otherNames : ""}`;
            const row = [
                sanitizeCsv(index + 1),
                sanitizeCsv(name),
                sanitizeCsv(student.admissionNumber),
                ...scoreColumns.map(() => '""'),
            ];
            csvLines.push(row.join(","));
        });

        const csvContent = csvLines.join("\n");

        const className = classArm ? `${classArm.class.name}_${classArm.armName}` : "Class";
        const fileName = `Legacy_${className}_${subjectName}_template.csv`.replace(/\s+/g, "_");

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (error: any) {
        console.error("Error generating legacy template:", error);
        return NextResponse.json(
            { error: "Failed to generate template" },
            { status: 500 }
        );
    }
}

