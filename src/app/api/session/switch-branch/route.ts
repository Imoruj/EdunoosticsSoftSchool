import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { emailMatchesNameLoginPrefix } from "@/lib/branchLoginIdentity";

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
    return orgSchools.map((school) => school.id);
}

async function canLoginIdentityUseBranch(userId: string, branchId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, schoolId: true },
    });
    if (!user?.schoolId) return false;

    const allowedSchoolIds = await getOrgSchoolIds(user.schoolId);
    if (!allowedSchoolIds.includes(branchId)) return false;

    const candidateUsers = await (prisma as any).user.findMany({
        where: { schoolId: { in: allowedSchoolIds } },
        select: { email: true, schoolId: true },
    });

    return candidateUsers.some((candidate: any) =>
        candidate.schoolId === branchId &&
        emailMatchesNameLoginPrefix(candidate.email, user.firstName, user.lastName)
    );
}

async function getBranchLoginProfile(userId: string, branchId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            firstName: true,
            lastName: true,
            schoolId: true,
            roles: true,
            classArms: { include: { class: true } },
        },
    });
    if (!user) return null;

    const branchUsers = await (prisma as any).user.findMany({
        where: { schoolId: branchId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roles: true,
            classArms: { include: { class: true } },
        },
    });
    const branchUser = branchUsers.find((candidate: any) =>
        emailMatchesNameLoginPrefix(candidate.email, user.firstName, user.lastName)
    );

    if (branchUser) {
        return branchUser;
    }

    return branchId === user.schoolId
        ? { id: userId, roles: user.roles, classArms: user.classArms }
        : null;
}

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

    const isEligibleBranch = await canLoginIdentityUseBranch(user.id, branchId);
    if (!isEligibleBranch) {
        return NextResponse.json(
            { error: "Your login email does not exist for this branch" },
            { status: 403 }
        );
    }

    const branchProfile = await getBranchLoginProfile(user.id, branchId);
    if (!branchProfile) {
        return NextResponse.json(
            { error: "Your branch login profile could not be resolved" },
            { status: 403 }
        );
    }

    const assignedClass = branchProfile.classArms?.[0]
        ? `${branchProfile.classArms[0].class.name} ${branchProfile.classArms[0].armName}`
        : null;

    // Set a lightweight cookie so the client can read the active branch without
    // needing to call NextAuth's update() (which requires NEXTAUTH_URL to match
    // the current domain and can cause a logout if it fails).
    const response = NextResponse.json({
        ok: true,
        branchId: userBranch.school.id,
        branchName: userBranch.school.name,
        activeBranchUserId: branchProfile.id,
        roles: branchProfile.roles ?? [],
        assignedClass,
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
