import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireSuperAdmin(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const roles: string[] = (session?.user as any)?.roles || [];
    if (!roles.includes("SUPER_ADMIN")) return null;
    return session;
}

// GET — return current platform settings
export async function GET(req: NextRequest) {
    const session = await requireSuperAdmin(req);
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const settings = await prisma.platformSettings.upsert({
        where: { id: "platform" },
        update: {},
        create: { id: "platform", signupEnabled: true },
    });

    return NextResponse.json({ signupEnabled: settings.signupEnabled });
}

// PATCH — update platform settings
export async function PATCH(req: NextRequest) {
    const session = await requireSuperAdmin(req);
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { signupEnabled } = await req.json();
    if (typeof signupEnabled !== "boolean") {
        return NextResponse.json({ error: "signupEnabled must be a boolean" }, { status: 400 });
    }

    const settings = await prisma.platformSettings.upsert({
        where: { id: "platform" },
        update: { signupEnabled },
        create: { id: "platform", signupEnabled },
    });

    return NextResponse.json({ signupEnabled: settings.signupEnabled });
}
