import { NotificationType, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { publishNotificationRefresh } from "@/lib/realtimeNotifications";

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
        const notification = await prisma.userNotification.create({
            data: {
                userId: params.userId,
                schoolId: params.schoolId,
                type: params.type,
                title: params.title,
                message: params.message,
                href: params.href,
                metadata: params.metadata,
            },
            select: { id: true },
        });
        publishNotificationRefresh(params.userId, notification.id);
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
        publishNotificationRefresh(uniqueUserIds);
    } catch (error) {
        console.error("Failed to create notifications:", error);
    }
}

export async function getSchoolAdminUserIds(schoolId: string, excludeUserId?: string) {
    const admins = await prisma.user.findMany({
        where: {
            schoolId,
            isActive: true,
            roles: { hasSome: [UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN] },
            ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        },
        select: { id: true },
    });

    return admins.map((admin) => admin.id);
}
