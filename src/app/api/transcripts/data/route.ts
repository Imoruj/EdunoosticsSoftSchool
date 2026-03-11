import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTranscriptData } from "@/services/transcriptService";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roles: string[] = (session.user as any).roles || [];
        if (!roles.includes("SUPER_ADMIN") && !roles.includes("SCHOOL_ADMIN")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { studentId } = body;

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }

        const data = await generateTranscriptData(studentId, false);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Transcript Data Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate transcript data" },
            { status: 500 }
        );
    }
}
