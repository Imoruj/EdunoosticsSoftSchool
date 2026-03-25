export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
export async function GET() {
    const settings = await prisma.platformSettings.findUnique({
        where: { id: "platform" },
    });

    return NextResponse.json({
        signupEnabled: settings?.signupEnabled ?? true,
    });
}

