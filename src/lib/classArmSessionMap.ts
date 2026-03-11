import prisma from "@/lib/prisma";

export type SessionMap = Record<string, string[]>;

interface ClassArmTermPair {
    classArmId: string;
    termId: string;
}

function addSessionForTerm(
    sessionSetsByClassArm: Record<string, Set<string>>,
    termIdToSessionId: Map<string, string>,
    classArmId: string,
    termId: string
) {
    const sessionId = termIdToSessionId.get(termId);
    if (!sessionId) return;
    sessionSetsByClassArm[classArmId]?.add(sessionId);
}

export async function getSessionIdsByClassArms(
    schoolId: string,
    classArmIds: string[],
    currentSessionId: string | null
): Promise<SessionMap> {
    if (classArmIds.length === 0) return {};

    const sessionSetsByClassArm: Record<string, Set<string>> = Object.fromEntries(
        classArmIds.map((classArmId) => [classArmId, new Set<string>()])
    );

    const [terms, reportCardPairs, enrollmentPairs, scorePairs, activeClassArms] = await Promise.all([
        prisma.term.findMany({
            where: { session: { schoolId } },
            select: { id: true, sessionId: true },
        }),
        prisma.reportCard.findMany({
            where: {
                classArmId: { in: classArmIds },
                term: { session: { schoolId } },
            },
            select: { classArmId: true, termId: true },
            distinct: ["classArmId", "termId"],
        }),
        prisma.subjectEnrollment.findMany({
            where: {
                classArmId: { in: classArmIds },
                term: { session: { schoolId } },
            },
            select: { classArmId: true, termId: true },
            distinct: ["classArmId", "termId"],
        }),
        prisma.score.findMany({
            where: {
                term: { session: { schoolId } },
                student: { classArmId: { in: classArmIds } },
            },
            select: {
                studentId: true,
                termId: true,
                student: { select: { classArmId: true } },
            },
            distinct: ["studentId", "termId"],
        }),
        prisma.student.findMany({
            where: {
                schoolId,
                isActive: true,
                classArmId: { in: classArmIds },
            },
            select: { classArmId: true },
            distinct: ["classArmId"],
        }),
    ]);

    const termIdToSessionId = new Map<string, string>(
        terms.map((term) => [term.id, term.sessionId])
    );

    const addPair = ({ classArmId, termId }: ClassArmTermPair) => {
        addSessionForTerm(
            sessionSetsByClassArm,
            termIdToSessionId,
            classArmId,
            termId
        );
    };

    reportCardPairs.forEach(addPair);
    enrollmentPairs.forEach(addPair);

    for (const score of scorePairs) {
        const classArmId = score.student.classArmId;
        if (!classArmId) continue;
        addSessionForTerm(
            sessionSetsByClassArm,
            termIdToSessionId,
            classArmId,
            score.termId
        );
    }

    if (currentSessionId) {
        for (const record of activeClassArms) {
            if (!record.classArmId) continue;
            sessionSetsByClassArm[record.classArmId]?.add(currentSessionId);
        }
    }

    return Object.fromEntries(
        Object.entries(sessionSetsByClassArm).map(([classArmId, sessionIds]) => [
            classArmId,
            Array.from(sessionIds),
        ])
    );
}
