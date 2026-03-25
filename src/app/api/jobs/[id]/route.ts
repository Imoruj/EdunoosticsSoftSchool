import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const jobId = params.id;
        const schoolId = (session.user as any).schoolId;

        if (!jobId) {
            return NextResponse.json({ error: "Job ID required" }, { status: 400 });
        }

        const job = await prisma.backgroundJob.findUnique({
            where: { id: jobId, schoolId },
            select: {
                id: true,
                status: true,
                progress: true,
                resultUrl: true,
                error: true,
            }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json(job);

    } catch (error: any) {
        console.error("Fetch Job Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
