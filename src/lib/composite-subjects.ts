import { SubjectKind } from "@prisma/client";
import {
    AssessmentTypeLike,
    ScoreFieldKey,
    calculateEndOfTermScoreTotals,
    mapAssessmentTypesToScoreFields,
} from "@/lib/assessment-types";
import {
    ResolvedAssessmentType,
    getResolvedAssessmentTypesForClassContext,
} from "@/lib/assessment-types-server";

type CompositeComponentInput = {
    componentSubjectId?: string;
    createComponent?: {
        name: string;
        code?: string;
        category?: string;
    };
    orderIndex?: number;
    ca1Max?: number;
    ca2Max?: number;
    ca3Max?: number;
    examMax?: number;
};

type CompositeComponentDefinition = {
    componentSubjectId: string;
    componentSubjectName: string;
    orderIndex: number;
    ca1Max: number;
    ca2Max: number;
    ca3Max: number;
    examMax: number;
};

type CompositeContextMode = "STANDARD" | "COMPOSITE_PARENT" | "COMPOSITE_COMPONENT";

export type CompositeSubjectContext = {
    mode: CompositeContextMode;
    subjectKind: SubjectKind;
    subjectId: string;
    classId: string;
    classArmId: string | null;
    sessionId: string;
    config: any | null;
    parentSubjectId: string | null;
    parentSubjectName: string | null;
    component: CompositeComponentDefinition | null;
    components: CompositeComponentDefinition[];
    isReadOnly: boolean;
    derivedFromComponents: boolean;
    isReportVisible: boolean;
    isScoreEntryEditable: boolean;
};

type ResolveSubjectContextParams = {
    schoolId: string;
    sessionId: string;
    subjectId: string;
    classId?: string | null;
    classArmId?: string | null;
};

type SaveCompositeConfigParams = {
    schoolId: string;
    sessionId: string;
    classId: string;
    parentSubjectId: string;
    components: CompositeComponentInput[];
};

type SyncCompositeEnrollmentsParams = {
    schoolId: string;
    sessionId: string;
    classArmId: string;
    termId: string;
    parentSubjectId: string;
};

type RecomputeCompositeParentScoresParams = {
    schoolId: string;
    sessionId: string;
    classArmId: string;
    termId: string;
    compositeConfigId: string;
    studentIds?: string[];
    actorUserId?: string | null;
};

export class CompositeValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CompositeValidationError";
    }
}

export class CompositeConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CompositeConflictError";
    }
}

export class CompositeNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CompositeNotFoundError";
    }
}

const ZERO_FIELD_TOTALS: Record<ScoreFieldKey, number> = {
    ca1: 0,
    ca2: 0,
    ca3: 0,
    exam: 0,
};

function roundCompositeMax(value: number) {
    return Math.round(value * 100) / 100;
}

function toNonNegativeInt(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.round(parsed);
}

function toCompositeMax(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return roundCompositeMax(parsed);
}

function compositeMaxMatches(left: number, right: number) {
    return Math.abs(roundCompositeMax(left) - roundCompositeMax(right)) < 0.001;
}

function formatCompositeMax(value: number) {
    const rounded = roundCompositeMax(value);
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

function normalizeComponentInput(input: CompositeComponentInput) {
    return {
        componentSubjectId: typeof input.componentSubjectId === "string" ? input.componentSubjectId.trim() : "",
        createComponent: input.createComponent && typeof input.createComponent.name === "string"
            ? {
                name: input.createComponent.name.trim(),
                code: typeof input.createComponent.code === "string" ? input.createComponent.code.trim() : "",
                category: typeof input.createComponent.category === "string" ? input.createComponent.category.trim() : "",
            }
            : null,
        orderIndex: toNonNegativeInt(input.orderIndex ?? 0),
        ca1Max: toCompositeMax(input.ca1Max ?? 0),
        ca2Max: toCompositeMax(input.ca2Max ?? 0),
        ca3Max: toCompositeMax(input.ca3Max ?? 0),
        examMax: toCompositeMax(input.examMax ?? 0),
    };
}

function normalizeScoreForRuleScale(total: number, rules: Array<{ maxScore: number }>) {
    const maxRuleScore = rules.reduce((max, rule) => Math.max(max, Number(rule.maxScore) || 0), 0);
    if (maxRuleScore <= 50 && total > 50) {
        return Math.round(total / 2);
    }
    return total;
}

function calculateGrade(total: number, rules: Array<{ minScore: number; maxScore: number; grade: string; remark: string }>) {
    const normalizedTotal = normalizeScoreForRuleScale(total, rules);
    const rule = rules.find((item) => normalizedTotal >= item.minScore && normalizedTotal <= item.maxScore);
    if (rule) {
        return { grade: rule.grade, remark: rule.remark };
    }
    return { grade: "-", remark: "-" };
}

function classLevelToCategory(level: string | undefined | null): string | null {
    if (!level) return null;
    if (level === "PRIMARY" || level === "NURSERY") return "PRIMARY";
    if (level === "JUNIOR_SECONDARY") return "JUNIOR_SECONDARY";
    if (level === "SENIOR_SECONDARY") return "SENIOR_SECONDARY";
    return null;
}

async function resolveClassContext(db: any, params: Pick<ResolveSubjectContextParams, "schoolId" | "classId" | "classArmId">) {
    if (params.classId) {
        const classRecord = await db.class.findFirst({
            where: { id: params.classId, schoolId: params.schoolId },
            select: { id: true },
        });
        return {
            classId: classRecord?.id ?? null,
            classArmId: params.classArmId ?? null,
        };
    }

    if (params.classArmId) {
        const classArm = await db.classArm.findFirst({
            where: {
                id: params.classArmId,
                class: { schoolId: params.schoolId },
            },
            select: { id: true, classId: true },
        });

        return {
            classId: classArm?.classId ?? null,
            classArmId: classArm?.id ?? null,
        };
    }

    return { classId: null, classArmId: null };
}

async function getCompositeConfigForParent(db: any, params: {
    sessionId: string;
    classId: string;
    parentSubjectId: string;
}) {
    return db.compositeSubjectConfig.findFirst({
        where: {
            sessionId: params.sessionId,
            classId: params.classId,
            parentSubjectId: params.parentSubjectId,
            isActive: true,
        },
        include: {
            parentSubject: {
                select: {
                    id: true,
                    name: true,
                    subjectKind: true,
                },
            },
            components: {
                include: {
                    componentSubject: {
                        select: {
                            id: true,
                            name: true,
                            subjectKind: true,
                            defaultParentSubjectId: true,
                        },
                    },
                },
                orderBy: [
                    { orderIndex: "asc" },
                    { componentSubject: { name: "asc" } },
                ],
            },
        },
    });
}

async function getCompositeConfigForComponent(db: any, params: {
    sessionId: string;
    classId: string;
    componentSubjectId: string;
}) {
    return db.compositeSubjectConfig.findFirst({
        where: {
            sessionId: params.sessionId,
            classId: params.classId,
            isActive: true,
            components: {
                some: {
                    componentSubjectId: params.componentSubjectId,
                },
            },
        },
        include: {
            parentSubject: {
                select: {
                    id: true,
                    name: true,
                    subjectKind: true,
                },
            },
            components: {
                include: {
                    componentSubject: {
                        select: {
                            id: true,
                            name: true,
                            subjectKind: true,
                            defaultParentSubjectId: true,
                        },
                    },
                },
                orderBy: [
                    { orderIndex: "asc" },
                    { componentSubject: { name: "asc" } },
                ],
            },
        },
    });
}

function mapCompositeComponents(components: any[]): CompositeComponentDefinition[] {
    return components.map((component) => ({
        componentSubjectId: component.componentSubjectId,
        componentSubjectName: component.componentSubject?.name || "Component Subject",
        orderIndex: component.orderIndex,
        ca1Max: Number(component.ca1Max) || 0,
        ca2Max: Number(component.ca2Max) || 0,
        ca3Max: Number(component.ca3Max) || 0,
        examMax: Number(component.examMax) || 0,
    }));
}

export async function resolveCompositeSubjectContext(
    db: any,
    params: ResolveSubjectContextParams
): Promise<CompositeSubjectContext> {
    const [subject, classContext] = await Promise.all([
        db.subject.findFirst({
            where: { id: params.subjectId, schoolId: params.schoolId },
            select: {
                id: true,
                name: true,
                subjectKind: true,
                defaultParentSubjectId: true,
            },
        }),
        resolveClassContext(db, params),
    ]);

    if (!subject) {
        throw new Error("Subject not found.");
    }

    if (!classContext.classId) {
        return {
            mode: "STANDARD",
            subjectKind: subject.subjectKind,
            subjectId: subject.id,
            classId: "",
            classArmId: classContext.classArmId,
            sessionId: params.sessionId,
            config: null,
            parentSubjectId: null,
            parentSubjectName: null,
            component: null,
            components: [],
            isReadOnly: false,
            derivedFromComponents: false,
            isReportVisible: subject.subjectKind !== SubjectKind.COMPOSITE_COMPONENT,
            isScoreEntryEditable: true,
        };
    }

    const [parentConfig, componentConfig] = await Promise.all([
        getCompositeConfigForParent(db, {
            sessionId: params.sessionId,
            classId: classContext.classId,
            parentSubjectId: subject.id,
        }),
        getCompositeConfigForComponent(db, {
            sessionId: params.sessionId,
            classId: classContext.classId,
            componentSubjectId: subject.id,
        }),
    ]);

    if (parentConfig) {
        return {
            mode: "COMPOSITE_PARENT",
            subjectKind: subject.subjectKind,
            subjectId: subject.id,
            classId: classContext.classId,
            classArmId: classContext.classArmId,
            sessionId: params.sessionId,
            config: parentConfig,
            parentSubjectId: parentConfig.parentSubjectId,
            parentSubjectName: parentConfig.parentSubject?.name || subject.name,
            component: null,
            components: mapCompositeComponents(parentConfig.components),
            isReadOnly: true,
            derivedFromComponents: true,
            isReportVisible: true,
            isScoreEntryEditable: false,
        };
    }

    if (componentConfig) {
        const componentRow = componentConfig.components.find(
            (item: any) => item.componentSubjectId === subject.id
        );

        return {
            mode: "COMPOSITE_COMPONENT",
            subjectKind: subject.subjectKind,
            subjectId: subject.id,
            classId: classContext.classId,
            classArmId: classContext.classArmId,
            sessionId: params.sessionId,
            config: componentConfig,
            parentSubjectId: componentConfig.parentSubjectId,
            parentSubjectName: componentConfig.parentSubject?.name || null,
            component: componentRow
                ? {
                    componentSubjectId: componentRow.componentSubjectId,
                    componentSubjectName: componentRow.componentSubject?.name || subject.name,
                    orderIndex: componentRow.orderIndex,
                    ca1Max: Number(componentRow.ca1Max) || 0,
                    ca2Max: Number(componentRow.ca2Max) || 0,
                    ca3Max: Number(componentRow.ca3Max) || 0,
                    examMax: Number(componentRow.examMax) || 0,
                }
                : null,
            components: mapCompositeComponents(componentConfig.components),
            isReadOnly: false,
            derivedFromComponents: false,
            isReportVisible: false,
            isScoreEntryEditable: true,
        };
    }

    return {
        mode: "STANDARD",
        subjectKind: subject.subjectKind,
        subjectId: subject.id,
        classId: classContext.classId,
        classArmId: classContext.classArmId,
        sessionId: params.sessionId,
        config: null,
        parentSubjectId: null,
        parentSubjectName: null,
        component: null,
        components: [],
        isReadOnly: false,
        derivedFromComponents: false,
        isReportVisible: subject.subjectKind !== SubjectKind.COMPOSITE_COMPONENT,
        isScoreEntryEditable: true,
    };
}

export async function resolveSubjectScoreProfile(db: any, params: ResolveSubjectContextParams) {
    const context = await resolveCompositeSubjectContext(db, params);
    const assessmentTypes = await getResolvedAssessmentTypesForClassContext(db, {
        schoolId: params.schoolId,
        classId: context.classId || params.classId,
        classArmId: params.classArmId,
    });

    if (context.mode !== "COMPOSITE_COMPONENT" || !context.component) {
        return {
            context,
            assessmentTypes,
        };
    }

    const fieldOverrides: Record<ScoreFieldKey, number> = {
        ca1: context.component.ca1Max,
        ca2: context.component.ca2Max,
        ca3: context.component.ca3Max,
        exam: context.component.examMax,
    };

    const mappedTypes = mapAssessmentTypesToScoreFields(assessmentTypes);
    const overridden = mappedTypes.map(({ field, ...type }) => ({
        ...type,
        maxScore: fieldOverrides[field],
    }));

    return {
        context,
        assessmentTypes: overridden as ResolvedAssessmentType[],
    };
}

export function buildSubjectAssessmentTotals(
    parentAssessmentTypes: AssessmentTypeLike[],
    components: Array<Pick<CompositeComponentDefinition, "ca1Max" | "ca2Max" | "ca3Max" | "examMax">>
) {
    const mappedTypes = mapAssessmentTypesToScoreFields(parentAssessmentTypes);
    const parentMaxByField = new Map<ScoreFieldKey, number>();
    mappedTypes.forEach((type) => parentMaxByField.set(type.field, roundCompositeMax(Number(type.maxScore) || 0)));

    const componentTotals: Record<ScoreFieldKey, number> = { ...ZERO_FIELD_TOTALS };
    components.forEach((component) => {
        componentTotals.ca1 = roundCompositeMax(componentTotals.ca1 + (Number(component.ca1Max) || 0));
        componentTotals.ca2 = roundCompositeMax(componentTotals.ca2 + (Number(component.ca2Max) || 0));
        componentTotals.ca3 = roundCompositeMax(componentTotals.ca3 + (Number(component.ca3Max) || 0));
        componentTotals.exam = roundCompositeMax(componentTotals.exam + (Number(component.examMax) || 0));
    });

    return {
        parentMaxByField,
        componentTotals,
    };
}

export function validateCompositeComponentMaxima(
    parentAssessmentTypes: AssessmentTypeLike[],
    components: Array<Pick<CompositeComponentDefinition, "componentSubjectId" | "ca1Max" | "ca2Max" | "ca3Max" | "examMax">>
) {
    const { parentMaxByField, componentTotals } = buildSubjectAssessmentTotals(parentAssessmentTypes, components as any);
    const fields: ScoreFieldKey[] = ["ca1", "ca2", "ca3", "exam"];

    for (const field of fields) {
        const parentMax = parentMaxByField.get(field);
        const componentTotal = componentTotals[field];

        if (parentMax === undefined) {
            if (!compositeMaxMatches(componentTotal, 0)) {
                throw new CompositeValidationError(`Component ${field.toUpperCase()} maxima must be 0 because the parent subject does not use that assessment type.`);
            }
            continue;
        }

        if (!compositeMaxMatches(componentTotal, parentMax)) {
            throw new CompositeValidationError(
                `Component ${field.toUpperCase()} maxima must sum to ${formatCompositeMax(parentMax)}. The current total is ${formatCompositeMax(componentTotal)}.`
            );
        }
    }
}

async function assertCompositeConfigCanChange(db: any, params: {
    schoolId: string;
    sessionId: string;
    classId: string;
    subjectIds: string[];
}) {
    const classArms = await db.classArm.findMany({
        where: { classId: params.classId },
        select: { id: true },
    });
    const classArmIds = classArms.map((arm: any) => arm.id);
    const sessionTerms = await db.term.findMany({
        where: { sessionId: params.sessionId },
        select: { id: true },
    });
    const termIds = sessionTerms.map((term: any) => term.id);

    if (classArmIds.length === 0 || termIds.length === 0) {
        return;
    }

    const [scoreCount, workflowCount, parentTeacherAssignments] = await Promise.all([
        db.score.count({
            where: {
                subjectId: { in: params.subjectIds },
                termId: { in: termIds },
                student: {
                    schoolId: params.schoolId,
                    classArmId: { in: classArmIds },
                },
            },
        }),
        db.scoreSheetWorkflow.count({
            where: {
                schoolId: params.schoolId,
                classArmId: { in: classArmIds },
                termId: { in: termIds },
                subjectId: { in: params.subjectIds },
            },
        }),
        db.teacherSubject.count({
            where: {
                subjectId: params.subjectIds[0],
                classArmId: { in: classArmIds },
            },
        }),
    ]);

    if (parentTeacherAssignments > 0) {
        throw new CompositeConflictError("The parent subject already has teacher assignments in this class. Remove those assignments before enabling composite setup.");
    }

    if (scoreCount > 0 || workflowCount > 0) {
        throw new CompositeConflictError("Composite setup cannot be changed after scores or workflows already exist for this session and class.");
    }
}

async function syncSubjectKinds(tx: any, subjectIds: string[]) {
    const uniqueSubjectIds = Array.from(new Set(subjectIds.filter(Boolean)));
    if (uniqueSubjectIds.length === 0) return;

    const [parentUsage, componentUsage, componentParentUsage] = await Promise.all([
        tx.compositeSubjectConfig.findMany({
            where: {
                parentSubjectId: { in: uniqueSubjectIds },
                isActive: true,
            },
            select: { parentSubjectId: true },
        }),
        tx.compositeSubjectComponent.findMany({
            where: {
                componentSubjectId: { in: uniqueSubjectIds },
                compositeConfig: { isActive: true },
            },
            select: { componentSubjectId: true },
        }),
        tx.compositeSubjectComponent.findMany({
            where: {
                componentSubjectId: { in: uniqueSubjectIds },
                compositeConfig: { isActive: true },
            },
            select: {
                componentSubjectId: true,
                compositeConfig: {
                    select: { parentSubjectId: true },
                },
            },
        }),
    ]);

    const parentSet = new Set(parentUsage.map((item: any) => item.parentSubjectId));
    const componentSet = new Set(componentUsage.map((item: any) => item.componentSubjectId));
    const defaultParentByComponent = new Map<string, string>();
    componentParentUsage.forEach((item: any) => {
        if (!defaultParentByComponent.has(item.componentSubjectId)) {
            defaultParentByComponent.set(item.componentSubjectId, item.compositeConfig.parentSubjectId);
        }
    });

    await Promise.all(
        uniqueSubjectIds.map((subjectId) => {
            const data: any = {};

            if (parentSet.has(subjectId)) {
                data.subjectKind = SubjectKind.COMPOSITE_PARENT;
            } else if (componentSet.has(subjectId)) {
                data.subjectKind = SubjectKind.COMPOSITE_COMPONENT;
                data.defaultParentSubjectId = defaultParentByComponent.get(subjectId) || null;
            } else {
                data.subjectKind = SubjectKind.STANDARD;
                data.defaultParentSubjectId = null;
            }

            return tx.subject.update({
                where: { id: subjectId },
                data,
            });
        })
    );
}

async function syncCompositeConfigDerivedEnrollments(tx: any, params: {
    sessionId: string;
    classId: string;
    parentSubjectId: string;
    componentSubjectIds: string[];
}) {
    const [classArms, sessionTerms] = await Promise.all([
        tx.classArm.findMany({
            where: { classId: params.classId },
            select: { id: true },
        }),
        tx.term.findMany({
            where: { sessionId: params.sessionId },
            select: { id: true },
        }),
    ]);

    const classArmIds = classArms.map((arm: any) => arm.id);
    const termIds = sessionTerms.map((term: any) => term.id);

    if (classArmIds.length === 0 || termIds.length === 0) {
        return;
    }

    await tx.subjectEnrollment.deleteMany({
        where: {
            classArmId: { in: classArmIds },
            termId: { in: termIds },
            isDerived: true,
            derivedFromSubjectId: params.parentSubjectId,
        },
    });

    if (params.componentSubjectIds.length === 0) {
        return;
    }

    const parentEnrollments = await tx.subjectEnrollment.findMany({
        where: {
            subjectId: params.parentSubjectId,
            classArmId: { in: classArmIds },
            termId: { in: termIds },
        },
        select: {
            studentId: true,
            classArmId: true,
            termId: true,
            isActive: true,
        },
    });

    if (parentEnrollments.length === 0) {
        return;
    }

    await tx.subjectEnrollment.createMany({
        data: parentEnrollments.flatMap((enrollment: any) =>
            params.componentSubjectIds.map((componentSubjectId) => ({
                studentId: enrollment.studentId,
                subjectId: componentSubjectId,
                classArmId: enrollment.classArmId,
                termId: enrollment.termId,
                isActive: enrollment.isActive,
                isDerived: true,
                derivedFromSubjectId: params.parentSubjectId,
            }))
        ),
        skipDuplicates: true,
    });
}

async function syncCompositeSubjectClassArms(tx: any, params: {
    classId: string;
    parentSubjectId: string;
    desiredComponentSubjectIds: string[];
}) {
    const parentAssignments = await tx.subjectClassArm.findMany({
        where: {
            subjectId: params.parentSubjectId,
            classArm: { classId: params.classId },
        },
        select: { classArmId: true },
    });

    const classArmIds = parentAssignments.map((item: any) => item.classArmId);
    if (classArmIds.length === 0 || params.desiredComponentSubjectIds.length === 0) {
        return;
    }

    const desiredPairs = params.desiredComponentSubjectIds.flatMap((subjectId) =>
        classArmIds.map((classArmId: string) => ({ subjectId, classArmId }))
    );

    const existingPairs = await tx.subjectClassArm.findMany({
        where: {
            subjectId: { in: params.desiredComponentSubjectIds },
            classArmId: { in: classArmIds },
        },
        select: { subjectId: true, classArmId: true },
    });
    const existingPairSet = new Set(existingPairs.map((item: any) => `${item.subjectId}:${item.classArmId}`));

    const missingPairs = desiredPairs.filter((item) => !existingPairSet.has(`${item.subjectId}:${item.classArmId}`));
    if (missingPairs.length > 0) {
        await tx.subjectClassArm.createMany({
            data: missingPairs,
            skipDuplicates: true,
        });
    }
}

async function cleanupRemovedComponentClassArms(tx: any, params: {
    classId: string;
    removedSubjectIds: string[];
    parentSubjectId: string;
}) {
    if (params.removedSubjectIds.length === 0) return;

    const parentAssignments = await tx.subjectClassArm.findMany({
        where: {
            subjectId: params.parentSubjectId,
            classArm: { classId: params.classId },
        },
        select: { classArmId: true },
    });
    const classArmIds = parentAssignments.map((item: any) => item.classArmId);
    if (classArmIds.length === 0) return;

    await tx.subjectClassArm.deleteMany({
        where: {
            subjectId: { in: params.removedSubjectIds },
            classArmId: { in: classArmIds },
        },
    });
}

export async function saveCompositeSubjectConfig(db: any, params: SaveCompositeConfigParams) {
    const [parentSubject, sessionRecord, classRecord] = await Promise.all([
        db.subject.findFirst({
            where: { id: params.parentSubjectId, schoolId: params.schoolId },
            select: {
                id: true,
                name: true,
                code: true,
                category: true,
                subjectKind: true,
            },
        }),
        db.academicSession.findFirst({
            where: { id: params.sessionId, schoolId: params.schoolId },
            select: { id: true, name: true },
        }),
        db.class.findFirst({
            where: { id: params.classId, schoolId: params.schoolId },
            select: { id: true, name: true },
        }),
    ]);

    if (!parentSubject || !sessionRecord || !classRecord) {
        throw new CompositeValidationError("Invalid parent subject, session, or class.");
    }

    const normalizedComponents = params.components.map(normalizeComponentInput);
    if (normalizedComponents.length === 0) {
        throw new CompositeValidationError("At least one component subject is required.");
    }

    const duplicateKeys = new Set<string>();
    normalizedComponents.forEach((component) => {
        const key = component.componentSubjectId || component.createComponent?.name?.toLowerCase() || "";
        if (!key) {
            throw new CompositeValidationError("Each component must select an existing subject or provide a new subject name.");
        }
        if (duplicateKeys.has(key)) {
            throw new CompositeValidationError("Duplicate component subjects are not allowed.");
        }
        duplicateKeys.add(key);
    });

    const parentAssessmentTypes = await getResolvedAssessmentTypesForClassContext(db, {
        schoolId: params.schoolId,
        classId: params.classId,
    });

    const existingConfig = await db.compositeSubjectConfig.findFirst({
        where: {
            sessionId: params.sessionId,
            classId: params.classId,
            parentSubjectId: params.parentSubjectId,
        },
        include: {
            components: {
                select: { componentSubjectId: true },
            },
        },
    });

    const existingComponentIds = existingConfig?.components.map((item: any) => item.componentSubjectId) || [];

    return db.$transaction(async (tx: any) => {
        const resolvedComponents: CompositeComponentDefinition[] = [];

        for (const component of normalizedComponents) {
            let componentSubjectId = component.componentSubjectId;

            if (component.createComponent?.name) {
                const existingSubject = await tx.subject.findFirst({
                    where: {
                        schoolId: params.schoolId,
                        name: component.createComponent.name,
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                });

                if (existingSubject) {
                    componentSubjectId = existingSubject.id;
                } else {
                    const createdSubject = await tx.subject.create({
                        data: {
                            name: component.createComponent.name,
                            code: component.createComponent.code || component.createComponent.name.slice(0, 3).toUpperCase(),
                            category: (component.createComponent.category || parentSubject.category) as any,
                            schoolId: params.schoolId,
                            subjectKind: SubjectKind.COMPOSITE_COMPONENT,
                            defaultParentSubjectId: params.parentSubjectId,
                        },
                        select: { id: true },
                    });
                    componentSubjectId = createdSubject.id;
                }
            }

            if (!componentSubjectId) {
                throw new CompositeValidationError("Each component must have a valid subject.");
            }

            if (componentSubjectId === params.parentSubjectId) {
                throw new CompositeValidationError("A parent subject cannot also be one of its components.");
            }

            const componentSubject = await tx.subject.findFirst({
                where: { id: componentSubjectId, schoolId: params.schoolId },
                select: {
                    id: true,
                    name: true,
                    defaultParentSubjectId: true,
                },
            });

            if (!componentSubject) {
                throw new CompositeValidationError("One or more component subjects are invalid.");
            }

            if (
                componentSubject.defaultParentSubjectId &&
                componentSubject.defaultParentSubjectId !== params.parentSubjectId
            ) {
                throw new CompositeValidationError(`${componentSubject.name} is already linked to a different composite parent subject.`);
            }

            resolvedComponents.push({
                componentSubjectId,
                componentSubjectName: componentSubject.name,
                orderIndex: component.orderIndex,
                ca1Max: component.ca1Max,
                ca2Max: component.ca2Max,
                ca3Max: component.ca3Max,
                examMax: component.examMax,
            });
        }

        validateCompositeComponentMaxima(parentAssessmentTypes, resolvedComponents);

        await assertCompositeConfigCanChange(tx, {
            schoolId: params.schoolId,
            sessionId: params.sessionId,
            classId: params.classId,
            subjectIds: [
                params.parentSubjectId,
                ...resolvedComponents.map((item) => item.componentSubjectId),
                ...existingComponentIds,
            ],
        });

        const savedConfig = await tx.compositeSubjectConfig.upsert({
            where: {
                sessionId_classId_parentSubjectId: {
                    sessionId: params.sessionId,
                    classId: params.classId,
                    parentSubjectId: params.parentSubjectId,
                },
            },
            update: {
                isActive: true,
            },
            create: {
                schoolId: params.schoolId,
                sessionId: params.sessionId,
                classId: params.classId,
                parentSubjectId: params.parentSubjectId,
                isActive: true,
            },
            select: { id: true },
        });

        await tx.compositeSubjectComponent.deleteMany({
            where: { compositeConfigId: savedConfig.id },
        });

        if (resolvedComponents.length > 0) {
            await tx.compositeSubjectComponent.createMany({
                data: resolvedComponents.map((component) => ({
                    compositeConfigId: savedConfig.id,
                    componentSubjectId: component.componentSubjectId,
                    orderIndex: component.orderIndex,
                    ca1Max: component.ca1Max,
                    ca2Max: component.ca2Max,
                    ca3Max: component.ca3Max,
                    examMax: component.examMax,
                })),
            });
        }

        await tx.subject.update({
            where: { id: params.parentSubjectId },
            data: { subjectKind: SubjectKind.COMPOSITE_PARENT },
        });

        const componentSubjectIds = resolvedComponents.map((item) => item.componentSubjectId);
        if (componentSubjectIds.length > 0) {
            await tx.subject.updateMany({
                where: { id: { in: componentSubjectIds } },
                data: {
                    subjectKind: SubjectKind.COMPOSITE_COMPONENT,
                    defaultParentSubjectId: params.parentSubjectId,
                },
            });
        }

        await syncCompositeSubjectClassArms(tx, {
            classId: params.classId,
            parentSubjectId: params.parentSubjectId,
            desiredComponentSubjectIds: componentSubjectIds,
        });

        const removedSubjectIds = existingComponentIds.filter((id: string) => !componentSubjectIds.includes(id));
        await cleanupRemovedComponentClassArms(tx, {
            classId: params.classId,
            removedSubjectIds,
            parentSubjectId: params.parentSubjectId,
        });

        await syncCompositeConfigDerivedEnrollments(tx, {
            sessionId: params.sessionId,
            classId: params.classId,
            parentSubjectId: params.parentSubjectId,
            componentSubjectIds,
        });

        await syncSubjectKinds(tx, [params.parentSubjectId, ...existingComponentIds, ...componentSubjectIds]);

        return tx.compositeSubjectConfig.findUnique({
            where: { id: savedConfig.id },
            include: {
                parentSubject: {
                    select: { id: true, name: true },
                },
                components: {
                    include: {
                        componentSubject: {
                            select: { id: true, name: true },
                        },
                    },
                    orderBy: [
                        { orderIndex: "asc" },
                        { componentSubject: { name: "asc" } },
                    ],
                },
            },
        });
    }, {
        maxWait: 10000,
        timeout: 60000,
    });
}

export async function deleteCompositeSubjectConfig(db: any, params: {
    schoolId: string;
    configId?: string | null;
    sessionId?: string | null;
    classId?: string | null;
    parentSubjectId?: string | null;
}) {
    const config = params.configId
        ? await db.compositeSubjectConfig.findFirst({
            where: {
                id: params.configId,
                schoolId: params.schoolId,
            },
            include: { components: true },
        })
        : await db.compositeSubjectConfig.findFirst({
            where: {
                schoolId: params.schoolId,
                sessionId: params.sessionId ?? undefined,
                classId: params.classId ?? undefined,
                parentSubjectId: params.parentSubjectId ?? undefined,
            },
            include: { components: true },
        });

    if (!config) {
        throw new CompositeNotFoundError("Composite configuration not found.");
    }

    await assertCompositeConfigCanChange(db, {
        schoolId: params.schoolId,
        sessionId: config.sessionId,
        classId: config.classId,
        subjectIds: [
            config.parentSubjectId,
            ...config.components.map((item: any) => item.componentSubjectId),
        ],
    });

    await db.$transaction(async (tx: any) => {
        await cleanupRemovedComponentClassArms(tx, {
            classId: config.classId,
            removedSubjectIds: config.components.map((item: any) => item.componentSubjectId),
            parentSubjectId: config.parentSubjectId,
        });

        await syncCompositeConfigDerivedEnrollments(tx, {
            sessionId: config.sessionId,
            classId: config.classId,
            parentSubjectId: config.parentSubjectId,
            componentSubjectIds: [],
        });

        await tx.compositeSubjectConfig.delete({
            where: { id: config.id },
        });

        await syncSubjectKinds(tx, [
            config.parentSubjectId,
            ...config.components.map((item: any) => item.componentSubjectId),
        ]);
    }, {
        maxWait: 10000,
        timeout: 60000,
    });
}

export async function syncCompositeEnrollments(db: any, params: SyncCompositeEnrollmentsParams) {
    const compositeContext = await resolveCompositeSubjectContext(db, {
        schoolId: params.schoolId,
        sessionId: params.sessionId,
        subjectId: params.parentSubjectId,
        classArmId: params.classArmId,
    });

    if (compositeContext.mode !== "COMPOSITE_PARENT" || !compositeContext.config) {
        return;
    }

    const componentSubjectIds = compositeContext.components.map((item) => item.componentSubjectId);
    if (componentSubjectIds.length === 0) {
        return;
    }

    const parentEnrollments = await db.subjectEnrollment.findMany({
        where: {
            subjectId: params.parentSubjectId,
            classArmId: params.classArmId,
            termId: params.termId,
        },
        select: {
            studentId: true,
            isActive: true,
        },
    });

    await db.$transaction(async (tx: any) => {
        await tx.subjectEnrollment.deleteMany({
            where: {
                classArmId: params.classArmId,
                termId: params.termId,
                subjectId: { in: componentSubjectIds },
                isDerived: true,
                derivedFromSubjectId: params.parentSubjectId,
            },
        });

        if (parentEnrollments.length === 0) {
            return;
        }

        await tx.subjectEnrollment.createMany({
            data: componentSubjectIds.flatMap((componentSubjectId) =>
                parentEnrollments.map((enrollment: any) => ({
                    studentId: enrollment.studentId,
                    subjectId: componentSubjectId,
                    classArmId: params.classArmId,
                    termId: params.termId,
                    isActive: enrollment.isActive,
                    isDerived: true,
                    derivedFromSubjectId: params.parentSubjectId,
                }))
            ),
            skipDuplicates: true,
        });
    });
}

async function getStudentsForCompositeRecompute(db: any, params: {
    schoolId: string;
    classArmId: string;
    termId: string;
    currentSession: boolean;
    parentSubjectId: string;
    componentSubjectIds: string[];
    studentIds?: string[];
}) {
    if (params.studentIds && params.studentIds.length > 0) {
        return Array.from(new Set(params.studentIds));
    }

    const [currentStudents, reportCards, enrollments, componentScores] = await Promise.all([
        params.currentSession
            ? db.student.findMany({
                where: {
                    schoolId: params.schoolId,
                    classArmId: params.classArmId,
                    isActive: true,
                },
                select: { id: true },
            })
            : Promise.resolve([]),
        db.reportCard.findMany({
            where: {
                termId: params.termId,
                classArmId: params.classArmId,
            },
            select: { studentId: true },
            distinct: ["studentId"],
        }),
        db.subjectEnrollment.findMany({
            where: {
                termId: params.termId,
                classArmId: params.classArmId,
                subjectId: { in: [params.parentSubjectId, ...params.componentSubjectIds] },
            },
            select: { studentId: true },
            distinct: ["studentId"],
        }),
        db.score.findMany({
            where: {
                termId: params.termId,
                subjectId: { in: params.componentSubjectIds },
                student: { schoolId: params.schoolId },
            },
            select: { studentId: true },
            distinct: ["studentId"],
        }),
    ]);

    const ids = new Set<string>();
    currentStudents.forEach((item: any) => ids.add(item.id));
    reportCards.forEach((item: any) => ids.add(item.studentId));
    enrollments.forEach((item: any) => ids.add(item.studentId));
    componentScores.forEach((item: any) => ids.add(item.studentId));
    return Array.from(ids);
}

export async function recomputeCompositeParentScores(db: any, params: RecomputeCompositeParentScoresParams) {
    const compositeConfig = await db.compositeSubjectConfig.findFirst({
        where: {
            id: params.compositeConfigId,
            schoolId: params.schoolId,
            sessionId: params.sessionId,
            isActive: true,
        },
        include: {
            components: {
                include: {
                    componentSubject: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: [
                    { orderIndex: "asc" },
                    { componentSubject: { name: "asc" } },
                ],
            },
        },
    });

    if (!compositeConfig) {
        return;
    }

    const [term, classArm, parentAssessmentTypes, allGradingRules] = await Promise.all([
        db.term.findUnique({
            where: { id: params.termId },
            include: { session: { select: { isCurrent: true } } },
        }),
        db.classArm.findUnique({
            where: { id: params.classArmId },
            select: {
                id: true,
                classId: true,
                class: { select: { level: true } },
            },
        }),
        getResolvedAssessmentTypesForClassContext(db, {
            schoolId: params.schoolId,
            classArmId: params.classArmId,
        }),
        db.gradingRule.findMany({
            where: { schoolId: params.schoolId },
            orderBy: { minScore: "desc" },
        }),
    ]);

    if (!term || !classArm || classArm.classId !== compositeConfig.classId) {
        return;
    }

    const category = classLevelToCategory(classArm.class?.level);
    const categoryRules = category
        ? allGradingRules.filter((rule: any) => rule.schoolCategory === category)
        : [];
    const gradingRules = categoryRules.length > 0
        ? categoryRules
        : allGradingRules.filter((rule: any) => rule.schoolCategory === null);

    const componentSubjectIds = compositeConfig.components.map((item: any) => item.componentSubjectId);
    if (componentSubjectIds.length === 0) {
        return;
    }

    const targetStudentIds = await getStudentsForCompositeRecompute(db, {
        schoolId: params.schoolId,
        classArmId: params.classArmId,
        termId: params.termId,
        currentSession: term.session?.isCurrent ?? true,
        parentSubjectId: compositeConfig.parentSubjectId,
        componentSubjectIds,
        studentIds: params.studentIds,
    });

    if (targetStudentIds.length === 0) {
        return;
    }

    const componentScores = await db.score.findMany({
        where: {
            termId: params.termId,
            subjectId: { in: componentSubjectIds },
            studentId: { in: targetStudentIds },
        },
        select: {
            studentId: true,
            subjectId: true,
            ca1: true,
            ca2: true,
            ca3: true,
            exam: true,
        },
    });

    const scoresByStudent = new Map<string, typeof componentScores>();
    componentScores.forEach((score: any) => {
        if (!scoresByStudent.has(score.studentId)) {
            scoresByStudent.set(score.studentId, []);
        }
        scoresByStudent.get(score.studentId)!.push(score);
    });

    const upsertOperations = targetStudentIds.map((studentId) => {
        const parts = scoresByStudent.get(studentId) || [];
        const totals = parts.reduce((acc: typeof ZERO_FIELD_TOTALS, score: any) => ({
            ca1: acc.ca1 + Number(score.ca1 || 0),
            ca2: acc.ca2 + Number(score.ca2 || 0),
            ca3: acc.ca3 + Number(score.ca3 || 0),
            exam: acc.exam + Number(score.exam || 0),
        }), { ...ZERO_FIELD_TOTALS });

        const totalSummary = calculateEndOfTermScoreTotals(totals, parentAssessmentTypes);
        const { grade, remark } = calculateGrade(totalSummary.adjustedTotal, gradingRules);

        return db.score.upsert({
            where: {
                studentId_subjectId_termId: {
                    studentId,
                    subjectId: compositeConfig.parentSubjectId,
                    termId: params.termId,
                },
            },
            update: {
                ca1: totals.ca1,
                ca2: totals.ca2,
                ca3: totals.ca3,
                exam: totals.exam,
                total: totalSummary.adjustedTotal,
                grade,
                remark,
                isDerived: true,
                derivedFromCompositeConfigId: compositeConfig.id,
                updatedById: params.actorUserId ?? undefined,
            },
            create: {
                studentId,
                subjectId: compositeConfig.parentSubjectId,
                termId: params.termId,
                ca1: totals.ca1,
                ca2: totals.ca2,
                ca3: totals.ca3,
                exam: totals.exam,
                total: totalSummary.adjustedTotal,
                grade,
                remark,
                isDerived: true,
                derivedFromCompositeConfigId: compositeConfig.id,
                createdById: params.actorUserId ?? undefined,
                updatedById: params.actorUserId ?? undefined,
            },
        });
    });

    await db.$transaction(upsertOperations);

    const allParentScores = await db.score.findMany({
        where: {
            termId: params.termId,
            subjectId: compositeConfig.parentSubjectId,
            student: {
                classArmId: params.classArmId,
            },
        },
        select: { id: true, total: true },
    });

    allParentScores.sort((left: any, right: any) => Number(right.total) - Number(left.total));

    let currentRank = 0;
    let previousTotal: string | null = null;
    const rankUpdates = allParentScores.map((score: any, index: number) => {
        const totalKey = String(score.total);
        if (previousTotal === null || totalKey !== previousTotal) {
            currentRank = index + 1;
            previousTotal = totalKey;
        }

        return db.score.update({
            where: { id: score.id },
            data: { subjectPosition: currentRank },
        });
    });

    if (rankUpdates.length > 0) {
        await db.$transaction(rankUpdates);
    }
}

export function isCompositeReportVisible(subject: { subjectKind?: SubjectKind | null }) {
    return subject.subjectKind !== SubjectKind.COMPOSITE_COMPONENT;
}
