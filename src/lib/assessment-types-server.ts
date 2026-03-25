import "server-only";
import { AssessmentTypeLike } from "@/lib/assessment-types";

export interface ResolvedAssessmentType extends AssessmentTypeLike {
    classId?: string | null;
    schoolId?: string | null;
}

interface ResolveAssessmentTypesParams {
    schoolId: string;
    classId?: string | null;
    classArmId?: string | null;
}

function getClassAssessmentTypeDelegate(db: any) {
    return db?.classAssessmentType ?? null;
}

export async function ensureAssessmentTypeColumns(db: any) {
    await db.$executeRawUnsafe(`
        ALTER TABLE "AssessmentType"
        ADD COLUMN IF NOT EXISTS "includeInTotal" BOOLEAN NOT NULL DEFAULT TRUE
    `);
}

export async function ensureClassAssessmentTypesTable(db: any) {
    await ensureAssessmentTypeColumns(db);

    await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ClassAssessmentType" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "shortName" TEXT,
            "maxScore" INTEGER NOT NULL,
            "includeInTotal" BOOLEAN NOT NULL DEFAULT TRUE,
            "order" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "classId" TEXT NOT NULL,
            CONSTRAINT "ClassAssessmentType_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "ClassAssessmentType_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
    `);

    await db.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "ClassAssessmentType_classId_name_key"
        ON "ClassAssessmentType" ("classId", "name")
    `);

    await db.$executeRawUnsafe(`
        ALTER TABLE "ClassAssessmentType"
        ADD COLUMN IF NOT EXISTS "includeInTotal" BOOLEAN NOT NULL DEFAULT TRUE
    `);
}

export function requireClassAssessmentTypeDelegate(db: any) {
    const delegate = getClassAssessmentTypeDelegate(db);
    if (!delegate) {
        throw new Error("Class-specific assessment types are unavailable in the current Prisma client. Restart the server after applying the latest Prisma migration.");
    }
    return delegate;
}

async function resolveClassId(db: any, params: ResolveAssessmentTypesParams) {
    if (params.classId) {
        const cls = await db.class.findFirst({
            where: {
                id: params.classId,
                schoolId: params.schoolId,
            },
            select: { id: true },
        });

        return cls?.id ?? null;
    }

    if (params.classArmId) {
        const classArm = await db.classArm.findFirst({
            where: {
                id: params.classArmId,
                class: { schoolId: params.schoolId },
            },
            select: { classId: true },
        });

        return classArm?.classId ?? null;
    }

    return null;
}

export async function getResolvedAssessmentTypesForClassContext(
    db: any,
    params: ResolveAssessmentTypesParams
): Promise<ResolvedAssessmentType[]> {
    await ensureClassAssessmentTypesTable(db);

    const resolvedClassId = await resolveClassId(db, params);
    const classAssessmentTypeDelegate = getClassAssessmentTypeDelegate(db);

    if (resolvedClassId && classAssessmentTypeDelegate?.findMany) {
        const classSpecificTypes = await classAssessmentTypeDelegate.findMany({
            where: { classId: resolvedClassId },
            orderBy: { order: "asc" },
        });

        if (classSpecificTypes.length > 0) {
            return classSpecificTypes as ResolvedAssessmentType[];
        }
    }

    return db.assessmentType.findMany({
        where: {
            schoolId: params.schoolId,
            isActive: true,
        },
        orderBy: { order: "asc" },
    }) as Promise<ResolvedAssessmentType[]>;
}
