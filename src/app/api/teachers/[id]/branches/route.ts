import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";
import { emailMatchesNameLoginPrefix } from "@/lib/branchLoginIdentity";

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

type EligibleBranchLogin = {
    userId: string;
    schoolId: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    school: { name: string; branchCode: string | null; isHeadBranch: boolean };
};

async function getEligibleBranchLogins(
    teacher: { firstName: string; lastName: string },
    allowedSchoolIds: string[]
): Promise<EligibleBranchLogin[]> {
    const candidateUsers = await (prisma as any).user.findMany({
        where: {
            schoolId: { in: allowedSchoolIds },
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            schoolId: true,
            isActive: true,
            school: { select: { name: true, branchCode: true, isHeadBranch: true } },
        },
    });

    return candidateUsers
        .filter((user: any) =>
            user.schoolId &&
            emailMatchesNameLoginPrefix(user.email, teacher.firstName, teacher.lastName)
        )
        .map((user: any) => ({
            userId: user.id,
            schoolId: user.schoolId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            school: user.school,
        }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorizeAdmin(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { schoolId } = auth;

    const teacher = await (prisma as any).user.findUnique({
        where: { id },
        select: { id: true, email: true, firstName: true, lastName: true, canSwitchBranches: true, schoolId: true, roles: true },
    });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const allowedSchoolIds = await getOrgSchoolIds(schoolId);
    const eligibleBranchLogins = await getEligibleBranchLogins(teacher, allowedSchoolIds);
    const eligibleBySchoolId = new Map<string, EligibleBranchLogin>();
    for (const login of eligibleBranchLogins) {
        const existing = eligibleBySchoolId.get(login.schoolId);
        if (!existing || login.userId === id || (!existing.isActive && login.isActive)) {
            eligibleBySchoolId.set(login.schoolId, login);
        }
    }

    const availableBranches = Array.from(eligibleBySchoolId.values())
        .map((login) => ({
            id: login.schoolId,
            name: login.school.name,
            branchCode: login.school.branchCode,
            isHeadBranch: login.school.isHeadBranch,
            loginEmail: login.email,
            loginUserId: login.userId,
        }))
        .sort((left, right) =>
            Number(right.isHeadBranch) - Number(left.isHeadBranch) ||
            left.name.localeCompare(right.name)
        );
    const eligibleSchoolIds = new Set(availableBranches.map((branch) => branch.id));

    const userBranches = await (prisma as any).userBranch.findMany({
        where: { userId: id, isActive: true },
        select: { schoolId: true },
    });
    const assignedBranchIds: string[] = userBranches
        .map((ub: any) => ub.schoolId)
        .filter((branchId: string) => eligibleSchoolIds.has(branchId));
    if (teacher.schoolId && eligibleSchoolIds.has(teacher.schoolId) && !assignedBranchIds.includes(teacher.schoolId)) {
        assignedBranchIds.unshift(teacher.schoolId);
    }

    const duplicateAccounts = eligibleBranchLogins
        .filter((login) => login.userId !== id && login.isActive)
        .map((login) => ({
            id: login.userId,
            firstName: login.firstName,
            lastName: login.lastName,
            email: login.email,
            schoolId: login.schoolId,
            school: { name: login.school.name, branchCode: login.school.branchCode },
        }));

    return NextResponse.json({
        canSwitchBranches: teacher.canSwitchBranches ?? true,
        assignedBranchIds,
        availableBranches,
        duplicateAccounts,
    });
}

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

    const teacher = await (prisma as any).user.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true, schoolId: true },
    });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    if (toggleOnly) {
        await (prisma as any).user.update({ where: { id }, data: { canSwitchBranches: Boolean(canSwitchBranches) } });
        return NextResponse.json({ ok: true });
    }

    if (!Array.isArray(assignedBranchIds)) {
        return NextResponse.json({ error: "assignedBranchIds must be an array" }, { status: 400 });
    }

    const allowedSchoolIds = await getOrgSchoolIds(schoolId);
    const eligibleBranchLogins = await getEligibleBranchLogins(teacher, allowedSchoolIds);
    const eligibleSchoolIds = new Set(eligibleBranchLogins.map((login) => login.schoolId));
    const validBranchIds = assignedBranchIds.filter((sid) =>
        allowedSchoolIds.includes(sid) && eligibleSchoolIds.has(sid)
    );

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

    const teacher = await (prisma as any).user.findUnique({
        where: { id },
        select: { id: true, email: true, firstName: true, lastName: true, schoolId: true },
    });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const allowedSchoolIds = await getOrgSchoolIds(schoolId);
    const candidateDuplicates = await (prisma as any).user.findMany({
        where: {
            id: { in: duplicateUserIds },
            schoolId: { in: allowedSchoolIds },
            isActive: true,
        },
        select: { id: true, email: true, schoolId: true },
    });
    const duplicates = candidateDuplicates.filter((dup: any) =>
        emailMatchesNameLoginPrefix(dup.email, teacher.firstName, teacher.lastName)
    );

    if (duplicates.length === 0) {
        return NextResponse.json({ error: "No valid duplicate accounts found" }, { status: 400 });
    }

    await Promise.all(
        duplicates.map(async (dup: any) => {
            if (!dup.schoolId) return;
            await (prisma as any).userBranch.upsert({
                where: { userId_schoolId: { userId: id, schoolId: dup.schoolId } },
                create: { userId: id, schoolId: dup.schoolId, isActive: true, assignedById: actor.id },
                update: { isActive: true },
            });
            await (prisma as any).user.update({
                where: { id: dup.id },
                data: { isActive: false },
            });
        })
    );

    await (prisma as any).user.update({
        where: { id },
        data: { canSwitchBranches: true },
    });

    return NextResponse.json({ ok: true, adoptedCount: duplicates.length });
}
