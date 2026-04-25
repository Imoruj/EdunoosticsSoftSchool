import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

async function resolveAssessmentType(id: string, schoolId: string) {
    return prisma.assessmentType.findFirst({
        where: { id, schoolId, isActive: true },
    });
}

// GET /api/assessment-types/[id]/components
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        const schoolId = (session.user as any).schoolId;

        const at = await resolveAssessmentType(id, schoolId);
        if (!at) return NextResponse.json({ error: "Assessment type not found" }, { status: 404 });

        const components = await prisma.assessmentTypeComponent.findMany({
            where: { assessmentTypeId: id },
            orderBy: { order: "asc" },
        });
        return NextResponse.json(components);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch components" }, { status: 500 });
    }
}

// POST /api/assessment-types/[id]/components — create a component
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        const schoolId = (session.user as any).schoolId;

        const at = await resolveAssessmentType(id, schoolId);
        if (!at) return NextResponse.json({ error: "Assessment type not found" }, { status: 404 });

        const body = await req.json();
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const maxScore = Number(body.maxScore);
        const order = typeof body.order === "number" ? body.order : 0;

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
        if (!Number.isFinite(maxScore) || maxScore <= 0) {
            return NextResponse.json({ error: "Max score must be a positive number" }, { status: 400 });
        }

        // Validate sum of components won't exceed parent max
        const existing = await prisma.assessmentTypeComponent.findMany({
            where: { assessmentTypeId: id },
        });
        const currentSum = existing.reduce((acc, c) => acc + c.maxScore, 0);
        if (currentSum + maxScore > at.maxScore) {
            return NextResponse.json({
                error: `Component scores would exceed the parent max of ${at.maxScore}. Currently used: ${currentSum}, adding: ${maxScore}`,
            }, { status: 400 });
        }

        const component = await prisma.assessmentTypeComponent.create({
            data: { assessmentTypeId: id, name, maxScore, order },
        });
        return NextResponse.json(component, { status: 201 });
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "A component with that name already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || "Failed to create component" }, { status: 500 });
    }
}

// PUT /api/assessment-types/[id]/components — update a component (body: { componentId, name, maxScore, order })
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        const schoolId = (session.user as any).schoolId;

        const at = await resolveAssessmentType(id, schoolId);
        if (!at) return NextResponse.json({ error: "Assessment type not found" }, { status: 404 });

        const body = await req.json();
        const { componentId } = body;
        if (!componentId) return NextResponse.json({ error: "componentId required" }, { status: 400 });

        const existing = await prisma.assessmentTypeComponent.findFirst({
            where: { id: componentId, assessmentTypeId: id },
        });
        if (!existing) return NextResponse.json({ error: "Component not found" }, { status: 404 });

        const updates: { name?: string; maxScore?: number; order?: number } = {};
        if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
        if (body.maxScore !== undefined) {
            const ms = Number(body.maxScore);
            if (!Number.isFinite(ms) || ms <= 0) {
                return NextResponse.json({ error: "Max score must be a positive number" }, { status: 400 });
            }
            const siblings = await prisma.assessmentTypeComponent.findMany({
                where: { assessmentTypeId: id, NOT: { id: componentId } },
            });
            const siblingSum = siblings.reduce((acc, c) => acc + c.maxScore, 0);
            if (siblingSum + ms > at.maxScore) {
                return NextResponse.json({
                    error: `Total components would exceed parent max of ${at.maxScore}`,
                }, { status: 400 });
            }
            updates.maxScore = ms;
        }
        if (typeof body.order === "number") updates.order = body.order;

        const updated = await prisma.assessmentTypeComponent.update({
            where: { id: componentId },
            data: updates,
        });
        return NextResponse.json(updated);
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "A component with that name already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || "Failed to update component" }, { status: 500 });
    }
}

// DELETE /api/assessment-types/[id]/components — delete a component (body: { componentId })
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        const schoolId = (session.user as any).schoolId;

        const at = await resolveAssessmentType(id, schoolId);
        if (!at) return NextResponse.json({ error: "Assessment type not found" }, { status: 404 });

        const body = await req.json();
        const { componentId } = body;
        if (!componentId) return NextResponse.json({ error: "componentId required" }, { status: 400 });

        await prisma.assessmentTypeComponent.deleteMany({
            where: { id: componentId, assessmentTypeId: id },
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete component" }, { status: 500 });
    }
}
