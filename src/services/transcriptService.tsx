
import prisma from "@/lib/prisma";
import { TranscriptData } from "@/components/transcripts/types";
import ReactPDF from "@react-pdf/renderer";
import TranscriptDocument from "@/components/transcripts/TranscriptDocument";
import React from "react";
import path from "path";

const TERM_NAMES: Record<number, string> = { 1: "First Term", 2: "Second Term", 3: "Third Term" };

export async function generateTranscriptData(
    studentId: string,
    useAbsolutePath: boolean = true
): Promise<TranscriptData> {
    // 1. Fetch student with school and current class
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            school: true,
            classArm: { include: { class: true } },
        },
    });

    if (!student) throw new Error("Student not found");
    const school = student.school;
    if (!school) throw new Error("School data not found");

    // 2. Fetch ALL report cards for this student
    const reportCards = await prisma.reportCard.findMany({
        where: { studentId },
        include: {
            term: {
                include: {
                    session: true,
                },
            },
            classArm: {
                include: { class: true },
            },
        },
        orderBy: [
            { term: { session: { startDate: "asc" } } },
            { term: { termNumber: "asc" } },
        ],
    });

    if (reportCards.length === 0) {
        return {
            student: buildStudentData(student, useAbsolutePath),
            school: buildSchoolData(school),
            sessions: [],
            cumulativeStats: {
                totalSessions: 0,
                overallAverage: 0,
                highestSessionAverage: 0,
                lowestSessionAverage: 0,
                highestSessionLabel: "-",
                lowestSessionLabel: "-",
                totalSubjectEntries: 0,
            },
            gradingRules: [],
            generatedAt: new Date().toISOString(),
        };
    }

    // 3. Fetch ALL scores for these terms
    const termIds = reportCards.map(rc => rc.termId);
    const scores = await prisma.score.findMany({
        where: {
            studentId,
            termId: { in: termIds },
        },
        include: { subject: true },
    });

    // 4. Fetch grading rules
    const gradingRules = await prisma.gradingRule.findMany({
        where: { schoolId: school.id },
        orderBy: { maxScore: "desc" },
    });

    // Group scores by termId
    const scoresByTerm: Record<string, typeof scores> = {};
    scores.forEach(score => {
        if (!scoresByTerm[score.termId]) scoresByTerm[score.termId] = [];
        scoresByTerm[score.termId].push(score);
    });

    // Group report cards by session
    const sessionMap = new Map<string, { session: typeof reportCards[0]["term"]["session"]; reportCards: typeof reportCards }>();
    reportCards.forEach(rc => {
        const sessionId = rc.term.sessionId;
        if (!sessionMap.has(sessionId)) {
            sessionMap.set(sessionId, { session: rc.term.session, reportCards: [] });
        }
        sessionMap.get(sessionId)!.reportCards.push(rc);
    });

    // Build session records
    const sessions = Array.from(sessionMap.values())
        .sort((a, b) => a.session.startDate.getTime() - b.session.startDate.getTime())
        .map(({ session, reportCards: rcs }) => {
            const sortedRcs = rcs.sort((a, b) => a.term.termNumber - b.term.termNumber);
            const lastRc = sortedRcs[sortedRcs.length - 1];
            const className = `${lastRc.classArm.class.name} ${lastRc.classArm.armName}`;

            // Check if 3rd term exists
            const term3Rc = sortedRcs.find(rc => rc.term.termNumber === 3);

            if (term3Rc) {
                // === END OF SESSION FORMAT ===
                const term3Scores = scoresByTerm[term3Rc.termId] || [];
                const term1Rc = sortedRcs.find(rc => rc.term.termNumber === 1);
                const term2Rc = sortedRcs.find(rc => rc.term.termNumber === 2);
                const term1Scores = term1Rc ? (scoresByTerm[term1Rc.termId] || []) : [];
                const term2Scores = term2Rc ? (scoresByTerm[term2Rc.termId] || []) : [];

                const totalScore = term3Rc.totalScore?.toNumber() ?? term3Scores.reduce((sum, s) => sum + s.total.toNumber(), 0);
                const subjectsCount = term3Scores.length;
                const average = term3Rc.average?.toNumber() ?? (subjectsCount > 0 ? totalScore / subjectsCount : 0);

                return {
                    id: session.id,
                    name: session.name,
                    className,
                    hasEndOfSession: true,
                    subjects: term3Scores.map(s => {
                        const t1Score = term1Scores.find(ts => ts.subjectId === s.subjectId);
                        const t2Score = term2Scores.find(ts => ts.subjectId === s.subjectId);
                        const caTotal = s.ca1.toNumber() + s.ca2.toNumber() + s.ca3.toNumber();

                        return {
                            subjectId: s.subjectId,
                            subjectName: s.subject.name,
                            category: s.subject.category,
                            cumulativeTotal1: t1Score ? t1Score.total.toNumber() : undefined,
                            cumulativeTotal2: t2Score ? t2Score.total.toNumber() : undefined,
                            ca: caTotal,
                            exam: s.exam.toNumber(),
                            total: s.total.toNumber(),
                            grade: s.grade || "-",
                            remark: s.remark || "-",
                        };
                    }),
                    summary: {
                        totalScore: Number(totalScore.toFixed(2)),
                        totalObtainable: term3Rc.totalObtainable ?? subjectsCount * 100,
                        average: Number(average.toFixed(2)),
                        subjectsCount,
                    },
                    attendance: {
                        daysPresent: term3Rc.daysPresent ?? 0,
                        daysAbsent: term3Rc.daysAbsent ?? 0,
                        totalSchoolDays: term3Rc.totalSchoolDays ?? 0,
                    },
                    termResults: undefined,
                };
            } else {
                // === NO 3RD TERM — show individual term results ===
                const termResults = sortedRcs.map(rc => {
                    const termScores = scoresByTerm[rc.termId] || [];
                    if (termScores.length === 0) return null;

                    const totalScore = rc.totalScore?.toNumber() ?? termScores.reduce((sum, s) => sum + s.total.toNumber(), 0);
                    const subjectsCount = termScores.length;
                    const average = rc.average?.toNumber() ?? (subjectsCount > 0 ? totalScore / subjectsCount : 0);

                    return {
                        termName: TERM_NAMES[rc.term.termNumber] || `Term ${rc.term.termNumber}`,
                        termNumber: rc.term.termNumber,
                        subjects: termScores.map(s => ({
                            subjectName: s.subject.name,
                            ca: s.ca1.toNumber() + s.ca2.toNumber() + s.ca3.toNumber(),
                            exam: s.exam.toNumber(),
                            total: s.total.toNumber(),
                            grade: s.grade || "-",
                            remark: s.remark || "-",
                        })),
                        summary: {
                            totalScore: Number(totalScore.toFixed(2)),
                            totalObtainable: rc.totalObtainable ?? subjectsCount * 100,
                            average: Number(average.toFixed(2)),
                            subjectsCount,
                        },
                    };
                }).filter((r): r is NonNullable<typeof r> => r !== null);

                // Use last available term for overall summary
                const lastTermScores = scoresByTerm[lastRc.termId] || [];
                const totalScore = lastRc.totalScore?.toNumber() ?? lastTermScores.reduce((sum, s) => sum + s.total.toNumber(), 0);
                const subjectsCount = lastTermScores.length;
                const average = lastRc.average?.toNumber() ?? (subjectsCount > 0 ? totalScore / subjectsCount : 0);

                return {
                    id: session.id,
                    name: session.name,
                    className,
                    hasEndOfSession: false,
                    subjects: [],
                    summary: {
                        totalScore: Number(totalScore.toFixed(2)),
                        totalObtainable: lastRc.totalObtainable ?? subjectsCount * 100,
                        average: Number(average.toFixed(2)),
                        subjectsCount,
                    },
                    attendance: {
                        daysPresent: lastRc.daysPresent ?? 0,
                        daysAbsent: lastRc.daysAbsent ?? 0,
                        totalSchoolDays: lastRc.totalSchoolDays ?? 0,
                    },
                    termResults,
                };
            }
        });

    // Compute cumulative statistics
    const sessionAverages = sessions
        .map(s => ({
            average: s.summary.average,
            label: s.name,
        }))
        .filter(s => s.average > 0);

    const overallAverage = sessionAverages.length > 0
        ? sessionAverages.reduce((sum, s) => sum + s.average, 0) / sessionAverages.length
        : 0;

    const highestSession = sessionAverages.length > 0
        ? sessionAverages.reduce((max, s) => s.average > max.average ? s : max, sessionAverages[0])
        : { average: 0, label: "-" };

    const lowestSession = sessionAverages.length > 0
        ? sessionAverages.reduce((min, s) => s.average < min.average ? s : min, sessionAverages[0])
        : { average: 0, label: "-" };

    return {
        student: buildStudentData(student, useAbsolutePath),
        school: buildSchoolData(school),
        sessions,
        cumulativeStats: {
            totalSessions: sessions.length,
            overallAverage: Number(overallAverage.toFixed(2)),
            highestSessionAverage: highestSession.average,
            lowestSessionAverage: lowestSession.average,
            highestSessionLabel: highestSession.label,
            lowestSessionLabel: lowestSession.label,
            totalSubjectEntries: scores.length,
        },
        gradingRules: gradingRules.map(r => ({
            grade: r.grade,
            minScore: r.minScore,
            maxScore: r.maxScore,
            remark: r.remark,
        })),
        generatedAt: new Date().toISOString(),
    };
}

export async function generateTranscriptStream(data: TranscriptData): Promise<NodeJS.ReadableStream> {
    return await ReactPDF.renderToStream(
        <TranscriptDocument data={data} />
    ) as NodeJS.ReadableStream;
}

function buildStudentData(student: any, useAbsolutePath: boolean) {
    let photoUrl: string | undefined;
    if (student.photoUrl) {
        if (student.photoUrl.startsWith("http")) {
            photoUrl = student.photoUrl;
        } else if (useAbsolutePath) {
            photoUrl = path.join(process.cwd(), "public", student.photoUrl.startsWith("/") ? student.photoUrl.slice(1) : student.photoUrl);
        } else {
            photoUrl = student.photoUrl;
        }
    }

    return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        otherNames: student.otherNames || undefined,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : undefined,
        photoUrl,
        admissionDate: student.admissionDate ? student.admissionDate.toISOString() : undefined,
        stateOfOrigin: student.stateOfOrigin || undefined,
        currentClassName: student.classArm
            ? `${student.classArm.class.name} ${student.classArm.armName}`
            : "Unassigned",
    };
}

function buildSchoolData(school: any) {
    return {
        name: school.name,
        address: school.address || "",
        email: school.email || "",
        phone: school.phone || "",
        logoUrl: school.logoUrl || undefined,
        motto: school.motto || undefined,
        principalSignatureUrl: school.principalSignatureUrl || undefined,
        stampUrl: school.stampUrl || undefined,
    };
}
