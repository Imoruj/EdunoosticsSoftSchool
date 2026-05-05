import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

async function assertSuperAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const user = session.user as any;
    if (!user.roles?.includes("SUPER_ADMIN")) return null;
    return user;
}

// GET — current branch assignments for a user + all available schools
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const [userBranches, schools] = await Promise.all([
        (prisma as any).userBranch.findMany({
            where: { userId: id, isActive: true },
            select: { schoolId: true },
        }),
        prisma.school.findMany({
            where: { isActive: true, registrationStatus: "APPROVED" },
            select: { id: true, name: true, branchCode: true, isHeadBranch: true, organizationId: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const assignedBranchIds: string[] = userBranches.map((ub: any) => ub.schoolId);

    return NextResponse.json({ assignedBranchIds, schools });
}

// POST — update branch assignments and enable canSwitchBranches
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { branchIds } = await req.json();

    if (!Array.isArray(branchIds) || branchIds.length === 0) {
        return NextResponse.json({ error: "branchIds must be a non-empty array" }, { status: 400 });
    }

    // Fetch the user to get their roles and primary schoolId
    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, roles: true, schoolId: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Upsert UserBranch for every selected school
    for (const schoolId of branchIds) {
        await (prisma as any).userBranch.upsert({
            where: { userId_schoolId: { userId: id, schoolId } },
            create: {
                userId: id,
                schoolId,
                roles: user.roles,
                isActive: true,
            },
            update: { isActive: true },
        });
    }

    // Deactivate any existing branches not in the new list
    await (prisma as any).userBranch.updateMany({
        where: { userId: id, schoolId: { notIn: branchIds } },
        data: { isActive: false },
    });

    // Enable branch switching since multiple branches are now assigned
    await (prisma as any).user.update({
        where: { id },
        data: { canSwitchBranches: true },
    });

    return NextResponse.json({ ok: true, branchCount: branchIds.length });
}
