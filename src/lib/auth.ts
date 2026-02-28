import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { school: true },
                });

                if (!user || !user.passwordHash) {
                    throw new Error("Invalid email or password");
                }

                const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

                if (!isValid) {
                    throw new Error("Invalid email or password");
                }

                if (!user.isActive) {
                    throw new Error("Account is deactivated. Contact support.");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    roles: user.roles,
                    schoolId: user.schoolId,
                    schoolName: user.school?.name || null,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.roles = (user as any).roles;
                token.schoolId = (user as any).schoolId;
                token.schoolName = (user as any).schoolName;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).roles = token.roles;
                (session.user as any).schoolId = token.schoolId;
                (session.user as any).schoolName = token.schoolName;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
        error: "/auth/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
