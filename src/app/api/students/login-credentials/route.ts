import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import {
    ensureUniqueStudentEmail,
    generateStudentDefaultPasswordHash,
} from "@/lib/studentLoginCredentials";

function buildPortalUrl(req: NextRequest, slug?: string | null) {
    const origin = new URL(req.url).origin;
    return slug ? `${origin}/s/${slug}/login` : `${origin}/auth/login`;
}

function formatStudentName(student: { firstName: string; lastName: string; otherNames?: string | null }) {
    return [student.firstName, student.lastName, student.otherNames || ""].filter(Boolean).join(" ");
}

function resolveStudentLoginModeLabels(params: {
    allowStudentEmailLogin: boolean;
    allowStudentAdmissionNumberLogin: boolean;
}) {
    const { allowStudentEmailLogin, allowStudentAdmissionNumberLogin } = params;

    if (allowStudentEmailLogin && allowStudentAdmissionNumberLogin) {
        return {
            loginIdentifierLabel: "Student Email / Admission Number",
            loginInstructions: "Use the Student tab and sign in with either the school email address or admission number below, plus the temporary password.",
        };
    }

    if (allowStudentEmailLogin) {
        return {
            loginIdentifierLabel: "Student Email Address",
            loginInstructions: "Use the Student tab and sign in with the email address and temporary password below.",
        };
    }

    return {
        loginIdentifierLabel: "Admission Number",
        loginInstructions: "Use the Student tab and sign in with the admission number and temporary password below.",
    };
}

function buildStudentLoginIdentifier(params: {
    email: string;
    admissionNumber: string;
    allowStudentEmailLogin: boolean;
    allowStudentAdmissionNumberLogin: boolean;
}) {
    const { email, admissionNumber, allowStudentEmailLogin, allowStudentAdmissionNumberLogin } = params;

    if (allowStudentEmailLogin && allowStudentAdmissionNumberLogin) {
        return `${email} / ${admissionNumber}`;
    }

    if (allowStudentEmailLogin) {
        return email;
    }

    return admissionNumber;
}

export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;
        if (!schoolId) {
            return NextResponse.json({ error: "Your account is not associated with a school." }, { status: 400 });
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                slug: true,
                allowStudentAdmissionNumberLogin: true,
                allowStudentEmailLogin: true,
            },
        });

        if (!school) {
            return NextResponse.json({ error: "School not found." }, { status: 404 });
        }

        const allowStudentEmailLogin = school.allowStudentEmailLogin ?? true;
        const allowStudentAdmissionNumberLogin = school.allowStudentAdmissionNumberLogin ?? true;

        if (!allowStudentEmailLogin && !allowStudentAdmissionNumberLogin) {
            return NextResponse.json(
                { error: "Student login is disabled for this school. Enable at least one student login method in settings." },
                { status: 400 }
            );
        }

        const loginModeLabels = resolveStudentLoginModeLabels({
            allowStudentEmailLogin,
            allowStudentAdmissionNumberLogin,
        });

        const students = await prisma.student.findMany({
            where: { schoolId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                otherNames: true,
                admissionNumber: true,
                isActive: true,
                userId: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        isActive: true,
                    },
                },
                classArm: {
                    select: {
                        armName: true,
                        class: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { firstName: "asc" },
                { lastName: "asc" },
            ],
        });

        const credentialRows = await prisma.$transaction(async (tx) => {
            const rows: Array<{
                name: string;
                loginIdentifier: string;
                temporaryPassword: string;
                context: string;
                accountStatus: string;
            }> = [];

            for (const student of students) {
                const email = await ensureUniqueStudentEmail(tx, {
                    firstName: student.firstName,
                    lastName: student.lastName,
                    schoolName: school.name,
                    excludeUserId: student.user?.id || null,
                });
                const { password, passwordHash } = await generateStudentDefaultPasswordHash({
                    firstName: student.firstName,
                    lastName: student.lastName,
                    admissionNumber: student.admissionNumber,
                    schoolName: school.name,
                });

                let userId = student.user?.id || null;

                if (!userId) {
                    const createdUser = await tx.user.create({
                        data: {
                            email,
                            passwordHash,
                            firstName: student.firstName,
                            lastName: student.lastName,
                            roles: [UserRole.STUDENT],
                            schoolId,
                            isActive: student.isActive,
                            mustChangePassword: true,
                        },
                        select: { id: true },
                    });

                    userId = createdUser.id;

                    await tx.student.update({
                        where: { id: student.id },
                        data: { userId },
                    });
                } else {
                    await tx.user.update({
                        where: { id: userId },
                        data: {
                            email,
                            passwordHash,
                            firstName: student.firstName,
                            lastName: student.lastName,
                            isActive: student.isActive,
                            mustChangePassword: true,
                        },
                    });
                }

                rows.push({
                    name: formatStudentName(student),
                    loginIdentifier: buildStudentLoginIdentifier({
                        email,
                        admissionNumber: student.admissionNumber,
                        allowStudentEmailLogin,
                        allowStudentAdmissionNumberLogin,
                    }),
                    temporaryPassword: password,
                    context: student.classArm ? `${student.classArm.class.name} ${student.classArm.armName}` : "Unassigned",
                    accountStatus: student.isActive ? "Ready" : "Inactive",
                });
            }

            return rows;
        });

        const credentials = credentialRows.sort((left, right) => left.name.localeCompare(right.name));

        return NextResponse.json({
            title: "Student Login Credentials",
            schoolName: school.name,
            portalUrl: buildPortalUrl(req, school.slug),
            loginInstructions: loginModeLabels.loginInstructions,
            loginIdentifierLabel: loginModeLabels.loginIdentifierLabel,
            temporaryPasswordLabel: "Temporary Password",
            contextLabel: "Class",
            rows: credentials,
        });
    } catch (error: any) {
        console.error("Error fetching student login credentials:", error);
        return NextResponse.json(
            { error: "Failed to fetch student login credentials" },
            { status: 500 }
        );
    }
}
