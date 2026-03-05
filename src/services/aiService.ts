
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/prisma";

export async function generateAIComment(studentData: any, type: 'teacher' | 'principal') {
    try {
        const schoolId = studentData.schoolId;

        // Fetch AI Settings for the school
        let aiSettings = await prisma.aiSettings.findUnique({
            where: { schoolId }
        });

        // If no settings found, create default one
        if (!aiSettings) {
            aiSettings = await prisma.aiSettings.create({
                data: { schoolId }
            });
        }

        const promptTemplate = type === 'teacher' ? aiSettings.teacherPrompt : aiSettings.principalPrompt;

        // Replace placeholders in template
        let prompt = promptTemplate
            .replace(/{{name}}/g, `${studentData.lastName} ${studentData.firstName}`)
            .replace(/{{gender}}/g, studentData.gender)
            .replace(/{{term}}/g, studentData.termName || "current term")
            .replace(/{{average}}/g, studentData.average?.toString() || "0")
            .replace(/{{position}}/g, studentData.classPosition?.toString() || "N/A")
            .replace(/{{attendance}}/g, `${studentData.daysPresent || 0}/${studentData.totalSchoolDays || 0} days`)
            .replace(/{{traits}}/g, studentData.traits || "N/A");

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return text.trim();
    } catch (error) {
        console.error("AI Generation Error:", error);
        return "Manual assessment recommended.";
    }
}

export async function generateTeacherComment(schoolId: string, studentData: any) {
    return generateAIComment({ ...studentData, schoolId }, 'teacher');
}

export async function generatePrincipalComment(schoolId: string, studentData: any) {
    return generateAIComment({ ...studentData, schoolId }, 'principal');
}
