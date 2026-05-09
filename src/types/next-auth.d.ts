import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    /** Supported at runtime in next-auth v4.24+ for multi-domain deployments */
    interface AuthOptions {
        trustHost?: boolean;
    }

    interface Session {
        user: {
            id: string;
            roles: string[];
            schoolId: string | null;
            schoolName: string | null;
            /** School portal slug from `School.slug` (tenant subdomain / path login). */
            schoolSlug: string | null;
            loginType?: string;
            loginProfileId?: string | null;
            assignedClass: string | null;
            avatarUrl?: string | null;
            mustChangePassword?: boolean;
            // Multi-branch
            activeBranchId: string | null;
            branchIds: string[];
            canSwitchBranches: boolean;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        roles: string[];
        schoolId: string | null;
        schoolName: string | null;
        schoolSlug?: string | null;
        loginType?: string;
        loginProfileId?: string | null;
        assignedClass: string | null;
        avatarUrl?: string | null;
        mustChangePassword?: boolean;
        // Multi-branch
        activeBranchId: string | null;
        branchIds: string[];
        canSwitchBranches: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string;
        roles: string[];
        schoolId: string | null;
        schoolName: string | null;
        schoolSlug?: string | null;
        loginType?: string;
        loginProfileId?: string | null;
        assignedClass: string | null;
        avatarUrl?: string | null;
        mustChangePassword?: boolean;
        // Multi-branch
        activeBranchId: string | null;
        branchIds: string[];
        canSwitchBranches: boolean;
    }
}
