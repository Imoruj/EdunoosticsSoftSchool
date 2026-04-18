import { ReportCommentConfig, ReportCommentPayload } from "@/lib/reportPayloadBuilder";

export const CRITICAL_COMMENT_RULES = `CRITICAL RULES FOR SCHOOL COMMENT GENERATION (MUST FOLLOW ALL):
1. ALWAYS use the school's comment template provided - do not create your own format
2. Keep comments to 1-2 sentences maximum - be extremely concise
3. Include specific academic data (average, position if ranked) and 1-2 key behavioral traits
4. Use the exact wording and structure from the school template
5. Do NOT add extra analysis, explanations, or free-form prose
6. Return ONLY the comment text - no introductions, conclusions, or meta-commentary
7. Use the student's name from the provided student data; do not reuse any other student's name
8. If the template includes a sample student name, replace it with the provided student name
9. Use the correct pronoun matching the student's gender throughout`;

export const HALF_TERM_COMMENT_RULES = `ADDITIONAL RULES FOR HALF-TERM REPORTS:
- This is a MID-TERM interim report, NOT a final end-of-term assessment
- Do NOT mention class position — students are not yet ranked at half-term
- Do NOT mention resit subjects — resit only applies at end of third term
- Focus on current progress and encouragement to keep up or improve before the term ends
- Use language like "so far this term", "has been showing", "is encouraged to" rather than final verdicts`;

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

export const defaultTeacherPrompt = `Generate a professional and encouraging class teacher’s comment for a student based on these details:
Name: {{name}}
Gender: {{gender}}
Report Type: {{report_type}}
Term: {{term}}
Average Score: {{average}}%
Class Position: {{position}}
Attendance: {{attendance}}
Traits: {{traits}}
Focus Subject: {{focus_subject}}
Resit Subjects: {{resit_subjects}}

Write 1-2 sentences. Use the correct pronoun for the student’s gender. Acknowledge their average (and class position if ranked), name one behavioral strength from their traits, and if a focus subject exists, gently encourage improvement in it. Mention resit subjects only when required. For half-term reports, do not mention class position or resit subjects.`;

export const defaultPrincipalPrompt = `Generate a concise principal’s closing remark for a student based on their overall performance:
Name: {{name}}
Gender: {{gender}}
Report Type: {{report_type}}
Term: {{term}}
Average Score: {{average}}%
Class Position: {{position}}
Attendance: {{attendance}}
Traits: {{traits}}
Resit Subjects: {{resit_subjects}}

Write 1-2 sentences. Use the correct pronoun for the student’s gender. Reflect on their overall achievement this term using their average (and class position if ranked). End with a motivating, forward-looking statement. Mention resit subjects only if they exist and this is an end-of-term report.`;

export function buildCommentSystemPrompt(type: "teacher" | "principal", reportType?: "halfTerm" | "endOfTerm") {
    const halfTermSection = reportType === "halfTerm" ? `\n\n${HALF_TERM_COMMENT_RULES}` : "";
    return `${CRITICAL_COMMENT_RULES}${halfTermSection}

You are a professional ${type} comment writer for a school. Follow the school comment template exactly and do not deviate from the required structure or tone.`;
}

function getPerformanceBand(average: number): string {
    if (average >= 75) return "Excellent";
    if (average >= 60) return "Good";
    if (average >= 50) return "Average";
    if (average >= 40) return "Below Average";
    return "Poor";
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
            return `- ${name}: ${score}`;
        }).join("\n") || "- No subject score details available.";

    const focusLine = studentData.focusSubject
        ? `Focus subject (lowest, needs attention): ${studentData.focusSubject.name} — ${studentData.focusSubject.rawScore}/${studentData.focusSubject.maxScore} (${studentData.focusSubject.percentage}%).`
        : "Focus subject: None.";

    const resitLine = studentData.includeResitAddendum && studentData.resitSubjects.length > 0
        ? `Resit subjects: ${studentData.resitSubjects.join(", ")}.`
        : "Resit subjects: None.";

    const performanceBand = getPerformanceBand(studentData.average);

    const isHalfTerm = studentData.reportType === "halfTerm";
    const positionDisplay = isHalfTerm ? "Not ranked (interim report)" : `${studentData.position}`;

    return `${prompt}

Student identity (must match exactly):
- Full name: ${studentData.name}
- First name: ${studentData.firstName}
- Last name: ${studentData.lastName}
- Gender: ${studentData.gender}

Report Type: ${studentData.reportTypeLabel}
${commentConfig ? renderCommentConfig(commentConfig) + "\n\n" : ""}Average: ${studentData.average}% (${performanceBand})
Class Position: ${positionDisplay}
Attendance: ${studentData.attendance}
Traits: ${studentData.traits || "Not recorded"}
${focusLine}
${resitLine}

Subject breakdown:
${subjectLines}
${analyses.academicAnalysis ? `\nAcademic Analysis: ${analyses.academicAnalysis}` : ""}${analyses.behavioralAnalysis ? `\nBehavioral Analysis: ${analyses.behavioralAnalysis}` : ""}

Generate only the ${type} comment text. Do not include any additional explanation, metadata, or formatting.`;
}
