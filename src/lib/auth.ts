import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ensureUniqueStudentEmail, getSchoolInitials } from "@/lib/studentLoginCredentials";

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
        allowStudentAdmissionNumberLogin?: boolean | null;
        allowStudentEmailLogin?: boolean | null;
    } | null;
    // Populated via Prisma include for admin login
    classArms?: Array<{ armName: string; class: { name: string } }> | null;
    // Populated via spread for student login
    student?: { photoUrl?: string | null } | null;
    // Populated via Prisma include for parent login
    parent?: { id?: string | null } | null;
};

const ADMIN_LOGIN_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "PROPRIETOR", "CLASS_TEACHER", "SUBJECT_TEACHER"];

function canUseSelectedLoginType(roles: string[], loginType: "admin" | "parent" | "student") {
    if (loginType === "admin") {
        return roles.some((role) => ADMIN_LOGIN_ROLES.includes(role));
    }

    if (loginType === "parent") {
        return roles.includes("PARENT");
    }

    return roles.includes("STUDENT");
}

function buildLoginTypeMismatchMessage(roles: string[]) {
    if (roles.includes("STUDENT")) {
        return "This account is registered as a student account. Select the Student tab to sign in.";
    }

    if (roles.includes("PARENT")) {
        return "This account is registered as a parent account. Select the Parent tab to sign in.";
    }

    if (roles.some((role) => ADMIN_LOGIN_ROLES.includes(role))) {
        return "This account must sign in from the Admin/Teacher tab.";
    }

    return "This account cannot sign in through the selected tab.";
}

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

function assertStudentLoginModeAllowed(
    school: AuthUserRecord["school"],
    mode: "email" | "admissionNumber"
) {
    const allowEmail = school?.allowStudentEmailLogin ?? true;
    const allowAdmissionNumber = school?.allowStudentAdmissionNumberLogin ?? true;

    if (!allowEmail && !allowAdmissionNumber) {
        throw new Error("Student login is disabled for this school. Please contact your school administrator.");
    }

    if (mode === "email" && !allowEmail) {
        throw new Error("Student email login is disabled for this school. Use your admission number instead.");
    }

    if (mode === "admissionNumber" && !allowAdmissionNumber) {
        throw new Error("Student admission number login is disabled for this school. Use your email address instead.");
    }
}

async function resolveStudentUserByCanonicalEmail(identifier: string) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const [localPart, rawDomainPart] = normalizedIdentifier.split("@");

    if (!localPart || !rawDomainPart) {
        return null;
    }

    const domainPart = rawDomainPart.replace(/\.com$/i, "");

    const schools = await prisma.school.findMany({
        where: {
            allowStudentEmailLogin: true,
        },
        select: {
            id: true,
            name: true,
        },
    });

    const candidateSchoolIds = schools
        .filter((school) => getSchoolInitials(school.name).toLowerCase() === domainPart)
        .map((school) => school.id);

    if (candidateSchoolIds.length === 0) {
        return null;
    }

    const students = await prisma.student.findMany({
        where: {
            schoolId: { in: candidateSchoolIds },
            userId: { not: null },
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            photoUrl: true,
            userId: true,
            user: {
                include: {
                    school: true,
                },
            },
        },
    });

    for (const student of students) {
        if (!student.user || !student.userId) {
            continue;
        }

        const canonicalEmail = await ensureUniqueStudentEmail(prisma, {
            firstName: student.firstName,
            lastName: student.lastName,
            schoolName: student.user.school?.name || "",
            excludeUserId: student.userId,
        });

        if (canonicalEmail.toLowerCase() !== normalizedIdentifier) {
            continue;
        }

        if (student.user.email.toLowerCase() !== canonicalEmail) {
            await prisma.user.update({
                where: { id: student.userId },
                data: { email: canonicalEmail },
            });
            student.user.email = canonicalEmail;
        }

        return {
            user: {
                ...student.user,
                student: { photoUrl: student.photoUrl },
            } as AuthUserRecord,
            studentId: student.id,
        };
    }

    return null;
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
                        user = await prisma.user.findFirst({
                            where: {
                                email: {
                                    equals: identifier.toLowerCase(),
                                    mode: "insensitive",
                                },
                            },
                            include: {
                                school: true,
                                classArms: {
                                    include: { class: true },
                                },
                            },
                        }) as AuthUserRecord | null;

                        if (user && !canUseSelectedLoginType(user.roles, "admin")) {
                            throw new Error(buildLoginTypeMismatchMessage(user.roles));
                        }
                    } else if (loginType === "parent") {
                        user = await prisma.user.findFirst({
                            where: {
                                email: {
                                    equals: identifier.toLowerCase(),
                                    mode: "insensitive",
                                },
                            },
                            include: { school: true, parent: true },
                        }) as AuthUserRecord | null;

                        if (user && !canUseSelectedLoginType(user.roles, "parent")) {
                            throw new Error(buildLoginTypeMismatchMessage(user.roles));
                        }

                        loginProfileId = user?.parent?.id || null;
                    } else if (loginType === "student") {
                        if (identifier.includes("@")) {
                            const matchedUser = await prisma.user.findFirst({
                                where: {
                                    email: {
                                        equals: identifier.toLowerCase(),
                                        mode: "insensitive",
                                    },
                                },
                                include: {
                                    school: true,
                                    studentAccount: true,
                                },
                            });

                            if (matchedUser && !canUseSelectedLoginType(matchedUser.roles, "student")) {
                                throw new Error(buildLoginTypeMismatchMessage(matchedUser.roles));
                            }

                            if (matchedUser) {
                                assertStudentLoginModeAllowed(matchedUser.school, "email");
                                user = {
                                    ...matchedUser,
                                    student: matchedUser.studentAccount || null,
                                } as AuthUserRecord;
                                loginProfileId = matchedUser.studentAccount?.id || null;
                            }

                            if (!user) {
                                const resolvedStudent = await resolveStudentUserByCanonicalEmail(identifier);
                                if (resolvedStudent) {
                                    assertStudentLoginModeAllowed(resolvedStudent.user.school, "email");
                                    user = resolvedStudent.user;
                                    loginProfileId = resolvedStudent.studentId;
                                }
                            }
                        } else {
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

                                assertStudentLoginModeAllowed(student.user.school, "admissionNumber");
                                user = {
                                    ...student.user,
                                    student,
                                } as AuthUserRecord;
                                loginProfileId = student.id;
                            }
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

