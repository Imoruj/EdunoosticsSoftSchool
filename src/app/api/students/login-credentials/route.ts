import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolAdmin } from "@/lib/rbac";

function buildPortalUrl(req: NextRequest, slug?: string | null) {
    const origin = new URL(req.url).origin;
    return slug ? `${origin}/s/${slug}/login` : `${origin}/auth/login`;
}

function formatStudentName(student: { firstName: string; lastName: string; otherNames?: string | null }) {
    return [student.firstName, student.lastName, student.otherNames || ""].filter(Boolean).join(" ");
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
            select: { name: true, slug: true },
        });

        if (!school) {
            return NextResponse.json({ error: "School not found." }, { status: 404 });
        }

        const students = await prisma.student.findMany({
            where: { schoolId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                otherNames: true,
                admissionNumber: true,
                isActive: true,
                user: {
                    select: {
                        id: true,
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
        });

        const credentials = students
            .map((student) => ({
                name: formatStudentName(student),
                loginIdentifier: student.admissionNumber,
                context: student.classArm ? `${student.classArm.class.name} ${student.classArm.armName}` : "Unassigned",
                accountStatus: !student.user
                    ? "No login account"
                    : (!student.isActive || student.user.isActive === false)
                        ? "Inactive"
                        : "Ready",
            }))
            .sort((left, right) => left.name.localeCompare(right.name));

        return NextResponse.json({
            title: "Student Login Credentials",
            schoolName: school.name,
            portalUrl: buildPortalUrl(req, school.slug),
            loginInstructions: "Use the Student tab and sign in with the admission number below.",
            loginIdentifierLabel: "Admission Number",
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

