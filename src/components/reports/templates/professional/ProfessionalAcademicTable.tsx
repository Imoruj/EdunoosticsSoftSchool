import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ProfessionalStyles";
import { formatScore, formatScoreOrBlank } from "../../scoreFormatting";

interface AcademicTableProps {
    subjects: ReportCardData["academic"]["subjects"];
}

const ProfessionalAcademicTable: React.FC<AcademicTableProps & { config?: any }> = ({ subjects, config }) => {
    // Group subjects by category
    const categories = subjects.reduce((acc, sub) => {
        const cat = sub.category || "OTHER SUBJECTS";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(sub);
        return acc;
    }, {} as Record<string, typeof subjects>);

    const colWidths = {
        subject: "14%", // Reduced from 18
        bf: "7%",
        ca: "4%",
        exam: "5%",
        total: "6%",
        percent: "7%",
        cum: "7%",      // Reduced from 8
        pos: "6%",      // Reduced from 8
        avg: "6%",      // Reduced from 8
        remark: "8%",   // Reduced from 10
        grade: "5%",
        sign: "5%",     // Reduced from 7
    };

    return (
        <View>
            <Text style={styles.sectionHeader}>ACADEMIC PERFORMANCE</Text>
            <View style={styles.table}>
                {/* Header Rows */}
                <View style={styles.tableHeaderRow}>
                    <View style={[styles.tableHeaderCol, { width: colWidths.subject }]}><Text style={styles.tableHeaderText}>SUBJECT</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.bf }]}>
                        <Text style={styles.tableHeaderText}>B/F</Text>
                        <Text style={[styles.tableHeaderText, { fontSize: 4 }]}>FIRST TERM</Text>
                    </View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.bf }]}>
                        <Text style={styles.tableHeaderText}>B/F</Text>
                        <Text style={[styles.tableHeaderText, { fontSize: 4 }]}>SECOND TERM</Text>
                    </View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.ca }]}><Text style={styles.tableHeaderText}>CA</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.ca }]}><Text style={styles.tableHeaderText}>CA</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.exam }]}><Text style={styles.tableHeaderText}>EXAM</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.total }]}><Text style={styles.tableHeaderText}>TOTAL SCORE</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.percent }]}><Text style={styles.tableHeaderText}>PERCEN- TAGE</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.cum }]}><Text style={styles.tableHeaderText}>CUM. TOTAL SCORE</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.pos }]}><Text style={styles.tableHeaderText}>POSITION IN SUBJECT</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.pos }]}><Text style={styles.tableHeaderText}>LOW</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.pos }]}><Text style={styles.tableHeaderText}>HIGH</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.avg }]}><Text style={styles.tableHeaderText}>CLASS AVERAGE</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.remark }]}><Text style={styles.tableHeaderText}>REMARKS</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.grade }]}><Text style={styles.tableHeaderText}>GRADE</Text></View>
                    <View style={[styles.tableHeaderCol, { width: colWidths.sign, borderRightWidth: 0 }]}><Text style={styles.tableHeaderText}>SIGN.</Text></View>
                </View>

                {/* Sub-Header Max Scores */}
                <View style={[styles.tableRow, { backgroundColor: "#f9fafb", height: 12 }]}>
                    <View style={{ width: colWidths.subject, borderRightWidth: 1, borderRightColor: "#047857" }} />
                    <View style={[styles.tableCol, { width: colWidths.bf }]}><Text style={styles.tableHeaderText}>100</Text></View>
                    <View style={[styles.tableCol, { width: colWidths.bf }]}><Text style={styles.tableHeaderText}>100</Text></View>
                    <View style={[styles.tableCol, { width: colWidths.ca }]}><Text style={styles.tableHeaderText}>20</Text></View>
                    <View style={[styles.tableCol, { width: colWidths.ca }]}><Text style={styles.tableHeaderText}>20</Text></View>
                    <View style={[styles.tableCol, { width: colWidths.exam }]}><Text style={styles.tableHeaderText}>60</Text></View>
                    <View style={[styles.tableCol, { width: colWidths.total }]}><Text style={styles.tableHeaderText}>100</Text></View>
                    <View style={[styles.tableCol, { width: colWidths.percent }]} />
                    <View style={[styles.tableCol, { width: colWidths.cum }]} />
                    <View style={[styles.tableCol, { width: colWidths.pos }]} />
                    <View style={[styles.tableCol, { width: colWidths.pos }]} />
                    <View style={[styles.tableCol, { width: colWidths.pos }]} />
                    <View style={[styles.tableCol, { width: colWidths.avg }]} />
                    <View style={[styles.tableCol, { width: colWidths.remark }]} />
                    <View style={[styles.tableCol, { width: colWidths.grade }]} />
                    <View style={[styles.tableCol, { width: colWidths.sign, borderRightWidth: 0 }]} />
                </View>

                {/* Subject Groups */}
                {Object.entries(categories).map(([category, items]) => (
                    <React.Fragment key={category}>
                        <View style={[styles.tableRow, { backgroundColor: "#f3f4f6", height: 12 }]}>
                            <View style={{ flex: 1, alignItems: "center" }}>
                                <Text style={{ fontSize: 7, fontWeight: "bold", fontFamily: "Helvetica-Bold" }}>{category}</Text>
                            </View>
                        </View>
                        {items.map((sub, idx) => {
                            // Calculate Cumulative Logic
                            const bf1 = sub.cumulativeTotal1 || 0;
                            const bf2 = sub.cumulativeTotal2 || 0;
                            // If BF scores exist, we assume 2nd or 3rd term.
                            // Logic: Total / (1 + (bf1>0?1:0) + (bf2>0?1:0))
                            const termsCount = 1 + (sub.cumulativeTotal1 !== undefined ? 1 : 0) + (sub.cumulativeTotal2 !== undefined ? 1 : 0);
                            const cumTotal = bf1 + bf2 + sub.total;
                            const percentage = termsCount > 0 ? (cumTotal / termsCount).toFixed(1) : sub.total.toFixed(1);

                            return (
                                <View key={sub.id} style={[styles.tableRow, idx === items.length - 1 ? { borderBottomWidth: 1 } : {}]}>
                                    <View style={[styles.tableCol, { width: colWidths.subject, alignItems: "flex-start", paddingLeft: 5 }]}><Text style={styles.tableCellLeft}>{sub.name}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.bf }]}><Text style={styles.tableCell}>{formatScoreOrBlank(sub.cumulativeTotal1)}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.bf }]}><Text style={styles.tableCell}>{formatScoreOrBlank(sub.cumulativeTotal2)}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.ca }]}><Text style={styles.tableCell}>{formatScore(Math.floor(sub.ca / 2))}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.ca }]}><Text style={styles.tableCell}>{formatScore(Math.ceil(sub.ca / 2))}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.exam }]}><Text style={styles.tableCell}>{formatScore(sub.exam)}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.total }]}><Text style={[styles.tableCell, styles.bold]}>{formatScore(sub.total)}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.percent }]}><Text style={styles.tableCell}>{percentage}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.cum }]}><Text style={styles.tableCell}>{cumTotal > sub.total ? formatScore(cumTotal) : ""}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.pos }]}><Text style={styles.tableCell}>{sub.subjectPosition || "-"}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.pos }]}><Text style={styles.tableCell}>{formatScore(sub.subjectLowestScore)}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.pos }]}><Text style={styles.tableCell}>{formatScore(sub.subjectHighestScore)}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.avg }]}><Text style={styles.tableCell}>{formatScore(sub.subjectClassAverage)}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.remark }]}><Text style={[styles.tableCell, { fontSize: 6 }]}>{sub.remark}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.grade }]}><Text style={[styles.tableCell, styles.bold]}>{sub.grade}</Text></View>
                                    <View style={[styles.tableCol, { width: colWidths.sign, borderRightWidth: 0 }]} />
                                </View>
                            );
                        })}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
};

export default ProfessionalAcademicTable;
