import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { syncCurrentTerm } from "@/lib/currentTerm";
import { generateDummySheetData, generateDummySheetStream } from "@/services/dummySheetService";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json(
                { error: "Your account is not associated with a school." },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const classArmId = searchParams.get("classArmId") || "";
        let termId = searchParams.get("termId") || "";

        if (!classArmId) {
            return NextResponse.json({ error: "Class arm is required." }, { status: 400 });
        }

        if (!termId) {
            await syncCurrentTerm(schoolId);
            const currentSession = await prisma.academicSession.findFirst({
                where: { schoolId, isCurrent: true },
                include: {
                    terms: {
                        where: { isCurrent: true },
                        orderBy: { termNumber: "asc" },
                        select: { id: true },
                    },
                },
            });
            termId = currentSession?.terms[0]?.id || "";
        }

        if (!termId) {
            return NextResponse.json(
                { error: "No active term found for this school." },
                { status: 400 }
            );
        }

        const [classArm, term] = await Promise.all([
            prisma.classArm.findFirst({
                where: {
                    id: classArmId,
                    class: { schoolId },
                },
                select: { id: true },
            }),
            prisma.term.findFirst({
                where: {
                    id: termId,
                    session: { schoolId },
                },
                select: { id: true },
            }),
        ]);

        if (!classArm || !term) {
            return NextResponse.json(
                { error: "Invalid class arm or term selection." },
                { status: 400 }
            );
        }

        const data = await generateDummySheetData(classArmId, termId);
        const stream = await generateDummySheetStream(data);
        const filename = `Dummy_${data.classArm.className}_${data.classArm.armName}_${data.term.name}.pdf`
            .replace(/[^a-zA-Z0-9._-]/g, "_");

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("Error generating dummy sheet PDF:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate dummy sheet PDF" },
            { status: 500 }
        );
    }
}
