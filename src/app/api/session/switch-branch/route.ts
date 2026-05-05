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

    // Set a lightweight cookie so the client can read the active branch without
    // needing to call NextAuth's update() (which requires NEXTAUTH_URL to match
    // the current domain and can cause a logout if it fails).
    const response = NextResponse.json({
        ok: true,
        branchId: userBranch.school.id,
        branchName: userBranch.school.name,
    });

    response.cookies.set("active_branch_id", userBranch.school.id, {
        httpOnly: false, // readable by client JS so the header can update instantly
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 h — matches session maxAge
    });

    return response;
}
