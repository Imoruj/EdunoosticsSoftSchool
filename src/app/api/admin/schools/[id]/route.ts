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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const school = await prisma.school.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            branchCode: true,
            isHeadBranch: true,
            organizationId: true,
            email: true,
            phone: true,
            city: true,
            state: true,
            isActive: true,
            registrationStatus: true,
            slug: true,
            logoUrl: true,
        },
    });

    if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(school);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, branchCode, isHeadBranch, organizationId } = body;

    const current = await prisma.school.findUnique({
        where: { id },
        select: { id: true, organizationId: true },
    });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If setting this school as head branch, clear isHeadBranch on all sibling schools in same org
    if (isHeadBranch === true) {
        const orgId = organizationId ?? current.organizationId;
        if (orgId) {
            await prisma.school.updateMany({
                where: { organizationId: orgId, id: { not: id } },
                data: { isHeadBranch: false },
            });
        }
    }

    const updated = await prisma.school.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(branchCode !== undefined && { branchCode: branchCode || null }),
            ...(isHeadBranch !== undefined && { isHeadBranch }),
            ...(organizationId !== undefined && { organizationId: organizationId || null }),
        },
        select: {
            id: true,
            name: true,
            branchCode: true,
            isHeadBranch: true,
            organizationId: true,
        },
    });

    return NextResponse.json(updated);
}
