
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found" }, { status: 400 });
        }

        let aiSettings = await prisma.aiSettings.findUnique({
            where: { schoolId }
        });

        if (!aiSettings) {
            aiSettings = await prisma.aiSettings.create({
                data: { schoolId }
            });
        }

        return NextResponse.json(aiSettings);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch AI settings" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "School ID not found" }, { status: 400 });
        }
        const body = await req.json();

        const updated = await prisma.aiSettings.upsert({
            where: { schoolId },
            update: {
                teacherPrompt: body.teacherPrompt,
                principalPrompt: body.principalPrompt,
            },
            create: {
                schoolId,
                teacherPrompt: body.teacherPrompt,
                principalPrompt: body.principalPrompt,
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 });
    }
}
