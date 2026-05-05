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

    const { canSwitchBranches } = await req.json();

    if (typeof canSwitchBranches !== "boolean") {
        return NextResponse.json({ error: "canSwitchBranches must be a boolean" }, { status: 400 });
    }

    const updated = await (prisma as any).user.update({
        where: { id: params.id },
        data: { canSwitchBranches },
        select: { id: true, canSwitchBranches: true },
    });

    return NextResponse.json(updated);
}
