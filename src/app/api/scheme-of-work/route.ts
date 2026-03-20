import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { UserRole, SowStatus } from "@prisma/client";
import { checkCsrf } from "@/lib/csrf";
import { clampLimit } from "@/lib/apiError";

// GET /api/scheme-of-work — list SOWs
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);
        const isTeacher = roles.includes(UserRole.SUBJECT_TEACHER) || roles.includes(UserRole.CLASS_TEACHER);
        const isStudent = roles.includes(UserRole.STUDENT);

        if (!schoolId) return NextResponse.json({ error: "No school associated" }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");
        const subjectId = searchParams.get("subjectId");
        const status = searchParams.get("status") as SowStatus | null;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = clampLimit(searchParams.get("limit"));

        const where: any = { schoolId };

        if (sessionId) where.sessionId = sessionId;
        if (subjectId) where.subjectId = subjectId;
        if (status) where.status = status;

        if (isStudent) {
            // Students see only APPROVED SOWs for subjects they're enrolled in
            const enrollments = await prisma.subjectEnrollment.findMany({
                where: { student: { userId: user.id } },
                select: { subjectId: true },
                distinct: ["subjectId"],
            });
            const enrolledSubjectIds = enrollments.map((e) => e.subjectId);
            where.status = SowStatus.APPROVED;
            where.subjectId = { in: enrolledSubjectIds };
        } else if (isTeacher && !isAdmin) {
            // Teachers see SOWs they own or collaborate on
            where.OR = [
                { ownerId: user.id },
                { collaborators: { some: { userId: user.id } } },
            ];
        }
        // Admins see all for school (no extra filter)

        const [schemesOfWork, total] = await Promise.all([
            prisma.schemeOfWork.findMany({
                where,
                include: {
                    subject: { select: { id: true, name: true, code: true } },
                    class: { select: { id: true, name: true } },
                    classArms: {
                        include: { classArm: { select: { id: true, armName: true } } },
                        orderBy: { createdAt: "asc" },
                    },
                    session: { select: { id: true, name: true } },
                    owner: { select: { id: true, firstName: true, lastName: true } },
                    collaborators: { select: { userId: true } },
                    _count: { select: { collaborators: true, terms: true } },
                },
                orderBy: { updatedAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.schemeOfWork.count({ where }),
        ]);

        return NextResponse.json({
            schemesOfWork,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error: any) {
        console.error("[SOW] GET error:", error);
        return NextResponse.json({
            error: "Failed to fetch schemes of work",
            detail: process.env.NODE_ENV === "development" ? String(error?.message || error) : undefined,
        }, { status: 500 });
    }
}

// POST /api/scheme-of-work — create a new SOW
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const schoolId = user.schoolId;
        const roles: string[] = user.roles || [];
        const isAdmin = roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);
        const isTeacher = roles.includes(UserRole.SUBJECT_TEACHER) || roles.includes(UserRole.CLASS_TEACHER);

        if (!isAdmin && !isTeacher) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { subjectId, classId, classArmIds, sessionId, title } = body;

        if (!subjectId || !classId || !sessionId) {
            return NextResponse.json({ error: "subjectId, classId, and sessionId are required" }, { status: 400 });
        }

        const armIds: string[] = Array.isArray(classArmIds) ? classArmIds : [];

        // Teachers must have a TeacherSubject assignment for this subject in at least one of the specified arms
        if (!isAdmin) {
            const assignment = await prisma.teacherSubject.findFirst({
                where: {
                    teacherId: user.id,
                    subjectId,
                    ...(armIds.length > 0 ? { classArmId: { in: armIds } } : {}),
                },
            });
            if (!assignment) {
                return NextResponse.json({ error: "You are not assigned to teach this subject in this class" }, { status: 403 });
            }
        }

        // Validate session belongs to school
        const academicSession = await prisma.academicSession.findFirst({
            where: { id: sessionId, schoolId },
            include: { terms: { orderBy: { termNumber: "asc" } } },
        });
        if (!academicSession) {
            return NextResponse.json({ error: "Invalid session" }, { status: 400 });
        }

        // Validate subject and class belong to school
        const [subject, classRecord] = await Promise.all([
            prisma.subject.findFirst({ where: { id: subjectId, schoolId } }),
            prisma.class.findFirst({ where: { id: classId, schoolId } }),
        ]);
        if (!subject || !classRecord) {
            return NextResponse.json({ error: "Invalid subject or class" }, { status: 400 });
        }

        // Validate all armIds belong to this class
        if (armIds.length > 0) {
            const validArms = await prisma.classArm.findMany({
                where: { id: { in: armIds }, classId },
                select: { id: true },
            });
            if (validArms.length !== armIds.length) {
                return NextResponse.json({ error: "One or more class arms do not belong to the selected class" }, { status: 400 });
            }
        }

        // Auto-generate title if not provided
        const resolvedTitle = title?.trim() ||
            `${subject.name} — ${classRecord.name} — ${academicSession.name}`;

        const sow = await prisma.schemeOfWork.create({
            data: {
                schoolId,
                subjectId,
                classId,
                sessionId,
                title: resolvedTitle,
                ownerId: user.id,
                status: SowStatus.DRAFT,
                ...(armIds.length > 0
                    ? {
                        classArms: {
                            create: armIds.map((classArmId) => ({ classArmId })),
                        },
                    }
                    : {}),
                ...(academicSession.terms.length > 0
                    ? {
                        terms: {
                            create: academicSession.terms.map((term) => ({
                                termId: term.id,
                                termNumber: term.termNumber,
                            })),
                        },
                    }
                    : {}),
            },
            include: {
                terms: { orderBy: { termNumber: "asc" }, include: { term: true, weeks: { orderBy: { weekNumber: "asc" } } } },
                subject: { select: { id: true, name: true } },
                class: { select: { id: true, name: true } },
                classArms: {
                    include: { classArm: { select: { id: true, armName: true } } },
                    orderBy: { createdAt: "asc" },
                },
                session: { select: { id: true, name: true } },
                owner: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        return NextResponse.json({ schemeOfWork: sow }, { status: 201 });
    } catch (error: any) {
        console.error("[SOW] POST error:", error);
        if (error.code === "P2002") {
            return NextResponse.json({ error: "A scheme of work already exists for this subject, class, and session" }, { status: 409 });
        }
        return NextResponse.json({
            error: "Failed to create scheme of work",
            detail: process.env.NODE_ENV === "development" ? String(error?.message || error) : undefined,
        }, { status: 500 });
    }
}
