import React from "react";
import { Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { TranscriptData, TranscriptSession, TranscriptTermResult } from "../types";

const styles = StyleSheet.create({
    page: {
        paddingHorizontal: 40,
        paddingVertical: 30,
        fontFamily: "Helvetica",
        fontSize: 9,
        color: "#1a1a1a",
        backgroundColor: "#FFFFFF",
    },
    headerContainer: {
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#d1d5db",
    },
    logoImage: { width: 50, height: 50, objectFit: "contain", marginBottom: 6 },
    schoolName: { fontSize: 15, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, color: "#111", marginBottom: 2 },
    schoolDetail: { fontSize: 7.5, color: "#666", marginBottom: 1 },
    schoolMotto: { fontSize: 7, fontStyle: "italic", color: "#888" },
    dividerLine: { width: 50, height: 1.5, backgroundColor: "#333", marginTop: 6 },
    title: { fontSize: 10, fontWeight: "bold", textAlign: "center", letterSpacing: 3, color: "#444", marginBottom: 12, textTransform: "uppercase" },
    bioSection: { flexDirection: "row", marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
    photoContainer: { width: 68, height: 82, marginRight: 14, borderWidth: 0.5, borderColor: "#d1d5db" },
    studentPhoto: { width: "100%", height: "100%", objectFit: "cover" },
    bioGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
    bioField: { width: "50%", marginBottom: 6 },
    bioFieldLabel: { fontSize: 6.5, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
    bioFieldValue: { fontSize: 8.5, color: "#222" },
    bioFieldValueBold: { fontSize: 8.5, color: "#111", fontWeight: "bold" },
    sessionHeader: { textAlign: "center", marginTop: 8, marginBottom: 6 },
    sessionBadge: { backgroundColor: "#2d3748", color: "#FFFFFF", fontSize: 8.5, fontWeight: "bold", paddingHorizontal: 18, paddingVertical: 4, letterSpacing: 0.5 },
    sessionClassName: { fontSize: 7, color: "#9ca3af", marginTop: 2, textAlign: "center" },
    sessionSubHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: "#374151", paddingBottom: 2, marginBottom: 3, marginTop: 2 },
    sessionSubHeaderText: { fontSize: 8.5, fontWeight: "bold", color: "#1f2937" },
    termSubHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: "#d1d5db", paddingBottom: 2, marginBottom: 3, marginTop: 2 },
    termSubHeaderText: { fontSize: 7.5, fontWeight: "bold", color: "#6b7280" },
    table: { width: "100%", marginBottom: 1 },
    tableRow: { flexDirection: "row", alignItems: "stretch", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
    tableHeaderRow: { backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#d1d5db" },
    tableAltRow: { backgroundColor: "#fafafa" },
    tableCol: { justifyContent: "center", alignItems: "center", paddingVertical: 3, paddingHorizontal: 2 },
    tableCell: { fontSize: 7, textAlign: "center", color: "#4b5563" },
    tableCellBold: { fontSize: 7, textAlign: "center", fontWeight: "bold", color: "#111" },
    subjectCell: { fontSize: 7, textAlign: "left", paddingLeft: 2, color: "#1f2937" },
    headerCell: { fontSize: 6.5, textAlign: "center", fontWeight: "bold", color: "#6b7280", textTransform: "uppercase" },
    summaryLine: { flexDirection: "row", marginTop: 2, marginBottom: 8, paddingLeft: 2 },
    summaryText: { fontSize: 7, color: "#9ca3af", marginRight: 8 },
    summaryTextBold: { fontSize: 7, color: "#374151", fontWeight: "bold" },
    summaryDot: { fontSize: 7, color: "#d1d5db", marginRight: 8 },
    cumulativeContainer: { borderWidth: 0.5, borderColor: "#d1d5db", marginTop: 10, marginBottom: 10 },
    cumulativeTitle: { backgroundColor: "#2d3748", color: "#FFFFFF", padding: 5, fontSize: 8, fontWeight: "bold", textAlign: "center", letterSpacing: 1 },
    cumulativeGrid: { flexDirection: "row" },
    cumulativeCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: "#e5e7eb", alignItems: "center" },
    cumulativeLabel: { fontSize: 6, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2, textAlign: "center" },
    cumulativeValue: { fontSize: 11, fontWeight: "bold", color: "#1f2937" },
    cumulativeRow2: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#e5e7eb" },
    cumulativeSubValue: { fontSize: 6.5, color: "#9ca3af", marginTop: 1 },
    gradingLine: { textAlign: "center", marginBottom: 8 },
    gradingLabel: { fontSize: 7, color: "#6b7280", fontWeight: "bold" },
    gradingText: { fontSize: 6.5, color: "#9ca3af" },
    gradingGrade: { fontSize: 6.5, color: "#4b5563", fontWeight: "bold" },
    footer: { marginTop: 20, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: "#e5e7eb", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    signatureBlock: { alignItems: "center" },
    signatureLine: { width: 120, borderTopWidth: 0.5, borderTopColor: "#9ca3af", paddingTop: 3 },
    signatureLabel: { fontSize: 7, color: "#6b7280", textAlign: "center" },
    stampArea: { alignItems: "center" },
    stampCircle: { width: 40, height: 40, borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 20, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
    stampText: { fontSize: 5, color: "#d1d5db" },
    generatedAt: { fontSize: 6, color: "#d1d5db", textAlign: "center", marginTop: 12 },
});

interface StandardTranscriptTemplateProps {
    data: TranscriptData;
}

const StandardTranscriptTemplate: React.FC<StandardTranscriptTemplateProps> = ({ data }) => {
    const { student, school, sessions, cumulativeStats, gradingRules } = data;

    // Render individual term table (Subject, Total, Grade, Remark)
    const renderTermTable = (term: TranscriptTermResult) => (
        <View key={term.termNumber}>
            <View style={styles.termSubHeaderRow}>
                <Text style={styles.termSubHeaderText}>{term.termName} Result</Text>
            </View>
            {term.subjects.length > 0 ? (
                <>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeaderRow]}>
                            <View style={[styles.tableCol, { flex: 3, alignItems: "flex-start" }]}>
                                <Text style={styles.headerCell}>Subject</Text>
                            </View>
                            <View style={[styles.tableCol, { width: 28 }]}>
                                <Text style={styles.headerCell}>CA</Text>
                            </View>
                            <View style={[styles.tableCol, { width: 32 }]}>
                                <Text style={styles.headerCell}>Exam</Text>
                            </View>
                            <View style={[styles.tableCol, { width: 35 }]}>
                                <Text style={styles.headerCell}>Total</Text>
                            </View>
                            <View style={[styles.tableCol, { width: 32 }]}>
                                <Text style={styles.headerCell}>Grade</Text>
                            </View>
                            <View style={[styles.tableCol, { flex: 1 }]}>
                                <Text style={styles.headerCell}>Remark</Text>
                            </View>
                        </View>
                        {term.subjects.map((sub, i) => (
                            <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableAltRow : {}]}>
                                <View style={[styles.tableCol, { flex: 3, alignItems: "flex-start" }]}>
                                    <Text style={styles.subjectCell}>{sub.subjectName}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: 28 }]}>
                                    <Text style={styles.tableCell}>{sub.ca || "-"}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: 32 }]}>
                                    <Text style={styles.tableCell}>{sub.exam || "-"}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: 35 }]}>
                                    <Text style={styles.tableCellBold}>{sub.total}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: 32 }]}>
                                    <Text style={[styles.tableCellBold, { color: sub.grade === "F" || sub.grade === "F9" ? "#ef4444" : "#111" }]}>{sub.grade}</Text>
                                </View>
                                <View style={[styles.tableCol, { flex: 1 }]}>
                                    <Text style={[styles.tableCell, { fontSize: 6, color: sub.remark?.toLowerCase() === "fail" ? "#f87171" : "#9ca3af" }]}>{sub.remark}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                    <View style={styles.summaryLine}>
                        <Text style={styles.summaryText}><Text style={styles.summaryTextBold}>{term.summary.subjectsCount}</Text> subjects</Text>
                        <Text style={styles.summaryDot}>·</Text>
                        <Text style={styles.summaryText}>Avg: <Text style={styles.summaryTextBold}>{term.summary.average.toFixed(1)}%</Text></Text>
                    </View>
                </>
            ) : (
                <View style={{ padding: 6, marginBottom: 6 }}>
                    <Text style={{ fontSize: 7, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>No scores</Text>
                </View>
            )}
        </View>
    );

    // Render end-of-session table (Subject, 1ST, 2ND, CA, Exam, Total, Grade, Remark)
    const renderEndOfSessionTable = (session: TranscriptSession) => (
        <>
            <View style={styles.sessionSubHeaderRow}>
                <Text style={styles.sessionSubHeaderText}>End of Session Result</Text>
                <Text style={{ fontSize: 7.5, color: "#6b7280" }}>{session.className}</Text>
            </View>
            {session.subjects.length > 0 ? (
                <>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeaderRow]}>
                            <View style={[styles.tableCol, { flex: 3, alignItems: "flex-start" }]}>
                                <Text style={styles.headerCell}>Subject</Text>
                            </View>
                            <View style={[styles.tableCol, { width: 28 }]}><Text style={styles.headerCell}>1ST</Text></View>
                            <View style={[styles.tableCol, { width: 28 }]}><Text style={styles.headerCell}>2ND</Text></View>
                            <View style={[styles.tableCol, { width: 28 }]}><Text style={styles.headerCell}>CA</Text></View>
                            <View style={[styles.tableCol, { width: 32 }]}><Text style={styles.headerCell}>Exam</Text></View>
                            <View style={[styles.tableCol, { width: 35 }]}><Text style={styles.headerCell}>Total</Text></View>
                            <View style={[styles.tableCol, { width: 32 }]}><Text style={styles.headerCell}>Grade</Text></View>
                            <View style={[styles.tableCol, { flex: 1 }]}><Text style={styles.headerCell}>Remark</Text></View>
                        </View>
                        {session.subjects.map((sub, i) => (
                            <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableAltRow : {}]}>
                                <View style={[styles.tableCol, { flex: 3, alignItems: "flex-start" }]}>
                                    <Text style={styles.subjectCell}>{sub.subjectName}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: 28 }]}><Text style={styles.tableCell}>{sub.cumulativeTotal1 || "-"}</Text></View>
                                <View style={[styles.tableCol, { width: 28 }]}><Text style={styles.tableCell}>{sub.cumulativeTotal2 || "-"}</Text></View>
                                <View style={[styles.tableCol, { width: 28 }]}><Text style={styles.tableCell}>{sub.ca || "-"}</Text></View>
                                <View style={[styles.tableCol, { width: 32 }]}><Text style={styles.tableCell}>{sub.exam || "-"}</Text></View>
                                <View style={[styles.tableCol, { width: 35 }]}><Text style={styles.tableCellBold}>{sub.total}</Text></View>
                                <View style={[styles.tableCol, { width: 32 }]}>
                                    <Text style={[styles.tableCellBold, { color: sub.grade === "F" || sub.grade === "F9" ? "#ef4444" : "#111" }]}>{sub.grade}</Text>
                                </View>
                                <View style={[styles.tableCol, { flex: 1 }]}>
                                    <Text style={[styles.tableCell, { fontSize: 6, color: sub.remark?.toLowerCase() === "fail" ? "#f87171" : "#9ca3af" }]}>{sub.remark}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                    <View style={styles.summaryLine}>
                        <Text style={styles.summaryText}><Text style={styles.summaryTextBold}>{session.summary.subjectsCount}</Text> subjects</Text>
                        <Text style={styles.summaryDot}>·</Text>
                        <Text style={styles.summaryText}>Avg: <Text style={styles.summaryTextBold}>{session.summary.average.toFixed(1)}%</Text></Text>
                        {session.attendance.totalSchoolDays > 0 ? (
                            <>
                                <Text style={styles.summaryDot}>·</Text>
                                <Text style={styles.summaryText}>Attendance: <Text style={styles.summaryTextBold}>{session.attendance.daysPresent}/{session.attendance.totalSchoolDays}</Text></Text>
                            </>
                        ) : null}
                    </View>
                </>
            ) : (
                <View style={{ padding: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 7, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>No subject scores recorded</Text>
                </View>
            )}
        </>
    );

    const renderSession = (session: TranscriptSession) => (
        <View key={session.id} wrap={false}>
            <View style={styles.sessionHeader}>
                <Text style={styles.sessionBadge}>{session.name}</Text>
                <Text style={styles.sessionClassName}>{session.className}</Text>
            </View>

            {session.hasEndOfSession ? (
                renderEndOfSessionTable(session)
            ) : (
                session.termResults && session.termResults.length > 0 ? (
                    session.termResults.map(term => renderTermTable(term))
                ) : (
                    <View style={{ padding: 10, marginBottom: 8 }}>
                        <Text style={{ fontSize: 7, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>No academic records for this session</Text>
                    </View>
                )
            )}
        </View>
    );

    return (
        <Page size="A4" style={styles.page} wrap>
            {/* School Header */}
            <View style={styles.headerContainer} fixed>
                {school.logoUrl && <Image style={styles.logoImage} src={school.logoUrl} />}
                <Text style={styles.schoolName}>{school.name}</Text>
                {school.address && <Text style={styles.schoolDetail}>{school.address}</Text>}
                {school.motto && <Text style={styles.schoolMotto}>{school.motto}</Text>}
                {(school.email || school.phone) && (
                    <Text style={styles.schoolDetail}>{[school.email, school.phone].filter(Boolean).join("  ·  ")}</Text>
                )}
                <View style={styles.dividerLine} />
            </View>

            <Text style={styles.title}>Academic Transcript</Text>

            {/* Student Bio */}
            <View style={styles.bioSection}>
                {student.photoUrl && (
                    <View style={styles.photoContainer}>
                        <Image style={styles.studentPhoto} src={student.photoUrl} />
                    </View>
                )}
                <View style={styles.bioGrid}>
                    <View style={styles.bioField}>
                        <Text style={styles.bioFieldLabel}>Full Name</Text>
                        <Text style={styles.bioFieldValueBold}>{student.lastName} {student.firstName} {student.otherNames || ""}</Text>
                    </View>
                    <View style={styles.bioField}>
                        <Text style={styles.bioFieldLabel}>Admission No.</Text>
                        <Text style={styles.bioFieldValueBold}>{student.admissionNumber}</Text>
                    </View>
                    <View style={styles.bioField}>
                        <Text style={styles.bioFieldLabel}>Gender</Text>
                        <Text style={styles.bioFieldValue}>{student.gender}</Text>
                    </View>
                    <View style={styles.bioField}>
                        <Text style={styles.bioFieldLabel}>Date of Birth</Text>
                        <Text style={styles.bioFieldValue}>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}</Text>
                    </View>
                    <View style={styles.bioField}>
                        <Text style={styles.bioFieldLabel}>Admission Date</Text>
                        <Text style={styles.bioFieldValue}>{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "N/A"}</Text>
                    </View>
                    {student.stateOfOrigin && (
                        <View style={styles.bioField}>
                            <Text style={styles.bioFieldLabel}>State of Origin</Text>
                            <Text style={styles.bioFieldValue}>{student.stateOfOrigin}</Text>
                        </View>
                    )}
                    <View style={styles.bioField}>
                        <Text style={styles.bioFieldLabel}>Current Class</Text>
                        <Text style={styles.bioFieldValueBold}>{student.currentClassName}</Text>
                    </View>
                </View>
            </View>

            {/* Academic Records */}
            {sessions.length > 0 ? (
                sessions.map(session => renderSession(session))
            ) : (
                <View style={{ padding: 30, alignItems: "center" }}>
                    <Text style={{ fontSize: 9, color: "#9ca3af" }}>No academic records found for this student.</Text>
                </View>
            )}

            {/* Cumulative Performance */}
            {cumulativeStats.totalSessions > 0 && (
                <View style={styles.cumulativeContainer} wrap={false}>
                    <Text style={styles.cumulativeTitle}>CUMULATIVE PERFORMANCE</Text>
                    <View style={styles.cumulativeGrid}>
                        <View style={styles.cumulativeCell}>
                            <Text style={styles.cumulativeLabel}>Sessions</Text>
                            <Text style={styles.cumulativeValue}>{cumulativeStats.totalSessions}</Text>
                        </View>
                        <View style={styles.cumulativeCell}>
                            <Text style={styles.cumulativeLabel}>Overall Average</Text>
                            <Text style={styles.cumulativeValue}>{cumulativeStats.overallAverage.toFixed(1)}%</Text>
                        </View>
                        <View style={[styles.cumulativeCell, { borderRightWidth: 0 }]}>
                            <Text style={styles.cumulativeLabel}>Subject Entries</Text>
                            <Text style={styles.cumulativeValue}>{cumulativeStats.totalSubjectEntries}</Text>
                        </View>
                    </View>
                    <View style={styles.cumulativeRow2}>
                        <View style={[styles.cumulativeCell, { flex: 1 }]}>
                            <Text style={styles.cumulativeLabel}>Best Performance</Text>
                            <Text style={[styles.cumulativeValue, { fontSize: 9, color: "#16a34a" }]}>{cumulativeStats.highestSessionAverage.toFixed(1)}%</Text>
                            <Text style={styles.cumulativeSubValue}>{cumulativeStats.highestSessionLabel}</Text>
                        </View>
                        <View style={[styles.cumulativeCell, { flex: 1, borderRightWidth: 0 }]}>
                            <Text style={styles.cumulativeLabel}>Lowest Performance</Text>
                            <Text style={[styles.cumulativeValue, { fontSize: 9, color: "#6b7280" }]}>{cumulativeStats.lowestSessionAverage.toFixed(1)}%</Text>
                            <Text style={styles.cumulativeSubValue}>{cumulativeStats.lowestSessionLabel}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Grading Key */}
            {gradingRules.length > 0 && (
                <View style={styles.gradingLine} wrap={false}>
                    <Text>
                        <Text style={styles.gradingLabel}>Grading:  </Text>
                        {gradingRules.map((r, i) => (
                            <Text key={i} style={styles.gradingText}>
                                {i > 0 ? "  ·  " : ""}<Text style={styles.gradingGrade}>{r.grade}</Text> ({r.minScore}-{r.maxScore})
                            </Text>
                        ))}
                    </Text>
                </View>
            )}

            {/* Footer */}
            <View style={styles.footer} wrap={false}>
                <View style={styles.signatureBlock}>
                    <View style={styles.signatureLine}>
                        <Text style={styles.signatureLabel}>Principal&apos;s Signature</Text>
                    </View>
                </View>
                <View style={styles.stampArea}>
                    {school.stampUrl ? (
                        <Image src={school.stampUrl} style={{ width: 40, height: 40, objectFit: "contain", opacity: 0.6 }} />
                    ) : (
                        <View style={styles.stampCircle}>
                            <Text style={styles.stampText}>STAMP</Text>
                        </View>
                    )}
                </View>
                <View style={styles.signatureBlock}>
                    <View style={styles.signatureLine}>
                        <Text style={styles.signatureLabel}>Date</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.generatedAt}>
                Generated {new Date(data.generatedAt).toLocaleDateString()}  ·  Computer-generated document
            </Text>
        </Page>
    );
};

export default StandardTranscriptTemplate;
