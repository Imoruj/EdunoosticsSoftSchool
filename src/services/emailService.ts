
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

export const sendEmail = async (schoolId: string, to: string, subject: string, html: string, userId: string) => {
    try {
        // 1. Fetch Configuration
        const config = await prisma.communicationConfig.findUnique({
            where: { schoolId }
        });

        if (!config || !config.emailHost || !config.emailUser || !config.emailPassword) {
            throw new Error("Email configuration incomplete.");
        }

        // 2. Configure Transporter
        const transporter = nodemailer.createTransport({
            host: config.emailHost,
            port: config.emailPort || 587,
            secure: config.emailPort === 465, // true for 465, false for other ports
            auth: {
                user: config.emailUser,
                pass: config.emailPassword,
            },
        });

        // 3. Send Email
        const info = await transporter.sendMail({
            from: `"${config.emailFrom || 'School Admin'}" <${config.emailUser}>`,
            to,
            subject,
            html,
        });

        // 4. Log Message
        await prisma.message.create({
            data: {
                schoolId,
                senderId: userId,
                recipientType: "EMAIL",
                recipientId: to,
                subject,
                body: html, // Warning: Storing full HTML body might be heavy
                channel: "EMAIL",
                status: "SENT",
                sentAt: new Date()
            }
        });

        return { success: true, messageId: info.messageId };

    } catch (error: any) {
        console.error("Email Send Error:", error);

        // Log failure if possible
        /*
        await prisma.message.create({
            data: {
                schoolId,
                senderId: userId,
                recipientType: "EMAIL",
                recipientId: to,
                subject,
                body: html,
                channel: "EMAIL",
                status: "FAILED",
                sentAt: new Date() // Attempted at
            }
        });
        */

        return { success: false, error: "Failed to send email" };
    }
};
