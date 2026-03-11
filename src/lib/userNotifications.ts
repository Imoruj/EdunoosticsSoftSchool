import { NotificationType } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function createUserNotification(params: {
    userId: string;
    schoolId: string;
    type: NotificationType;
    title: string;
    message: string;
    href?: string;
    metadata?: any;
}) {
    try {
        await prisma.userNotification.create({
            data: {
                userId: params.userId,
                schoolId: params.schoolId,
                type: params.type,
                title: params.title,
                message: params.message,
                href: params.href,
                metadata: params.metadata,
            },
        });
    } catch (error) {
        // Notification failures are non-blocking.
        console.error("Failed to create notification:", error);
    }
}

export async function createUserNotifications(
    userIds: string[],
    params: {
        schoolId: string;
        type: NotificationType;
        title: string;
        message: string;
        href?: string;
        metadata?: any;
    }
) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) return;

    try {
        await prisma.userNotification.createMany({
            data: uniqueUserIds.map((userId) => ({
                userId,
                schoolId: params.schoolId,
                type: params.type,
                title: params.title,
                message: params.message,
                href: params.href,
                metadata: params.metadata,
            })),
        });
    } catch (error) {
        console.error("Failed to create notifications:", error);
    }
}
