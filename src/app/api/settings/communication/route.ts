
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { encryptSecret } from "@/lib/serverEncrypt";

const communicationConfigSchema = z.object({
    smsProvider: z.string().trim().min(1).max(50).optional(),
    smsApiKey: z.string().optional(),
    smsSenderId: z.string().trim().max(30).optional(),
    emailProvider: z.string().trim().min(1).max(50).optional(),
    emailHost: z.string().trim().max(255).optional(),
    emailPort: z.union([z.string(), z.number()]).optional(),
    emailUser: z.string().trim().max(255).optional(),
    emailPassword: z.string().optional(),
    emailFrom: z.string().trim().max(255).optional(),
});

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roles = (session.user as any).roles || [];
        if (!roles.includes(UserRole.SUPER_ADMIN) && !roles.includes(UserRole.SCHOOL_ADMIN)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;

        const config = await prisma.communicationConfig.findUnique({
            where: { schoolId },
        });

        if (!config) {
            return NextResponse.json({});
        }

        return NextResponse.json({
            ...config,
            smsApiKey: "",
            emailPassword: "",
            hasSmsApiKey: Boolean(config.smsApiKey),
            hasEmailPassword: Boolean(config.emailPassword),
        });

    } catch (error: any) {
        console.error("Failed to fetch communication settings:", error);
        return NextResponse.json({ error: "Failed to fetch communication settings" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roles = (session.user as any).roles || [];
        if (!roles.includes(UserRole.SUPER_ADMIN) && !roles.includes(UserRole.SCHOOL_ADMIN)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const schoolId = (session.user as any).schoolId;
        const parsed = communicationConfigSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
        }
        const body = parsed.data;

        const existing = await prisma.communicationConfig.findUnique({
            where: { schoolId },
            select: { smsApiKey: true, emailPassword: true },
        });

        const rawPort = typeof body.emailPort === "number" ? body.emailPort : body.emailPort ? parseInt(body.emailPort, 10) : undefined;
        const emailPort = Number.isFinite(rawPort) ? rawPort : undefined;
        const rawSmsKey = body.smsApiKey && body.smsApiKey.trim().length > 0 ? body.smsApiKey.trim() : null;
        const rawEmailPass = body.emailPassword && body.emailPassword.trim().length > 0 ? body.emailPassword : null;
        const smsApiKey = rawSmsKey ? encryptSecret(rawSmsKey) : existing?.smsApiKey;
        const emailPassword = rawEmailPass ? encryptSecret(rawEmailPass) : existing?.emailPassword;

        const config = await prisma.communicationConfig.upsert({
            where: { schoolId },
            update: {
                smsProvider: body.smsProvider,
                smsApiKey,
                smsSenderId: body.smsSenderId,
                emailProvider: body.emailProvider,
                emailHost: body.emailHost,
                emailPort,
                emailUser: body.emailUser,
                emailPassword,
                emailFrom: body.emailFrom,
            },
            create: {
                schoolId,
                smsProvider: body.smsProvider || "termii",
                smsApiKey,
                smsSenderId: body.smsSenderId,
                emailProvider: body.emailProvider || "smtp",
                emailHost: body.emailHost,
                emailPort,
                emailUser: body.emailUser,
                emailPassword,
                emailFrom: body.emailFrom,
            }
        });

        return NextResponse.json({
            ...config,
            smsApiKey: "",
            emailPassword: "",
            hasSmsApiKey: Boolean(config.smsApiKey),
            hasEmailPassword: Boolean(config.emailPassword),
        });

    } catch (error: any) {
        console.error("Failed to save communication settings:", error);
        return NextResponse.json({ error: "Failed to save communication settings" }, { status: 500 });
    }
}

