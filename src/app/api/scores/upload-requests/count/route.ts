import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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
            return NextResponse.json({ pendingCount: 0 });
        }

        const pendingCount = await prisma.scoreUploadRequest.count({
            where: {
                schoolId: user.schoolId,
                status: "PENDING",
            },
        });

        return NextResponse.json({ pendingCount });
    } catch (error: any) {
        console.error("Error fetching upload request count:", error);
        return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
    }
}
