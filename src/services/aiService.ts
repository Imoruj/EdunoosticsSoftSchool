import { prisma } from "@/lib/prisma";
import { formatAttendancePoints } from "@/lib/attendance-points";
import { buildCommentSystemPrompt, buildCommentUserContent, defaultTeacherPrompt, defaultPrincipalPrompt } from "@/lib/promptTemplates";
import { buildReportCommentPayload, ReportCommentConfig, ReportCommentPayload } from "@/lib/reportPayloadBuilder";

type AiProvider = "openrouter" | "gemini";

const DEFAULT_COMMENT_CONFIG: ReportCommentConfig = {
    maxScorePerSubject: "dynamic",
    scoreDisplayed: "raw",
    overallAverage: "normalized",
    performanceBand: "normalized",
    resitSubjects: "never",
    resitEligibleSubjects: [
        "Mathematics",
        "English Language",
        "Chemistry",
        "Physics",
        "Literature in English",
        "Biology",
    ],
    focusSubjectPolicy: "lowestNormalized",
};

type StudentData = ReportCommentPayload;

interface AgentResult {
    success: boolean;
    data?: any;
    error?: string;
}

interface CommentCriteria {
    teacherPrompt: string;
    principalPrompt: string;
    schoolId: string;
    commentConfig: ReportCommentConfig;
}

abstract class BaseAgent {
    protected provider: AiProvider;
    protected model: string;

    constructor(provider: AiProvider, model: string) {
        this.provider = provider;
        this.model = model;
    }

    protected async callAI(systemPrompt: string, userContent: string): Promise<string> {
        return this.provider === "gemini"
            ? await callGemini(systemPrompt, userContent, this.model)
            : await callOpenRouter(systemPrompt, userContent, this.model);
    }

    protected formatStudentPayload(studentData: StudentData) {
        return JSON.stringify({
            first_name: studentData.firstName,
            full_name: studentData.name,
            gender: studentData.gender,
            average: studentData.average,
            position: studentData.position,
            attendance: studentData.attendance,
            report_type: studentData.reportTypeLabel || studentData.reportType || "end of term",
            term_number: studentData.termNumber,
            affective_traits: studentData.affective_traits || {},
            psychomotor_skills: studentData.psychomotor_skills || {},
            subject_scores: studentData.subjectScores || {},
            subject_percentages: studentData.subjectPercentages || {},
            resit_subjects: studentData.resitSubjects || [],
            focus_subject: studentData.focusSubject?.name || undefined,
            include_resit_addendum: studentData.includeResitAddendum || false,
        }, null, 2);
    }
}

class DataCollectionAgent extends BaseAgent {
    async collectStudentData(studentId: string, termId: string): Promise<AgentResult> {
        try {
            console.log(`DataCollectionAgent: Collecting data for student ${studentId}`);

            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    gender: true,
                    schoolId: true,
                    classArmId: true,
                },
            });

            if (!student) {
                return { success: false, error: "Student not found" };
            }

            const [reportCard, term, scores, aiSettings] = await Promise.all([
                prisma.reportCard.findFirst({
                    where: { studentId, termId },
                    include: {
                        affectiveRatings: { include: { trait: true } },
                        psychomotorRatings: { include: { skill: true } },
                    },
                }),
                prisma.term.findFirst({
                    where: { id: termId, session: { schoolId: student.schoolId } },
                    select: { name: true, termNumber: true },
                }),
                prisma.score.findMany({
                    where: { studentId, termId },
                    include: { subject: true },
                }),
                getOrCreateAiSettings(student.schoolId),
            ]);

            if (!term) {
                return { success: false, error: "Term not found" };
            }

            const traitsSummary = reportCard
                ? [
                    ...reportCard.affectiveRatings.map((rating) => `${rating.trait.name}: ${rating.rating}`),
                    ...reportCard.psychomotorRatings.map((rating) => `${rating.skill.name}: ${rating.rating}`),
                ].join(", ")
                : "";

            const affective_traits = reportCard
                ? Object.fromEntries(reportCard.affectiveRatings.map((rating) => [rating.trait.name, rating.rating]))
                : {};

            const psychomotor_skills = reportCard
                ? Object.fromEntries(reportCard.psychomotorRatings.map((rating) => [rating.skill.name, rating.rating]))
                : {};

            const commentConfig =
                ((aiSettings as any).commentConfig as ReportCommentConfig | null) || DEFAULT_COMMENT_CONFIG;

            const payload = await buildReportCommentPayload({
                prisma,
                studentData: {
                    id: student.id,
                    studentId: student.id,
                    termId,
                    name: `${student.firstName} ${student.lastName}`,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    gender: student.gender,
                    term: term.name,
                    schoolId: student.schoolId,
                    attendance: reportCard
                        ? formatAttendancePoints(reportCard.daysPresent, reportCard.totalSchoolDays)
                        : "N/A",
                    traits: traitsSummary,
                    affective_traits,
                    psychomotor_skills,
                    average: reportCard?.average?.toNumber() || 0,
                    position: reportCard?.classPosition || 0,
                },
                reportCard: reportCard
                    ? {
                        average: reportCard.average,
                        classPosition: reportCard.classPosition,
                        daysPresent: reportCard.daysPresent,
                        totalSchoolDays: reportCard.totalSchoolDays,
                    }
                    : null,
                term: { termNumber: term.termNumber, name: term.name },
                scores,
                classArmId: student.classArmId,
                commentConfig,
            });

            const data: StudentData = {
                ...payload,
                id: student.id,
                studentId: student.id,
                termId,
                schoolId: student.schoolId,
            };

            return { success: true, data };
        } catch (error) {
            console.error("DataCollectionAgent error:", error);
            return { success: false, error: "Failed to collect student data" };
        }
    }
}

class AcademicAnalysisAgent extends BaseAgent {
    async analyzePerformance(studentData: StudentData): Promise<AgentResult> {
        try {
            console.log(`AcademicAnalysisAgent: Analyzing performance for ${studentData.name}`);

            const payload = this.formatStudentPayload(studentData);
            const systemPrompt = "You are an academic performance analyst. Provide objective analysis of student academic data.";
            const userContent = `Analyze this student's academic performance and provide insights:

Student Data:
${payload}

Provide a brief analysis of their academic standing, strengths, and areas for improvement. Focus on objective assessment. Return only the analysis text, no additional formatting or explanations.`;

            const analysis = await this.callAI(systemPrompt, userContent);
            return { success: true, data: { academicAnalysis: analysis } };
        } catch (error) {
            console.error("AcademicAnalysisAgent error:", error);
            return { success: false, error: "Failed to analyze academic performance" };
        }
    }
}

class BehavioralAnalysisAgent extends BaseAgent {
    async analyzeBehavior(studentData: StudentData): Promise<AgentResult> {
        try {
            console.log(`BehavioralAnalysisAgent: Analyzing behavior for ${studentData.name}`);

            const payload = this.formatStudentPayload(studentData);
            const systemPrompt = "You are a behavioral analyst specializing in student character assessment.";
            const userContent = `Analyze this student's behavioral traits and provide insights:

Student Data:
${payload}
Traits: ${studentData.traits}

Provide a brief analysis of their behavioral characteristics, social skills, and personality traits that would be relevant for a school report comment. Return only the analysis text, no additional formatting or explanations.`;

            const analysis = await this.callAI(systemPrompt, userContent);
            return { success: true, data: { behavioralAnalysis: analysis } };
        } catch (error) {
            console.error("BehavioralAnalysisAgent error:", error);
            return { success: false, error: "Failed to analyze behavioral traits" };
        }
    }
}

class CommentGenerationAgent extends BaseAgent {
    async generateComment(
        studentData: StudentData,
        analyses: { academicAnalysis: string; behavioralAnalysis: string },
        criteria: CommentCriteria,
        type: "teacher" | "principal"
    ): Promise<AgentResult> {
        try {
            console.log(`CommentGenerationAgent: Generating ${type} comment for ${studentData.name}`);

            const template = type === "teacher" ? criteria.teacherPrompt : criteria.principalPrompt;

            // Replace placeholders in the template
            let prompt = template;
            const replacements: Record<string, string> = {
                first_name: studentData.firstName,
                firstName: studentData.firstName,
                last_name: studentData.lastName,
                lastName: studentData.lastName,
                name: studentData.name,
                gender: studentData.gender,
                term: studentData.term,
                average: studentData.average.toString(),
                position: studentData.position.toString(),
                attendance: studentData.attendance,
                traits: studentData.traits,
                behaviour: studentData.traits,
                skills: studentData.traits,
            };

            for (const [key, value] of Object.entries(replacements)) {
                prompt = prompt.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
            }

            // Remove any unreplaced placeholders
            prompt = prompt.replace(/{{[^}]+}}/g, "").trim();

            // Add context from analyses
            const teacherInput = {
                first_name: studentData.firstName,
                name: studentData.name,
                gender: studentData.gender,
                affective_traits: studentData.affective_traits,
                psychomotor_skills: studentData.psychomotor_skills,
            };
            const systemPrompt = buildCommentSystemPrompt(type);
            const promptWithTeacherInput =
                type === "teacher"
                    ? `${prompt}\n\nUse ONLY the following student identity for this single comment:\n- Full name: ${studentData.name}\n- First name: ${studentData.firstName}\n\nTeacher Input JSON:\n${JSON.stringify(teacherInput, null, 2)}`
                    : prompt;
            const userContent = buildCommentUserContent(type, promptWithTeacherInput, studentData, analyses, criteria.commentConfig);

            const comment = await this.callAI(systemPrompt, userContent);
            return { success: true, data: { comment, type } };
        } catch (error) {
            console.error("CommentGenerationAgent error:", error);
            return { success: false, error: `Failed to generate ${type} comment` };
        }
    }
}

class ValidationAgent extends BaseAgent {
    async validateComment(
        comment: string,
        studentData: StudentData,
        criteria: CommentCriteria,
        type: "teacher" | "principal"
    ): Promise<AgentResult> {
        try {
            console.log(`ValidationAgent: Validating ${type} comment for ${studentData.name}`);

            const template = type === "teacher" ? criteria.teacherPrompt : criteria.principalPrompt;
            const payload = this.formatStudentPayload(studentData);

            const systemPrompt = "You are a validation specialist. Return only JSON responses.";
            const userContent = `Validate this ${type} comment against the school's criteria:

School Criteria: ${template}

Student Data:
${payload}
Traits: ${studentData.traits}

Generated Comment: "${comment}"

Check if the comment:
1. References the student's academic performance appropriately
2. Includes behavioral/character assessment
3. Aligns with the school's commenting style and criteria
4. Is appropriate in length and tone
5. Contains no factual errors

Return only this JSON, nothing else:
{
  "isValid": true/false,
  "issues": ["list of issues if invalid, empty array if valid"],
  "notes": "brief explanation"
}`;

            const validation = await this.callAI(systemPrompt, userContent);

            // Parse JSON response
            try {
                const result = JSON.parse(validation);
                return {
                    success: true,
                    data: {
                        isValid: result.isValid,
                        validationNotes: result.notes || result.issues?.join(", ") || validation,
                        comment
                    }
                };
            } catch (parseError) {
                // Fallback to text parsing if JSON fails
                const isValid = validation.toUpperCase().includes("VALID") && !validation.toUpperCase().includes("INVALID");
                return {
                    success: true,
                    data: {
                        isValid,
                        validationNotes: validation,
                        comment
                    }
                };
            }
        } catch (error) {
            console.error("ValidationAgent error:", error);
            return { success: false, error: "Failed to validate comment" };
        }
    }
}

class QualityAssuranceAgent extends BaseAgent {
    async finalCheck(
        comment: string,
        studentData: StudentData,
        validationResult: any
    ): Promise<AgentResult> {
        try {
            console.log(`QualityAssuranceAgent: Final check for ${studentData.name}`);

            if (!validationResult.isValid) {
                // Attempt to fix the comment
                const systemPrompt = "You are a comment editor. Fix validation issues while maintaining professional tone.";
                const userContent = `Fix this comment based on the validation issues:

Original Comment: "${comment}"

Validation Issues: ${validationResult.validationNotes}

Student: ${studentData.name} (${studentData.average}%, Position ${studentData.position})

Provide a corrected version that addresses the issues. Return only the corrected comment text, no additional formatting or explanations.`;

                const correctedComment = await this.callAI(systemPrompt, userContent);
                return { success: true, data: { finalComment: correctedComment, wasCorrected: true } };
            }

            return { success: true, data: { finalComment: comment, wasCorrected: false } };
        } catch (error) {
            console.error("QualityAssuranceAgent error:", error);
            return { success: false, error: "Failed quality assurance check" };
        }
    }
}

class CoordinatorAgent {
    private dataAgent: DataCollectionAgent;
    private academicAgent: AcademicAnalysisAgent;
    private behavioralAgent: BehavioralAnalysisAgent;
    private generationAgent: CommentGenerationAgent;
    private validationAgent: ValidationAgent;
    private qaAgent: QualityAssuranceAgent;

    constructor(provider: AiProvider, primaryModel: string) {
        this.dataAgent = new DataCollectionAgent(provider, primaryModel);
        this.academicAgent = new AcademicAnalysisAgent(provider, primaryModel);
        this.behavioralAgent = new BehavioralAnalysisAgent(provider, primaryModel);
        this.generationAgent = new CommentGenerationAgent(provider, primaryModel);
        this.validationAgent = new ValidationAgent(provider, primaryModel);
        this.qaAgent = new QualityAssuranceAgent(provider, primaryModel);
    }

    async generateComment(
        studentId: string,
        termId: string,
        type: "teacher" | "principal"
    ): Promise<string> {
        try {
            console.log(`CoordinatorAgent: Starting ${type} comment generation for student ${studentId}`);

            // Step 1: Collect student data
            const dataResult = await this.dataAgent.collectStudentData(studentId, termId);
            if (!dataResult.success) {
                throw new Error(dataResult.error || "Failed to collect student data");
            }
            const studentData = dataResult.data as StudentData;

            // Step 2: Get AI criteria
            const aiSettings = await getOrCreateAiSettings(studentData.schoolId);

            const criteria: CommentCriteria = {
                teacherPrompt: aiSettings.teacherPrompt || "Generate a professional teacher comment.",
                principalPrompt: aiSettings.principalPrompt || "Generate a professional principal comment.",
                schoolId: studentData.schoolId,
                commentConfig: ((aiSettings as any).commentConfig as ReportCommentConfig | null) || DEFAULT_COMMENT_CONFIG,
            };

            // Step 3: Parallel analysis
            const [academicResult, behavioralResult] = await Promise.all([
                this.academicAgent.analyzePerformance(studentData),
                this.behavioralAgent.analyzeBehavior(studentData),
            ]);

            if (!academicResult.success || !behavioralResult.success) {
                throw new Error("Failed to analyze student data");
            }

            const analyses = {
                academicAnalysis: academicResult.data.academicAnalysis,
                behavioralAnalysis: behavioralResult.data.behavioralAnalysis,
            };

            // Step 4: Generate comment
            const generationResult = await this.generationAgent.generateComment(
                studentData,
                analyses,
                criteria,
                type
            );

            if (!generationResult.success) {
                throw new Error(generationResult.error || "Failed to generate comment");
            }

            const { comment } = generationResult.data;

            // Step 5: Validate comment
            const validationResult = await this.validationAgent.validateComment(
                comment,
                studentData,
                criteria,
                type
            );

            if (!validationResult.success) {
                throw new Error(validationResult.error || "Failed to validate comment");
            }

            // Step 6: Quality assurance
            const qaResult = await this.qaAgent.finalCheck(
                comment,
                studentData,
                validationResult.data
            );

            if (!qaResult.success) {
                throw new Error(qaResult.error || "Failed quality assurance");
            }

            const finalComment = qaResult.data.finalComment;
            console.log(`CoordinatorAgent: Successfully generated ${type} comment for ${studentData.name}`);

            return finalComment;
        } catch (error) {
            console.error("CoordinatorAgent error:", error);
            return "Manual assessment recommended due to technical issues.";
        }
    }
}

function getConfiguredAiProvider(): AiProvider {
    if (process.env.OPENROUTER_API_KEY) return "openrouter";
    if (process.env.GOOGLE_AI_API_KEY) return "gemini";
    return "openrouter";
}

async function getOrCreateAiSettings(schoolId: string) {
    let aiSettings = await prisma.aiSettings.findUnique({ where: { schoolId } });
    if (!aiSettings) {
        aiSettings = await prisma.aiSettings.create({ data: { schoolId } });
    }
    return aiSettings;
}

async function callOpenRouter(systemPrompt: string, userContent: string, model: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("API Key Missing");

    try {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: userContent });

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
                messages,
                max_tokens: 200,
                temperature: 0.3,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => "Unknown");
            throw new Error(`OpenRouter ${res.status}: ${errorBody.substring(0, 50)}`);
        }

        const data = await res.json();
        return data.choices[0]?.message?.content?.trim() ?? "";
    } catch (err: any) {
        if (err.name === 'TimeoutError') throw new Error("Timeout (30s)");
        throw err;
    }
}

async function callGemini(systemPrompt: string, userContent: string, model: string): Promise<string> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("API Key Missing");

    // Gemini API expects a different shape than OpenRouter.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
        const requestBody: any = {
            contents: [{ role: "user", parts: [{ text: userContent }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 200,
            },
        };

        if (systemPrompt) {
            requestBody.systemInstruction = {
                role: "system",
                parts: [{ text: systemPrompt }]
            };
        }

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => "Unknown");
            throw new Error(`Gemini ${res.status}: ${errorBody.substring(0, 80)}`);
        }

        const data: any = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") ?? "";
        return String(text).trim();
    } catch (err: any) {
        if (err?.name === "TimeoutError") throw new Error("Timeout (30s)");
        throw err;
    }
}

async function generateWithFallback(systemPrompt: string, userContent: string): Promise<string> {
    const provider = getConfiguredAiProvider();
    console.log(`AI Service: Using provider ${provider}`);
    const models =
        provider === "gemini"
            ? ([
                // Keep these in descending preference; Vercel env already includes GOOGLE_AI_API_KEY.
                "gemini-2.0-flash",
                "gemini-1.5-flash",
            ] as const)
            : ([                // OpenRouter main model for report comment generation (DeepSeek R1 preferred)
                "deepseek-ai/deepseek-r1",                "google/gemini-2.0-flash-lite-001",
                "google/gemini-2.0-flash-001",
                "google/gemini-flash-1.5-8b",
                "google/gemini-flash-1.5",
                "meta-llama/llama-3.1-8b-instruct:free",
            ] as const);
    let lastError: any;
    for (const model of models) {
        try {
            console.log(`AI Service: Trying model ${model} with provider ${provider}`);
            const output =
                provider === "gemini"
                    ? await callGemini(systemPrompt, userContent, model)
                    : await callOpenRouter(systemPrompt, userContent, model);
            if (output) {
                console.log(`AI Service: Successfully used model ${model}`);
                return output;
            }
            lastError = new Error("Empty AI response");
        } catch (err: any) {
            console.warn(`AI Service: Model ${model} failed:`, err.message);
            lastError = err;
            if (err.message.includes("401") || err.message.includes("402") || err.message.includes("API Key Missing")) {
                throw err;
            }
        }
    }
    throw lastError;
}

export async function generateAIComment(studentData: any, type: "teacher" | "principal") {
    try {
        const schoolId = studentData.schoolId;

        // Ensure AI settings exist before generation
        const aiSettings = await getOrCreateAiSettings(schoolId);
        const useMultiAgent = aiSettings.useMultiAgentComments;
        const hasMultiAgentContext = Boolean(studentData.studentId && studentData.termId);

        if (useMultiAgent && hasMultiAgentContext) {
            console.log(`Using multi-agent system for ${type} comment generation`);
            const provider = getConfiguredAiProvider();
            const primaryModel = provider === "gemini"
                ? "gemini-2.0-flash"
                : "deepseek-ai/deepseek-r1";

            const coordinator = new CoordinatorAgent(provider, primaryModel);
            try {
                const result = await coordinator.generateComment(studentData.studentId, studentData.termId, type);
                if (!result || result.startsWith("Manual assessment recommended")) {
                    throw new Error("Multi-agent comment generation returned fallback result");
                }
                return result;
            } catch (error) {
                console.warn("Multi-agent generation failed, falling back to single-agent:", error);
            }
        } else if (useMultiAgent) {
            console.warn(`Skipping multi-agent system for ${type} comment generation because studentId or termId is missing`);
        }

        // Fallback to original single-agent system
        console.log(`Using single-agent system for ${type} comment generation`);

        let promptTemplate = type === "teacher" ? aiSettings.teacherPrompt : aiSettings.principalPrompt;
        promptTemplate = (promptTemplate || "").trim() || (type === "teacher" ? defaultTeacherPrompt : defaultPrincipalPrompt);

        const firstName = studentData.firstName || (typeof studentData.name === "string" ? studentData.name.split(" ")[0] : "the student");
        const lastName = studentData.lastName || (typeof studentData.name === "string" ? studentData.name.split(" ").slice(-1)[0] : "");
        const name = studentData.name || `${firstName} ${lastName}`.trim() || "the student";
        const averageValue = Number(studentData.average ?? 0);
        const averageText = Number.isFinite(averageValue) ? `${averageValue}` : "0";
        const positionText = studentData.position !== undefined && studentData.position !== null ? `${studentData.position}` : "N/A";
        const reportTypeLabel = studentData.reportTypeLabel || (studentData.reportType === "halfTerm" ? "Half term" : "End of term");
        const resitSubjects = Array.isArray(studentData.resitSubjects) ? studentData.resitSubjects.filter(Boolean).join(", ") : "None";
        const focusSubject = studentData.focusSubject?.name || "None";

        const replacements: Record<string, string> = {
            first_name: firstName,
            firstName: firstName,
            last_name: lastName,
            lastName: lastName,
            name,
            gender: studentData.gender || "neutral",
            term: studentData.term || "current term",
            average: averageText,
            position: positionText,
            attendance: studentData.attendance || "N/A",
            traits: studentData.traits || "N/A",
            behaviour: studentData.traits || "N/A",
            skills: studentData.traits || "N/A",
            report_type: reportTypeLabel,
            report_term_number: studentData.termNumber?.toString() || "N/A",
            resit_subjects: resitSubjects,
            focus_subject: focusSubject,
        };

        let prompt = promptTemplate;
        for (const [key, value] of Object.entries(replacements)) {
            prompt = prompt.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
        }

        // Remove any placeholders that weren't recognized to avoid unfilled literal tokens in the prompt.
        prompt = prompt.replace(/{{[^}]+}}/g, "").trim();

        const commentConfig = ((aiSettings as any).commentConfig as ReportCommentConfig | null) || DEFAULT_COMMENT_CONFIG;
        const systemPrompt = buildCommentSystemPrompt(type);
        const userContent = buildCommentUserContent(type, prompt, studentData, {
            academicAnalysis: "",
            behavioralAnalysis: "",
        }, commentConfig);

        return await generateWithFallback(systemPrompt, userContent);
    } catch (error) {
        console.error("AI Generation Failure:", error);
        return "Manual assessment recommended.";
    }
}

export async function generateTeacherComment(schoolId: string, studentData: any) {
    // Add studentId and termId to studentData for multi-agent system
    const enhancedData = {
        ...studentData,
        schoolId,
        studentId: studentData.studentId || studentData.id,
        termId: studentData.termId,
    };
    return generateAIComment(enhancedData, "teacher");
}

export async function generatePrincipalComment(schoolId: string, studentData: any) {
    // Add studentId and termId to studentData for multi-agent system
    const enhancedData = {
        ...studentData,
        schoolId,
        studentId: studentData.studentId || studentData.id,
        termId: studentData.termId,
    };
    return generateAIComment(enhancedData, "principal");
}
