import { prisma } from "@/lib/prisma";

/**
 * Automatically sync the `isCurrent` flag on Term (and AcademicSession)
 * based on today's date vs. the stored start/end date ranges.
 *
 * Call this from server-side code before querying the current term.
 * It's idempotent — if the correct term is already current, it's a no-op.
 */
export async function syncCurrentTerm(schoolId: string): Promise<void> {
    const now = new Date();

    // Fetch all sessions with their terms for this school
    const sessions = await prisma.academicSession.findMany({
        where: { schoolId },
        include: { terms: { orderBy: { termNumber: "asc" } } },
    });

    // Respect admin-configured current session/term if already set.
    // Only fall back to date-based auto-selection when current flags are missing/invalid.
    const currentSessions = sessions.filter((session) => session.isCurrent);
    const currentTerms = sessions.flatMap((session) =>
        session.terms.filter((term) => term.isCurrent).map((term) => ({ sessionId: session.id, termId: term.id }))
    );

    if (
        currentSessions.length === 1 &&
        currentTerms.length === 1 &&
        currentTerms[0].sessionId === currentSessions[0].id
    ) {
        return;
    }

    let matchedSessionId: string | null = null;
    let matchedTermId: string | null = null;

    // Find which term's date range contains today
    for (const session of sessions) {
        for (const term of session.terms) {
            if (term.startDate <= now && term.endDate >= now) {
                matchedSessionId = session.id;
                matchedTermId = term.id;
                break;
            }
        }
        if (matchedTermId) break;
    }

    if (!matchedTermId || !matchedSessionId) {
        // No term covers today — don't change anything
        return;
    }

    // Check if the matched term is already current
    const currentSession = sessions.find((s) => s.isCurrent);
    const currentTerm = currentSession?.terms.find((t) => t.isCurrent);

    if (currentTerm?.id === matchedTermId && currentSession?.id === matchedSessionId) {
        // Already correct — no-op
        return;
    }

    // Update in a transaction
    await prisma.$transaction(async (tx) => {
        // Set correct session as current, unset others
        await tx.academicSession.updateMany({
            where: { schoolId, id: { not: matchedSessionId! } },
            data: { isCurrent: false },
        });
        await tx.academicSession.update({
            where: { id: matchedSessionId! },
            data: { isCurrent: true },
        });

        // Unset all terms in this school's sessions
        const allSessionIds = sessions.map((s) => s.id);
        await tx.term.updateMany({
            where: { sessionId: { in: allSessionIds } },
            data: { isCurrent: false },
        });

        // Set the matched term as current
        await tx.term.update({
            where: { id: matchedTermId! },
            data: { isCurrent: true },
        });
    });
}

