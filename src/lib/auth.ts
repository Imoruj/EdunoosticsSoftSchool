import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

type AuthUserRecord = {
    id: string;
    email: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
    roles: string[];
    schoolId: string | null;
    avatarUrl?: string | null;
    mustChangePassword?: boolean | null;
    isActive?: boolean | null;
    school?: {
        name?: string | null;
        isActive?: boolean | null;
        registrationStatus?: string | null;
        registrationRejectionReason?: string | null;
    } | null;
    // Populated via Prisma include for admin login
    classArms?: Array<{ armName: string; class: { name: string } }> | null;
    // Populated via spread for student login
    student?: { photoUrl?: string | null } | null;
    // Populated via Prisma include for parent login
    parent?: { id?: string | null } | null;
};

function assertActiveAccount(user: AuthUserRecord): asserts user is AuthUserRecord & { passwordHash: string } {
    if (!user.passwordHash) {
        throw new Error("Your account is not set up yet. Please contact your school administrator.");
    }

    if (user.isActive === false) {
        throw new Error("This account is inactive. Please contact your school administrator.");
    }

    if (user.school?.isActive === false) {
        if (user.school.registrationStatus === "PENDING") {
            throw new Error("Your school registration is pending approval. Please wait for administrator review.");
        }
        if (user.school.registrationStatus === "REJECTED") {
            const reason = user.school.registrationRejectionReason;
            throw new Error(
                reason
                    ? `Your school registration was rejected: ${reason}`
                    : "Your school registration was rejected. Please contact support."
            );
        }
        throw new Error("Your school account is inactive. Please contact support.");
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email/Admission", type: "text" },
                password: { label: "Password/PIN", type: "password" },
                loginType: { label: "Login Type", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Credentials are required");
                }

                const loginType = credentials.loginType || "admin";
                const identifier = credentials.email.trim();

                // Rate limit: 10 attempts per identifier per 15 minutes
                const allowed = rateLimit("login", identifier, { limit: 10, windowMs: 15 * 60 * 1000 });
                if (!allowed) {
                    throw new Error("Too many login attempts. Please try again later.");
                }
                const password = credentials.password.trim();

                let user: AuthUserRecord | null = null;
                let loginProfileId: string | null = null;

                try {
                    if (loginType === "admin") {
                        user = await prisma.user.findUnique({
                            where: { email: identifier.toLowerCase() },
                            include: {
                                school: true,
                                classArms: {
                                    include: { class: true },
                                },
                            },
                        }) as AuthUserRecord | null;
                    } else if (loginType === "parent") {
                        user = await prisma.user.findFirst({
                            where: {
                                email: {
                                    equals: identifier.toLowerCase(),
                                    mode: "insensitive",
                                },
                                roles: { has: "PARENT" },
                            },
                            include: { school: true, parent: true },
                        }) as AuthUserRecord | null;

                        loginProfileId = user?.parent?.id || null;
                    } else if (loginType === "student") {
                        const student = await prisma.student.findFirst({
                            where: {
                                admissionNumber: {
                                    equals: identifier,
                                    mode: "insensitive",
                                },
                            },
                            include: { user: { include: { school: true } } },
                        });

                        if (student) {
                            if (!student.user) {
                                throw new Error("Your account is not set up yet. Please contact your school administrator.");
                            }

                            user = {
                                ...student.user,
                                student,
                            } as AuthUserRecord;
                            loginProfileId = student.id;
                        }
                    }

                    if (!user) {
                        throw new Error("Invalid credentials");
                    }

                    assertActiveAccount(user);

                    const isValid = await bcrypt.compare(password, user.passwordHash);
                    if (!isValid) {
                        throw new Error("Invalid credentials");
                    }

                    const firstArm = user.classArms?.[0];
                    const assignedClass = firstArm
                        ? `${firstArm.class.name} ${firstArm.armName}`
                        : null;
                    const photoUrl =
                        (loginType === "student" ? user.student?.photoUrl : null) ||
                        user.avatarUrl ||
                        null;

                    return {
                        id: user.id,
                        email: user.email,
                        name: `${user.firstName} ${user.lastName}`,
                        roles: user.roles,
                        schoolId: user.schoolId || null,
                        schoolName: user.school?.name || null,
                        loginType,
                        loginProfileId,
                        assignedClass,
                        image: photoUrl,
                        avatarUrl: photoUrl,
                        mustChangePassword: user.mustChangePassword ?? false,
                    };
                } catch (error: any) {
                    console.error("[AUTH] Authorization error:", error?.message || error);
                    throw new Error(error.message || "Authentication failed");
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.roles = user.roles;
                token.schoolId = user.schoolId;
                token.schoolName = user.schoolName;
                token.loginType = user.loginType;
                token.loginProfileId = user.loginProfileId;
                token.assignedClass = user.assignedClass;
                token.avatarUrl = user.avatarUrl;
                token.mustChangePassword = user.mustChangePassword ?? false;
            }

            if (trigger === "update" && session) {
                if (session.user.name) token.name = session.user.name;
                if (session.user.avatarUrl) {
                    token.avatarUrl = session.user.avatarUrl;
                }
                if (session.user.mustChangePassword !== undefined) {
                    token.mustChangePassword = session.user.mustChangePassword;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.roles = token.roles;
                session.user.schoolId = token.schoolId;
                session.user.schoolName = token.schoolName;
                session.user.loginType = token.loginType;
                session.user.loginProfileId = token.loginProfileId;
                session.user.assignedClass = token.assignedClass;
                session.user.avatarUrl = token.avatarUrl;
                session.user.image = token.avatarUrl ?? null;
                session.user.mustChangePassword = token.mustChangePassword ?? false;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
        error: "/auth/login",
    },
    debug: process.env.NODE_ENV === "development",
    secret: process.env.NEXTAUTH_SECRET,
};

