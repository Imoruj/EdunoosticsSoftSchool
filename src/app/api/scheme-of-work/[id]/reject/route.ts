import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

        const sow = await prisma.schemeOfWork.findFirst({ where: { id: params.id, schoolId } });
        if (!sow) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (sow.status !== SowStatus.SUBMITTED) {
            return NextResponse.json({ error: "Only submitted SOWs can be rejected" }, { status: 409 });
        }

        const body = await req.json();
        const { adminNote } = body;

        if (!adminNote?.trim()) {
            return NextResponse.json({ error: "A reason is required when rejecting" }, { status: 400 });
        }

        const updated = await prisma.schemeOfWork.update({
            where: { id: params.id },
            data: { status: SowStatus.REJECTED, adminNote: adminNote.trim(), approvedById: null, approvedAt: null },
        });

        return NextResponse.json({ schemeOfWork: updated });
    } catch (error) {
        console.error("[SOW] reject error:", error);
        return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
    }
}
