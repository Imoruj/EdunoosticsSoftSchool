import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

// GET /api/settings/broadsheet - Fetch the current configuration
export async function GET() {
    try {
        const session = await requireSchoolAdmin();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "No school associated with user" }, { status: 400 });
        }

        let config = await prisma.broadsheetConfig.findUnique({
            where: { schoolId },
        }) as any;

        // if no config exists, creating default one
        if (!config) {
            config = await prisma.broadsheetConfig.create({
                data: {
                    schoolId,
                    activeTemplate: "standard",
                    colorScheme: "blue",
                    showCA1: true,
                    showCA2: true,
                    showExam: true,
                    showSubjectTotal: true,
                    showGrade: true,
                    showPosition: true,
                    customTitles: {},
                } as any,
            });
        }

        return NextResponse.json(config);
    } catch (error: any) {
        console.error("Error fetching broadsheet settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

// POST /api/settings/broadsheet - Update the configuration
export async function POST(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "No school associated with user" }, { status: 400 });
        }
        const body = await req.json();

        // Build update object with only provided fields
        const updateData: any = {};
        if (body.customTemplates !== undefined) updateData.customTemplates = body.customTemplates;
        if (body.activeTemplateId !== undefined) updateData.activeTemplateId = body.activeTemplateId;
        if (body.activeTemplate !== undefined) updateData.activeTemplate = body.activeTemplate;
        if (body.colorScheme !== undefined) updateData.colorScheme = body.colorScheme;
        if (body.showCA1 !== undefined) updateData.showCA1 = body.showCA1;
        if (body.showCA2 !== undefined) updateData.showCA2 = body.showCA2;
        if (body.showExam !== undefined) updateData.showExam = body.showExam;
        if (body.showSubjectTotal !== undefined) updateData.showSubjectTotal = body.showSubjectTotal;
        if (body.showGrade !== undefined) updateData.showGrade = body.showGrade;
        if (body.showPosition !== undefined) updateData.showPosition = body.showPosition;
        if (body.customTitles !== undefined) updateData.customTitles = body.customTitles;
        if (body.displayOptions !== undefined) updateData.displayOptions = body.displayOptions;
        if (body.termMappings !== undefined) updateData.termMappings = body.termMappings;

        const config = await prisma.broadsheetConfig.upsert({
            where: { schoolId },
            update: updateData,
            create: {
                schoolId,
                activeTemplateId: body.activeTemplateId || "default-standard",
                activeTemplate: body.activeTemplate || "standard",
                colorScheme: body.colorScheme || "blue",
                showCA1: body.showCA1 ?? true,
                showCA2: body.showCA2 ?? true,
                showExam: body.showExam ?? true,
                showSubjectTotal: body.showSubjectTotal ?? true,
                showGrade: body.showGrade ?? true,
                showPosition: body.showPosition ?? true,
                customTitles: body.customTitles || {},
                displayOptions: body.displayOptions || {},
                customTemplates: body.customTemplates || {},
                termMappings: body.termMappings || {},
            } as any,
        });

        return NextResponse.json(config);
    } catch (error: any) {
        console.error("Error updating broadsheet settings:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
