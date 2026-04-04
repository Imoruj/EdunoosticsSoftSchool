import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ALL_ENABLED_FEATURES, type FeatureFlags, getSchoolFeatures } from "@/lib/getSchoolFeatures";
import {
    createEmptyPermissionState,
    createPermissionState,
    getPermissionDefinition,
    getRoleDefaultPermissionKeys,
    isManagedRolePermissionRole,
    MANAGED_ROLE_PERMISSION_ROLES,
    type ManagedRolePermissionRole,
    type PermissionKey,
    type PermissionState,
} from "@/lib/permissions";

export type RolePermissionMatrix = Record<ManagedRolePermissionRole, PermissionState>;

export type RolePermissionAssignments = Record<ManagedRolePermissionRole, PermissionKey[]>;

type EffectivePermissionUser = {
    roles?: string[] | null;
    schoolId?: string | null;
};

function normalizePermissionKeys(
    role: ManagedRolePermissionRole,
    rawKeys: unknown
): PermissionKey[] {
    const allowedKeys = new Set(getRoleDefaultPermissionKeys(role));
    if (!Array.isArray(rawKeys)) {
        return getRoleDefaultPermissionKeys(role);
    }

    return Array.from(new Set(
        rawKeys
            .filter((key): key is string => typeof key === "string")
            .map((key) => key.trim())
            .filter((key): key is PermissionKey => allowedKeys.has(key as PermissionKey))
    ));
}

function applySchoolFeatureFlags(
    permissions: PermissionState,
    schoolFeatures: FeatureFlags
): PermissionState {
    const next = { ...permissions };

    for (const key of Object.keys(next) as PermissionKey[]) {
        const definition = getPermissionDefinition(key);
        if (definition.schoolFeatureKey && !schoolFeatures[definition.schoolFeatureKey]) {
            next[key] = false;
        }
    }

    return next;
}

export function createRolePermissionMatrix(assignments: RolePermissionAssignments): RolePermissionMatrix {
    return Object.fromEntries(
        MANAGED_ROLE_PERMISSION_ROLES.map((role) => [role, createPermissionState(assignments[role] || [])])
    ) as RolePermissionMatrix;
}

export async function getRolePermissionAssignments(schoolId: string): Promise<RolePermissionAssignments> {
    const records = await prisma.$transaction(
        MANAGED_ROLE_PERMISSION_ROLES.map((role) =>
            prisma.rolePermissionControl.upsert({
                where: {
                    schoolId_role: {
                        schoolId,
                        role: role as UserRole,
                    },
                },
                update: {},
                create: {
                    schoolId,
                    role: role as UserRole,
                    permissions: getRoleDefaultPermissionKeys(role),
                },
                select: {
                    role: true,
                    permissions: true,
                },
            })
        )
    );

    return Object.fromEntries(
        MANAGED_ROLE_PERMISSION_ROLES.map((role) => {
            const record = records.find((item) => item.role === role);
            return [role, normalizePermissionKeys(role, record?.permissions || [])];
        })
    ) as RolePermissionAssignments;
}

export async function getRolePermissionMatrix(schoolId: string): Promise<RolePermissionMatrix> {
    const assignments = await getRolePermissionAssignments(schoolId);
    return createRolePermissionMatrix(assignments);
}

export async function saveRolePermissionAssignments(
    schoolId: string,
    rawAssignments: Partial<Record<ManagedRolePermissionRole, unknown>>
): Promise<RolePermissionAssignments> {
    await prisma.$transaction(
        MANAGED_ROLE_PERMISSION_ROLES.map((role) =>
            prisma.rolePermissionControl.upsert({
                where: {
                    schoolId_role: {
                        schoolId,
                        role: role as UserRole,
                    },
                },
                update: {
                    permissions: normalizePermissionKeys(role, rawAssignments[role]),
                },
                create: {
                    schoolId,
                    role: role as UserRole,
                    permissions: normalizePermissionKeys(role, rawAssignments[role]),
                },
            })
        )
    );

    return getRolePermissionAssignments(schoolId);
}

export async function getEffectivePermissionsForUser(
    user: EffectivePermissionUser | null | undefined
): Promise<PermissionState> {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const schoolId = typeof user?.schoolId === "string" ? user.schoolId : "";

    if (roles.includes("SUPER_ADMIN")) {
        return createPermissionState(
            Array.from(new Set(MANAGED_ROLE_PERMISSION_ROLES.flatMap((role) => getRoleDefaultPermissionKeys(role))))
        );
    }

    if (!schoolId) {
        return createPermissionState(
            Array.from(new Set(
                roles
                    .filter(isManagedRolePermissionRole)
                    .flatMap((role) => getRoleDefaultPermissionKeys(role))
            ))
        );
    }

    const [assignments, schoolFeatures] = await Promise.all([
        getRolePermissionAssignments(schoolId),
        getSchoolFeatures(schoolId),
    ]);

    const base = createEmptyPermissionState();
    for (const role of roles) {
        if (!isManagedRolePermissionRole(role)) continue;
        for (const key of assignments[role] || []) {
            base[key] = true;
        }
    }

    return applySchoolFeatureFlags(base, schoolFeatures);
}

export function getDefaultEffectivePermissionsForRoles(roles: string[]): PermissionState {
    const base = createEmptyPermissionState();

    if (roles.includes("SUPER_ADMIN")) {
        for (const role of MANAGED_ROLE_PERMISSION_ROLES) {
            for (const key of getRoleDefaultPermissionKeys(role)) {
                base[key] = true;
            }
        }
        return base;
    }

    for (const role of roles) {
        if (!isManagedRolePermissionRole(role)) continue;
        for (const key of getRoleDefaultPermissionKeys(role)) {
            base[key] = true;
        }
    }

    return applySchoolFeatureFlags(base, ALL_ENABLED_FEATURES);
}
