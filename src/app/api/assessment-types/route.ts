import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { validateAssessmentTypeCollection } from "@/lib/assessment-types";
import { ensureAssessmentTypeColumns } from "@/lib/assessment-types-server";
import { STALE_SCHOOL_SESSION_MESSAGE, sessionSchoolExists } from "@/lib/session-school";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

function normalizeName(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function parseMaxScore(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return Math.round(parsed);
}

function parseIncludeInTotal(value: unknown) {
    if (value === undefined) return true;
    return value !== false;
}

async function validateSchoolSession(schoolId: string | null | undefined) {
    if (!schoolId) {
        return NextResponse.json(
            { error: "No school associated with user" },
            { status: 400 }
        );
    }

    const schoolExists = await sessionSchoolExists(prisma, schoolId);
    if (!schoolExists) {
        return NextResponse.json(
            { error: STALE_SCHOOL_SESSION_MESSAGE },
            { status: 401 }
        );
    }

    return null;
}

// GET - Fetch all assessment types for the school
export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        const sessionError = await validateSchoolSession(schoolId);
        if (sessionError) {
            return sessionError;
        }

        await ensureAssessmentTypeColumns(prisma);
        const assessmentTypes = await prisma.assessmentType.findMany({
            where: { schoolId, isActive: true },
            orderBy: { order: "asc" },
            include: { components: { orderBy: { order: "asc" } } },
        });

        return NextResponse.json(assessmentTypes);
    } catch (error: any) {
        console.error("Error fetching assessment types:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch assessment types" },
            { status: 500 }
        );
    }
}

// POST - Create a new assessment type
export async function POST(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        const sessionError = await validateSchoolSession(schoolId);
        if (sessionError) {
            return sessionError;
        }

        const body = await req.json();
        const normalizedName = typeof body.name === "string" ? normalizeName(body.name) : "";
        const parsedMaxScore = parseMaxScore(body.maxScore);
        const includeInTotal = parseIncludeInTotal(body.includeInTotal);
        const { shortName, order } = body;

        if (!normalizedName || parsedMaxScore === null) {
            return NextResponse.json(
                { error: "Name and max score are required" },
                { status: 400 }
            );
        }

        await ensureAssessmentTypeColumns(prisma);

        const existingTypes = await prisma.assessmentType.findMany({
            where: { schoolId, isActive: true },
            orderBy: { order: "asc" },
        });

        if (existingTypes.some((type) => normalizeName(type.name).toLowerCase() === normalizedName.toLowerCase())) {
            return NextResponse.json(
                { error: "Assessment type with this name already exists" },
                { status: 400 }
            );
        }

        const configurationError = validateAssessmentTypeCollection([
            ...existingTypes.map((type) => ({ name: type.name })),
            { name: normalizedName },
        ]);
        if (configurationError) {
            return NextResponse.json({ error: configurationError }, { status: 400 });
        }

        // Get the next order if not provided
        let assessmentOrder = order;
        if (assessmentOrder === undefined) {
            const lastAssessment = await prisma.assessmentType.findFirst({
                where: { schoolId },
                orderBy: { order: "desc" },
            });
            assessmentOrder = (lastAssessment?.order || 0) + 1;
        }

        const assessmentType = await prisma.assessmentType.create({
            data: {
                name: normalizedName,
                shortName: typeof shortName === "string" && shortName.trim() ? normalizeName(shortName) : normalizedName,
                maxScore: parsedMaxScore,
                includeInTotal,
                order: assessmentOrder,
                schoolId,
            },
        });

        return NextResponse.json(assessmentType, { status: 201 });
    } catch (error: any) {
        console.error("Error creating assessment type:", error);
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "Assessment type with this name already exists" },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: error.message || "Failed to create assessment type" },
            { status: 500 }
        );
    }
}

// PUT - Update an assessment type
export async function PUT(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        const sessionError = await validateSchoolSession(schoolId);
        if (sessionError) {
            return sessionError;
        }
        const body = await req.json();
        const { id, shortName, order, isActive } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Assessment type ID is required" },
                { status: 400 }
            );
        }

        await ensureAssessmentTypeColumns(prisma);
        const existing = await prisma.assessmentType.findFirst({
            where: { id, schoolId },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Assessment type not found" },
                { status: 404 }
            );
        }

        const normalizedName = body.name === undefined
            ? existing.name
            : normalizeName(String(body.name));
        const parsedMaxScore = body.maxScore === undefined
            ? existing.maxScore
            : parseMaxScore(body.maxScore);

        if (!normalizedName || parsedMaxScore === null) {
            return NextResponse.json(
                { error: "Name and max score are required" },
                { status: 400 }
            );
        }

        const siblingTypes = await prisma.assessmentType.findMany({
            where: { schoolId, isActive: true },
            orderBy: { order: "asc" },
        });

        if (siblingTypes.some((type) => type.id !== id && normalizeName(type.name).toLowerCase() === normalizedName.toLowerCase())) {
            return NextResponse.json(
                { error: "Assessment type with this name already exists" },
                { status: 400 }
            );
        }

        const configurationError = validateAssessmentTypeCollection(
            siblingTypes.map((type) => ({
                name: type.id === id ? normalizedName : type.name,
            }))
        );
        if (configurationError) {
            return NextResponse.json({ error: configurationError }, { status: 400 });
        }

        const assessmentType = await prisma.assessmentType.update({
            where: { id, schoolId },
            data: {
                name: normalizedName,
                shortName: shortName === undefined
                    ? existing.shortName
                    : (typeof shortName === "string" && shortName.trim() ? normalizeName(shortName) : normalizedName),
                maxScore: parsedMaxScore,
                includeInTotal: parseIncludeInTotal(body.includeInTotal),
                order,
                isActive,
            },
        });

        return NextResponse.json(assessmentType);
    } catch (error: any) {
        console.error("Error updating assessment type:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update assessment type" },
            { status: 500 }
        );
    }
}

// DELETE - Delete an assessment type
export async function DELETE(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        const sessionError = await validateSchoolSession(schoolId);
        if (sessionError) {
            return sessionError;
        }
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Assessment type ID is required" },
                { status: 400 }
            );
        }

        await prisma.assessmentType.delete({
            where: { id, schoolId },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting assessment type:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete assessment type" },
            { status: 500 }
        );
    }
}

