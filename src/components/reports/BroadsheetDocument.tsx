import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { BroadsheetData, BroadsheetDisplayOptions, SectionStyle } from "./broadsheetTypes";
import { formatNonZeroScoreOrBlank } from "./scoreFormatting";

interface BroadsheetDocumentProps {
    data: BroadsheetData;
}

function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const BroadsheetDocument: React.FC<BroadsheetDocumentProps> = ({ data }) => {
    const d: BroadsheetDisplayOptions = data.config.displayOptions || {};

    const globalStyle: SectionStyle = d.globalStyle || {
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: "#14532d",
        headerBg: "#f3f4f6",
        headerText: "#1f2937",
    };

    const borderColor = globalStyle.borderColor || "#14532d";
    const headerBg = globalStyle.headerBg || "#f3f4f6";
    const headerText = globalStyle.headerText || "#1f2937";

    // Build visible sub-columns per subject (matching BroadsheetPreview.tsx logic)
    const subCols: { key: string; label: string }[] = [];
    if (data.reportType === "endOfTerm") {
        if (d.show1stTerm !== false) subCols.push({ key: "term1Total", label: "1st Term" });
        if (d.show2ndTerm !== false) subCols.push({ key: "term2Total", label: "2nd Term" });
    }
    if (data.config.showCA1 && d.showCA1 !== false) subCols.push({ key: "ca1", label: "CA 1" });
    if (data.config.showCA2 && d.showCA2 !== false) subCols.push({ key: "ca2", label: "CA 2" });
    if (d.showDMAT !== false) subCols.push({ key: "caTotal", label: "CA" });
    if (data.reportType === "endOfTerm") {
        if (data.config.showExam && d.showExam !== false) subCols.push({ key: "exam", label: "EXAM" });
    }
    if (data.config.showSubjectTotal && d.showSubjectTotal !== false) subCols.push({ key: "total", label: "TOTAL" });
    if (data.reportType === "endOfTerm") {
        if (data.config.showGrade && d.showGrade !== false) subCols.push({ key: "grade", label: "GRADE" });
    }
    if (data.config.showPosition && d.showSubjectPosition !== false) subCols.push({ key: "position", label: "POS" });

    // Aggregate columns
    const aggCols: { key: string; label: string }[] = [];
    if (d.showGrandTotal !== false) aggCols.push({ key: "grandTotal", label: "TOTAL" });
    if (d.showAverage !== false) aggCols.push({ key: "average", label: "AVG" });
    if (d.showOverallPosition !== false) aggCols.push({ key: "overallPosition", label: "POS" });
    if (d.showSubjectCount !== false) aggCols.push({ key: "subjectCount", label: "SUBJ" });
    const scoreColumnKeys = new Set(["term1Total", "term2Total", "ca1", "ca2", "ca3", "caTotal", "exam", "total"]);
    const aggregateScoreKeys = new Set(["grandTotal", "average"]);

    const availableSubCols = new Set(subCols.map((col) => col.key));
    const pickSummaryColumn = (...keys: string[]) => keys.find((key) => availableSubCols.has(key)) || "";
    const summaryCol =
        data.reportType === "halfTerm"
            ? pickSummaryColumn("caTotal", "ca1", "total")
            : pickSummaryColumn("total", "caTotal", "ca1");

    const formatPosition = (value: unknown) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) && numericValue > 0 ? ordinal(numericValue) : "";
    };

    // Calculate dynamic column widths
    // A4 landscape usable width: 842 - 2*15 = 812 points
    const pageWidth = 812;
    const snWidth = 14;
    const nameWidth = 80;
    const aggColWidth = 22;
    const fixedWidth = snWidth + nameWidth + (aggCols.length * aggColWidth);
    const subjectAreaWidth = pageWidth - fixedWidth;
    const totalSubCols = data.subjects.length * subCols.length;
    const subColWidth = totalSubCols > 0 ? Math.max(14, Math.min(22, subjectAreaWidth / totalSubCols)) : 18;

    // Calculate actual table content width to prevent stretching with few subjects
    const tableContentWidth = snWidth + nameWidth + (totalSubCols * subColWidth) + (aggCols.length * aggColWidth);
    const tableWidth = Math.min(pageWidth, tableContentWidth);

    // Adjust font size based on column density
    const baseFontSize = totalSubCols > 70 ? 4.5 : totalSubCols > 50 ? 5 : totalSubCols > 30 ? 5.5 : 6;
    const headerFontSize = baseFontSize - 0.5;

    const styles = StyleSheet.create({
        page: {
            padding: 15,
            fontFamily: "Helvetica",
            fontSize: baseFontSize,
            color: "#000",
            backgroundColor: "#fff",
        },
        schoolHeader: {
            alignItems: "center",
            marginBottom: 6,
        },
        schoolName: {
            fontSize: 12,
            fontWeight: "bold",
            color: "#1e40af",
            textTransform: "uppercase",
            letterSpacing: 1,
        },
        schoolAddress: {
            fontSize: 7,
            fontWeight: "bold",
            fontStyle: "italic",
            color: "#374151",
        },
        schoolMotto: {
            fontSize: 7,
            fontWeight: "bold",
            color: "#1e40af",
            marginTop: 1,
        },
        sessionInfo: {
            fontSize: 7,
            fontWeight: "bold",
            marginTop: 2,
        },
        termClassRow: {
            flexDirection: "row",
            justifyContent: "center",
            gap: 30,
            marginTop: 2,
        },
        termClassText: {
            fontSize: 7,
            fontWeight: "bold",
        },
        table: {
            borderWidth: globalStyle.borderWidth,
            borderColor: borderColor,
            borderStyle: globalStyle.borderStyle as any,
            marginTop: 4,
            width: tableWidth,
            alignSelf: "center" as const,
        },
        headerRow: {
            flexDirection: "row",
            backgroundColor: headerBg,
        },
        subjectGroupHeader: {
            borderWidth: 0.5,
            borderColor: borderColor,
            alignItems: "center",
            justifyContent: "center",
            padding: 1,
        },
        subColHeader: {
            borderWidth: 0.5,
            borderColor: borderColor,
            alignItems: "center",
            justifyContent: "center",
            padding: 1,
            width: subColWidth,
        },
        subColHeaderText: {
            fontSize: headerFontSize,
            fontWeight: "bold",
            color: headerText,
            textAlign: "center",
            transform: "rotate(-90deg)",
        },
        dataRow: {
            flexDirection: "row",
        },
        snCell: {
            width: snWidth,
            borderWidth: 0.5,
            borderColor: borderColor,
            alignItems: "center",
            justifyContent: "center",
            padding: 1,
        },
        nameCell: {
            width: nameWidth,
            borderWidth: 0.5,
            borderColor: borderColor,
            justifyContent: "center",
            paddingHorizontal: 2,
            paddingVertical: 1,
        },
        dataCell: {
            width: subColWidth,
            borderWidth: 0.5,
            borderColor: borderColor,
            alignItems: "center",
            justifyContent: "center",
            padding: 1,
        },
        aggCell: {
            width: aggColWidth,
            borderWidth: 0.5,
            borderColor: borderColor,
            alignItems: "center",
            justifyContent: "center",
            padding: 1,
        },
        cellText: {
            fontSize: baseFontSize,
            textAlign: "center",
        },
        boldText: {
            fontSize: baseFontSize,
            fontWeight: "bold",
            textAlign: "center",
        },
        nameText: {
            fontSize: baseFontSize,
            textAlign: "left",
        },
        summaryRow: {
            flexDirection: "row",
            backgroundColor: "#f9fafb",
        },
        logoContainer: {
            width: 56,
            height: 56,
            marginBottom: 3,
        },
        logoImage: {
            width: 56,
            height: 56,
        },
    });

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* School Header */}
                {(d.showSchoolName !== false || d.showLogo !== false) && (
                    <View style={styles.schoolHeader}>
                        {d.showLogo !== false && data.school.logoUrl && (
                            <View style={styles.logoContainer}>
                                <Image src={data.school.logoUrl} style={styles.logoImage} />
                            </View>
                        )}
                        {d.showSchoolName !== false && (
                            <Text style={styles.schoolName}>{data.school.name}</Text>
                        )}
                        {d.showSchoolAddress !== false && data.school.address && (
                            <Text style={styles.schoolAddress}>{data.school.address}</Text>
                        )}
                        {d.showSchoolMotto !== false && (
                            <Text style={styles.schoolMotto}>
                                STUDENTS&apos; EDUCATIONAL CONTINUOUS ASSESSMENT RECORD
                            </Text>
                        )}
                        {d.showSessionInfo !== false && (
                            <>
                                <Text style={styles.sessionInfo}>
                                    ACADEMIC REPORT ({data.classArm.level ? data.classArm.level.replace(/_/g, " ") : ""}){" "}
                                </Text>
                                <Text style={{ fontSize: 7 }}>{data.session.name} ACADEMIC SESSION</Text>
                            </>
                        )}
                        {(d.showTermInfo !== false || d.showClassInfo !== false) && (
                            <View style={styles.termClassRow}>
                                {d.showTermInfo !== false && (
                                    <Text style={styles.termClassText}>{data.term.name.toUpperCase()}</Text>
                                )}
                                {d.showClassInfo !== false && (
                                    <Text style={styles.termClassText}>
                                        {data.classArm.className} {data.classArm.armName}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Main Table */}
                <View style={styles.table}>
                    {/* Header Row 1: Subject group headers */}
                    <View style={styles.headerRow}>
                        {/* S/N header */}
                        <View style={[styles.snCell, { backgroundColor: headerBg }]}>
                            <Text style={{ fontSize: headerFontSize, fontWeight: "bold", color: headerText }}></Text>
                        </View>
                        {/* Name header */}
                        <View style={[styles.nameCell, { backgroundColor: headerBg }]}>
                            <Text style={{ fontSize: headerFontSize, fontWeight: "bold", color: headerText }}>NAME</Text>
                        </View>
                        {/* Subject group headers spanning sub-columns */}
                        {data.subjects.map((sub) => (
                            <View
                                key={sub.id}
                                style={[styles.subjectGroupHeader, {
                                    width: subColWidth * subCols.length,
                                    backgroundColor: headerBg,
                                }]}
                            >
                                <Text style={{
                                    fontSize: headerFontSize + 0.5,
                                    fontWeight: "bold",
                                    color: headerText,
                                    textAlign: "center",
                                }}>
                                    {sub.name}
                                </Text>
                            </View>
                        ))}
                        {/* Aggregate column headers */}
                        {aggCols.map((agg) => (
                            <View key={agg.key} style={[styles.aggCell, { backgroundColor: headerBg, height: 50 }]}>
                                <Text style={[styles.subColHeaderText, { color: headerText }]}>
                                    {agg.label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Header Row 2: Sub-column headers */}
                    <View style={styles.headerRow}>
                        <View style={[styles.snCell, { backgroundColor: headerBg, height: 50 }]}>
                            <Text style={{ fontSize: headerFontSize, fontWeight: "bold", color: headerText }}>S/N</Text>
                        </View>
                        <View style={[styles.nameCell, { backgroundColor: headerBg, height: 50 }]} />
                        {data.subjects.map((sub) =>
                            subCols.map((col) => (
                                <View key={`${sub.id}-${col.key}`} style={[styles.subColHeader, { backgroundColor: headerBg, height: 50 }]}>
                                    <Text style={[styles.subColHeaderText, { color: headerText }]}>
                                        {col.label}
                                    </Text>
                                </View>
                            ))
                        )}
                        {/* Empty cells for aggregate columns (they use rowSpan=2 visually via first row) */}
                        {aggCols.map((agg) => (
                            <View key={`sub-${agg.key}`} style={[styles.aggCell, { backgroundColor: headerBg, height: 50 }]} />
                        ))}
                    </View>

                    {/* Student Data Rows */}
                    {data.students.map((student, idx) => (
                        <View key={student.id} style={styles.dataRow} wrap={false}>
                            {/* S/N */}
                            <View style={styles.snCell}>
                                <Text style={styles.boldText}>{idx + 1}</Text>
                            </View>
                            {/* Name */}
                            <View style={styles.nameCell}>
                                <Text style={styles.nameText}>
                                    {student.lastName} {student.firstName}
                                </Text>
                            </View>
                            {/* Per-subject scores */}
                            {data.subjects.map((sub) => {
                                const score = student.scores.find(s => s.subjectId === sub.id);
                                return subCols.map((col) => {
                                    const val = score ? (score as any)[col.key] : "";
                                    let displayVal = "";
                                    if (col.key === "position") {
                                        displayVal = formatPosition(val);
                                    } else if (scoreColumnKeys.has(col.key)) {
                                        displayVal = formatNonZeroScoreOrBlank(val);
                                    } else if (val !== null && val !== undefined && val !== "" && val !== "-") {
                                        displayVal = String(val);
                                    }
                                    return (
                                        <View key={`${student.id}-${sub.id}-${col.key}`} style={styles.dataCell}>
                                            <Text style={col.key === "total" ? styles.boldText : styles.cellText}>
                                                {displayVal}
                                            </Text>
                                        </View>
                                    );
                                });
                            })}
                            {/* Aggregate columns */}
                            {aggCols.map((agg) => {
                                const aggVal = (student as any)[agg.key];
                                let aggDisplay = "";
                                if (agg.key === "overallPosition") {
                                    aggDisplay = formatPosition(aggVal);
                                } else if (aggregateScoreKeys.has(agg.key)) {
                                    aggDisplay = formatNonZeroScoreOrBlank(aggVal);
                                } else if (aggVal !== null && aggVal !== undefined && aggVal !== "") {
                                    aggDisplay = String(aggVal);
                                }
                                return (
                                    <View key={`${student.id}-${agg.key}`} style={styles.aggCell}>
                                        <Text style={(agg.key === "grandTotal" || agg.key === "average") ? styles.boldText : styles.cellText}>
                                            {aggDisplay}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ))}

                    {/* Summary Rows */}
                    {d.showHighestScore !== false && (() => {
                        return (
                        <View style={styles.summaryRow} wrap={false}>
                            <View style={styles.snCell} />
                            <View style={styles.nameCell}>
                                <Text style={styles.boldText}>HIGHEST</Text>
                            </View>
                            {data.subjects.map((sub) =>
                                subCols.map((col, cIdx) => (
                                    <View key={`h-${sub.id}-${cIdx}`} style={styles.dataCell}>
                                        <Text style={styles.boldText}>
                                            {col.key === summaryCol ? formatNonZeroScoreOrBlank(data.summary.highest[sub.id]) : ""}
                                        </Text>
                                    </View>
                                ))
                            )}
                            {aggCols.map((agg) => (
                                <View key={`h-${agg.key}`} style={styles.aggCell} />
                            ))}
                        </View>
                        );
                    })()}

                    {d.showLowestScore !== false && (() => {
                        return (
                        <View style={styles.summaryRow} wrap={false}>
                            <View style={styles.snCell} />
                            <View style={styles.nameCell}>
                                <Text style={styles.boldText}>LOWEST</Text>
                            </View>
                            {data.subjects.map((sub) =>
                                subCols.map((col, cIdx) => (
                                    <View key={`l-${sub.id}-${cIdx}`} style={styles.dataCell}>
                                        <Text style={styles.boldText}>
                                            {col.key === summaryCol ? formatNonZeroScoreOrBlank(data.summary.lowest[sub.id]) : ""}
                                        </Text>
                                    </View>
                                ))
                            )}
                            {aggCols.map((agg) => (
                                <View key={`l-${agg.key}`} style={styles.aggCell} />
                            ))}
                        </View>
                        );
                    })()}

                    {d.showStudentCount !== false && (
                        <View style={styles.summaryRow} wrap={false}>
                            <View style={styles.snCell} />
                            <View style={styles.nameCell}>
                                <Text style={styles.boldText}>NO. OF STUDENTS</Text>
                            </View>
                            {data.subjects.map((sub) => {
                                return subCols.map((col, cIdx) => (
                                    <View key={`c-${sub.id}-${cIdx}`} style={styles.dataCell}>
                                        <Text style={styles.boldText}>
                                            {col.key === summaryCol ? String(data.summary.studentCountBySubject?.[sub.id] ?? data.summary.studentCount) : ""}
                                        </Text>
                                    </View>
                                ));
                            })}
                            {aggCols.map((agg) => (
                                <View key={`c-${agg.key}`} style={styles.aggCell} />
                            ))}
                        </View>
                    )}
                </View>
            </Page>
        </Document>
    );
};

export default BroadsheetDocument;
