import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiError";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// GET /api/communication/recipients?channel=SMS&group=all_parents|all_students|all_teachers|class:classArmId
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return apiError("Unauthorized", 401);

        const user = session.user as any;
        const roles = user.roles || [];
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;

        if (!roles.includes("SUPER_ADMIN") && !roles.includes("SCHOOL_ADMIN")) {
            return apiError("Forbidden", 403);
        }

        const { searchParams } = new URL(req.url);
        const channel = searchParams.get("channel") as "SMS" | "EMAIL" | null;
        const group = searchParams.get("group") ?? "";

        if (!channel || !["SMS", "EMAIL"].includes(channel)) {
            return apiError("channel must be SMS or EMAIL", 400);
        }

        let recipients: string[] = [];

        if (group === "all_parents") {
            // Get parent users for this school
            const parents = await prisma.user.findMany({
                where: { schoolId, roles: { hasSome: ["PARENT"] }, isActive: true },
                select: { email: true, phone: true },
            });
            recipients = parents
                .map(p => channel === "SMS" ? p.phone : p.email)
                .filter((v): v is string => !!v);
        } else if (group === "all_students") {
            // Get student users for this school
            const students = await prisma.user.findMany({
                where: { schoolId, roles: { hasSome: ["STUDENT"] }, isActive: true },
                select: { email: true, phone: true },
            });
            recipients = students
                .map(s => channel === "SMS" ? s.phone : s.email)
                .filter((v): v is string => !!v);
        } else if (group === "all_teachers") {
            const teachers = await prisma.user.findMany({
                where: {
                    schoolId,
                    isActive: true,
                    roles: { hasSome: ["CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_ADMIN", "PROPRIETOR"] },
                },
                select: { email: true, phone: true },
            });
            recipients = teachers
                .map(t => channel === "SMS" ? t.phone : t.email)
                .filter((v): v is string => !!v);
        } else if (group.startsWith("class:")) {
            const classArmId = group.slice(6);
            // Verify this class belongs to the school
            const classArm = await prisma.classArm.findFirst({
                where: { id: classArmId, class: { schoolId } },
            });
            if (!classArm) return apiError("Class not found", 404);

            // Get parent contacts from student records (parentPhone / parentEmail)
            const students = await prisma.student.findMany({
                where: { classArmId, isActive: true, schoolId },
                select: { parentPhone: true, parentEmail: true },
            });
            const contactSet = new Set<string>();
            for (const s of students) {
                const contact = channel === "SMS" ? s.parentPhone : s.parentEmail;
                if (contact) contactSet.add(contact);
            }
            recipients = Array.from(contactSet);
        }

        return NextResponse.json({ recipients, count: recipients.length });
    } catch (error) {
        return apiError("Failed to fetch recipients", 500, error);
    }
}
