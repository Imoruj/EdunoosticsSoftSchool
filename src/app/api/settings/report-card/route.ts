import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

// GET /api/settings/report-card - Fetch the current configuration
export async function GET() {
    try {
        const session = await requireSchoolAdmin();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
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

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json({ error: "No school associated with user" }, { status: 400 });
        }
        const body = await req.json();
        const { targetBranchIds, ...rest } = body;

        // Build update object with only provided fields
        const updateData: any = {};
        if (rest.customTemplates !== undefined) updateData.customTemplates = rest.customTemplates;
        if (rest.termMappings !== undefined) updateData.termMappings = rest.termMappings;
        if (rest.activeTemplateId !== undefined) updateData.activeTemplateId = rest.activeTemplateId;
        if (rest.activeTemplate !== undefined) updateData.activeTemplate = rest.activeTemplate;
        if (rest.colorScheme !== undefined) updateData.colorScheme = rest.colorScheme;
        if (rest.showAttendance !== undefined) updateData.showAttendance = rest.showAttendance;
        if (rest.showTraits !== undefined) updateData.showTraits = rest.showTraits;
        if (rest.showSkills !== undefined) updateData.showSkills = rest.showSkills;
        if (rest.showComments !== undefined) updateData.showComments = rest.showComments;
        if (rest.showPhoto !== undefined) updateData.showPhoto = rest.showPhoto;
        if (rest.showPosition !== undefined) updateData.showPosition = rest.showPosition;
        if (rest.showBehaviourGradeKey !== undefined) updateData.showBehaviourGradeKey = rest.showBehaviourGradeKey;
        if (rest.customTitles !== undefined) updateData.customTitles = rest.customTitles;
        if (rest.displayOptions !== undefined) updateData.displayOptions = rest.displayOptions;

        // Save to current branch
        const config = await prisma.reportCardConfig.upsert({
            where: { schoolId },
            update: updateData,
            create: {
                schoolId,
                activeTemplateId: rest.activeTemplateId || "default-standard",
                activeTemplate: rest.activeTemplate || "standard",
                colorScheme: rest.colorScheme || "blue",
                showAttendance: rest.showAttendance ?? true,
                showTraits: rest.showTraits ?? true,
                showSkills: rest.showSkills ?? true,
                showComments: rest.showComments ?? true,
                showPhoto: rest.showPhoto ?? true,
                showPosition: rest.showPosition ?? true,
                showBehaviourGradeKey: rest.showBehaviourGradeKey ?? true,
                customTitles: rest.customTitles || {},
                displayOptions: rest.displayOptions || {},
                customTemplates: rest.customTemplates || {},
                termMappings: rest.termMappings || {},
            } as any,
        });

        // Propagate to selected target branches (must be in the same org)
        if (Array.isArray(targetBranchIds) && targetBranchIds.length > 0) {
            const currentSchool = await prisma.school.findUnique({
                where: { id: schoolId },
                select: { organizationId: true },
            });
            const orgId = currentSchool?.organizationId;

            const validTargets = orgId
                ? await prisma.school.findMany({
                    where: { id: { in: targetBranchIds }, organizationId: orgId, isActive: true, NOT: { id: schoolId } },
                    select: { id: true },
                })
                : [];

            if (validTargets.length > 0) {
                await Promise.all(
                    validTargets.map((target) =>
                        prisma.reportCardConfig.upsert({
                            where: { schoolId: target.id },
                            update: updateData,
                            create: {
                                schoolId: target.id,
                                activeTemplateId: rest.activeTemplateId || "default-standard",
                                activeTemplate: rest.activeTemplate || "standard",
                                colorScheme: rest.colorScheme || "blue",
                                showAttendance: rest.showAttendance ?? true,
                                showTraits: rest.showTraits ?? true,
                                showSkills: rest.showSkills ?? true,
                                showComments: rest.showComments ?? true,
                                showPhoto: rest.showPhoto ?? true,
                                showPosition: rest.showPosition ?? true,
                                showBehaviourGradeKey: rest.showBehaviourGradeKey ?? true,
                                customTitles: rest.customTitles || {},
                                displayOptions: rest.displayOptions || {},
                                customTemplates: rest.customTemplates || {},
                                termMappings: rest.termMappings || {},
                            } as any,
                        })
                    )
                );
            }
        }

        return NextResponse.json(config);
    } catch (error: any) {
        console.error("Error updating report card settings:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}

