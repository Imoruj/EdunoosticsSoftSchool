import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { clampLimit } from "@/lib/apiError";

async function assertSuperAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const user = session.user as any;
    if (!user.roles?.includes("SUPER_ADMIN")) return null;
    return user;
}

const STAFF_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PROPRIETOR", "CLASS_TEACHER", "SUBJECT_TEACHER"];

export async function GET(req: NextRequest) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const schoolId = searchParams.get("schoolId") ?? "";
    const role = searchParams.get("role") ?? "";
    const limit = clampLimit(Number(searchParams.get("limit") ?? 50), 100);
    const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

    const users = await prisma.user.findMany({
        where: {
            roles: { hasSome: STAFF_ROLES as any },
            ...(schoolId && { schoolId }),
            ...(role && { roles: { has: role as any } }),
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            }),
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
            isActive: true,
            canSwitchBranches: true,
            schoolId: true,
            school: { select: { id: true, name: true } },
            branches: { select: { id: true, schoolId: true, isActive: true } },
        },
        orderBy: [{ school: { name: "asc" } }, { firstName: "asc" }],
        take: limit,
        skip: offset,
    });

    const total = await prisma.user.count({
        where: {
            roles: { hasSome: STAFF_ROLES as any },
            ...(schoolId && { schoolId }),
            ...(role && { roles: { has: role as any } }),
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            }),
        },
    });

    const mapped = users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        roles: u.roles,
        isActive: u.isActive,
        canSwitchBranches: (u as any).canSwitchBranches ?? true,
        schoolId: u.schoolId,
        schoolName: u.school?.name ?? null,
        branchCount: (u as any).branches?.filter((b: any) => b.isActive).length ?? 0,
    }));

    return NextResponse.json({ users: mapped, total });
}
