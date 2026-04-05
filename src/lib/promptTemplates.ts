import { ReportCommentConfig, ReportCommentPayload } from "@/lib/reportPayloadBuilder";

export const CRITICAL_COMMENT_RULES = `CRITICAL RULES FOR SCHOOL COMMENT GENERATION (MUST FOLLOW ALL):
1. ALWAYS use the school's comment template provided - do not create your own format
2. Keep comments to 1-2 sentences maximum - be extremely concise
3. Include specific academic data (average, position) and 1-2 key behavioral traits
4. Use the exact wording and structure from the school template
5. Do NOT add extra analysis, explanations, or free-form prose
6. Return ONLY the comment text - no introductions, conclusions, or meta-commentary
7. Use the student's name from the provided student data for this single comment; do not reuse any other student's name`;

export function renderCommentConfig(config: ReportCommentConfig) {
    return `Report Comment Configuration:
- Max score per subject: ${config.maxScorePerSubject === "dynamic" ? "Dynamic from assessment type settings" : "100 (CA + Exam combined)"}
- Score displayed: ${config.scoreDisplayed === "raw" ? "Raw score only" : "Raw score out of 100"}
- Overall average: ${config.overallAverage === "normalized" ? "Sum of scores ÷ (subjects × max_score) × 100" : "Sum of scores ÷ number of subjects"}
- Performance band: ${config.performanceBand === "normalized" ? "Derived from normalised % average" : "Derived directly from average"}
- Resit subjects: ${config.resitSubjects === "never" ? "Never" : "3rd term only, score below 50"}
- Resit eligible subjects: ${config.resitEligibleSubjects.join(", ") || "None"}
- Focus subject policy: ${config.focusSubjectPolicy === "lowestNormalized" ? "Lowest scoring subject (normalised)" : "Lowest scoring subject (raw, not resit)"}`;
}

export const defaultTeacherPrompt = `Generate a professional and encouraging class teacher's comment for a student based on these details:
Name: {{name}}
Gender: {{gender}}
Term: {{term}}
Average Score: {{average}}%
Class Position: {{position}}
Attendance: {{attendance}}
Traits: {{traits}}

The comment should be concise, follow the school template, mention the student’s strengths and one area for growth, and include resit subjects only when required.`;

export const defaultPrincipalPrompt = `Generate a concise principal's closing remark for a student based on their overall performance:
Name: {{name}}
Average Score: {{average}}%
Class Position: {{position}}
Attendance: {{attendance}}
Traits: {{traits}}

Keep it professional, focused on growth, and mention resit subjects only if they exist.`;

export function buildCommentSystemPrompt(type: "teacher" | "principal") {
    return `${CRITICAL_COMMENT_RULES}

You are a professional ${type} comment writer for a school. Follow the school comment template exactly and do not deviate from the required structure or tone.`;
}

export function buildCommentUserContent(
    type: "teacher" | "principal",
    prompt: string,
    studentData: ReportCommentPayload,
    analyses: { academicAnalysis: string; behavioralAnalysis: string },
    commentConfig?: ReportCommentConfig
) {
    const subjectLines = (studentData.subjectDetails && studentData.subjectDetails.length > 0)
        ? studentData.subjectDetails.map((subject) => {
            const scoreText = studentData.reportType === "halfTerm"
                ? `${subject.rawScore}/${subject.maxScore}`
                : `${subject.rawScore}`;
            return `- ${subject.name}: ${scoreText} (${subject.percentage}%)`;
        }).join("\n")
        : Object.entries(studentData.subjectScores || {}).map(([name, score]) => {
            const scoreText = studentData.reportType === "halfTerm" ? `${score}` : `${score}`;
            return `- ${name}: ${scoreText}`;
        }).join("\n") || "- No subject score details available.";

    const focusLine = studentData.focusSubject
        ? `Focus subject: ${studentData.focusSubject.name} (${studentData.focusSubject.percentage}%).`
        : studentData.subjectDetails && studentData.subjectDetails.length > 0
            ? "Focus subject: None."
            : "Focus subject information unavailable.";

    const resitLine = studentData.includeResitAddendum
        ? `Resit subjects: ${studentData.resitSubjects.join(", ")}.`
        : "Resit subjects: None.";

    return `${prompt}

Report Type: ${studentData.reportTypeLabel}
${commentConfig ? renderCommentConfig(commentConfig) + "\n\n" : ""}Average: ${studentData.average}%
Class Position: ${studentData.position}
Attendance: ${studentData.attendance}
Traits: ${studentData.traits}
${focusLine}
${resitLine}

Subject breakdown:
${subjectLines}

Additional Context:
Academic Analysis: ${analyses.academicAnalysis}
Behavioral Analysis: ${analyses.behavioralAnalysis}

Generate only the ${type} comment text. Do not include any additional explanation, metadata, or formatting.`;
}
