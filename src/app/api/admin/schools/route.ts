import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const roles: string[] = (session?.user as any)?.roles || [];
    if (!roles.includes("SUPER_ADMIN")) return null;
    return session;
}

// GET — list all schools with student + user counts
export async function GET(req: NextRequest) {
    const session = await requireSuperAdmin(req);
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const schools = await prisma.school.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            state: true,
            isActive: true,
            registrationStatus: true,
            registrationRejectionReason: true,
            createdAt: true,
            _count: {
                select: {
                    students: true,
                    users: true,
                },
            },
        },
    });

    return NextResponse.json(schools);
}

// PATCH — toggle isActive, or approve/reject a school registration
export async function PATCH(req: NextRequest) {
    const session = await requireSuperAdmin(req);
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { schoolId, action, isActive, rejectionReason } = body;

    if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

    if (action === "approve") {
        const school = await prisma.school.update({
            where: { id: schoolId },
            data: {
                registrationStatus: "APPROVED",
                isActive: true,
                registrationRejectionReason: null,
            },
            select: { id: true, name: true, isActive: true, registrationStatus: true, registrationRejectionReason: true },
        });
        return NextResponse.json(school);
    }

    if (action === "reject") {
        const school = await prisma.school.update({
            where: { id: schoolId },
            data: {
                registrationStatus: "REJECTED",
                isActive: false,
                registrationRejectionReason: rejectionReason || null,
            },
            select: { id: true, name: true, isActive: true, registrationStatus: true, registrationRejectionReason: true },
        });
        return NextResponse.json(school);
    }

    // Default: toggle isActive
    if (typeof isActive !== "boolean") {
        return NextResponse.json({ error: "isActive or action required" }, { status: 400 });
    }

    const school = await prisma.school.update({
        where: { id: schoolId },
        data: { isActive },
        select: { id: true, name: true, isActive: true, registrationStatus: true, registrationRejectionReason: true },
    });

    return NextResponse.json(school);
}

