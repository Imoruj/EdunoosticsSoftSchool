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

export async function GET() {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgs = await (prisma as any).organization.findMany({
        include: {
            branches: {
                select: {
                    id: true,
                    name: true,
                    branchCode: true,
                    isHeadBranch: true,
                    isActive: true,
                    logoUrl: true,
                    _count: { select: { students: true, users: true } },
                },
                orderBy: [{ isHeadBranch: "desc" }, { name: "asc" }],
            },
        },
        orderBy: { name: "asc" },
    });

    // Schools not assigned to any org
    const unassigned = await prisma.school.findMany({
        where: { organizationId: null },
        select: {
            id: true,
            name: true,
            branchCode: true,
            isHeadBranch: true,
            isActive: true,
            logoUrl: true,
            _count: { select: { students: true, users: true } },
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ orgs, unassigned });
}

export async function POST(req: NextRequest) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, slug } = await req.json();
    if (!name || typeof name !== "string") {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const resolvedSlug = (slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const org = await (prisma as any).organization.create({
        data: { name: name.trim(), slug: resolvedSlug },
    });

    return NextResponse.json(org, { status: 201 });
}
