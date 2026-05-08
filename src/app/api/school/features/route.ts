import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    ALL_ENABLED_FEATURES,
    extractFeatureFlags,
    getSchoolFeatures,
} from "@/lib/getSchoolFeatures";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";
import { prisma } from "@/lib/prisma";

const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

type SessionUser = {
    schoolId?: string;
};

async function getPlatformDarkModeEnabled() {
    const platformSettings = await prisma.platformSettings.findUnique({
        where: { id: "platform" },
        select: { darkModeEnabled: true },
    });

    return platformSettings?.darkModeEnabled ?? true;
}

// GET /api/school/features
// Returns feature flags for the currently logged-in school admin
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as SessionUser | undefined;

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const platformDarkModeEnabled = await getPlatformDarkModeEnabled();
        const withPlatformFeatures = (features: typeof ALL_ENABLED_FEATURES) => ({
            ...features,
            darkModeEnabled: platformDarkModeEnabled && features.darkModeEnabled,
        });

        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        if (!schoolId) {
            // Super admin or users with no school => all features enabled
            return NextResponse.json(
                { features: withPlatformFeatures(ALL_ENABLED_FEATURES) },
                { headers: NO_CACHE_HEADERS }
            );
        }

        const features = await getSchoolFeatures(schoolId);
        return NextResponse.json(
            { features: withPlatformFeatures(extractFeatureFlags(features)) },
            { headers: NO_CACHE_HEADERS }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[features] Error fetching school features, returning defaults:", message);
        let platformDarkModeEnabled = true;
        try {
            platformDarkModeEnabled = await getPlatformDarkModeEnabled();
        } catch {
            platformDarkModeEnabled = false;
        }

        // Never return 500 - return safe defaults so dashboard doesn't break.
        return NextResponse.json(
            {
                features: {
                    ...ALL_ENABLED_FEATURES,
                    darkModeEnabled: platformDarkModeEnabled,
                },
            },
            { headers: NO_CACHE_HEADERS }
        );
    }
}
