import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    createEmptyPermissionState,
    type PermissionKey,
} from "@/lib/permissions";
import { getEffectivePermissionsForUser } from "@/lib/rolePermissions";
import { getActiveBranchProfile } from "@/lib/activeBranchProfile";

const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const activeProfile = await getActiveBranchProfile(session.user as any);
        const permissions = await getEffectivePermissionsForUser({
            roles: activeProfile.roles,
            schoolId: activeProfile.schoolId as string,
        });

        return NextResponse.json(
            { permissions },
            { headers: NO_CACHE_HEADERS }
        );
    } catch (error: unknown) {
        console.error("[permissions] Failed to load current user permissions:", error);
        return NextResponse.json(
            { permissions: createEmptyPermissionState() as Record<PermissionKey, boolean> },
            { headers: NO_CACHE_HEADERS }
        );
    }
}
