
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

const SCHOOL_TIMEZONE = "Africa/Lagos";

function toSchoolDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: SCHOOL_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value ?? "0000";
    const month = parts.find((part) => part.type === "month")?.value ?? "00";
    const day = parts.find((part) => part.type === "day")?.value ?? "00";

    return `${year}-${month}-${day}`;
}

function normalizeDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
}

// GET: List all public holidays for the school, optionally filtered by date range
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json({ error: "No school associated with this account" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const from = searchParams.get("from"); // YYYY-MM-DD
        const to = searchParams.get("to");     // YYYY-MM-DD

        const where: any = { schoolId };
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = normalizeDate(from);
            if (to) {
                const toDate = normalizeDate(to);
                toDate.setHours(23, 59, 59, 999);
                where.date.lte = toDate;
            }
        }

        const holidays = await prisma.publicHoliday.findMany({
            where,
            orderBy: { date: "asc" },
        });

        return NextResponse.json(holidays);
    } catch (error) {
        console.error("Error fetching public holidays:", error);
        return NextResponse.json({ error: "Failed to fetch public holidays" }, { status: 500 });
    }
}

// POST: Create a public holiday (admin only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        const roles = user.roles || [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }
        if (!schoolId) {
            return NextResponse.json({ error: "No school associated with this account" }, { status: 400 });
        }

        const body = await req.json();

        if (Array.isArray(body?.holidays)) {
            const uniqueHolidays = new Map<string, { name: string; date: Date; description: string | null }>();

            body.holidays.forEach((entry: any) => {
                const name = typeof entry?.name === "string" ? entry.name.trim() : "";
                const dateStr = typeof entry?.date === "string" ? entry.date : "";
                const description = typeof entry?.description === "string" ? entry.description.trim() : "";

                if (!name || !dateStr) return;

                const date = normalizeDate(dateStr);
                uniqueHolidays.set(toSchoolDateKey(date), {
                    name,
                    date,
                    description: description || null,
                });
            });

            const normalizedHolidays = Array.from(uniqueHolidays.values());
            if (!normalizedHolidays.length) {
                return NextResponse.json({ error: "At least one valid holiday date is required" }, { status: 400 });
            }

            const existingHolidays = await prisma.publicHoliday.findMany({
                where: {
                    schoolId,
                    date: { in: normalizedHolidays.map((holiday) => holiday.date) },
                },
                select: { date: true },
            });
            const existingDateSet = new Set(
                existingHolidays.map((holiday) => toSchoolDateKey(holiday.date))
            );
            const holidaysToCreate = normalizedHolidays.filter(
                (holiday) => !existingDateSet.has(toSchoolDateKey(holiday.date))
            );

            if (!holidaysToCreate.length) {
                return NextResponse.json(
                    { error: "The selected break days already exist", skippedDates: Array.from(existingDateSet).sort() },
                    { status: 409 }
                );
            }

            const created = await prisma.publicHoliday.createMany({
                data: holidaysToCreate.map((holiday) => ({
                    name: holiday.name,
                    date: holiday.date,
                    description: holiday.description,
                    schoolId,
                })),
            });

            return NextResponse.json({
                message: "School closure days created successfully",
                createdCount: created.count,
                skippedDates: Array.from(existingDateSet).sort(),
            }, { status: 201 });
        }

        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const dateStr = typeof body?.date === "string" ? body.date : "";
        const description = typeof body?.description === "string" ? body.description.trim() : "";

        if (!name || !dateStr) {
            return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
        }

        const date = normalizeDate(dateStr);

        const holiday = await prisma.publicHoliday.create({
            data: { name, date, description: description || null, schoolId },
        });

        return NextResponse.json(holiday, { status: 201 });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ error: "A holiday already exists for this date" }, { status: 409 });
        }
        console.error("Error creating public holiday:", error);
        return NextResponse.json({ error: "Failed to create public holiday" }, { status: 500 });
    }
}

