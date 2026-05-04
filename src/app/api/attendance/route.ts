
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";

function parsePeriod(value: string | null): "MORNING" | "AFTERNOON" {
    return value === "AFTERNOON" ? "AFTERNOON" : "MORNING";
}

// GET: Fetch attendance for a class arm, date, and period
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId");
        const dateStr = searchParams.get("date"); // YYYY-MM-DD
        const period = parsePeriod(searchParams.get("period"));

        if (!classArmId || !dateStr) {
            return NextResponse.json({ error: "Class Arm ID and Date are required" }, { status: 400 });
        }

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles = user.roles || [];

        // RBAC CHECK
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            const isClassTeacher = await prisma.classArm.findFirst({
                where: { id: classArmId, classTeacherId: user.id }
            });
            if (!isClassTeacher) {
                return NextResponse.json({ error: "Unauthorized: You are not the class teacher for this class" }, { status: 403 });
            }
        }

        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);

        // Fetch students and their attendance for this date and period
        const students = await prisma.student.findMany({
            where: { classArmId, schoolId, isActive: true },
            include: {
                attendance: {
                    where: { date, period }
                }
            },
            orderBy: { lastName: "asc" }
        });

        const data = students.map(student => ({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
            status: student.attendance[0]?.status || "PRESENT"
        }));

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
    }
}

// POST: Save attendance (Bulk) for a specific period
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { classArmId, date: dateStr, attendance, period: periodStr } = body;

        if (!classArmId || !dateStr || !attendance || !Array.isArray(attendance)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const period = parsePeriod(periodStr);

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles = user.roles || [];

        // RBAC CHECK
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            const isClassTeacher = await prisma.classArm.findFirst({
                where: { id: classArmId, classTeacherId: user.id }
            });
            if (!isClassTeacher) {
                return NextResponse.json({ error: "Unauthorized: You are not the class teacher for this class" }, { status: 403 });
            }
        }

        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);

        // Bulk upsert attendance per period
        await prisma.$transaction(
            attendance.map((item: any) =>
                prisma.attendance.upsert({
                    where: {
                        studentId_date_period: {
                            studentId: item.studentId,
                            date,
                            period
                        }
                    },
                    update: {
                        status: item.status as AttendanceStatus,
                        markedById: user.id
                    },
                    create: {
                        studentId: item.studentId,
                        classArmId,
                        date,
                        period,
                        status: item.status as AttendanceStatus,
                        markedById: user.id
                    }
                })
            )
        );

        return NextResponse.json({ message: "Attendance saved successfully" });
    } catch (error) {
        console.error("Error saving attendance:", error);
        return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
    }
}
