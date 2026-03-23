import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);
        const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

        if (!isAdmin && !isClassTeacher) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = typeof user.schoolId === "string" ? user.schoolId : "";
        if (!schoolId) {
            return NextResponse.json({ error: "Your account is not associated with a school." }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const limitParam = Number(searchParams.get("limit") || "20");
        const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;
        const normalizedStatus = status && ["PENDING", "APPROVED", "REJECTED"].includes(status)
            ? status as "PENDING" | "APPROVED" | "REJECTED"
            : undefined;

        const requests = await prisma.studentChangeRequest.findMany({
            where: {
                schoolId,
                ...(normalizedStatus ? { status: normalizedStatus } : {}),
                ...(!isAdmin ? { requesterId: user.id } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: {
                id: true,
                action: true,
                status: true,
                studentId: true,
                studentName: true,
                admissionNumber: true,
                classLabel: true,
                currentData: true,
                requestedData: true,
                summary: true,
                reviewNote: true,
                reviewedAt: true,
                createdAt: true,
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Error loading student change requests:", error);
        return NextResponse.json({ error: "Failed to load student change requests" }, { status: 500 });
    }
}
