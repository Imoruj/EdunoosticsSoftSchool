import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {

    interface Session {
        user: {
            id: string;
            roles: string[];
            schoolId: string | null;
            schoolName: string | null;
            loginType?: string;
            loginProfileId?: string | null;
            assignedClass: string | null;
            avatarUrl?: string | null;
            mustChangePassword?: boolean;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        roles: string[];
        schoolId: string | null;
        schoolName: string | null;
        loginType?: string;
        loginProfileId?: string | null;
        assignedClass: string | null;
        avatarUrl?: string | null;
        mustChangePassword?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string;
        roles: string[];
        schoolId: string | null;
        schoolName: string | null;
        loginType?: string;
        loginProfileId?: string | null;
        assignedClass: string | null;
        avatarUrl?: string | null;
        mustChangePassword?: boolean;
    }
}
