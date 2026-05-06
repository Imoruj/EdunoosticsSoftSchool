import { prisma } from "@/lib/prisma";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";
import { emailMatchesNameLoginPrefix } from "@/lib/branchLoginIdentity";

type SessionUserLike = {
    id?: string | null;
    schoolId?: string | null;
    roles?: string[] | null;
    activeBranchUserId?: string | null;
};

export async function getActiveBranchProfile(user: SessionUserLike) {
    const schoolId = await getActiveSchoolId(user.schoolId);
    const fallbackRoles = Array.isArray(user.roles) ? user.roles : [];

    if (!user.id || !schoolId) {
        return { userId: user.id ?? null, schoolId, roles: fallbackRoles };
    }

    if (user.activeBranchUserId && schoolId !== user.schoolId) {
        const activeUser = await prisma.user.findUnique({
            where: { id: user.activeBranchUserId },
            select: { id: true, roles: true, schoolId: true },
        });
        if (activeUser?.schoolId === schoolId) {
            return { userId: activeUser.id, schoolId, roles: activeUser.roles };
        }
    }

    const baseUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, firstName: true, lastName: true, roles: true, schoolId: true },
    });
    if (!baseUser) {
        return { userId: user.id, schoolId, roles: fallbackRoles };
    }

    const branchUsers = await prisma.user.findMany({
        where: { schoolId },
        select: { id: true, email: true, roles: true },
    });
    const branchUser = branchUsers.find((candidate) =>
        emailMatchesNameLoginPrefix(candidate.email, baseUser.firstName, baseUser.lastName)
    );

    if (branchUser) {
        return { userId: branchUser.id, schoolId, roles: branchUser.roles };
    }

    return { userId: baseUser.id, schoolId, roles: baseUser.roles };
}
