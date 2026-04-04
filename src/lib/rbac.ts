import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { getSafeServerSession } from "@/lib/server-session";

type RoleLike = UserRole | string;

type SessionUserLike = {
    roles?: string[] | null;
};

const SCHOOL_ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN] as const;
const EXECUTIVE_ROLES = [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PROPRIETOR] as const;
const TEACHER_ROLES = [
    ...SCHOOL_ADMIN_ROLES,
    UserRole.CLASS_TEACHER,
    UserRole.SUBJECT_TEACHER,
] as const;

export function getUserRoles(user: SessionUserLike | null | undefined): string[] {
    return Array.isArray(user?.roles) ? user.roles : [];
}

export function hasAnyRole(
    user: SessionUserLike | null | undefined,
    allowedRoles: readonly RoleLike[]
): boolean {
    const roles = getUserRoles(user);
    return allowedRoles.some((role) => roles.includes(role));
}

export function isSchoolAdmin(user: SessionUserLike | null | undefined): boolean {
    return hasAnyRole(user, SCHOOL_ADMIN_ROLES);
}

export function isExecutiveViewer(user: SessionUserLike | null | undefined): boolean {
    return hasAnyRole(user, EXECUTIVE_ROLES);
}

export function isTeacher(user: SessionUserLike | null | undefined): boolean {
    return hasAnyRole(user, TEACHER_ROLES);
}

async function requireRoles(_req: NextRequest | undefined, allowedRoles: readonly RoleLike[]) {
    const session = await getSafeServerSession("RBAC guard");
    if (!session?.user) {
        return null;
    }

    return hasAnyRole(session.user as SessionUserLike, allowedRoles) ? session : null;
}

export async function requireSchoolAdmin(req?: NextRequest) {
    return requireRoles(req, SCHOOL_ADMIN_ROLES);
}

export async function requireExecutiveViewer(req?: NextRequest) {
    return requireRoles(req, EXECUTIVE_ROLES);
}

export async function requireTeacher(req?: NextRequest) {
    return requireRoles(req, TEACHER_ROLES);
}

export async function requireSuperAdmin(req?: NextRequest) {
    return requireRoles(req, [UserRole.SUPER_ADMIN]);
}
