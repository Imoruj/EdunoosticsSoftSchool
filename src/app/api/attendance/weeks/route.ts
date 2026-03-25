import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { listAttendanceWeekMarks, upsertAttendanceWeekMark } from "@/lib/attendance-week-marks";

function parseDateStr(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function getMonday(date: Date): Date {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = normalizedDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    normalizedDate.setDate(normalizedDate.getDate() + diff);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
}

function toDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        if (!classArmId || !from || !to) {
            return NextResponse.json(
                { error: "classArmId, from, and to are required" },
                { status: 400 }
            );
        }

        const user = session.user as any;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : "";
        const userId = typeof user.id === "string" ? user.id : "";
        const roles = Array.isArray(user.roles) ? user.roles : [];

        if (!schoolId || !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        const classArm = await prisma.classArm.findFirst({
            where: {
                id: classArmId,
                class: { schoolId },
                ...(isAdmin ? {} : { classTeacherId: userId }),
            },
            select: { id: true },
        });

        if (!classArm) {
            return NextResponse.json(
                { error: "Unauthorized: You do not have access to this class" },
                { status: 403 }
            );
        }

        const fromDate = parseDateStr(from);
        const toDate = parseDateStr(to);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);

        const [markedDates, savedWeekMarks] = await Promise.all([
            prisma.attendance.findMany({
                where: {
                    classArmId,
                    markedById: userId,
                    date: {
                        gte: fromDate,
                        lte: toDate,
                    },
                },
                select: {
                    date: true,
                },
                distinct: ["date"],
                orderBy: {
                    date: "desc",
                },
            }),
            listAttendanceWeekMarks(prisma, {
                schoolId,
                classArmId,
                markedById: userId,
                from,
                to,
            }),
        ]);

        const weeks = new Map<string, Set<string>>();

        markedDates.forEach((entry) => {
            const markedDate = new Date(entry.date);
            const markedDateStr = toDateStr(markedDate);
            const weekStartDate = toDateStr(getMonday(markedDate));
            const datesInWeek = weeks.get(weekStartDate) ?? new Set<string>();

            datesInWeek.add(markedDateStr);
            weeks.set(weekStartDate, datesInWeek);
        });

        savedWeekMarks.forEach((weekMark: { weekStartDate: string; markedDates: string[] }) => {
            const datesInWeek = weeks.get(weekMark.weekStartDate) ?? new Set<string>();
            weekMark.markedDates.forEach((markedDate: string) => {
                datesInWeek.add(markedDate);
            });
            weeks.set(weekMark.weekStartDate, datesInWeek);
        });

        const response = Array.from(weeks.entries())
            .map(([weekStartDate, datesInWeek]) => ({
                weekStartDate,
                markedDates: Array.from(datesInWeek).sort(),
                markedDaysCount: datesInWeek.size,
            }))
            .sort((left, right) => right.weekStartDate.localeCompare(left.weekStartDate));

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching marked attendance weeks:", error);
        return NextResponse.json(
            { error: "Failed to fetch marked attendance weeks" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { classArmId, weekStartDate, markedDates } = body;

        if (!classArmId || !weekStartDate || !Array.isArray(markedDates)) {
            return NextResponse.json(
                { error: "classArmId, weekStartDate, and markedDates are required" },
                { status: 400 }
            );
        }

        const user = session.user as any;
        const schoolId = typeof user.schoolId === "string" ? user.schoolId : "";
        const userId = typeof user.id === "string" ? user.id : "";
        const roles = Array.isArray(user.roles) ? user.roles : [];

        if (!schoolId || !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        const classArm = await prisma.classArm.findFirst({
            where: {
                id: classArmId,
                class: { schoolId },
                ...(isAdmin ? {} : { classTeacherId: userId }),
            },
            select: { id: true },
        });

        if (!classArm) {
            return NextResponse.json(
                { error: "Unauthorized: You do not have access to this class" },
                { status: 403 }
            );
        }

        await upsertAttendanceWeekMark(prisma, {
            schoolId,
            classArmId,
            markedById: userId,
            weekStartDate,
            markedDates,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving attendance week mark:", error);
        return NextResponse.json(
            { error: "Failed to save attendance week mark" },
            { status: 500 }
        );
    }
}

