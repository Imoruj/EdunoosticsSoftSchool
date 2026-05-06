import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

async function authorizeAdmin(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const user = session.user as any;
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN") || roles.includes("PROPRIETOR");
    if (!isAdmin) return null;
    const schoolId = (await getActiveSchoolId(user.schoolId)) as string | null;
    if (!schoolId) return null;
    return { user, schoolId };
}

/** GET /api/teachers/[id]/branches
 *  Returns the teacher's current branch assignments and all available branches
 *  in the same organization as the active school.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorizeAdmin(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { schoolId } = auth;

    // Get teacher basic info + canSwitchBranches
    const teacher = await (prisma as any).user.findUnique({
        where: { id },
        select: { id: true, canSwitchBranches: true, schoolId: true },
    });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    // Get the active school's organization (to list sibling branches)
    const activeSchool = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { organizationId: true, name: true },
    });

    let availableBranches: { id: string; name: string; branchCode: string | null; isHeadBranch: boolean }[] = [];

    if (activeSchool?.organizationId) {
        availableBranches = await prisma.school.findMany({
            where: { organizationId: activeSchool.organizationId, isActive: true },
            select: { id: true, name: true, branchCode: true, isHeadBranch: true },
            orderBy: [{ isHeadBranch: "desc" }, { name: "asc" }],
        }) as any;
    } else {
        // No org — only the current school is available
        const s = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, branchCode: true, isHeadBranch: true },
        });
        if (s) availableBranches = [s as any];
    }

    // Get this teacher's current UserBranch records
    const userBranches = await (prisma as any).userBranch.findMany({
        where: { userId: id, isActive: true },
        select: { schoolId: true },
    });
    const assignedBranchIds: string[] = userBranches.map((ub: any) => ub.schoolId);

    // Always include the teacher's primary schoolId
    if (teacher.schoolId && !assignedBranchIds.includes(teacher.schoolId)) {
        assignedBranchIds.unshift(teacher.schoolId);
    }

    return NextResponse.json({
        canSwitchBranches: teacher.canSwitchBranches ?? true,
        assignedBranchIds,
        availableBranches,
    });
}

/** PATCH /api/teachers/[id]/branches
 *  Body: { assignedBranchIds: string[], canSwitchBranches: boolean }
 *  Updates UserBranch records and canSwitchBranches flag.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorizeAdmin(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { user: actor, schoolId } = auth;
    const body = await req.json();
    const { assignedBranchIds, canSwitchBranches, toggleOnly } = body as {
        assignedBranchIds: string[] | null;
        canSwitchBranches: boolean;
        toggleOnly?: boolean;
    };

    const teacher = await (prisma as any).user.findUnique({ where: { id }, select: { id: true, schoolId: true } });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    // toggleOnly = just update canSwitchBranches, skip branch upsert
    if (toggleOnly) {
        await (prisma as any).user.update({ where: { id }, data: { canSwitchBranches: Boolean(canSwitchBranches) } });
        return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(assignedBranchIds)) {
        return NextResponse.json({ error: "assignedBranchIds must be an array" }, { status: 400 });
    }

    // Verify all requested branches belong to the same organization
    const activeSchool = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { organizationId: true },
    });

    let allowedSchoolIds: string[] = [schoolId];
    if (activeSchool?.organizationId) {
        const orgSchools = await prisma.school.findMany({
            where: { organizationId: activeSchool.organizationId, isActive: true },
            select: { id: true },
        });
        allowedSchoolIds = orgSchools.map((s) => s.id);
    }

    const validBranchIds = assignedBranchIds.filter((sid) => allowedSchoolIds.includes(sid));

    // Upsert UserBranch records for each valid branch
    await Promise.all(
        validBranchIds.map((sid) =>
            (prisma as any).userBranch.upsert({
                where: { userId_schoolId: { userId: id, schoolId: sid } },
                create: { userId: id, schoolId: sid, isActive: true, assignedById: actor.id },
                update: { isActive: true },
            })
        )
    );

    // Deactivate branches that were removed (only within org scope)
    await (prisma as any).userBranch.updateMany({
        where: {
            userId: id,
            schoolId: { in: allowedSchoolIds, notIn: validBranchIds },
        },
        data: { isActive: false },
    });

    // Update canSwitchBranches
    await (prisma as any).user.update({
        where: { id },
        data: { canSwitchBranches: Boolean(canSwitchBranches) },
    });

    return NextResponse.json({ ok: true });
}
