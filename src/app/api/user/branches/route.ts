import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;

    try {
        const userBranches = await (prisma as any).userBranch.findMany({
            where: { userId: user.id, isActive: true },
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

        const branches = userBranches.map((ub: any) => ({
            id: ub.school.id,
            name: ub.school.name,
            logoUrl: ub.school.logoUrl,
            branchCode: ub.school.branchCode,
            slug: ub.school.slug,
            roles: ub.roles,
            isActive: ub.isActive,
        }));

        return NextResponse.json({ branches });
    } catch {
        // UserBranch table may not exist yet (pre-migration fallback)
        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        if (!schoolId) return NextResponse.json({ branches: [] });

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, logoUrl: true, branchCode: true, slug: true },
        });

        return NextResponse.json({
            branches: school ? [{ ...school, roles: user.roles, isActive: true }] : [],
        });
    }
}
