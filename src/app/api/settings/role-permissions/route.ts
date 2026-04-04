import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/rbac";
import { MANAGED_ROLE_PERMISSION_ROLES } from "@/lib/permissions";
import {
    getRolePermissionAssignments,
    saveRolePermissionAssignments,
} from "@/lib/rolePermissions";

const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export async function GET() {
    try {
        const session = await requireSchoolAdmin();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId as string | null;
        if (!schoolId) {
            return NextResponse.json({ error: "School not found for current user." }, { status: 400 });
        }

        const permissions = await getRolePermissionAssignments(schoolId);
        return NextResponse.json(
            { permissions },
            { headers: NO_CACHE_HEADERS }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load role permissions";
        console.error("[role-permissions] GET failed:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId as string | null;
        if (!schoolId) {
            return NextResponse.json({ error: "School not found for current user." }, { status: 400 });
        }

        const body = await req.json();
        const rawPermissions = typeof body?.permissions === "object" && body?.permissions
            ? body.permissions as Partial<Record<(typeof MANAGED_ROLE_PERMISSION_ROLES)[number], unknown>>
            : null;

        if (!rawPermissions) {
            return NextResponse.json({ error: "permissions payload is required" }, { status: 400 });
        }

        const permissions = await saveRolePermissionAssignments(schoolId, rawPermissions);
        return NextResponse.json(
            {
                permissions,
                message: "Role access updated successfully.",
            },
            { headers: NO_CACHE_HEADERS }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update role permissions";
        console.error("[role-permissions] PUT failed:", error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
