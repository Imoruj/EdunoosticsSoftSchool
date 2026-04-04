import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found" }, { status: 400 });
        }

        const subjects = await prisma.subject.findMany({
            where: { schoolId },
            select: { name: true },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ subjects: subjects.map((subject) => subject.name) });
    } catch (error) {
        console.error("Failed to fetch subject options", error);
        return NextResponse.json({ error: "Failed to fetch subject options" }, { status: 500 });
    }
}
