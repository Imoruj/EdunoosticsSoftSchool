import { NextRequest, NextResponse } from "next/server";
import { prismaDirect } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/server-session";
import { isTransientPrismaError, withPrismaRetry } from "@/lib/prisma-transient";

const USER_NOTIFICATION_TABLE_HINTS = [
    "UserNotification",
    "user_notification",
];

function isMissingPrismaRelationError(error: unknown, relationHints: string[]) {
    if (!error || typeof error !== "object") return false;

    const maybeError = error as {
        code?: string;
        message?: string;
        meta?: { table?: string; column?: string };
    };

    const code = maybeError.code;
    if (code !== "P2021" && code !== "P2022") return false;

    const message = (maybeError.message || "").toLowerCase();
    const metaTable = (maybeError.meta?.table || "").toLowerCase();
    const metaColumn = (maybeError.meta?.column || "").toLowerCase();

    return relationHints.some((hint) => {
        const normalizedHint = hint.toLowerCase();
        return (
            message.includes(normalizedHint) ||
            metaTable.includes(normalizedHint) ||
            metaColumn.includes(normalizedHint)
        );
    });
}

function buildTimeAgoLabel(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

    return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function buildScoreReviewHref(
    fallbackHref: string | null,
    metadata: any
): string | undefined {
    if (!metadata || typeof metadata !== "object") {
        return fallbackHref || undefined;
    }

    const workflowId = typeof metadata.workflowId === "string" ? metadata.workflowId : null;
    const termId = typeof metadata.termId === "string" ? metadata.termId : null;
    const classArmId = typeof metadata.classArmId === "string" ? metadata.classArmId : null;
    const subjectId = typeof metadata.subjectId === "string" ? metadata.subjectId : null;

    if (!workflowId || !termId || !classArmId || !subjectId) {
        return fallbackHref || undefined;
    }

    const search = new URLSearchParams({
        workflowId,
        termId,
        classArmId,
        subjectId,
    });
    return `/dashboard/score-reviews?${search.toString()}`;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getSafeServerSession("/api/notifications");
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const roles = user.roles || [];
        const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");

        const limitParam = Number(new URL(req.url).searchParams.get("limit") || 6);
        const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : 6;

        const dbNotifications = await withPrismaRetry(
            "/api/notifications user notifications",
            async () => {
                try {
                    return await prismaDirect.userNotification.findMany({
                        where: { userId: user.id },
                        orderBy: { createdAt: "desc" },
                        take: limit,
                        select: {
                            id: true,
                            type: true,
                            title: true,
                            message: true,
                            href: true,
                            metadata: true,
                            createdAt: true,
                            isRead: true,
                        },
                    });
                } catch (error) {
                    if (isMissingPrismaRelationError(error, USER_NOTIFICATION_TABLE_HINTS)) {
                        console.warn(
                            "User notification table is missing. Falling back to system-only notifications.",
                            error
                        );
                        return [] as Array<{
                            id: string;
                            type: string;
                            title: string;
                            message: string;
                            href: string | null;
                            metadata: any;
                            createdAt: Date;
                            isRead: boolean;
                        }>;
                    }

                    throw error;
                }
            }
        );

        let pendingUploadCount = 0;
        let pendingUploadRequests: any[] = [];

        if (isAdmin && user.schoolId) {
            try {
                [pendingUploadCount, pendingUploadRequests] = await withPrismaRetry(
                    "/api/notifications pending uploads",
                    () =>
                        prismaDirect.$transaction([
                            prismaDirect.scoreUploadRequest.count({
                                where: {
                                    schoolId: user.schoolId,
                                    status: "PENDING",
                                },
                            }),
                            prismaDirect.scoreUploadRequest.findMany({
                                where: {
                                    schoolId: user.schoolId,
                                    status: "PENDING",
                                },
                                orderBy: { createdAt: "desc" },
                                take: limit,
                                select: {
                                    id: true,
                                    createdAt: true,
                                    studentCount: true,
                                    uploader: { select: { firstName: true, lastName: true } },
                                    subject: { select: { name: true } },
                                    term: {
                                        select: {
                                            name: true,
                                            session: { select: { name: true } },
                                        },
                                    },
                                    classArm: {
                                        select: {
                                            armName: true,
                                            class: { select: { name: true } },
                                        },
                                    },
                                },
                            }),
                        ])
                );
            } catch (error) {
                if (!isTransientPrismaError(error)) {
                    throw error;
                }

                console.warn(
                    "Pending upload notifications are temporarily unavailable because the database is busy.",
                    error
                );
            }
        }

        const workflowNotifications = dbNotifications.map((entry) => ({
            id: `workflow:${entry.id}`,
            title: entry.title,
            message: entry.message,
            time: buildTimeAgoLabel(entry.createdAt),
            href: entry.type === "SCORE_SUBMITTED"
                ? buildScoreReviewHref(entry.href, entry.metadata)
                : (entry.href || undefined),
            createdAt: entry.createdAt.toISOString(),
            isRead: entry.isRead,
        }));

        const requestIdsWithDbNotifications = new Set(
            dbNotifications
                .map((entry) => {
                    const metadata = entry.metadata as { requestId?: unknown } | null;
                    return typeof metadata?.requestId === "string" ? metadata.requestId : null;
                })
                .filter((requestId): requestId is string => Boolean(requestId))
        );

        const systemNotifications = pendingUploadRequests
            .filter((request) => !requestIdsWithDbNotifications.has(request.id))
            .map((request) => {
            const uploaderName = `${request.uploader.firstName} ${request.uploader.lastName}`.trim();
            const className = `${request.classArm.class.name} ${request.classArm.armName}`.trim();

            return {
                id: `upload-request:${request.id}`,
                title: "Score Upload Pending Approval",
                message: `${uploaderName} submitted ${request.studentCount} score(s) for ${request.subject.name} - ${className} (${request.term.session.name}, ${request.term.name}).`,
                time: buildTimeAgoLabel(request.createdAt),
                href: "/dashboard/scores/upload-requests",
                createdAt: request.createdAt.toISOString(),
                isRead: false,
            };
            });

        const notifications = [...workflowNotifications, ...systemNotifications]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);

        return NextResponse.json({
            pendingUploadCount,
            notifications,
        });
    } catch (error: any) {
        if (isTransientPrismaError(error)) {
            console.warn("Notifications temporarily unavailable because the database is busy.", error);
            return NextResponse.json({
                pendingUploadCount: 0,
                notifications: [],
            });
        }

        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

