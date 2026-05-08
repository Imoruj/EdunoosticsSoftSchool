import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin(_req: NextRequest) {
    const session = await getServerSession(authOptions);
    const roles: string[] = (session?.user as any)?.roles || [];
    if (!roles.includes("SUPER_ADMIN")) return null;
    return session;
}

function serializePlatformSettings(settings: { signupEnabled: boolean; darkModeEnabled: boolean }) {
    return {
        signupEnabled: settings.signupEnabled,
        darkModeEnabled: settings.darkModeEnabled,
    };
}

// GET - return current platform settings
export async function GET(req: NextRequest) {
    const session = await requireSuperAdmin(req);
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const settings = await prisma.platformSettings.upsert({
        where: { id: "platform" },
        update: {},
        create: { id: "platform", signupEnabled: true, darkModeEnabled: true },
    });

    return NextResponse.json(serializePlatformSettings(settings));
}

// PATCH - update platform settings
export async function PATCH(req: NextRequest) {
    const session = await requireSuperAdmin(req);
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const updates: { signupEnabled?: boolean; darkModeEnabled?: boolean } = {};

    if ("signupEnabled" in body) {
        if (typeof body.signupEnabled !== "boolean") {
            return NextResponse.json({ error: "signupEnabled must be a boolean" }, { status: 400 });
        }
        updates.signupEnabled = body.signupEnabled;
    }

    if ("darkModeEnabled" in body) {
        if (typeof body.darkModeEnabled !== "boolean") {
            return NextResponse.json({ error: "darkModeEnabled must be a boolean" }, { status: 400 });
        }
        updates.darkModeEnabled = body.darkModeEnabled;
    }

    if (!("signupEnabled" in updates) && !("darkModeEnabled" in updates)) {
        return NextResponse.json({ error: "No platform setting provided" }, { status: 400 });
    }

    const settings = await prisma.platformSettings.upsert({
        where: { id: "platform" },
        update: updates,
        create: {
            id: "platform",
            signupEnabled: updates.signupEnabled ?? true,
            darkModeEnabled: updates.darkModeEnabled ?? true,
        },
    });

    return NextResponse.json(serializePlatformSettings(settings));
}
