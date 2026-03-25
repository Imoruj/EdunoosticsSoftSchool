type SchoolReader = {
    school: {
        findUnique(args: {
            where: { id: string };
            select: { id: true };
        }): Promise<{ id: string } | null>;
    };
};

export const STALE_SCHOOL_SESSION_MESSAGE = "Session expired. Please sign in again.";

export async function sessionSchoolExists(
    prismaClient: SchoolReader,
    schoolId: string | null | undefined
): Promise<boolean> {
    if (!schoolId) {
        return false;
    }

    const school = await prismaClient.school.findUnique({
        where: { id: schoolId },
        select: { id: true },
    });

    return Boolean(school);
}
