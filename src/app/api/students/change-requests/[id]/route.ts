import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkCsrf } from "@/lib/csrf";
import { createUserNotification } from "@/lib/userNotifications";
import {
    applyStudentUpdateTransaction,
    normalizeStudentUpdatePayload,
} from "@/lib/students/changeRequests";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export const dynamic = "force-dynamic";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin =
            roles.includes(UserRole.SUPER_ADMIN) ||
            roles.includes(UserRole.SCHOOL_ADMIN);

        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
        if (!schoolId) {
            return NextResponse.json({ error: "Your account is not associated with a school." }, { status: 400 });
        }

        const body = await req.json();
        const action = body?.action;
        const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim() : "";

        if (action !== "approve" && action !== "reject") {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const requestRecord = await prisma.studentChangeRequest.findFirst({
            where: {
                id: id,
                schoolId,
            },
        });

        if (!requestRecord) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (requestRecord.status !== "PENDING") {
            return NextResponse.json({ error: "This request has already been reviewed." }, { status: 400 });
        }

        if (action === "reject") {
            const rejected = await prisma.studentChangeRequest.update({
                where: { id: requestRecord.id },
                data: {
                    status: "REJECTED",
                    reviewerId: user.id,
                    reviewedAt: new Date(),
                    reviewNote: reviewNote || null,
                },
            });

            if (requestRecord.requesterId !== user.id) {
                await createUserNotification({
                    userId: requestRecord.requesterId,
                    schoolId,
                    type: "APPROVAL_REJECTED",
                    title: "Student Request Rejected",
                    message: reviewNote
                        ? `Your student ${requestRecord.action.toLowerCase()} request for ${requestRecord.studentName} was rejected. Reason: ${reviewNote}`
                        : `Your student ${requestRecord.action.toLowerCase()} request for ${requestRecord.studentName} was rejected.`,
                    href: "/dashboard/students",
                    metadata: {
                        requestId: requestRecord.id,
                        studentId: requestRecord.studentId,
                        action: requestRecord.action,
                    },
                });
            }

            return NextResponse.json({ request: rejected, message: "Request rejected." });
        }

        if (!requestRecord.studentId) {
            return NextResponse.json({ error: "This request can no longer be applied." }, { status: 409 });
        }

        const student = await prisma.student.findFirst({
            where: {
                id: requestRecord.studentId,
                schoolId,
            },
            select: { id: true },
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found." }, { status: 404 });
        }

        if (requestRecord.action === "EDIT") {
            const requestedData = normalizeStudentUpdatePayload(
                ((requestRecord.requestedData || {}) as Record<string, unknown>)
            );

            if (requestedData.dateOfBirth) {
                const parsedDate = new Date(requestedData.dateOfBirth);
                if (isNaN(parsedDate.getTime())) {
                    return NextResponse.json({ error: "The requested date of birth is invalid." }, { status: 409 });
                }
            }

            if (requestedData.classArmId) {
                const classArm = await prisma.classArm.findFirst({
                    where: {
                        id: requestedData.classArmId,
                        class: { schoolId },
                    },
                    select: { id: true },
                });

                if (!classArm) {
                    return NextResponse.json(
                        { error: "The requested class assignment is no longer valid." },
                        { status: 409 }
                    );
                }
            }

            await prisma.$transaction(async (tx) => {
                await applyStudentUpdateTransaction(tx, requestRecord.studentId!, requestedData);
                await tx.studentChangeRequest.update({
                    where: { id: requestRecord.id },
                    data: {
                        status: "APPROVED",
                        reviewerId: user.id,
                        reviewedAt: new Date(),
                        reviewNote: reviewNote || null,
                    },
                });
            });
        } else {
            await prisma.$transaction(async (tx) => {
                await tx.student.delete({
                    where: { id: requestRecord.studentId! },
                });
                await tx.studentChangeRequest.update({
                    where: { id: requestRecord.id },
                    data: {
                        status: "APPROVED",
                        reviewerId: user.id,
                        reviewedAt: new Date(),
                        reviewNote: reviewNote || null,
                    },
                });
            });
        }

        if (requestRecord.requesterId !== user.id) {
            await createUserNotification({
                userId: requestRecord.requesterId,
                schoolId,
                type: "APPROVAL_APPROVED",
                title: "Student Request Approved",
                message: `Your student ${requestRecord.action.toLowerCase()} request for ${requestRecord.studentName} was approved.`,
                href: "/dashboard/students",
                metadata: {
                    requestId: requestRecord.id,
                    studentId: requestRecord.studentId,
                    action: requestRecord.action,
                },
            });
        }

        return NextResponse.json({ message: "Request approved." });
    } catch (error) {
        console.error("Error reviewing student change request:", error);
        return NextResponse.json({ error: "Failed to review student change request" }, { status: 500 });
    }
}
