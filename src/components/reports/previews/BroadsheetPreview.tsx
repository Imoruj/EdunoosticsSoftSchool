import React from "react";
import { BroadsheetData, BroadsheetDisplayOptions, SectionStyle } from "../broadsheetTypes";
import { formatNonZeroScoreOrBlank } from "../scoreFormatting";

interface BroadsheetPreviewProps {
    config: {
        activeTemplate: string;
        colorScheme: string;
        showCA1: boolean;
        showCA2: boolean;
        showExam: boolean;
        showSubjectTotal: boolean;
        showGrade: boolean;
        showPosition: boolean;
        customTitles?: Record<string, string>;
        displayOptions?: BroadsheetDisplayOptions;
    };
    data?: BroadsheetData;
}

// ── Mock Data ──────────────────────────────────────────────────────
const MOCK_SUBJECTS = [
    "English Language", "Mathematics", "Physics", "Chemistry",
    "Biology", "Economics", "Commerce",
];

const STUDENT_NAMES = [
    "Akunam Osubamem Kingdavid", "Bawey Dennis Chrismyl",
    "Chabake Precious Chimsom", "Doki Popkabari Excel",
    "Egurunne Onoshioze Annabel", "Erewa Uganu Sharon",
    "Fata Omotolanl", "Ijesiobemi Oluwatimilehim Lord's Treasure",
    "Ndege Ephraimo Emerald", "Mburipbaa Samica",
    "Ochenbo Richmore", "Obiwasaka Naomi Ferami",
    "Onyeka Chinedu Nikki", "Onyekochi Edwin Uchechiukwu",
    "Orda Chiminirim Blossom", "Tony-Ekawu Oguiwe Tonia",
    "Uzodinma-Oworo Chiborim Elvis", "Wanogho Uritonginer Ileoma",
];

const seed = (a: number, b: number) => ((a * 2654435761 + b * 340573321) >>> 0) % 100;

function buildMockStudents() {
    const students = STUDENT_NAMES.map((name, i) => {
        const scores = MOCK_SUBJECTS.map((_, j) => {
            const s = seed(i + 1, j + 1);
            const ca1 = 8 + (s % 7);
            const ca2 = 7 + ((s * 3) % 8);
            const dmat = ca1 + ca2;
            const exam = 35 + ((s * 7) % 36);
            const total = dmat + exam;
            const term1 = 55 + ((s * 11) % 40);
            const term2 = 50 + ((s * 13) % 45);
            const grade = total >= 80 ? "A1" : total >= 70 ? "B2" : total >= 60 ? "B3" : total >= 50 ? "C4" : total >= 45 ? "C5" : total >= 40 ? "C6" : "F9";
            return { term1, term2, ca1, ca2, dmat, exam, total, grade, pos: "" };
        });
        const grandTotal = scores.reduce((sum, s) => sum + s.total, 0);
        const average = +(grandTotal / MOCK_SUBJECTS.length).toFixed(2);
        return { name, scores, grandTotal, average, overallPos: "", subjectCount: MOCK_SUBJECTS.length };
    });

    MOCK_SUBJECTS.forEach((_, j) => {
        const sorted = [...students].sort((a, b) => b.scores[j].total - a.scores[j].total);
        sorted.forEach((s, rank) => { s.scores[j].pos = `${rank + 1}`; });
    });

    students.sort((a, b) => b.grandTotal - a.grandTotal);
    students.forEach((s, rank) => { s.overallPos = `${rank + 1}`; });

    return students;
}

const MOCK_STUDENTS = buildMockStudents();

type MockSummaryKey = "ca1" | "ca2" | "dmat" | "exam" | "total";

function buildMockSummary(columnKey: MockSummaryKey) {
    return {
        highest: MOCK_SUBJECTS.map((_, j) => Math.max(...MOCK_STUDENTS.map(s => Number((s.scores[j] as any)[columnKey] || 0)))),
        lowest: MOCK_SUBJECTS.map((_, j) => Math.min(...MOCK_STUDENTS.map(s => Number((s.scores[j] as any)[columnKey] || 0)))),
        count: MOCK_SUBJECTS.map(() => MOCK_STUDENTS.length),
    };
}

function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Component ──────────────────────────────────────────────────────
const BroadsheetPreview: React.FC<BroadsheetPreviewProps> = ({ config, data }) => {
    const d = config.displayOptions || {};
    const useRealData = !!data;

    const style: SectionStyle = d.globalStyle || {
        borderWidth: 2, borderStyle: 'solid', borderColor: '#14532d',
        headerBg: '#f3f4f6', headerText: '#1f2937',
    };

    const border = `${style.borderWidth}px ${style.borderStyle} ${style.borderColor || '#14532d'}`;
    const thin = `1px ${style.borderStyle} ${style.borderColor || '#14532d'}`;

    // Determine subjects list
    const subjectNames = useRealData ? data.subjects.map(s => s.name) : MOCK_SUBJECTS;

    // Build visible sub-columns per subject
    const subCols: { key: string; label: string }[] = [];
    if (useRealData && data.reportType === "endOfTerm") {
        if (d.show1stTerm !== false) subCols.push({ key: "term1Total", label: "1st Term" });
        if (d.show2ndTerm !== false) subCols.push({ key: "term2Total", label: "2nd Term" });
    } else if (!useRealData) {
        if (d.show1stTerm !== false) subCols.push({ key: "term1", label: "1st Term" });
        if (d.show2ndTerm !== false) subCols.push({ key: "term2", label: "2nd Term" });
    }
    if (config.showCA1 && d.showCA1 !== false) subCols.push({ key: useRealData ? "ca1" : "ca1", label: "CA 1" });
    if (config.showCA2 && d.showCA2 !== false) subCols.push({ key: useRealData ? "ca2" : "ca2", label: "CA 2" });
    if (d.showDMAT !== false) subCols.push({ key: useRealData ? "caTotal" : "dmat", label: "CA" });
    if (!useRealData || data.reportType === "endOfTerm") {
        if (config.showExam && d.showExam !== false) subCols.push({ key: "exam", label: "EXAM" });
    }
    if (config.showSubjectTotal && d.showSubjectTotal !== false) subCols.push({ key: "total", label: "TOTAL" });
    if (!useRealData || data.reportType === "endOfTerm") {
        if (config.showGrade && d.showGrade !== false) subCols.push({ key: "grade", label: "GRADE" });
    }
    if (config.showPosition && d.showSubjectPosition !== false) subCols.push({ key: useRealData ? "position" : "pos", label: "POS" });

    const availableSubCols = new Set(subCols.map((col) => col.key));
    const pickSummaryColumn = (...keys: string[]) => keys.find((key) => availableSubCols.has(key)) || "";

    // Summary rows should align with the CA subtotal column for half-term.
    // In template preview mode (no real data), prefer CA subtotal so values stay visible even if TOTAL is hidden.
    const summaryCol =
        useRealData
            ? (data.reportType === "halfTerm"
                ? pickSummaryColumn("caTotal", "ca1", "total")
                : pickSummaryColumn("total", "caTotal", "ca1"))
            : pickSummaryColumn("dmat", "total", "ca1");

    const formatPosition = (value: unknown) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) && numericValue > 0 ? ordinal(numericValue) : "";
    };

    // Aggregate columns
    const aggCols: { key: string; label: string }[] = [];
    if (d.showGrandTotal !== false) aggCols.push({ key: "grandTotal", label: "TOTAL" });
    if (d.showAverage !== false) aggCols.push({ key: "average", label: "AVERAGE" });
    if (d.showOverallPosition !== false) aggCols.push({ key: useRealData ? "overallPosition" : "overallPos", label: "OVERALL POS" });
    if (d.showSubjectCount !== false) aggCols.push({ key: "subjectCount", label: "No. of Subject" });
    const scoreColumnKeys = new Set(["term1", "term2", "term1Total", "term2Total", "ca1", "ca2", "ca3", "caTotal", "dmat", "exam", "total"]);
    const aggregateScoreKeys = new Set(["grandTotal", "average"]);

    // Calculate ideal table width based on column count
    const subColPx = 35;
    const aggColPx = 45;
    const idealTableWidth = 20 + 130 + (subjectNames.length * subCols.length * subColPx) + (aggCols.length * aggColPx);

    const thStyle: React.CSSProperties = {
        border: thin, padding: "1px 2px",
        background: style.headerBg, color: style.headerText,
        fontWeight: "bold", fontSize: "6.5px", textAlign: "center",
        writingMode: "vertical-rl", height: "70px", minWidth: "18px",
    };

    const tdStyle: React.CSSProperties = {
        border: thin, padding: "1px 2px", fontSize: "7px", textAlign: "center",
    };

    // Build data arrays based on real or mock
    const displayStudents = useRealData
        ? data.students.map((s) => ({
            name: `${s.lastName} ${s.firstName}`,
            scores: data.subjects.map((sub) => {
                const score = s.scores.find(sc => sc.subjectId === sub.id);
                return score || { ca1: 0, ca2: 0, ca3: 0, caTotal: 0, exam: 0, total: 0, grade: "-", position: 0, term1Total: 0, term2Total: 0 };
            }),
            grandTotal: s.grandTotal,
            average: s.average,
            overallPosition: s.overallPosition,
            subjectCount: s.subjectCount,
        }))
        : MOCK_STUDENTS;

    const mockSummaryKey: MockSummaryKey =
        summaryCol === "caTotal"
            ? "dmat"
            : (["ca1", "ca2", "dmat", "exam", "total"].includes(summaryCol) ? (summaryCol as MockSummaryKey) : "dmat");

    const displaySummary = useRealData
        ? {
            highest: data.subjects.map((sub) => data.summary.highest[sub.id] || 0),
            lowest: data.subjects.map((sub) => data.summary.lowest[sub.id] || 0),
            count: data.subjects.map((sub) => data.summary.studentCountBySubject?.[sub.id] ?? data.summary.studentCount),
        }
        : buildMockSummary(mockSummaryKey);

    // School info
    const schoolName = useRealData ? data.school.name : "TRINITATE INTERNATIONAL SCHOOL";
    const schoolAddress = useRealData ? data.school.address : "ENEKA ROAD, IGWURUTA, GREATER PORT HARCOURT, RIVERS STATE.";
    const sessionName = useRealData ? data.session.name : "2024/2025";
    const termName = useRealData ? data.term.name.toUpperCase() : "THIRD TERM";
    const classLabel = useRealData ? `${data.classArm.className} ${data.classArm.armName}` : "SS 1 Diligence";
    const levelLabel = useRealData && data.classArm.level ? data.classArm.level.replace(/_/g, " ") : "JUNIOR SCHOOL";

    return (
        <div style={{
            fontFamily: "'Times New Roman', serif",
            fontSize: "8px",
            color: "#000",
            background: "#fff",
            padding: "16px 12px",
            aspectRatio: "297 / 210",
            width: "100%",
            boxSizing: "border-box",
        }}>
            {/* School Header */}
            {(d.showSchoolName !== false || d.showLogo !== false) && (
                <div style={{ textAlign: "center", marginBottom: "6px" }}>
                    {d.showLogo !== false && (
                        <div style={{ width: "56px", height: "56px", margin: "0 auto 3px", background: useRealData && data.school.logoUrl ? "transparent" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {useRealData && data.school.logoUrl ? (
                                <img src={data.school.logoUrl} alt="Logo" style={{ width: "56px", height: "56px", objectFit: "contain" }} />
                            ) : (
                                <span style={{ fontSize: "6px", color: "#9ca3af" }}>LOGO</span>
                            )}
                        </div>
                    )}
                    {d.showSchoolName !== false && (
                        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e40af", textTransform: "uppercase", letterSpacing: "1px" }}>
                            {schoolName}
                        </div>
                    )}
                    {d.showSchoolAddress !== false && (
                        <div style={{ fontSize: "7.5px", fontWeight: "bold", fontStyle: "italic", color: "#374151" }}>
                            {schoolAddress}
                        </div>
                    )}
                    {d.showSchoolMotto !== false && (
                        <div style={{ fontSize: "8px", fontWeight: "bold", color: "#1e40af" }}>
                            STUDENTS&apos; EDUCATIONAL CONTINUOUS ASSESSMENT RECORD
                        </div>
                    )}
                    {d.showSessionInfo !== false && (
                        <>
                            <div style={{ fontSize: "8px", fontWeight: "bold" }}>ACADEMIC REPORT ({levelLabel})</div>
                            <div style={{ fontSize: "8px" }}>{sessionName} ACADEMIC SESSION</div>
                        </>
                    )}
                    {(d.showTermInfo !== false || d.showClassInfo !== false) && (
                        <div style={{ fontSize: "8px", display: "flex", justifyContent: "center", gap: "32px", marginTop: "2px" }}>
                            {d.showTermInfo !== false && <span style={{ fontWeight: "bold" }}>{termName}</span>}
                            {d.showClassInfo !== false && <span style={{ fontWeight: "bold" }}>{classLabel}</span>}
                        </div>
                    )}
                </div>
            )}

            {/* Main Table */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", border, tableLayout: "fixed", width: `min(100%, ${idealTableWidth}px)`, margin: "0 auto" }}>
                    <thead>
                        <tr>
                            <th rowSpan={2} style={{ ...thStyle, writingMode: "horizontal-tb", height: "auto", minWidth: "16px", width: "16px", verticalAlign: "bottom", padding: "2px 1px" }}></th>
                            <th rowSpan={2} style={{ ...thStyle, writingMode: "horizontal-tb", height: "auto", minWidth: "120px", width: "120px", textAlign: "left", verticalAlign: "bottom", padding: "2px 4px", fontSize: "7px" }}>
                                NAME
                            </th>
                            {subjectNames.map((sub) => (
                                <th
                                    key={sub}
                                    colSpan={subCols.length}
                                    style={{
                                        border: thin, padding: "3px 2px",
                                        background: style.headerBg, color: style.headerText,
                                        fontWeight: "bold", fontSize: "7.5px", textAlign: "center",
                                    }}
                                >
                                    {sub}
                                </th>
                            ))}
                            {aggCols.map((agg) => (
                                <th key={agg.key} rowSpan={2} style={{ ...thStyle, minWidth: "22px" }}>
                                    {agg.label}
                                </th>
                            ))}
                        </tr>

                        <tr>
                            {subjectNames.map((sub) =>
                                subCols.map((col) => (
                                    <th key={`${sub}-${col.key}`} style={thStyle}>
                                        {col.label}
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {displayStudents.map((student: any, idx: number) => (
                            <tr key={idx}>
                                <td style={{ ...tdStyle, fontSize: "6.5px", fontWeight: "bold", width: "16px" }}>{idx + 1}</td>
                                <td style={{ ...tdStyle, textAlign: "left", padding: "1px 3px", fontSize: "6.5px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
                                    {student.name}
                                </td>
                                {student.scores.map((score: any, sIdx: number) =>
                                    subCols.map((col) => {
                                        const val = (score as any)[col.key];
                                        let displayVal: any = "";
                                        if (col.key === "position" || col.key === "pos") {
                                            displayVal = formatPosition(val);
                                        } else if (scoreColumnKeys.has(col.key)) {
                                            displayVal = formatNonZeroScoreOrBlank(val);
                                        } else if (val !== null && val !== undefined && val !== "" && val !== "-") {
                                            displayVal = String(val);
                                        }
                                        return (
                                            <td
                                                key={`${idx}-${sIdx}-${col.key}`}
                                                style={{
                                                    ...tdStyle,
                                                    fontWeight: col.key === "total" ? "bold" : "normal",
                                                }}
                                            >
                                                {displayVal}
                                            </td>
                                        );
                                    })
                                )}
                                {aggCols.map((agg) => {
                                    const aggVal = (student as any)[agg.key];
                                    let aggDisplay: any = "";
                                    if (agg.key === "overallPosition" || agg.key === "overallPos") {
                                        aggDisplay = formatPosition(aggVal);
                                    } else if (aggregateScoreKeys.has(agg.key)) {
                                        aggDisplay = formatNonZeroScoreOrBlank(aggVal);
                                    } else if (aggVal !== null && aggVal !== undefined && aggVal !== "") {
                                        aggDisplay = String(aggVal);
                                    }
                                    return (
                                        <td
                                            key={`${idx}-${agg.key}`}
                                            style={{
                                                ...tdStyle,
                                                fontWeight: (agg.key === "grandTotal" || agg.key === "average") ? "bold" : "normal",
                                            }}
                                        >
                                            {aggDisplay}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {/* Summary Rows */}
                        {(() => {
                            // Compute per-subject per-column summary from student data
                            const numericKeys = new Set(["ca1", "ca2", "caTotal", "dmat", "exam", "total", "term1", "term2", "term1Total", "term2Total"]);
                            const perSubColHighest: number[][] = [];
                            const perSubColLowest: number[][] = [];
                            const perSubColCount: number[][] = [];

                            subjectNames.forEach((_sub, sIdx) => {
                                const colHighest: number[] = [];
                                const colLowest: number[] = [];
                                const colCount: number[] = [];
                                subCols.forEach((col) => {
                                    if (!numericKeys.has(col.key)) {
                                        colHighest.push(0);
                                        colLowest.push(0);
                                        colCount.push(0);
                                        return;
                                    }
                                    const vals: number[] = [];
                                    displayStudents.forEach((student: any) => {
                                        const score = student.scores[sIdx];
                                        if (!score) return;
                                        const v = Number((score as any)[col.key] || 0);
                                        if (v > 0) vals.push(v);
                                    });
                                    colHighest.push(vals.length > 0 ? Math.max(...vals) : 0);
                                    colLowest.push(vals.length > 0 ? Math.min(...vals) : 0);
                                    colCount.push(vals.length);
                                });
                                perSubColHighest.push(colHighest);
                                perSubColLowest.push(colLowest);
                                perSubColCount.push(colCount);
                            });

                            return (
                                <>
                                    {d.showHighestScore !== false && (
                                        <tr style={{ background: "#f9fafb" }}>
                                            <td style={{ ...tdStyle }}></td>
                                            <td style={{ ...tdStyle, textAlign: "left", padding: "1px 3px", fontSize: "6.5px", fontWeight: "bold", whiteSpace: "nowrap" }}>CLASS HIGHEST SCORE</td>
                                            {perSubColHighest.map((colVals, sIdx) =>
                                                colVals.map((val, cIdx) => {
                                                    const isNumeric = numericKeys.has(subCols[cIdx].key);
                                                    return (
                                                        <td key={`h-${sIdx}-${cIdx}`} style={{ ...tdStyle, fontWeight: "bold" }}>
                                                            {isNumeric && val > 0 ? formatNonZeroScoreOrBlank(val) : ""}
                                                        </td>
                                                    );
                                                })
                                            )}
                                            {aggCols.map((agg) => (
                                                <td key={`h-${agg.key}`} style={tdStyle}></td>
                                            ))}
                                        </tr>
                                    )}
                                    {d.showLowestScore !== false && (
                                        <tr style={{ background: "#f9fafb" }}>
                                            <td style={{ ...tdStyle }}></td>
                                            <td style={{ ...tdStyle, textAlign: "left", padding: "1px 3px", fontSize: "6.5px", fontWeight: "bold", whiteSpace: "nowrap" }}>CLASS LOWEST SCORE</td>
                                            {perSubColLowest.map((colVals, sIdx) =>
                                                colVals.map((val, cIdx) => {
                                                    const isNumeric = numericKeys.has(subCols[cIdx].key);
                                                    return (
                                                        <td key={`l-${sIdx}-${cIdx}`} style={{ ...tdStyle, fontWeight: "bold" }}>
                                                            {isNumeric && val > 0 ? formatNonZeroScoreOrBlank(val) : ""}
                                                        </td>
                                                    );
                                                })
                                            )}
                                            {aggCols.map((agg) => (
                                                <td key={`l-${agg.key}`} style={tdStyle}></td>
                                            ))}
                                        </tr>
                                    )}
                                    {d.showStudentCount !== false && (
                                        <tr style={{ background: "#f9fafb" }}>
                                            <td style={{ ...tdStyle }}></td>
                                            <td style={{ ...tdStyle, textAlign: "left", padding: "1px 3px", fontSize: "6.5px", fontWeight: "bold", whiteSpace: "nowrap" }}>NUMBER OF STUDENTS</td>
                                            {perSubColCount.map((colVals, sIdx) =>
                                                colVals.map((val, cIdx) => {
                                                    const isNumeric = numericKeys.has(subCols[cIdx].key);
                                                    return (
                                                        <td key={`c-${sIdx}-${cIdx}`} style={{ ...tdStyle, fontWeight: "bold" }}>
                                                            {isNumeric && val > 0 ? val : ""}
                                                        </td>
                                                    );
                                                })
                                            )}
                                            {aggCols.map((agg) => (
                                                <td key={`c-${agg.key}`} style={tdStyle}></td>
                                            ))}
                                        </tr>
                                    )}
                                </>
                            );
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BroadsheetPreview;
