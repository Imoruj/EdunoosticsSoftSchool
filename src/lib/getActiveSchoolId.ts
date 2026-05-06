import { cookies } from "next/headers";

/**
 * Returns the schoolId to use for the current request.
 * Checks the active_branch_id cookie set by /api/session/switch-branch first,
 * so branch switches propagate to all data queries immediately without requiring
 * a session JWT update.
 */
export async function getActiveSchoolId(
    fallback: string | null | undefined
): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const cookieBranchId = cookieStore.get("active_branch_id")?.value;
        return cookieBranchId || fallback || null;
    } catch {
        return fallback || null;
    }
}

/** Same as getActiveSchoolId but returns undefined instead of null, for Prisma where clauses. */
export async function getActiveSchoolIdOrUndefined(
    fallback: string | null | undefined
): Promise<string | undefined> {
    const id = await getActiveSchoolId(fallback);
    return id ?? undefined;
}
