import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    SCHOOL_FEATURE_FIELDS,
    SCHOOL_FEATURE_SELECT,
    extractFeatureFlags,
    getSchoolFeatures,
} from "@/lib/getSchoolFeatures";
import prisma from "@/lib/prisma";

type SessionUser = {
    roles?: string[];
};

// GET /api/admin/schools/[id]/features
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;
        if (!user || !user.roles?.includes("SUPER_ADMIN")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const features = await getSchoolFeatures(params.id);
        const response = NextResponse.json({ features: extractFeatureFlags(features) });

        // Ensure browser never caches this admin route
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");

        return response;
    } catch (error: unknown) {
        console.error("Error fetching school features:", error);
        return NextResponse.json(
            { error: "Failed to fetch school features" },
            { status: 500 }
        );
    }
}

// PUT /api/admin/schools/[id]/features
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;
        if (!user || !user.roles?.includes("SUPER_ADMIN")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json() as Record<string, unknown>;

        const updateData: Record<string, boolean> = {};
        for (const field of SCHOOL_FEATURE_FIELDS) {
            if (typeof body[field] === "boolean") {
                updateData[field] = body[field];
            }
        }

        const client = prisma as any;
        const updated = await client.schoolFeatureControl.upsert({
            where: { schoolId: params.id },
            update: updateData,
            create: { schoolId: params.id, ...updateData },
            select: SCHOOL_FEATURE_SELECT,
        });

        const response = NextResponse.json({ features: extractFeatureFlags(updated) });

        // Ensure browser never caches this admin route
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");

        return response;
    } catch (error: unknown) {
        console.error("Error updating school features:", error);
        return NextResponse.json(
            { error: "Failed to update school features" },
            { status: 500 }
        );
    }
}
