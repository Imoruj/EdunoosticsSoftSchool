import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

async function authorizeAdmin(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const user = session.user as any;
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
    if (!isAdmin) return null;
    const schoolId = (await getActiveSchoolId(user.schoolId)) as string | null;
    if (!schoolId) return null;
    return { user, schoolId };
}

async function getOrgSchoolIds(schoolId: string): Promise<string[]> {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { organizationId: true },
    });
    if (!school?.organizationId) return [schoolId];
    const orgSchools = await prisma.school.findMany({
        where: { organizationId: school.organizationId, isActive: true },
        select: { id: true },
    });
    return orgSchools.map((s) => s.id);
}

/** GET /api/students/[id]/transfer
 *  Returns available target branches (with class arms) for the transfer modal.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorizeAdmin(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { schoolId } = auth;

    const student = await prisma.student.findUnique({
        where: { id },
        select: { id: true, schoolId: true, classArmId: true, firstName: true, lastName: true },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const allowedSchoolIds = await getOrgSchoolIds(schoolId);

    const branches = await prisma.school.findMany({
        where: { id: { in: allowedSchoolIds }, isActive: true },
        select: {
            id: true,
            name: true,
            branchCode: true,
            isHeadBranch: true,
            classes: {
                select: {
                    id: true,
                    name: true,
                    arms: {
                        select: { id: true, armName: true },
                        orderBy: { armName: "asc" },
                    },
                },
                orderBy: { name: "asc" },
            },
        },
        orderBy: [{ isHeadBranch: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({
        currentBranchId: student.schoolId,
        currentClassArmId: student.classArmId,
        branches,
    });
}

/** POST /api/students/[id]/transfer
 *  Transfers the student to another branch + class arm.
 *  All existing records (scores, reports, attendance) remain linked via studentId.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await authorizeAdmin(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { user, schoolId } = auth;
    const body = await req.json();
    const { toBranchId, toClassArmId, reason } = body as {
        toBranchId: string;
        toClassArmId?: string | null;
        reason?: string;
    };

    if (!toBranchId) {
        return NextResponse.json({ error: "toBranchId is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
        where: { id },
        select: { id: true, schoolId: true, classArmId: true },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const allowedSchoolIds = await getOrgSchoolIds(schoolId);
    if (!allowedSchoolIds.includes(toBranchId)) {
        return NextResponse.json({ error: "Target branch not in your organisation" }, { status: 403 });
    }

    if (toClassArmId) {
        const arm = await prisma.classArm.findFirst({
            where: { id: toClassArmId, class: { schoolId: toBranchId } },
            select: { id: true },
        });
        if (!arm) return NextResponse.json({ error: "Class arm not found in target branch" }, { status: 400 });
    }

    await prisma.$transaction([
        (prisma as any).studentTransfer.create({
            data: {
                studentId: id,
                fromBranchId: student.schoolId,
                toBranchId,
                fromClassArmId: student.classArmId ?? null,
                toClassArmId: toClassArmId ?? null,
                reason: reason ?? null,
                transferredById: user.id,
            },
        }),
        prisma.student.update({
            where: { id },
            data: {
                schoolId: toBranchId,
                classArmId: toClassArmId ?? null,
            },
        }),
    ]);

    return NextResponse.json({ ok: true });
}
