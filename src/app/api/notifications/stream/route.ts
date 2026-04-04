import { NextRequest } from "next/server";
import { subscribeToUserNotificationStream } from "@/lib/realtimeNotifications";
import { getSafeServerSession } from "@/lib/server-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function encodeSseEvent(event: string, data: object) {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(req: NextRequest) {
    const session = await getSafeServerSession("/api/notifications/stream");
    if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const user = session.user as any;
    const userId = typeof user.id === "string" ? user.id : null;
    if (!userId) {
        return new Response("Invalid session context", { status: 400 });
    }

    let cleanup = () => undefined;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const send = (event: string, payload: object) => {
                controller.enqueue(encodeSseEvent(event, payload));
            };

            send("connected", { createdAt: new Date().toISOString() });

            const unsubscribe = subscribeToUserNotificationStream(userId, (payload) => {
                send("notification", payload);
            });

            const heartbeatId = setInterval(() => {
                send("ping", { createdAt: new Date().toISOString() });
            }, 25000);

            cleanup = () => {
                clearInterval(heartbeatId);
                unsubscribe();
                try {
                    controller.close();
                } catch {
                    // Stream is already closed.
                }
            };

            req.signal.addEventListener("abort", cleanup, { once: true });
        },
        cancel() {
            cleanup();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
