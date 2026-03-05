
import prisma from "@/lib/prisma";

interface SmsConfig {
    apiKey: string;
    senderId: string;
}

export const sendSms = async (schoolId: string, recipients: string[], message: string, userId: string) => {
    try {
        // 1. Fetch Configuration
        const config = await prisma.communicationConfig.findUnique({
            where: { schoolId }
        });

        if (!config || !config.smsApiKey || !config.smsSenderId) {
            throw new Error("SMS configuration not found or incomplete.");
        }

        const smsConfig: SmsConfig = {
            apiKey: config.smsApiKey,
            senderId: config.smsSenderId
        };

        // 2. Prepare Termii API Request
        // Termii supports bulk SMS. 
        // Iterate if necessary or use their bulk endpoint.
        // For simplicity, we'll iterate for now but in production use bulk endpoint if available and reliable.

        const results = await Promise.all(recipients.map(async (phone) => {
            // Basic phone number formatting to international format (234...)
            let formattedPhone = phone.replace(/\s+/g, '');
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '234' + formattedPhone.substring(1);
            }

            const payload = {
                to: formattedPhone,
                from: smsConfig.senderId,
                sms: message,
                type: "plain",
                channel: "generic",
                api_key: smsConfig.apiKey,
            };

            const response = await fetch("https://api.ng.termii.com/api/sms/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            return { phone, status: response.ok ? "SENT" : "FAILED", response: data };
        }));

        // 3. Log Messages
        // We can optimize this to createMany
        await prisma.message.createMany({
            data: results.map(res => ({
                schoolId,
                senderId: userId,
                recipientType: "PHONE", // Generic for now
                recipientId: res.phone,
                subject: "SMS Broadcast",
                body: message,
                channel: "SMS",
                status: res.status === "SENT" ? "SENT" : "FAILED",
                sentAt: new Date()
            }))
        });

        const successCount = results.filter(r => r.status === "SENT").length;
        const failedCount = results.filter(r => r.status === "FAILED").length;

        return { success: true, sent: successCount, failed: failedCount, details: results };

    } catch (error: any) {
        console.error("SMS Send Error:", error);
        return { success: false, error: "Failed to send SMS" };
    }
};
