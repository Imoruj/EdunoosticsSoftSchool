import { NextRequest, NextResponse } from "next/server";
import { prismaDirect } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/server-session";
import {
    CompositeConflictError,
    CompositeNotFoundError,
    CompositeValidationError,
    deleteCompositeSubjectConfig,
    saveCompositeSubjectConfig,
} from "@/lib/composite-subjects";
import { getResolvedAssessmentTypesForClassContext } from "@/lib/assessment-types-server";
import { isSchoolAdmin } from "@/lib/rbac";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

function compositeBusyResponse(action: string) {
    return NextResponse.json(
        { error: `Composite subject settings are temporarily unavailable and could not ${action}. Please retry.` },
        { status: 503 }
    );
}

function compositeErrorResponse(error: any, fallbackMessage: string) {
    if (error instanceof CompositeValidationError) {
        return NextResponse.json(
            { error: error.message || fallbackMessage },
            { status: 400 }
        );
    }

    if (error instanceof CompositeConflictError) {
        return NextResponse.json(
            { error: error.message || fallbackMessage },
            { status: 409 }
        );
    }

    if (error instanceof CompositeNotFoundError) {
        return NextResponse.json(
            { error: error.message || fallbackMessage },
            { status: 404 }
        );
    }

    return NextResponse.json(
        { error: error.message || fallbackMessage },
        { status: 500 }
    );
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/subjects/composites");
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isSchoolAdmin(session.user as any)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        const { searchParams } = new URL(req.url);
        const parentSubjectId = searchParams.get("parentSubjectId");
        const sessionId = searchParams.get("sessionId");
        const classId = searchParams.get("classId");

        if (!parentSubjectId || !sessionId || !classId) {
            return NextResponse.json(
                { error: "parentSubjectId, sessionId, and classId are required" },
                { status: 400 }
            );
        }

        const [config, parentAssessmentTypes] = await Promise.all([
            withPrismaRetry("/api/subjects/composites GET config", () =>
                prismaDirect.compositeSubjectConfig.findFirst({
                    where: {
                        schoolId,
                        parentSubjectId,
                        sessionId,
                        classId,
                        isActive: true,
                    },
                    select: {
                        id: true,
                        parentSubjectId: true,
                        sessionId: true,
                        classId: true,
                    },
                })
            ),
            getResolvedAssessmentTypesForClassContext(prismaDirect, {
                schoolId,
                classId,
            }),
        ]);

        const components = config
            ? await withPrismaRetry("/api/subjects/composites GET components", () =>
                prismaDirect.compositeSubjectComponent.findMany({
                    where: {
                        compositeConfigId: config.id,
                    },
                    select: {
                        id: true,
                        componentSubjectId: true,
                        orderIndex: true,
                        ca1Max: true,
                        ca2Max: true,
                        ca3Max: true,
                        examMax: true,
                        componentSubject: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: [
                        { orderIndex: "asc" },
                        { componentSubject: { name: "asc" } },
                    ],
                })
            )
            : [];

        return NextResponse.json({
            parentAssessmentTypes,
            config: config
                ? {
                    id: config.id,
                    parentSubjectId: config.parentSubjectId,
                    sessionId: config.sessionId,
                    classId: config.classId,
                    parentAssessmentTypes,
                    components: components.map((component: any) => ({
                        id: component.id,
                        componentSubjectId: component.componentSubjectId,
                        componentSubjectName: component.componentSubject?.name || "Component Subject",
                        orderIndex: component.orderIndex,
                        ca1Max: Number(component.ca1Max) || 0,
                        ca2Max: Number(component.ca2Max) || 0,
                        ca3Max: Number(component.ca3Max) || 0,
                        examMax: Number(component.examMax) || 0,
                    })),
                }
                : null,
        });
    } catch (error: any) {
        if (isTransientPrismaError(error)) {
            console.warn("Transient database error fetching composite subject config:", error);
            return compositeBusyResponse("load the current component setup");
        }

        console.error("Error fetching composite subject config:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch composite subject configuration" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/subjects/composites");
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isSchoolAdmin(session.user as any)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        const body = await req.json();
        const { parentSubjectId, sessionId, classId, components } = body;

        if (!parentSubjectId || !sessionId || !classId || !Array.isArray(components)) {
            return NextResponse.json(
                { error: "parentSubjectId, sessionId, classId, and components are required" },
                { status: 400 }
            );
        }

        const config = await withPrismaRetry("/api/subjects/composites PUT save", () =>
            saveCompositeSubjectConfig(prismaDirect, {
                schoolId,
                parentSubjectId,
                sessionId,
                classId,
                components,
            })
        );

        const parentAssessmentTypes = await getResolvedAssessmentTypesForClassContext(prismaDirect, {
            schoolId,
            classId,
        });

        return NextResponse.json({
            parentAssessmentTypes,
            config: config
                ? {
                    id: config.id,
                    parentSubjectId: config.parentSubjectId,
                    sessionId: config.sessionId,
                    classId: config.classId,
                    parentAssessmentTypes,
                    components: config.components.map((component: any) => ({
                        id: component.id,
                        componentSubjectId: component.componentSubjectId,
                        componentSubjectName: component.componentSubject?.name || "Component Subject",
                        orderIndex: component.orderIndex,
                        ca1Max: Number(component.ca1Max) || 0,
                        ca2Max: Number(component.ca2Max) || 0,
                        ca3Max: Number(component.ca3Max) || 0,
                        examMax: Number(component.examMax) || 0,
                    })),
                }
                : null,
        });
    } catch (error: any) {
        if (isTransientPrismaError(error)) {
            console.warn("Transient database error saving composite subject config:", error);
            return compositeBusyResponse("save the component setup");
        }

        console.error("Error saving composite subject config:", error);
        return compositeErrorResponse(error, "Failed to save composite subject configuration");
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/subjects/composites");
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isSchoolAdmin(session.user as any)) {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        const { searchParams } = new URL(req.url);
        const configId = searchParams.get("id");
        const parentSubjectId = searchParams.get("parentSubjectId");
        const sessionId = searchParams.get("sessionId");
        const classId = searchParams.get("classId");

        await withPrismaRetry("/api/subjects/composites DELETE", () =>
            deleteCompositeSubjectConfig(prismaDirect, {
                schoolId,
                configId,
                parentSubjectId,
                sessionId,
                classId,
            })
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (isTransientPrismaError(error)) {
            console.warn("Transient database error deleting composite subject config:", error);
            return compositeBusyResponse("remove the component setup");
        }

        console.error("Error deleting composite subject config:", error);
        return compositeErrorResponse(error, "Failed to delete composite subject configuration");
    }
}
