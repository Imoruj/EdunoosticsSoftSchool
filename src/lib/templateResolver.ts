import type { PrismaClient } from "@prisma/client";

export type TemplateReportType = "halfTerm" | "endOfTerm";

type TemplateMappings = Record<string, Partial<Record<TemplateReportType, string>>>;

function normalizeMappings(raw: unknown): TemplateMappings {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw as TemplateMappings;
}

/**
 * Synchronously check for a class-specific template override.
 * Returns the template id if one is configured, or null otherwise.
 */
export function resolveClassArmOverride(params: {
    termId: string;
    classId: string | null | undefined;
    reportType: TemplateReportType;
    termMappings: unknown;
}): string | null {
    const { termId, classId, reportType, termMappings } = params;
    if (!classId) return null;
    const mappings = normalizeMappings(termMappings);
    const override = (mappings[termId] as any)?.classOverrides?.[classId]?.[reportType];
    return typeof override === "string" ? override : null;
}

export async function resolveTemplateForTerm(params: {
    prisma: PrismaClient;
    schoolId: string;
    termId: string;
    termNumber: number;
    reportType: TemplateReportType;
    termMappings: unknown;
    fallbackTemplate: string;
    classId?: string | null;
}): Promise<string> {
    const {
        prisma,
        schoolId,
        termId,
        termNumber,
        reportType,
        termMappings,
        fallbackTemplate,
        classId,
    } = params;

    // 0) Class-specific override — checked before any term-level mapping
    if (classId) {
        const classOverride = resolveClassArmOverride({ termId, classId, reportType, termMappings });
        if (classOverride) return classOverride;
    }

    const mappings = normalizeMappings(termMappings);
    const mappingTermIds = Object.keys(mappings);
    if (mappingTermIds.length === 0) return fallbackTemplate;

    // 1) Exact mapping for selected term
    const exact = mappings[termId]?.[reportType];
    if (exact) return exact;

    const [currentSessionTerms, mappedTerms] = await Promise.all([
        prisma.term.findMany({
            where: { session: { schoolId, isCurrent: true } },
            select: { id: true, termNumber: true, isCurrent: true, startDate: true },
        }),
        prisma.term.findMany({
            where: {
                id: { in: mappingTermIds },
                session: { schoolId },
            },
            select: {
                id: true,
                termNumber: true,
                startDate: true,
                session: { select: { isCurrent: true } },
            },
        }),
    ]);

    const sortedMappedTerms = [...mappedTerms].sort((a, b) => {
        const currentBias = Number(b.session.isCurrent) - Number(a.session.isCurrent);
        if (currentBias !== 0) return currentBias;
        return b.startDate.getTime() - a.startDate.getTime();
    });

    // 2) Same term number mapping from current session (admin mapping pattern)
    const currentSameNumber = currentSessionTerms.find(t => t.termNumber === termNumber);
    if (currentSameNumber) {
        const mapped = mappings[currentSameNumber.id]?.[reportType];
        if (mapped) return mapped;
    }

    // 3) Same term number mapping from any session
    for (const mappedTerm of sortedMappedTerms) {
        if (mappedTerm.termNumber !== termNumber) continue;
        const mapped = mappings[mappedTerm.id]?.[reportType];
        if (mapped) return mapped;
    }

    // 4) Current term mapping for this report type
    const currentTerm = currentSessionTerms.find(t => t.isCurrent) || currentSessionTerms[0];
    if (currentTerm) {
        const mapped = mappings[currentTerm.id]?.[reportType];
        if (mapped) return mapped;
    }

    // 5) Any available mapping for this report type
    for (const mappedTerm of sortedMappedTerms) {
        const mapped = mappings[mappedTerm.id]?.[reportType];
        if (mapped) return mapped;
    }

    // 6) Last fallback
    return fallbackTemplate;
}
