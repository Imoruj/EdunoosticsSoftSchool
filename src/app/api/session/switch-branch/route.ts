import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { branchId } = await req.json();

    if (!branchId || typeof branchId !== "string") {
        return NextResponse.json({ error: "branchId is required" }, { status: 400 });
    }

    // Verify this user is actually assigned to the requested branch
    const userBranch = await (prisma as any).userBranch.findFirst({
        where: { userId: user.id, schoolId: branchId, isActive: true },
        include: { school: { select: { id: true, name: true } } },
    });

    if (!userBranch) {
        return NextResponse.json({ error: "You are not assigned to this branch" }, { status: 403 });
    }

    return NextResponse.json({
        ok: true,
        branchId: userBranch.school.id,
        branchName: userBranch.school.name,
    });
}
