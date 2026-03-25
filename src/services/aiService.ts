import { prisma } from "@/lib/prisma";

async function callOpenRouter(prompt: string, model: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://app.edunostics.com",
            "X-Title": "EduNostics Report Comments",
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.7,
        }),
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() ?? "";
}

async function generateWithFallback(prompt: string): Promise<string> {
    const models = [
        "mistralai/mistral-nemo",              // $0.02/$0.04 — cheapest paid, ideal for short comments
        "meta-llama/llama-3.1-8b-instruct",   // $0.02/$0.05 — fallback
    ];
    let lastError: unknown;
    for (const model of models) {
        try {
            return await callOpenRouter(prompt, model);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}

export async function generateAIComment(studentData: any, type: "teacher" | "principal") {
    try {
        const schoolId = studentData.schoolId;

        let aiSettings = await prisma.aiSettings.findUnique({ where: { schoolId } });
        if (!aiSettings) {
            aiSettings = await prisma.aiSettings.create({ data: { schoolId } });
        }

        const promptTemplate = type === "teacher" ? aiSettings.teacherPrompt : aiSettings.principalPrompt;

        const prompt = promptTemplate
            .replace(/{{name}}/g, `${studentData.lastName} ${studentData.firstName}`)
            .replace(/{{gender}}/g, studentData.gender)
            .replace(/{{term}}/g, studentData.termName || "current term")
            .replace(/{{average}}/g, studentData.average?.toString() || "0")
            .replace(/{{position}}/g, studentData.classPosition?.toString() || "N/A")
            .replace(/{{attendance}}/g, `${studentData.daysPresent || 0}/${studentData.totalSchoolDays || 0} days`)
            .replace(/{{traits}}/g, studentData.traits || "N/A");

        return await generateWithFallback(prompt);
    } catch (error) {
        console.error("AI Generation Error:", error);
        return "Manual assessment recommended.";
    }
}

export async function generateTeacherComment(schoolId: string, studentData: any) {
    return generateAIComment({ ...studentData, schoolId }, "teacher");
}

export async function generatePrincipalComment(schoolId: string, studentData: any) {
    return generateAIComment({ ...studentData, schoolId }, "principal");
}

