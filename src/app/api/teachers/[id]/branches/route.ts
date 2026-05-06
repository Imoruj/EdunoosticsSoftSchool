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

async function getOrgSchoolIds(schoolId: string): Promise<string[]> {
    const activeSchool = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { organizationId: true },
    });
    if (!activeSchool?.organizationId) return [schoolId];
    const orgSchools = await prisma.school.findMany({
        where: { organizationId: activeSchool.organizationId, isActive: true },
        select: { id: true },
    });
    return orgSchools.map((s) => s.id);
}

/** GET /api/teachers/[id]/branches
 *  Returns branch assignments, available branches, and any duplicate accounts
 *  found across the organisation for the same email address.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorizeAdmin(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { schoolId } = auth;

    const teacher = await (prisma as any).user.findUnique({
        where: { id },
        select: { id: true, email: true, firstName: true, lastName: true, canSwitchBranches: true, schoolId: true },
    });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const activeSchool = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { organizationId: true, name: true },
    });

    let availableBranches: { id: string; name: string; branchCode: string | null; isHeadBranch: boolean }[] = [];
    const allowedSchoolIds = await getOrgSchoolIds(schoolId);

    availableBranches = await prisma.school.findMany({
        where: { id: { in: allowedSchoolIds }, isActive: true },
        select: { id: true, name: true, branchCode: true, isHeadBranch: true },
        orderBy: [{ isHeadBranch: "desc" }, { name: "asc" }],
    }) as any;

    const userBranches = await (prisma as any).userBranch.findMany({
        where: { userId: id, isActive: true },
        select: { schoolId: true },
    });
    const assignedBranchIds: string[] = userBranches.map((ub: any) => ub.schoolId);
    if (teacher.schoolId && !assignedBranchIds.includes(teacher.schoolId)) {
        assignedBranchIds.unshift(teacher.schoolId);
    }

    // Find other active User accounts with the same email in org schools (duplicate accounts)
    const duplicateAccounts = await (prisma as any).user.findMany({
        where: {
            email: teacher.email,
            id: { not: id },
            schoolId: { in: allowedSchoolIds },
            isActive: true,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            schoolId: true,
            school: { select: { name: true, branchCode: true } },
        },
    });

    return NextResponse.json({
        canSwitchBranches: teacher.canSwitchBranches ?? true,
        assignedBranchIds,
        availableBranches,
        duplicateAccounts,
    });
}

/** PATCH /api/teachers/[id]/branches — update branch assignments + canSwitchBranches */
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

    if (toggleOnly) {
        await (prisma as any).user.update({ where: { id }, data: { canSwitchBranches: Boolean(canSwitchBranches) } });
        return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(assignedBranchIds)) {
        return NextResponse.json({ error: "assignedBranchIds must be an array" }, { status: 400 });
    }

    const allowedSchoolIds = await getOrgSchoolIds(schoolId);
    const validBranchIds = assignedBranchIds.filter((sid) => allowedSchoolIds.includes(sid));

    await Promise.all(
        validBranchIds.map((sid) =>
            (prisma as any).userBranch.upsert({
                where: { userId_schoolId: { userId: id, schoolId: sid } },
                create: { userId: id, schoolId: sid, isActive: true, assignedById: actor.id },
                update: { isActive: true },
            })
        )
    );

    await (prisma as any).userBranch.updateMany({
        where: { userId: id, schoolId: { in: allowedSchoolIds, notIn: validBranchIds } },
        data: { isActive: false },
    });

    await (prisma as any).user.update({
        where: { id },
        data: { canSwitchBranches: Boolean(canSwitchBranches) },
    });

    return NextResponse.json({ ok: true });
}

/** POST /api/teachers/[id]/branches  (body: { action: "adopt-credential", duplicateUserIds: string[] })
 *  Adopts the selected duplicate accounts:
 *  - Adds their schools as UserBranch records on the primary account
 *  - Deactivates the duplicate User accounts so their credentials no longer work
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorizeAdmin(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { user: actor, schoolId } = auth;
    const body = await req.json();
    const { action, duplicateUserIds } = body as { action: string; duplicateUserIds: string[] };

    if (action !== "adopt-credential" || !Array.isArray(duplicateUserIds) || duplicateUserIds.length === 0) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const teacher = await (prisma as any).user.findUnique({ where: { id }, select: { id: true, email: true, schoolId: true } });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const allowedSchoolIds = await getOrgSchoolIds(schoolId);

    // Fetch the duplicate accounts to verify they belong to org schools and have the same email
    const duplicates = await (prisma as any).user.findMany({
        where: {
            id: { in: duplicateUserIds },
            email: teacher.email,
            schoolId: { in: allowedSchoolIds },
            isActive: true,
        },
        select: { id: true, schoolId: true },
    });

    if (duplicates.length === 0) {
        return NextResponse.json({ error: "No valid duplicate accounts found" }, { status: 400 });
    }

    // For each duplicate: create a UserBranch on the primary account + deactivate the duplicate
    await Promise.all(
        duplicates.map(async (dup: any) => {
            if (!dup.schoolId) return;
            // Grant access to that branch on the primary account
            await (prisma as any).userBranch.upsert({
                where: { userId_schoolId: { userId: id, schoolId: dup.schoolId } },
                create: { userId: id, schoolId: dup.schoolId, isActive: true, assignedById: actor.id },
                update: { isActive: true },
            });
            // Deactivate the duplicate account
            await (prisma as any).user.update({
                where: { id: dup.id },
                data: { isActive: false },
            });
        })
    );

    // Enable branch switching since they now have multiple branches
    await (prisma as any).user.update({
        where: { id },
        data: { canSwitchBranches: true },
    });

    return NextResponse.json({ ok: true, adoptedCount: duplicates.length });
}
