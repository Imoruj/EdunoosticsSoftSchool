import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";

// GET /api/reports/broadsheet/export?termId=...&classArmId=...&format=csv|excel
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return apiError("Unauthorized", 401);

        const user = session.user as any;
        const roles: string[] = user.roles ?? [];
        const schoolId: string = user.schoolId;

        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        const isClassTeacher = roles.includes("CLASS_TEACHER");
        if (!isAdmin && !isClassTeacher) return apiError("Forbidden", 403);

        const { searchParams } = new URL(req.url);
        const termId = searchParams.get("termId");
        const classArmId = searchParams.get("classArmId");
        const format = (searchParams.get("format") ?? "csv") as "csv" | "excel";

        if (!termId || !classArmId) return apiError("termId and classArmId are required", 400);

        // Verify class belongs to school
        const classArm = await prisma.classArm.findFirst({
            where: { id: classArmId, class: { schoolId } },
            include: { class: { select: { name: true } } },
        });
        if (!classArm) return apiError("Class not found", 404);

        // For class teachers, verify they teach this class
        if (!isAdmin && isClassTeacher) {
            const isAssigned = await prisma.classArm.findFirst({
                where: { id: classArmId, classTeacherId: user.id },
            });
            if (!isAssigned) return apiError("Forbidden", 403);
        }

        const className = `${classArm.class.name} ${classArm.armName}`;

        // Fetch report cards with scores
        const reportCards = await prisma.reportCard.findMany({
            where: { termId, classArmId },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
            },
            orderBy: { classPosition: "asc" },
        });

        const studentIds = reportCards.map(rc => rc.student.id);

        const scores = await prisma.score.findMany({
            where: {
                termId,
                studentId: { in: studentIds },
                subject: { subjectKind: { not: "COMPOSITE_COMPONENT" } },
            },
            include: { subject: { select: { name: true } } },
            orderBy: { subject: { name: "asc" } },
        });

        // Build subject list
        const subjectNames = Array.from(new Set(scores.map(s => s.subject.name))).sort();

        // Build score map: studentId -> subjectName -> total
        const scoreMap = new Map<string, Map<string, number>>();
        for (const score of scores) {
            if (!scoreMap.has(score.studentId)) scoreMap.set(score.studentId, new Map());
            scoreMap.get(score.studentId)!.set(score.subject.name, Number(score.total));
        }

        // Build rows
        const rows = reportCards.map((rc, idx) => {
            const studentScores = scoreMap.get(rc.student.id) ?? new Map();
            const row: Record<string, string | number> = {
                "S/N": idx + 1,
                "Student Name": `${rc.student.firstName} ${rc.student.lastName}`,
                "Admission No.": rc.student.admissionNumber ?? "",
                "Position": rc.classPosition ?? "",
                "Average": rc.average ? Number(rc.average).toFixed(1) : "",
            };
            for (const subj of subjectNames) {
                row[subj] = studentScores.has(subj) ? studentScores.get(subj)! : "";
            }
            return row;
        });

        const termName = (await prisma.term.findUnique({ where: { id: termId }, select: { name: true } }))?.name ?? termId;
        const filename = `Broadsheet_${className}_${termName}`.replace(/[^a-zA-Z0-9_\-]/g, "_");

        if (format === "csv") {
            const headers = Object.keys(rows[0] ?? {});
            const csv = [
                headers.join(","),
                ...rows.map(row =>
                    headers.map(h => {
                        const v = String(row[h] ?? "");
                        return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
                    }).join(",")
                ),
            ].join("\n");

            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${filename}.csv"`,
                },
            });
        }

        // Excel format
        const xlsx = await import("xlsx");
        const ws = xlsx.utils.json_to_sheet(rows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Broadsheet");

        // Auto-column widths
        const colWidths = Object.keys(rows[0] ?? {}).map(key => ({
            wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? "").length)) + 2,
        }));
        ws["!cols"] = colWidths;

        const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
            },
        });
    } catch (error) {
        return apiError("Failed to export broadsheet", 500, error);
    }
}
