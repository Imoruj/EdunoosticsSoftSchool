
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { Academic, ReportConfig, SectionStyle } from "../types";

const styles = StyleSheet.create({
    tableSection: {
        marginBottom: 15,
        width: "100%",
    },
    sectionHeader: {
        backgroundColor: "#e0e0e0",
        padding: 5,
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 10,
        borderWidth: 2,
        borderColor: "#333",
        marginBottom: 5,
    },
    table: {
        width: "100%",
        borderWidth: 2,
        borderColor: "#333",
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        alignItems: "stretch", // Important for equal height
    },
    tableHeaderRow: {
        backgroundColor: "#f5f5f5",
    },
    tableCol: {
        borderRightWidth: 1,
        borderRightColor: "#333",
        justifyContent: "center",
        alignItems: "center",
        padding: 2,
    },
    tableCell: {
        fontSize: 8,
        textAlign: "center",
    },
    subjectCell: {
        textAlign: "left",
        paddingLeft: 4,
        fontWeight: "bold",
    },
    bold: { fontWeight: "bold" },
});

interface AcademicTableProps {
    academic: Academic;
    displayOptions?: ReportConfig['displayOptions'];
    sectionStyle?: SectionStyle;
}

export const AcademicTable: React.FC<AcademicTableProps> = ({ academic, displayOptions = {}, sectionStyle = {} as any }) => {
    const showOption = (key: string) => (displayOptions as any)[key] !== false;
    const { container, header, borderOnly } = sectionStyle as any; // Temporary cast until SectionStyle is fully fleshed out

    return (
        <View style={styles.tableSection}>
            <Text style={[styles.sectionHeader, header, { borderTopWidth: container?.borderWidth, borderLeftWidth: container?.borderWidth, borderRightWidth: container?.borderWidth }]}>ACADEMIC PERFORMANCE</Text>
            <View style={[styles.table, container]}>
                {/* Header Row */}
                <View style={[styles.tableRow, styles.tableHeaderRow, header, { height: 25 }]}>
                    <View style={[styles.tableCol, header, { flex: 2 }]}>
                        <Text style={[styles.tableCell, styles.bold, { color: header?.color }]}>SUBJECT</Text>
                    </View>

                    {showOption('showTermHistory') && (
                        <>
                            <View style={[styles.tableCol, header, { width: 35 }]}>
                                <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>1ST</Text>
                            </View>
                            <View style={[styles.tableCol, header, { width: 35 }]}>
                                <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>2ND</Text>
                            </View>
                        </>
                    )}
                    {showOption('showCA1') && (
                        <View style={[styles.tableCol, header, { width: 20 }]}>
                            <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>CA1</Text>
                        </View>
                    )}
                    {showOption('showCA2') && (
                        <View style={[styles.tableCol, header, { width: 20 }]}>
                            <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>CA2</Text>
                        </View>
                    )}
                    {showOption('showCA3') && (
                        <View style={[styles.tableCol, header, { width: 20 }]}>
                            <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>CA3</Text>
                        </View>
                    )}
                    {showOption('showCA') && (
                        <View style={[styles.tableCol, header, { width: 25 }]}>
                            <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>CA</Text>
                        </View>
                    )}
                    {showOption('showExam') && (
                        <View style={[styles.tableCol, header, { width: 25 }]}>
                            <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>EXAM</Text>
                        </View>
                    )}
                    {showOption('showSubjectTotal') && (
                        <View style={[styles.tableCol, header, { width: 30 }]}>
                            <Text style={[styles.tableCell, styles.bold, { color: header?.color }]}>TOTAL</Text>
                        </View>
                    )}
                    {showOption('showGrade') && (
                        <View style={[styles.tableCol, header, { width: 40 }]}>
                            <Text style={[styles.tableCell, styles.bold, { color: header?.color }]}>GRADE</Text>
                        </View>
                    )}
                    {showOption('showSubjectPosition') && (
                        <View style={[styles.tableCol, header, { width: 30 }]}>
                            <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>POS</Text>
                        </View>
                    )}
                    {showOption('showSubjectAverage') && (
                        <View style={[styles.tableCol, header, { width: 30 }]}>
                            <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>AVG</Text>
                        </View>
                    )}
                    {showOption('showSubjectLowHigh') && (
                        <>
                            <View style={[styles.tableCol, header, { width: 30 }]}>
                                <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>LOW</Text>
                            </View>
                            <View style={[styles.tableCol, header, { width: 30 }]}>
                                <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: header?.color }]}>HIGH</Text>
                            </View>
                        </>
                    )}
                    {showOption('showRemarks') && (
                        <View style={[styles.tableCol, header, { flex: 1, borderRightWidth: 0 }]}>
                            <Text style={[styles.tableCell, styles.bold, { color: header?.color }]}>REMARK</Text>
                        </View>
                    )}
                </View>

                {/* Data Rows */}
                {academic.subjects.map((sub, i) => (
                    <View key={i} style={[styles.tableRow, borderOnly]}>
                        <View style={[styles.tableCol, borderOnly, { flex: 2, alignItems: 'flex-start' }]}>
                            <Text style={[styles.tableCell, styles.subjectCell]}>{sub.name}</Text>
                        </View>
                        {showOption('showTermHistory') && (
                            <>
                                <View style={[styles.tableCol, borderOnly, { width: 35 }]}>
                                    <Text style={styles.tableCell}>{sub.cumulativeTotal1 || "-"}</Text>
                                </View>
                                <View style={[styles.tableCol, borderOnly, { width: 35 }]}>
                                    <Text style={styles.tableCell}>{sub.cumulativeTotal2 || "-"}</Text>
                                </View>
                            </>
                        )}
                        {showOption('showCA1') && (
                            <View style={[styles.tableCol, borderOnly, { width: 20 }]}>
                                <Text style={styles.tableCell}>{sub.ca1 || "-"}</Text>
                            </View>
                        )}
                        {showOption('showCA2') && (
                            <View style={[styles.tableCol, borderOnly, { width: 20 }]}>
                                <Text style={styles.tableCell}>{sub.ca2 || "-"}</Text>
                            </View>
                        )}
                        {showOption('showCA3') && (
                            <View style={[styles.tableCol, borderOnly, { width: 20 }]}>
                                <Text style={styles.tableCell}>{sub.ca3 || "-"}</Text>
                            </View>
                        )}
                        {showOption('showCA') && (
                            <View style={[styles.tableCol, borderOnly, { width: 25 }]}>
                                <Text style={styles.tableCell}>{sub.ca}</Text>
                            </View>
                        )}
                        {showOption('showExam') && (
                            <View style={[styles.tableCol, borderOnly, { width: 25 }]}>
                                <Text style={styles.tableCell}>{sub.exam}</Text>
                            </View>
                        )}
                        {showOption('showSubjectTotal') && (
                            <View style={[styles.tableCol, borderOnly, { width: 30 }]}>
                                <Text style={[styles.tableCell, styles.bold]}>{sub.total}</Text>
                            </View>
                        )}
                        {showOption('showGrade') && (
                            <View style={[styles.tableCol, borderOnly, { width: 40 }]}>
                                <Text style={[styles.tableCell, {
                                    color: sub.grade?.startsWith("F") ? "red" : "black",
                                    fontWeight: "bold"
                                }]}>{sub.grade}</Text>
                            </View>
                        )}
                        {showOption('showSubjectPosition') && (
                            <View style={[styles.tableCol, borderOnly, { width: 30 }]}>
                                <Text style={styles.tableCell}>{sub.subjectPosition || "-"}</Text>
                            </View>
                        )}
                        {showOption('showSubjectAverage') && (
                            <View style={[styles.tableCol, borderOnly, { width: 30 }]}>
                                <Text style={styles.tableCell}>{sub.subjectClassAverage?.toFixed(0) || "-"}</Text>
                            </View>
                        )}
                        {showOption('showSubjectLowHigh') && (
                            <>
                                <View style={[styles.tableCol, borderOnly, { width: 30 }]}>
                                    <Text style={styles.tableCell}>{sub.subjectLowestScore !== undefined ? sub.subjectLowestScore : "-"}</Text>
                                </View>
                                <View style={[styles.tableCol, borderOnly, { width: 30 }]}>
                                    <Text style={styles.tableCell}>{sub.subjectHighestScore !== undefined ? sub.subjectHighestScore : "-"}</Text>
                                </View>
                            </>
                        )}
                        {showOption('showRemarks') && (
                            <View style={[styles.tableCol, { flex: 1, borderRightWidth: 0 }]}>
                                <Text style={[styles.tableCell, { fontSize: 7 }]}>{sub.remark}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
};
