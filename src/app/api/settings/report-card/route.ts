import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

// GET /api/settings/report-card - Fetch the current configuration
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

        let config = await prisma.reportCardConfig.findUnique({
            where: { schoolId },
        }) as any;

        // if no config exists, creating default one
        if (!config) {
            config = await prisma.reportCardConfig.create({
                data: {
                    schoolId,
                    activeTemplate: "standard",
                    colorScheme: "blue",
                    showAttendance: true,
                    showTraits: true,
                    showSkills: true,
                    showComments: true,
                    showPhoto: true,
                    showPosition: true,
                    showBehaviourGradeKey: true,
                    customTitles: {},
                } as any,
            });
        }

        return NextResponse.json(config);
    } catch (error: any) {
        console.error("Error fetching report card settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

// POST /api/settings/report-card - Update the configuration
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
        if (body.termMappings !== undefined) updateData.termMappings = body.termMappings;
        if (body.activeTemplateId !== undefined) updateData.activeTemplateId = body.activeTemplateId;
        if (body.activeTemplate !== undefined) updateData.activeTemplate = body.activeTemplate;
        if (body.colorScheme !== undefined) updateData.colorScheme = body.colorScheme;
        if (body.showAttendance !== undefined) updateData.showAttendance = body.showAttendance;
        if (body.showTraits !== undefined) updateData.showTraits = body.showTraits;
        if (body.showSkills !== undefined) updateData.showSkills = body.showSkills;
        if (body.showComments !== undefined) updateData.showComments = body.showComments;
        if (body.showPhoto !== undefined) updateData.showPhoto = body.showPhoto;
        if (body.showPosition !== undefined) updateData.showPosition = body.showPosition;
        if (body.showBehaviourGradeKey !== undefined) updateData.showBehaviourGradeKey = body.showBehaviourGradeKey;
        if (body.customTitles !== undefined) updateData.customTitles = body.customTitles;
        if (body.displayOptions !== undefined) updateData.displayOptions = body.displayOptions;

        const config = await prisma.reportCardConfig.upsert({
            where: { schoolId },
            update: updateData,
            create: {
                schoolId,
                activeTemplateId: body.activeTemplateId || "default-standard",
                activeTemplate: body.activeTemplate || "standard",
                colorScheme: body.colorScheme || "blue",
                showAttendance: body.showAttendance ?? true,
                showTraits: body.showTraits ?? true,
                showSkills: body.showSkills ?? true,
                showComments: body.showComments ?? true,
                showPhoto: body.showPhoto ?? true,
                showPosition: body.showPosition ?? true,
                showBehaviourGradeKey: body.showBehaviourGradeKey ?? true,
                customTitles: body.customTitles || {},
                displayOptions: body.displayOptions || {},
                customTemplates: body.customTemplates || {},
                termMappings: body.termMappings || {},
            } as any,
        });

        return NextResponse.json(config);
    } catch (error: any) {
        console.error("Error updating report card settings:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
