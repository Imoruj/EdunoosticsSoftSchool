import { Prisma } from "@prisma/client";

interface AttendanceWeekMarkParams {
    schoolId: string;
    classArmId: string;
    markedById: string;
    weekStartDate: string;
    markedDates: string[];
}

interface AttendanceWeekMarkQueryParams {
    schoolId: string;
    classArmId: string;
    markedById: string;
    from: string;
    to: string;
}

interface AttendanceWeekMarkRow {
    weekStartDate: string;
    markedDates: unknown;
    markedDaysCount: number;
}

export interface AttendanceWeekMarkSummary {
    weekStartDate: string;
    markedDates: string[];
    markedDaysCount: number;
}

function parseDateStr(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function toDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getMonday(date: Date): Date {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = normalizedDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    normalizedDate.setDate(normalizedDate.getDate() + diff);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
}

function normalizeMarkedDates(markedDates: string[]) {
    return Array.from(
        new Set(
            markedDates
                .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
                .map((value) => toDateStr(parseDateStr(value)))
        )
    ).sort();
}

export async function ensureAttendanceWeekMarksTable(prisma: any) {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AttendanceWeekMark" (
            "schoolId" TEXT NOT NULL,
            "classArmId" TEXT NOT NULL,
            "markedById" TEXT NOT NULL,
            "weekStartDate" DATE NOT NULL,
            "markedDates" JSONB NOT NULL DEFAULT '[]'::jsonb,
            "markedDaysCount" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "AttendanceWeekMark_pkey" PRIMARY KEY ("classArmId", "markedById", "weekStartDate"),
            CONSTRAINT "AttendanceWeekMark_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "AttendanceWeekMark_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "AttendanceWeekMark_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
    `);

    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AttendanceWeekMark_schoolId_classArmId_markedById_weekStartDate_idx"
        ON "AttendanceWeekMark" ("schoolId", "classArmId", "markedById", "weekStartDate")
    `);
}

export async function upsertAttendanceWeekMark(prisma: any, params: AttendanceWeekMarkParams) {
    await ensureAttendanceWeekMarksTable(prisma);

    const normalizedWeekStartDate = toDateStr(getMonday(parseDateStr(params.weekStartDate)));
    const normalizedMarkedDates = normalizeMarkedDates(params.markedDates);

    if (!normalizedMarkedDates.length) {
        throw new Error("At least one valid marked date is required.");
    }

    await prisma.$executeRaw(
        Prisma.sql`
            INSERT INTO "AttendanceWeekMark" (
                "schoolId",
                "classArmId",
                "markedById",
                "weekStartDate",
                "markedDates",
                "markedDaysCount",
                "updatedAt"
            )
            VALUES (
                ${params.schoolId},
                ${params.classArmId},
                ${params.markedById},
                CAST(${normalizedWeekStartDate} AS DATE),
                CAST(${JSON.stringify(normalizedMarkedDates)} AS JSONB),
                ${normalizedMarkedDates.length},
                CURRENT_TIMESTAMP
            )
            ON CONFLICT ("classArmId", "markedById", "weekStartDate")
            DO UPDATE SET
                "schoolId" = EXCLUDED."schoolId",
                "markedDates" = EXCLUDED."markedDates",
                "markedDaysCount" = EXCLUDED."markedDaysCount",
                "updatedAt" = CURRENT_TIMESTAMP
        `
    );
}

export async function listAttendanceWeekMarks(
    prisma: any,
    params: AttendanceWeekMarkQueryParams
): Promise<AttendanceWeekMarkSummary[]> {
    await ensureAttendanceWeekMarksTable(prisma);

    const fromMonday = toDateStr(getMonday(parseDateStr(params.from)));
    const rows = await prisma.$queryRaw(
        Prisma.sql`
            SELECT
                TO_CHAR("weekStartDate", 'YYYY-MM-DD') AS "weekStartDate",
                "markedDates",
                "markedDaysCount"
            FROM "AttendanceWeekMark"
            WHERE "schoolId" = ${params.schoolId}
              AND "classArmId" = ${params.classArmId}
              AND "markedById" = ${params.markedById}
              AND "weekStartDate" BETWEEN CAST(${fromMonday} AS DATE) AND CAST(${params.to} AS DATE)
            ORDER BY "weekStartDate" DESC
        `
    ) as AttendanceWeekMarkRow[];

    return rows.map((row: AttendanceWeekMarkRow): AttendanceWeekMarkSummary => {
        let rawMarkedDates: unknown[] = [];

        if (Array.isArray(row.markedDates)) {
            rawMarkedDates = row.markedDates;
        } else if (typeof row.markedDates === "string") {
            try {
                rawMarkedDates = JSON.parse(row.markedDates);
            } catch {
                rawMarkedDates = [];
            }
        }

        const markedDates = Array.isArray(row.markedDates)
            ? normalizeMarkedDates(row.markedDates.filter((value: unknown): value is string => typeof value === "string"))
            : normalizeMarkedDates(rawMarkedDates.filter((value: unknown): value is string => typeof value === "string"));

        return {
            weekStartDate: row.weekStartDate,
            markedDates,
            markedDaysCount: row.markedDaysCount ?? markedDates.length,
        };
    });
}
