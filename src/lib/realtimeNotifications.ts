type NotificationStreamEvent = {
    type: "refresh";
    notificationId?: string;
    createdAt: string;
};

type NotificationStreamListener = (event: NotificationStreamEvent) => void;

class NotificationRealtimeBroker {
    private listeners = new Map<string, Set<NotificationStreamListener>>();

    subscribe(userId: string, listener: NotificationStreamListener) {
        const current = this.listeners.get(userId) || new Set<NotificationStreamListener>();
        current.add(listener);
        this.listeners.set(userId, current);

        return () => {
            const next = this.listeners.get(userId);
            if (!next) return;
            next.delete(listener);
            if (next.size === 0) {
                this.listeners.delete(userId);
            }
        };
    }

    publish(userIds: string[], event: NotificationStreamEvent) {
        for (const userId of new Set(userIds.filter(Boolean))) {
            const listeners = this.listeners.get(userId);
            if (!listeners) continue;

            for (const listener of listeners) {
                try {
                    listener(event);
                } catch (error) {
                    console.error("Failed to publish realtime notification event:", error);
                }
            }
        }
    }
}

const globalForNotifications = globalThis as unknown as {
    notificationRealtimeBroker?: NotificationRealtimeBroker;
};

const broker =
    globalForNotifications.notificationRealtimeBroker ??
    new NotificationRealtimeBroker();

if (process.env.NODE_ENV !== "production") {
    globalForNotifications.notificationRealtimeBroker = broker;
}

export function subscribeToUserNotificationStream(userId: string, listener: NotificationStreamListener) {
    return broker.subscribe(userId, listener);
}

export function publishNotificationRefresh(userIds: string | string[], notificationId?: string) {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    broker.publish(ids, {
        type: "refresh",
        notificationId,
        createdAt: new Date().toISOString(),
    });
}
