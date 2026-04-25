
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// DELETE: Remove a public holiday (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles = user.roles || [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const holiday = await prisma.publicHoliday.findFirst({
            where: { id: id, schoolId },
        });
        if (!holiday) {
            return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
        }

        await prisma.publicHoliday.delete({ where: { id: id } });

        return NextResponse.json({ message: "Holiday deleted" });
    } catch (error) {
        console.error("Error deleting public holiday:", error);
        return NextResponse.json({ error: "Failed to delete public holiday" }, { status: 500 });
    }
}
