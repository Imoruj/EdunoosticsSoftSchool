import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            roles: string[];
            schoolId: string;
            schoolName: string | null;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        roles: string[];
        schoolId: string;
        schoolName: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string;
        roles: string[];
        schoolId: string;
        schoolName: string | null;
    }
}
