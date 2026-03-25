import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET: List upload requests (admin only)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles = user.roles || [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "PENDING";

        const requests = await prisma.scoreUploadRequest.findMany({
            where: {
                schoolId: user.schoolId,
                ...(status !== "ALL" && { status: status as any }),
            },
            include: {
                uploader: { select: { firstName: true, lastName: true, email: true } },
                subject: { select: { name: true, code: true } },
                term: {
                    select: {
                        name: true,
                        session: { select: { name: true } },
                    },
                },
                classArm: {
                    select: {
                        armName: true,
                        class: { select: { name: true } },
                    },
                },
                reviewedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ requests });
    } catch (error: any) {
        console.error("Error fetching upload requests:", error);
        return NextResponse.json({ error: "Failed to fetch upload requests" }, { status: 500 });
    }
}

