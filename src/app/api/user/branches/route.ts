import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";
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

async function getEligibleSchoolIdsForLogin(user: { firstName: string; lastName: string; schoolId: string | null }) {
    if (!user.schoolId) return new Set<string>();

    const allowedSchoolIds = await getOrgSchoolIds(user.schoolId);
    const candidateUsers = await (prisma as any).user.findMany({
        where: { schoolId: { in: allowedSchoolIds } },
        select: { email: true, schoolId: true },
    });

    return new Set<string>(
        candidateUsers
            .filter((candidate: any) =>
                candidate.schoolId &&
                emailMatchesNameLoginPrefix(candidate.email, user.firstName, user.lastName)
            )
            .map((candidate: any) => candidate.schoolId)
    );
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;

    try {
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            select: { firstName: true, lastName: true, schoolId: true },
        });
        if (!userRecord) return NextResponse.json({ branches: [] });

        const eligibleSchoolIds = await getEligibleSchoolIdsForLogin(userRecord);
        const userBranches = await (prisma as any).userBranch.findMany({
            where: { userId: user.id, isActive: true, schoolId: { in: Array.from(eligibleSchoolIds) } },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        branchCode: true,
                        slug: true,
                    },
                },
            },
            orderBy: { school: { name: "asc" } },
        });

        const branchesById = new Map<string, any>();
        for (const ub of userBranches) {
            branchesById.set(ub.school.id, {
                id: ub.school.id,
                name: ub.school.name,
                logoUrl: ub.school.logoUrl,
                branchCode: ub.school.branchCode,
                slug: ub.school.slug,
                roles: ub.roles,
                isActive: ub.isActive,
            });
        }

        if (userRecord.schoolId && eligibleSchoolIds.has(userRecord.schoolId) && !branchesById.has(userRecord.schoolId)) {
            const primarySchool = await prisma.school.findUnique({
                where: { id: userRecord.schoolId },
                select: { id: true, name: true, logoUrl: true, branchCode: true, slug: true },
            });
            if (primarySchool) {
                branchesById.set(primarySchool.id, {
                    ...primarySchool,
                    roles: user.roles,
                    isActive: true,
                });
            }
        }

        const branches = Array.from(branchesById.values()).sort((left, right) =>
            left.name.localeCompare(right.name)
        );

        return NextResponse.json({ branches });
    } catch {
        // UserBranch table may not exist yet (pre-migration fallback)
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        if (!schoolId) return NextResponse.json({ branches: [] });

        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            select: { firstName: true, lastName: true, schoolId: true },
        });
        if (!userRecord || !emailMatchesNameLoginPrefix(user.email, userRecord.firstName, userRecord.lastName)) {
            return NextResponse.json({ branches: [] });
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, logoUrl: true, branchCode: true, slug: true },
        });

        return NextResponse.json({
            branches: school ? [{ ...school, roles: user.roles, isActive: true }] : [],
        });
    }
}
