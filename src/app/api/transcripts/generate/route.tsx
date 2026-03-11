import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTranscriptData, generateTranscriptStream } from "@/services/transcriptService";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roles: string[] = (session.user as any).roles || [];
        if (!roles.includes("SUPER_ADMIN") && !roles.includes("SCHOOL_ADMIN")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

        if (!studentId) {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }

        const data = await generateTranscriptData(studentId);
        const stream = await generateTranscriptStream(data);

        const filename = `Transcript_${data.student.admissionNumber}_${data.student.lastName}.pdf`
            .replace(/[^a-zA-Z0-9._-]/g, "_");

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("Transcript Generate Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate transcript" },
            { status: 500 }
        );
    }
}
