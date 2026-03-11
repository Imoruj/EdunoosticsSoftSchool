
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendSms } from "@/services/smsService";
import { sendEmail } from "@/services/emailService";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { checkCsrf } from "@/lib/csrf";

const sendPayloadSchema = z.object({
    channel: z.enum(["SMS", "EMAIL"]),
    recipients: z.array(z.string().trim().min(1)).min(1).max(500),
    message: z.string().trim().min(1).max(5000),
    subject: z.string().trim().max(255).optional(),
});

export async function POST(req: Request) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins can send broadcasts for now
        const roles = (session.user as any).roles || [];
        if (!roles.includes(UserRole.SUPER_ADMIN) && !roles.includes(UserRole.SCHOOL_ADMIN)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;
        const userId = (session.user as any).id;
        const parsed = sendPayloadSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
        }
        const { channel, recipients, message, subject } = parsed.data;
        const normalizedRecipients = Array.from(new Set(recipients.map((value) => value.trim()).filter(Boolean)));

        if (channel === "SMS") {
            const result = await sendSms(schoolId, normalizedRecipients, message, userId);
            return NextResponse.json(result);
        } else if (channel === "EMAIL") {
            if (!subject) {
                return NextResponse.json({ error: "Subject is required for Email" }, { status: 400 });
            }

            const results = await Promise.all(
                normalizedRecipients.map(async (email) => {
                    const res = await sendEmail(schoolId, email, subject, message, userId);
                    return { email, ...res };
                })
            );

            return NextResponse.json({ success: true, details: results });
        } else {
            return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Send API Error:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
}
