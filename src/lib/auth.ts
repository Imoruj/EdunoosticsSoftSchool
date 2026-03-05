// PrismaAdapter removed — not needed for JWT+CredentialsProvider and missing required DB tables
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    // adapter removed — using JWT strategy only, no Account/Session tables needed
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email/Admission", type: "text" },
                password: { label: "Password/PIN", type: "password" },
                loginType: { label: "Login Type", type: "text" }, // "admin", "parent", "student"
            },
            async authorize(credentials) {
                console.log("[AUTH] Raw credentials:", JSON.stringify(credentials));
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Credentials are required");
                }

                const loginType = credentials.loginType || "admin";
                const identifier = credentials.email.trim();
                const password = credentials.password.trim();

                console.log(`[AUTH] Attempting ${loginType} login for: ${identifier}`);
                let user = null;

                try {
                    let loginProfileId = null;

                    if (loginType === "admin") {
                        // Admin/Teacher Login (Email)
                        user = await prisma.user.findUnique({
                            where: { email: identifier.toLowerCase() },
                            include: {
                                school: true,
                                classArms: {
                                    include: { class: true }
                                }
                            },
                        });
                    } else if (loginType === "parent") {
                        // Parent Login (Email only)
                        user = await prisma.user.findFirst({
                            where: {
                                email: {
                                    equals: identifier.toLowerCase(),
                                    mode: "insensitive",
                                },
                                roles: { has: "PARENT" }
                            },
                            include: { school: true, parent: true },
                        });

                        loginProfileId = user?.parent?.id || null;
                    } else if (loginType === "student") {
                        // Student Login (Admission Number)
                        const student = await prisma.student.findFirst({
                            where: {
                                admissionNumber: {
                                    equals: identifier,
                                    mode: 'insensitive'
                                }
                            },
                            include: { user: { include: { school: true } } }
                        });
                        if (student) {
                            if (!student.user) {
                                console.log("[AUTH] Student found but has no User account:", identifier);
                                throw new Error("Your account is not set up yet. Please contact your school administrator.");
                            }
                            user = { ...student.user, student };
                            loginProfileId = student.id;
                        }
                    }

                    if (!user) {
                        console.log("[AUTH] User NOT found for identifier:", identifier);
                        throw new Error("Invalid credentials");
                    }

                    console.log("[AUTH] User found:", user.email, "Roles:", user.roles, "Has Hash:", !!user.passwordHash);

                    // ... rest of validation ...
                    const isValid = await bcrypt.compare(password, user.passwordHash!);
                    console.log("[AUTH] Password check for", identifier, ":", isValid ? "SUCCESS" : "FAILED");
                    if (!isValid) throw new Error("Invalid credentials");

                    return {
                        id: user.id || "",
                        email: user.email || "",
                        name: `${user.firstName} ${user.lastName}`,
                        roles: user.roles as string[],
                        schoolId: user.schoolId || null,
                        schoolName: user.school?.name || null,
                        loginType: loginType,
                        loginProfileId: loginProfileId, // Parent.id or Student.id
                        assignedClass: (user as any).classArms && (user as any).classArms.length > 0
                            ? `${(user as any).classArms[0].class.name} ${(user as any).classArms[0].armName}`
                            : null,
                        image: (loginType === "student" && (user as any).student?.photoUrl
                            ? (user as any).student.photoUrl
                            : user.avatarUrl) || null,
                        avatarUrl: (loginType === "student" && (user as any).student?.photoUrl
                            ? (user as any).student.photoUrl
                            : user.avatarUrl) || null,
                        mustChangePassword: (user as any).mustChangePassword ?? false,
                    };

                } catch (error: any) {
                    throw new Error(error.message || "Authentication failed");
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.roles = (user as any).roles;
                token.schoolId = (user as any).schoolId;
                token.schoolName = (user as any).schoolName;
                token.loginType = (user as any).loginType;
                token.loginProfileId = (user as any).loginProfileId;
                token.assignedClass = (user as any).assignedClass;
                token.avatarUrl = (user as any).avatarUrl;
                token.image = (user as any).image;
                token.mustChangePassword = (user as any).mustChangePassword ?? false;
            }

            // Handle session update
            if (trigger === "update" && session) {
                if (session.user.name) token.name = session.user.name;
                if (session.user.avatarUrl) {
                    token.avatarUrl = session.user.avatarUrl;
                    token.image = session.user.avatarUrl;
                }
                if (session.user.mustChangePassword !== undefined) {
                    token.mustChangePassword = session.user.mustChangePassword;
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).roles = token.roles;
                (session.user as any).schoolId = token.schoolId;
                (session.user as any).schoolName = token.schoolName;
                (session.user as any).loginType = token.loginType;
                (session.user as any).loginProfileId = token.loginProfileId;
                (session.user as any).assignedClass = token.assignedClass;
                (session.user as any).avatarUrl = token.avatarUrl;
                (session.user as any).image = token.image;
                (session.user as any).mustChangePassword = token.mustChangePassword ?? false;
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
