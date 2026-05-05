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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, slug } = await req.json();

    const org = await (prisma as any).organization.update({
        where: { id: params.id },
        data: {
            ...(name && { name: name.trim() }),
            ...(slug && { slug }),
        },
    });

    return NextResponse.json(org);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Unlink all schools from this org first
    await prisma.school.updateMany({
        where: { organizationId: params.id },
        data: { organizationId: null, isHeadBranch: false },
    });

    await (prisma as any).organization.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
}

// POST /api/admin/organizations/[id] with action body for school assignment
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    if (!(await assertSuperAdmin())) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { schoolId, branchCode, isHeadBranch, remove } = await req.json();

    if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    if (remove) {
        // Remove school from org
        await prisma.school.update({
            where: { id: schoolId },
            data: { organizationId: null, isHeadBranch: false },
        });
        return NextResponse.json({ ok: true });
    }

    // Assign school to this org
    if (isHeadBranch) {
        // Clear head branch on all other schools in org first
        await prisma.school.updateMany({
            where: { organizationId: params.id },
            data: { isHeadBranch: false },
        });
    }

    const updated = await prisma.school.update({
        where: { id: schoolId },
        data: {
            organizationId: params.id,
            ...(branchCode !== undefined && { branchCode: branchCode || null }),
            isHeadBranch: isHeadBranch === true,
        },
        select: { id: true, name: true, branchCode: true, isHeadBranch: true, organizationId: true },
    });

    return NextResponse.json(updated);
}
