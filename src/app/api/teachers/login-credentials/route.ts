import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Platform Admin",
    SCHOOL_ADMIN: "School Admin",
    PROPRIETOR: "Proprietor",
    CLASS_TEACHER: "Class Teacher",
    SUBJECT_TEACHER: "Subject Teacher",
};

function buildPortalUrl(req: NextRequest, slug?: string | null) {
    const origin = new URL(req.url).origin;
    return slug ? `${origin}/s/${slug}/login` : `${origin}/auth/login`;
}

function formatTeacherContext(teacher: {
    roles: string[];
    classArms: Array<{ armName: string; class: { name: string } }>;
}) {
    const roleText = teacher.roles.map((role) => ROLE_LABELS[role] || role).join(", ");
    const classText = teacher.classArms.length > 0
        ? teacher.classArms.map((classArm) => `${classArm.class.name} ${classArm.armName}`).join(", ")
        : "No class assignment";

    return `${roleText}${classText ? ` | ${classText}` : ""}`;
}

export async function GET(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json({ error: "Your account is not associated with a school." }, { status: 400 });
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true, slug: true },
        });

        if (!school) {
            return NextResponse.json({ error: "School not found." }, { status: 404 });
        }

        const teachers = await prisma.user.findMany({
            where: {
                schoolId,
                roles: {
                    hasSome: ["CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_ADMIN", "PROPRIETOR"],
                },
            },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                roles: true,
                isActive: true,
                classArms: {
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
        });

        const credentials = teachers
            .map((teacher) => ({
                name: `${teacher.firstName} ${teacher.lastName}`,
                loginIdentifier: teacher.email,
                context: formatTeacherContext(teacher),
                accountStatus: teacher.isActive ? "Ready" : "Inactive",
            }))
            .sort((left, right) => left.name.localeCompare(right.name));

        return NextResponse.json({
            title: "Staff Login Credentials",
            schoolName: school.name,
            portalUrl: buildPortalUrl(req, school.slug),
            loginInstructions: "Use the Admin tab and sign in with the email address below.",
            loginIdentifierLabel: "Email Address",
            contextLabel: "Roles / Class Assignment",
            rows: credentials,
        });
    } catch (error: any) {
        console.error("Error fetching teacher login credentials:", error);
        return NextResponse.json(
            { error: "Failed to fetch staff login credentials" },
            { status: 500 }
        );
    }
}

