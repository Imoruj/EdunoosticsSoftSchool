import "server-only";
import { AssessmentTypeLike } from "@/lib/assessment-types";
import { withPrismaRetry } from "@/lib/prisma-transient";

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
    void db;
}

export async function ensureClassAssessmentTypesTable(db: any) {
    await ensureAssessmentTypeColumns(db);
    requireClassAssessmentTypeDelegate(db);
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
        const cls = await withPrismaRetry<{ id: string } | null>("/assessment-types resolve class", () =>
            db.class.findFirst({
                where: {
                    id: params.classId,
                    schoolId: params.schoolId,
                },
                select: { id: true },
            })
        );

        return cls?.id ?? null;
    }

    if (params.classArmId) {
        const classArm = await withPrismaRetry<{ classId: string } | null>("/assessment-types resolve class arm", () =>
            db.classArm.findFirst({
                where: {
                    id: params.classArmId,
                    class: { schoolId: params.schoolId },
                },
                select: { classId: true },
            })
        );

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
        const classSpecificTypes = await withPrismaRetry<ResolvedAssessmentType[]>("/assessment-types class-specific", () =>
            classAssessmentTypeDelegate.findMany({
                where: { classId: resolvedClassId },
                orderBy: { order: "asc" },
            })
        );

        if (classSpecificTypes.length > 0) {
            return classSpecificTypes as ResolvedAssessmentType[];
        }
    }

    return withPrismaRetry("/assessment-types school fallback", () =>
        db.assessmentType.findMany({
            where: {
                schoolId: params.schoolId,
                isActive: true,
            },
            orderBy: { order: "asc" },
        })
    ) as Promise<ResolvedAssessmentType[]>;
}
