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

        const schoolId = (session.user as any).schoolId;

        const sessions = await prisma.academicSession.findMany({
            where: { schoolId },
            orderBy: { name: "desc" },
            include: {
                terms: {
                    orderBy: { termNumber: "asc" }
                }
            }
        });

        return NextResponse.json({ sessions });
    } catch (error: any) {
        console.error("Error fetching sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
        );
    }
}
