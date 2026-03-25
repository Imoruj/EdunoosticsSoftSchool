import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { validateAssessmentTypeCollection } from "@/lib/assessment-types";
import { ensureClassAssessmentTypesTable, requireClassAssessmentTypeDelegate } from "@/lib/assessment-types-server";
import { STALE_SCHOOL_SESSION_MESSAGE, sessionSchoolExists } from "@/lib/session-school";

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

function validateTypeInput(name: unknown, maxScore: unknown) {
    const normalizedName = typeof name === "string" ? normalizeName(name) : "";
    if (!normalizedName) {
        return { error: "Component name is required." };
    }

    const parsedMaxScore = parseMaxScore(maxScore);
    if (parsedMaxScore === null) {
        return { error: "Max score must be a valid number greater than zero." };
    }

    return {
        name: normalizedName,
        maxScore: parsedMaxScore,
    };
}

async function validateSchoolSession(schoolId: string | null | undefined) {
    if (!schoolId) {
        return NextResponse.json({ error: "No school associated with user" }, { status: 400 });
    }

    const schoolExists = await sessionSchoolExists(prisma, schoolId);
    if (!schoolExists) {
        return NextResponse.json({ error: STALE_SCHOOL_SESSION_MESSAGE }, { status: 401 });
    }

    return null;
}

// GET - fetch assessment types for a specific class
export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const schoolId = (session.user as any).schoolId;
        const sessionError = await validateSchoolSession(schoolId);
        if (sessionError) return sessionError;
        const classId = req.nextUrl.searchParams.get("classId");
        if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });

        await ensureClassAssessmentTypesTable(prisma);
        const classAssessmentType = requireClassAssessmentTypeDelegate(prisma);

        const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
        if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

        const types = await classAssessmentType.findMany({
            where: { classId },
            orderBy: { order: "asc" },
        });

        return NextResponse.json(types);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 });
    }
}

// POST - create a class-specific assessment type
export async function POST(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const schoolId = (session.user as any).schoolId;
        const sessionError = await validateSchoolSession(schoolId);
        if (sessionError) return sessionError;
        const body = await req.json();
        const { classId, name, shortName, maxScore } = body;
        const includeInTotal = parseIncludeInTotal(body.includeInTotal);

        if (!classId) {
            return NextResponse.json({ error: "classId is required" }, { status: 400 });
        }

        await ensureClassAssessmentTypesTable(prisma);
        const classAssessmentType = requireClassAssessmentTypeDelegate(prisma);
        const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
        if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

        const validated = validateTypeInput(name, maxScore);
        if ("error" in validated) {
            return NextResponse.json({ error: validated.error }, { status: 400 });
        }

        const existingTypes = await classAssessmentType.findMany({
            where: { classId },
            orderBy: { order: "asc" },
        });

        if (existingTypes.some((type: any) => normalizeName(type.name).toLowerCase() === validated.name.toLowerCase())) {
            return NextResponse.json({ error: "A component with this name already exists for this class." }, { status: 400 });
        }

        const configurationError = validateAssessmentTypeCollection([
            ...existingTypes.map((type: any) => ({ name: type.name })),
            { name: validated.name },
        ]);
        if (configurationError) {
            return NextResponse.json({ error: configurationError }, { status: 400 });
        }

        const order = (existingTypes.at(-1)?.order ?? -1) + 1;

        const created = await classAssessmentType.create({
            data: {
                classId,
                name: validated.name,
                shortName: typeof shortName === "string" && shortName.trim() ? normalizeName(shortName) : validated.name,
                maxScore: validated.maxScore,
                includeInTotal,
                order,
            },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "A component with this name already exists for this class." }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || "Failed to create" }, { status: 500 });
    }
}

// PUT - update a class-specific assessment type
export async function PUT(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const schoolId = (session.user as any).schoolId;
        const sessionError = await validateSchoolSession(schoolId);
        if (sessionError) return sessionError;
        const body = await req.json();
        const { id, name, shortName, maxScore } = body;

        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        await ensureClassAssessmentTypesTable(prisma);
        const classAssessmentType = requireClassAssessmentTypeDelegate(prisma);
        const existing = await classAssessmentType.findFirst({
            where: { id },
            include: { class: { select: { schoolId: true } } },
        });
        if (!existing || existing.class.schoolId !== schoolId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const validated = validateTypeInput(name ?? existing.name, maxScore ?? existing.maxScore);
        if ("error" in validated) {
            return NextResponse.json({ error: validated.error }, { status: 400 });
        }

        const classTypes = await classAssessmentType.findMany({
            where: { classId: existing.classId },
            orderBy: { order: "asc" },
        });

        if (classTypes.some((type: any) => type.id !== existing.id && normalizeName(type.name).toLowerCase() === validated.name.toLowerCase())) {
            return NextResponse.json({ error: "A component with this name already exists for this class." }, { status: 400 });
        }

        const configurationError = validateAssessmentTypeCollection(
            classTypes.map((type: any) => ({
                name: type.id === existing.id ? validated.name : type.name,
            }))
        );
        if (configurationError) {
            return NextResponse.json({ error: configurationError }, { status: 400 });
        }

        const updated = await classAssessmentType.update({
            where: { id },
            data: {
                name: validated.name,
                shortName: shortName === undefined
                    ? existing.shortName
                    : (typeof shortName === "string" && shortName.trim() ? normalizeName(shortName) : validated.name),
                maxScore: validated.maxScore,
                includeInTotal: parseIncludeInTotal(body.includeInTotal),
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
    }
}

// DELETE - remove a single override (?id=) or reset all for a class (?classId=&all=true)
export async function DELETE(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const schoolId = (session.user as any).schoolId;
        const sessionError = await validateSchoolSession(schoolId);
        if (sessionError) return sessionError;
        const id = req.nextUrl.searchParams.get("id");
        const classId = req.nextUrl.searchParams.get("classId");
        const all = req.nextUrl.searchParams.get("all");

        await ensureClassAssessmentTypesTable(prisma);
        const classAssessmentType = requireClassAssessmentTypeDelegate(prisma);

        if (all === "true" && classId) {
            const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
            if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
            await classAssessmentType.deleteMany({ where: { classId } });
            return NextResponse.json({ success: true });
        }

        if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const existing = await classAssessmentType.findFirst({
            where: { id },
            include: { class: { select: { schoolId: true } } },
        });
        if (!existing || existing.class.schoolId !== schoolId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await classAssessmentType.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 });
    }
}

