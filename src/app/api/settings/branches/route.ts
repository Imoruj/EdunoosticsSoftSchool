import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

/** GET /api/settings/branches
 *  Returns all active branches in the same organization as the current school.
 *  Used to populate the "Apply to branches" selector in settings pages.
 */
export async function GET() {
    try {
        const session = await requireSchoolAdmin();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as string | null;
        if (!schoolId) {
            return NextResponse.json({ error: "No school context" }, { status: 400 });
        }

        const activeSchool = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, organizationId: true, branchCode: true, isHeadBranch: true },
        });
        if (!activeSchool) return NextResponse.json({ branches: [], currentBranchId: schoolId });

        if (!activeSchool.organizationId) {
            return NextResponse.json({
                branches: [{ id: activeSchool.id, name: activeSchool.name, branchCode: activeSchool.branchCode, isHeadBranch: activeSchool.isHeadBranch, isCurrent: true }],
                currentBranchId: schoolId,
            });
        }

        const orgBranches = await prisma.school.findMany({
            where: { organizationId: activeSchool.organizationId, isActive: true },
            select: { id: true, name: true, branchCode: true, isHeadBranch: true },
            orderBy: [{ isHeadBranch: "desc" }, { name: "asc" }],
        });

        return NextResponse.json({
            branches: orgBranches.map((b) => ({
                ...b,
                isCurrent: b.id === schoolId,
            })),
            currentBranchId: schoolId,
        });
    } catch (error: any) {
        console.error("Error fetching org branches:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch branches" }, { status: 500 });
    }
}
