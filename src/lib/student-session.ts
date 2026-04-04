import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Whether this session should use the student (ward) reports experience:
 * student login, or a user flagged with the STUDENT role (same as dashboard reports page).
 */
export function isStudentSessionUser(user: {
    loginType?: string | null;
    roles?: string[] | null;
}): boolean {
    const roles = Array.isArray(user.roles) ? user.roles : [];
    return user.loginType === "student" || roles.includes(UserRole.STUDENT);
}

/**
 * Resolves the Student.id for API authorization. Uses loginProfileId when present for
 * student login; otherwise looks up Student by userId so published reports still work if
 * the session omitted loginProfileId.
 */
export async function resolveStudentRecordIdForUser(user: {
    id: string;
    loginType?: string | null;
    loginProfileId?: string | null;
    roles?: string[] | null;
}): Promise<string | null> {
    if (!user?.id) return null;

    if (user.loginType === "student" && user.loginProfileId) {
        return user.loginProfileId;
    }

    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (!roles.includes(UserRole.STUDENT) && user.loginType !== "student") {
        return user.loginProfileId ?? null;
    }

    const row = await prisma.student.findFirst({
        where: { userId: user.id },
        select: { id: true },
    });
    if (row) return row.id;

    return user.loginProfileId ?? null;
}
