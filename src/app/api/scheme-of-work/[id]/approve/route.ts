import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles: string[] = user.roles || [];

        if (!roles.includes(UserRole.SUPER_ADMIN) && !roles.includes(UserRole.SCHOOL_ADMIN)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const sow = await prisma.schemeOfWork.findFirst({ where: { id: id, schoolId } });
        if (!sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (sow.status !== SowStatus.SUBMITTED) {
            return NextResponse.json({ error: "Only submitted SOWs can be approved" }, { status: 409 });
        }

        const body = await req.json().catch(() => ({}));
        const adminNote = body.adminNote || null;

        const updated = await prisma.schemeOfWork.update({
            where: { id: id },
            data: { status: SowStatus.APPROVED, approvedAt: new Date(), approvedById: user.id, adminNote },
        });

        return NextResponse.json({ schemeOfWork: updated });
    } catch (error) {
        console.error("[SOW] approve error:", error);
        return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
    }
}
