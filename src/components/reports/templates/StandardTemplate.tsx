import React from "react";
import { Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { ReportCardData } from "../types";
import { formatPublishedDate } from "../formatPublishedDate";
import { formatScore } from "../scoreFormatting";
import { formatStudentFullName } from "../formatStudentFullName";

// Register fonts if needed, but for now we'll stick to standard Helvetica/Times.

const styles = StyleSheet.create({
    page: {
        padding: 20,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#000",
        backgroundColor: "#FFFFFF",
    },
    // Header
    header: {
        flexDirection: "row",
        borderWidth: 3,
        // borderColor: "#2e7d32", // Dynamic
        padding: 10,
        marginBottom: 10,
        alignItems: "center",
        backgroundColor: "#e8f5e9",
    },
    logoContainer: {
        width: 80,
        height: 80,
        // backgroundColor: "#2e7d32", // Dynamic
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 15,
    },
    logoInner: {
        width: 70,
        height: 70,
        borderRadius: 35, // Circle
        borderWidth: 2,
        borderColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    logoImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    schoolInfo: {
        flex: 1,
        alignItems: "center",
        textAlign: "center",
    },
    schoolName: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4,
        textTransform: "uppercase",
    },

    gradeKey: {
        marginVertical: 5,
        padding: 5,
        borderWidth: 1,
        borderColor: '#333',
    },
    gradeKeyTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    gradeKeyText: {
        fontSize: 7,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 10,
        marginBottom: 2,
        color: "#333",
    },
    motto: {
        fontSize: 9,
        fontStyle: "italic",
        color: "#555",
        marginBottom: 2,
    },
    email: {
        fontSize: 8,
        color: "#555",
    },

    // Term Header
    termHeader: {
        backgroundColor: "#e0e0e0",
        textAlign: "center",
        padding: 6,
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 10,
        borderWidth: 2,
        borderColor: "#333",
    },

    // Personal Data Section (Grid simulation)
    personalDataContainer: {
        flexDirection: "row",
        marginBottom: 15,
        gap: 10,
    },
    // Column 1: Personal Data Table
    personalDataCol: {
        width: "40%",
        borderWidth: 2,
        borderColor: "#333",
    },
    personalDataHeader: {
        backgroundColor: "#e0e0e0",
        padding: 4,
        fontWeight: "bold",
        textAlign: "center",
        borderBottomWidth: 2,
        borderBottomColor: "#333",
        fontSize: 9,
    },
    dataRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    dataLabel: {
        width: 70,
        padding: 4,
        fontWeight: "bold",
        backgroundColor: "#f5f5f5",
        borderRightWidth: 1,
        borderRightColor: "#333",
        fontSize: 8,
    },
    dataValue: {
        flex: 1,
        padding: 4,
        fontSize: 8,
        justifyContent: "center",
    },

    // Column 2: Photo
    photoCol: {
        width: "20%",
        borderWidth: 2,
        borderColor: "#333",
        backgroundColor: "#f9f9f9",
        alignItems: "center",
        justifyContent: "center",
        height: 120, // Approximate height to match content
    },
    studentPhoto: {
        width: "90%",
        height: "90%",
        objectFit: "cover",
    },

    // Column 3: Attendance & Stats
    statsCol: {
        width: "40%",
        borderWidth: 2,
        borderColor: "#333",
    },
    statsHeader: {
        backgroundColor: "#e0e0e0",
        padding: 4,
        fontWeight: "bold",
        textAlign: "center",
        borderBottomWidth: 2,
        borderBottomColor: "#333",
        fontSize: 9,
    },
    attendanceGrid: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    attendanceCell: {
        flex: 1,
        padding: 2,
        borderRightWidth: 1,
        borderRightColor: "#333",
        alignItems: "center",
        justifyContent: "center",
    },
    attendanceLabel: {
        fontSize: 7,
        textAlign: "center",
        marginBottom: 2,
    },
    attendanceValue: {
        fontSize: 10,
        fontWeight: "bold",
    },

    scoreSummaryRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    scoreLabel: {
        flex: 2,
        padding: 3,
        fontSize: 8,
        fontWeight: "bold",
        backgroundColor: "#f5f5f5",
        borderRightWidth: 1,
        borderRightColor: "#333",
    },
    scoreValueBox: {
        flex: 1,
        padding: 3,
        fontSize: 8,
        textAlign: "center",
        fontWeight: "bold",
    },

    // Academic Table
    tableSection: {
        marginBottom: 15,
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
        alignItems: "stretch",
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

    // Traits
    traitsContainer: {
        flexDirection: "row",
        gap: 15,
        marginBottom: 15,
    },
    traitsCol: {
        flex: 1,
        borderWidth: 2,
        borderColor: "#333",
    },
    traitsHeader: {
        backgroundColor: "#e0e0e0",
        padding: 4,
        textAlign: "center",
        fontWeight: "bold",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        fontSize: 9,
    },
    traitRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        alignItems: "center",
    },
    traitNameCol: {
        width: "40%",
        padding: 3,
        borderRightWidth: 1,
        borderRightColor: "#333",
        backgroundColor: "#fafafa",
    },
    traitRatingCol: {
        flex: 1, // Distribute remaining space for 1-5
        flexDirection: "row",
    },
    ratingBox: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: "#eee",
        alignItems: "center",
        justifyContent: "center",
        height: "100%", // Full height of row
    },
    checkmark: {
        fontSize: 8,
        color: "#2e7d32",
    },

    // Footer
    footer: {
        borderWidth: 2,
        borderColor: "#333",
        marginTop: 10,
    },
    footerRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        alignItems: "center",
    },
    footerLabel: {
        width: 120,
        padding: 5,
        fontWeight: "bold",
        backgroundColor: "#f5f5f5",
        borderRightWidth: 1,
        borderRightColor: "#333",
        fontSize: 9,
    },
    footerText: {
        flex: 1,
        padding: 5,
        fontSize: 9,
        borderRightWidth: 1,
        borderRightColor: "#333",
    },
    footerSign: {
        width: 80,
        padding: 5,
        fontSize: 9,
        textAlign: "center",
        borderRightWidth: 1,
        borderRightColor: "#333",
    },
    footerDate: {
        width: 100,
        padding: 5,
        fontSize: 9,
        textAlign: "center",
    },
    promotionStatus: {
        backgroundColor: "#e0e0e0",
        padding: 8,
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 10,
        borderWidth: 2,
        borderColor: "#333",
        marginTop: 10,
    },

    // Utilities
    bold: { fontWeight: "bold" },
    center: { textAlign: "center" },
});

interface StandardTemplateProps {
    data: ReportCardData;
}

interface SectionStyle {
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
    borderColor?: string;
    headerBg?: string;
    headerText?: string;
}

const StandardTemplate: React.FC<StandardTemplateProps> = ({ data }) => {
    const { student, school, term, attendance, academic, affective, psychomotor, comments, config, reportType } = data;
    const isHalfTerm = reportType === "halfTerm";
    const publishedDateLabel = formatPublishedDate(comments.publishedAt);
    const studentFullName = formatStudentFullName(student);

    const showOption = (key: string) => {
        if (!config?.displayOptions) return true;
        return (config.displayOptions as any)[key] !== false;
    };

    const caAssessmentTypes = (config?.assessmentTypes ?? []).filter(at => at.field !== "exam");
    const examAssessmentType = (config?.assessmentTypes ?? []).find(at => at.field === "exam");
    const examLabel = examAssessmentType?.name || config?.assessmentTypeNames?.["exam"] || "EXAM";
    const showScoreComponents = showOption("showScoreComponents");
    // Build a flat list of component columns to render in the PDF (from all CA types that have components)
    const componentColumns: { caField: string; compId: string; name: string; maxScore: number }[] = showScoreComponents
        ? caAssessmentTypes.flatMap(at => (at.components ?? []).map(c => ({ caField: at.field, compId: c.id, name: c.name, maxScore: c.maxScore })))
        : [];

    // Style resolver for PDF
    const getSectionStyle = (sectionKey: string) => {
        const { displayOptions } = config || {};
        const globalStyle: SectionStyle = (displayOptions as any)?.globalStyle || {
            borderWidth: 2, borderStyle: 'solid', borderColor: '#14532d', headerBg: '#f3f4f6', headerText: '#333333'
        };
        const sectionStyle = (displayOptions?.sectionStyles as any)?.[sectionKey] as SectionStyle;

        const style = ((displayOptions as any)?.globalUniformity !== false || !sectionStyle) ? globalStyle : sectionStyle;

        // Map 'double' to 'solid' since react-pdf doesn't support double
        const borderStyle = style.borderStyle === 'double' ? 'solid' : style.borderStyle;

        return {
            container: {
                borderWidth: style.borderWidth,
                borderStyle: borderStyle as any,
                borderColor: style.borderColor || '#14532d'
            },
            header: {
                backgroundColor: style.headerBg || '#e0e0e0',
                color: style.headerText || '#333333',
                borderBottomWidth: style.borderWidth,
                borderBottomStyle: borderStyle as any,
                borderBottomColor: style.borderColor || '#14532d'
            },
            borderOnly: {
                borderColor: style.borderColor || '#14532d'
            },
            checkmarkColor: style.borderColor || '#14532d'
        };
    };

    const headerStyles = getSectionStyle('global');
    const personalStyles = getSectionStyle('personalData');
    const attStyles = getSectionStyle('attendance');
    const academicStyles = getSectionStyle('academic');
    const traitStyles = getSectionStyle('traits');
    const skillStyles = getSectionStyle('skills');
    const footerStyles = getSectionStyle('comments');

    // Helper to render checkmark for rating
    const renderRatingCheck = (rating: number, target: number, color: string) => {
        return Math.round(rating) === target ? <Text style={[styles.checkmark, { color }]}>✓</Text> : null;
    };

    return (
        <View style={styles.page}>
            {/* Header */}
            <View style={[styles.header, headerStyles.container]}>
                {showOption('showLogo') && (
                    <View style={[styles.logoContainer, { backgroundColor: headerStyles.borderOnly.borderColor }]}>
                        <View style={styles.logoInner}>
                            {school.logoUrl ? (
                                <Image style={styles.logoImage} src={school.logoUrl} />
                            ) : (
                                <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>Logo</Text>
                            )}
                        </View>
                    </View>
                )}
                <View style={styles.schoolInfo}>
                    {showOption('showSchoolName') && <Text style={styles.schoolName}>{school.name}</Text>}
                    {showOption('showSchoolAddress') && (
                        <Text style={styles.subtitle}>{school.address}</Text>
                    )}
                    {(showOption('showSchoolMotto') && school.motto) && <Text style={styles.motto}>Motto: "{school.motto}"</Text>}
                    {showOption('showSchoolContact') && <Text style={styles.email}>{school.email}</Text>}
                </View>
            </View>

            {/* Term Header */}
            {showOption('showTermHeader') && (
                <Text style={[styles.termHeader, headerStyles.header]}>
                    {term.sessionName} {term.name.toUpperCase()} {isHalfTerm ? "HALF TERM REPORT" : "REPORT SHEET"}
                </Text>
            )}

            {/* Personal Data Section */}
            <View style={styles.personalDataContainer}>
                {/* Column 1: Personal Data */}
                <View style={[styles.personalDataCol, personalStyles.container, { width: showOption('showPhoto') ? "40%" : "50%" }]}>
                    <Text style={[styles.personalDataHeader, personalStyles.header]}>STUDENT'S PERSONAL DATA</Text>
                    {/* Rows */}
                    {showOption('showName') && (
                        <View style={[styles.dataRow, personalStyles.borderOnly]}>
                            <Text style={[styles.dataLabel, personalStyles.borderOnly]}>Name</Text>
                            <Text style={[styles.dataValue, styles.bold]}>{studentFullName}</Text>
                        </View>
                    )}
                    {showOption('showDOB') && (
                        <View style={styles.dataRow}>
                            <Text style={styles.dataLabel}>DOB</Text>
                            <Text style={styles.dataValue}>
                                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}
                            </Text>
                        </View>
                    )}
                    {showOption('showSex') && (
                        <View style={styles.dataRow}>
                            <Text style={styles.dataLabel}>Sex</Text>
                            <Text style={styles.dataValue}>{student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1).toLowerCase() : "N/A"}</Text>
                        </View>
                    )}
                    {showOption('showClass') && (
                        <View style={styles.dataRow}>
                            <Text style={styles.dataLabel}>Class</Text>
                            <Text style={styles.dataValue}>{student.className}</Text>
                        </View>
                    )}
                    {showOption('showAdmNo') && (
                        <View style={[styles.dataRow, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.dataLabel, { borderRightColor: "#333" }]}>Adm No.</Text>
                            <Text style={styles.dataValue}>{student.admissionNumber}</Text>
                        </View>
                    )}
                </View>

                {/* Column 2: Photo */}
                {showOption('showPhoto') && (
                    <View style={[styles.photoCol, personalStyles.container]}>
                        {student.photoUrl && config?.showPhoto !== false ? (
                            <Image style={styles.studentPhoto} src={student.photoUrl} />
                        ) : (
                            <Text style={{ color: "#999", fontSize: 8 }}>PHOTO</Text>
                        )}
                    </View>
                )}

                {/* Column 3: Attendance & Stats Container */}
                <View style={[{ width: showOption('showPhoto') ? "40%" : "50%", flexDirection: 'column', gap: 10 }]}>
                    {/* Attendance Box */}
                    <View style={[styles.statsCol, attStyles.container, { width: "100%", marginBottom: 10 }]}>
                        <Text style={[styles.statsHeader, attStyles.header, { borderBottomWidth: 1 }]}>ATTENDANCE</Text>
                        <View style={[styles.attendanceGrid, attStyles.borderOnly]}>
                            {showOption('showAttOpened') && (
                                <View style={[styles.attendanceCell, attStyles.borderOnly]}>
                                    <Text style={styles.attendanceLabel}>Opened</Text>
                                    <Text style={styles.attendanceValue}>{attendance.totalSchoolDays || "-"}</Text>
                                </View>
                            )}
                            {showOption('showAttPresent') && (
                                <View style={[styles.attendanceCell, attStyles.borderOnly]}>
                                    <Text style={styles.attendanceLabel}>Present</Text>
                                    <Text style={styles.attendanceValue}>{attendance.daysPresent || "-"}</Text>
                                </View>
                            )}
                            {showOption('showAttAbsent') && (
                                <View style={[styles.attendanceCell, { borderRightWidth: 0 }]}>
                                    <Text style={styles.attendanceLabel}>Absent</Text>
                                    <Text style={styles.attendanceValue}>{attendance.daysAbsent || "-"}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Summary Box */}
                    <View style={[styles.statsCol, attStyles.container, { width: "100%" }]}>
                        <Text style={[styles.statsHeader, attStyles.header, { borderBottomWidth: 1 }]}>SUMMARY</Text>
                        <View style={[styles.scoreSummaryRow, attStyles.borderOnly]}>
                            <Text style={[styles.scoreLabel, attStyles.borderOnly]}>Total Score Possible</Text>
                            <Text style={styles.scoreValueBox}>{formatScore(academic.summary.totalObtainable || (academic.subjects.length * 100))}</Text>
                        </View>
                        <View style={[styles.scoreSummaryRow, attStyles.borderOnly]}>
                            <Text style={[styles.scoreLabel, attStyles.borderOnly]}>Total Score Obtained</Text>
                            <Text style={styles.scoreValueBox}>{formatScore(academic.summary.totalScore)}</Text>
                        </View>
                        <View style={[styles.scoreSummaryRow, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.scoreLabel, attStyles.borderOnly]}>Average %</Text>
                            <Text style={styles.scoreValueBox}>{formatScore(academic.summary.average)}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Academic Performance */}
            <View style={styles.tableSection}>
                <Text style={[styles.sectionHeader, academicStyles.header, { borderTopWidth: academicStyles.container.borderWidth, borderLeftWidth: academicStyles.container.borderWidth, borderRightWidth: academicStyles.container.borderWidth }]}>ACADEMIC PERFORMANCE</Text>
                <View style={[styles.table, academicStyles.container]}>
                    {/* Header Row 1 */}
                    <View style={[styles.tableRow, styles.tableHeaderRow, academicStyles.header, { height: 25 }]}>
                        <View style={[styles.tableCol, academicStyles.header, { flex: 2 }]}>
                            <Text style={[styles.tableCell, styles.bold, { color: academicStyles.header.color }]}>SUBJECT</Text>
                        </View>

                        {/* Term History */}
                        {showOption('showTermHistory') && (
                            <>
                                <View style={[styles.tableCol, academicStyles.header, { width: 35 }]}>
                                    <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>1ST</Text>
                                </View>
                                <View style={[styles.tableCol, academicStyles.header, { width: 35 }]}>
                                    <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>2ND</Text>
                                </View>
                            </>
                        )}
                        {showOption('showCA1') && caAssessmentTypes.map(at => (
                            <View key={at.field}>
                                {/* If components are shown, render a sub-column per component then the CA total */}
                                {showScoreComponents && (at.components ?? []).length > 0 ? (
                                    <>
                                        {(at.components ?? []).map(comp => (
                                            <View key={comp.id} style={[styles.tableCol, academicStyles.header, { width: 18 }]}>
                                                <Text style={[styles.tableCell, styles.bold, { fontSize: 5, color: academicStyles.header.color }]}>{comp.name.toUpperCase()}</Text>
                                                <Text style={[styles.tableCell, { fontSize: 5, color: academicStyles.header.color }]}>({comp.maxScore})</Text>
                                            </View>
                                        ))}
                                        <View style={[styles.tableCol, academicStyles.header, { width: 20, backgroundColor: (academicStyles.header as any).backgroundColor ?? '#f3f4f6' }]}>
                                            <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>{at.name.toUpperCase()}</Text>
                                        </View>
                                    </>
                                ) : (
                                    <View style={[styles.tableCol, academicStyles.header, { width: 20 }]}>
                                        <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>{at.name.toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                        {showOption('showCA') && (
                            <View style={[styles.tableCol, academicStyles.header, { width: 25 }]}>
                                <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>CA</Text>
                            </View>
                        )}
                        {showOption('showExam') && !isHalfTerm && (
                            <View style={[styles.tableCol, academicStyles.header, { width: 25 }]}>
                                <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>{examLabel.toUpperCase()}</Text>
                            </View>
                        )}
                        {showOption('showSubjectTotal') && (
                            <View style={[styles.tableCol, academicStyles.header, { width: 30 }]}>
                                <Text style={[styles.tableCell, styles.bold, { color: academicStyles.header.color }]}>TOTAL</Text>
                            </View>
                        )}
                        {showOption('showGrade') && !isHalfTerm && (
                            <View style={[styles.tableCol, academicStyles.header, { width: 40 }]}>
                                <Text style={[styles.tableCell, styles.bold, { color: academicStyles.header.color }]}>GRADE</Text>
                            </View>
                        )}
                        {showOption('showSubjectPosition') && !isHalfTerm && (
                            <View style={[styles.tableCol, academicStyles.header, { width: 30 }]}>
                                <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>POS</Text>
                            </View>
                        )}
                        {showOption('showSubjectAverage') && (
                            <View style={[styles.tableCol, academicStyles.header, { width: 30 }]}>
                                <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>AVG</Text>
                            </View>
                        )}
                        {showOption('showSubjectLowHigh') && !isHalfTerm && (
                            <>
                                <View style={[styles.tableCol, academicStyles.header, { width: 30 }]}>
                                    <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>LOW</Text>
                                </View>
                                <View style={[styles.tableCol, academicStyles.header, { width: 30 }]}>
                                    <Text style={[styles.tableCell, styles.bold, { fontSize: 6, color: academicStyles.header.color }]}>HIGH</Text>
                                </View>
                            </>
                        )}
                        {showOption('showRemarks') && !isHalfTerm && (
                            <View style={[styles.tableCol, academicStyles.header, { flex: 1, borderRightWidth: 0 }]}>
                                <Text style={[styles.tableCell, styles.bold, { color: academicStyles.header.color }]}>REMARK</Text>
                            </View>
                        )}
                    </View>

                    {/* Data Rows */}
                    {academic.subjects.map((sub, i) => (
                        <View key={i} style={[styles.tableRow, academicStyles.borderOnly]}>
                            <View style={[styles.tableCol, academicStyles.borderOnly, { flex: 2, alignItems: 'flex-start' }]}>
                                <Text style={[styles.tableCell, styles.subjectCell]}>{sub.name}</Text>
                            </View>
                            {showOption('showTermHistory') && (
                                <>
                                    <View style={[styles.tableCol, academicStyles.borderOnly, { width: 35 }]}>
                                        <Text style={styles.tableCell}>{formatScore(sub.cumulativeTotal1)}</Text>
                                    </View>
                                    <View style={[styles.tableCol, academicStyles.borderOnly, { width: 35 }]}>
                                        <Text style={styles.tableCell}>{formatScore(sub.cumulativeTotal2)}</Text>
                                    </View>
                                </>
                            )}
                            {showOption('showCA1') && caAssessmentTypes.map(at => (
                                <View key={at.field}>
                                    {showScoreComponents && (at.components ?? []).length > 0 ? (
                                        <>
                                            {(at.components ?? []).map(comp => (
                                                <View key={comp.id} style={[styles.tableCol, academicStyles.borderOnly, { width: 18 }]}>
                                                    <Text style={styles.tableCell}>{formatScore((sub.componentScores as any)?.[comp.id] as number | undefined)}</Text>
                                                </View>
                                            ))}
                                            <View style={[styles.tableCol, academicStyles.borderOnly, { width: 20, backgroundColor: '#f9fafb' }]}>
                                                <Text style={[styles.tableCell, styles.bold]}>{formatScore(sub[at.field] as number | undefined)}</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <View style={[styles.tableCol, academicStyles.borderOnly, { width: 20 }]}>
                                            <Text style={styles.tableCell}>{formatScore(sub[at.field] as number | undefined)}</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                            {showOption('showCA') && (
                                <View style={[styles.tableCol, academicStyles.borderOnly, { width: 25 }]}>
                                    <Text style={styles.tableCell}>{formatScore(sub.ca)}</Text>
                                </View>
                            )}
                            {showOption('showExam') && !isHalfTerm && (
                                <View style={[styles.tableCol, academicStyles.borderOnly, { width: 25 }]}>
                                    <Text style={styles.tableCell}>{formatScore(sub.exam)}</Text>
                                </View>
                            )}

                            {showOption('showSubjectTotal') && (
                                <View style={[styles.tableCol, academicStyles.borderOnly, { width: 30 }]}>
                                    <Text style={[styles.tableCell, styles.bold]}>{formatScore(sub.total)}</Text>
                                </View>
                            )}

                            {showOption('showGrade') && !isHalfTerm && (
                                <View style={[styles.tableCol, academicStyles.borderOnly, { width: 40 }]}>
                                    <Text style={[styles.tableCell, {
                                        color: sub.grade && sub.grade.startsWith("F") ? "red" : "black",
                                        fontWeight: "bold"
                                    }]}>{sub.grade}</Text>
                                </View>
                            )}

                            {showOption('showSubjectPosition') && !isHalfTerm && (
                                <View style={[styles.tableCol, academicStyles.borderOnly, { width: 30 }]}>
                                    <Text style={styles.tableCell}>{sub.subjectPosition || "-"}</Text>
                                </View>
                            )}

                            {showOption('showSubjectAverage') && (
                                <View style={[styles.tableCol, academicStyles.borderOnly, { width: 30 }]}>
                                    <Text style={styles.tableCell}>{formatScore(sub.subjectClassAverage)}</Text>
                                </View>
                            )}

                            {showOption('showSubjectLowHigh') && !isHalfTerm && (
                                <>
                                    <View style={[styles.tableCol, academicStyles.borderOnly, { width: 30 }]}>
                                        <Text style={styles.tableCell}>{formatScore(sub.subjectLowestScore)}</Text>
                                    </View>
                                    <View style={[styles.tableCol, academicStyles.borderOnly, { width: 30 }]}>
                                        <Text style={styles.tableCell}>{formatScore(sub.subjectHighestScore)}</Text>
                                    </View>
                                </>
                            )}

                            {showOption('showRemarks') && !isHalfTerm && (
                                <View style={[styles.tableCol, { flex: 1, borderRightWidth: 0 }]}>
                                    <Text style={[styles.tableCell, { fontSize: 7 }]}>{sub.remark}</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </View>

            {/* Traits Section */}
            {(config?.showTraits !== false || config?.showSkills !== false) && (
                <View style={{ marginBottom: 15 }}>
                    <View style={[styles.traitsContainer, { marginBottom: 5 }]}>
                        {/* Affective */}
                        {config?.showTraits !== false && (
                            <View style={[styles.traitsCol, traitStyles.container]}>
                                <Text style={[styles.traitsHeader, traitStyles.header]}>AFFECTIVE TRAITS</Text>
                                {/* Header Row */}
                                <View style={[styles.traitRow, traitStyles.header]}>
                                    <View style={[styles.traitNameCol, traitStyles.borderOnly]}><Text style={{ fontSize: 8, color: traitStyles.header.color }}>TRAIT</Text></View>
                                    <View style={styles.traitRatingCol}>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <View key={n} style={styles.ratingBox}>
                                                <Text style={{ fontSize: 8, color: traitStyles.header.color }}>{n}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                {/* Rows */}
                                {affective.map((trait, i) => {
                                    if (showOption(`showTrait${trait.name}`) === false) return null;
                                    return (
                                        <View key={i} style={[styles.traitRow, traitStyles.borderOnly]}>
                                            <View style={[styles.traitNameCol, traitStyles.borderOnly]}>
                                                <Text style={{ fontSize: 7 }}>{trait.name}</Text>
                                            </View>
                                            <View style={styles.traitRatingCol}>
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <View key={n} style={[styles.ratingBox, traitStyles.borderOnly]}>
                                                        {renderRatingCheck(trait.rating, n, traitStyles.checkmarkColor)}
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Psychomotor */}
                        {config?.showSkills !== false && (
                            <View style={[styles.traitsCol, skillStyles.container]}>
                                <Text style={[styles.traitsHeader, skillStyles.header]}>PSYCHOMOTOR SKILLS</Text>
                                {/* Header Row */}
                                <View style={[styles.traitRow, skillStyles.header]}>
                                    <View style={[styles.traitNameCol, skillStyles.borderOnly]}><Text style={{ fontSize: 8, color: skillStyles.header.color }}>SKILL</Text></View>
                                    <View style={styles.traitRatingCol}>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <View key={n} style={styles.ratingBox}>
                                                <Text style={{ fontSize: 8, color: skillStyles.header.color }}>{n}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                {/* Rows */}
                                {psychomotor.map((trait, i) => {
                                    const skillKey = trait.name.replace(/\s+/g, '');
                                    if (showOption(`showSkill${skillKey}`) === false) return null;
                                    return (
                                        <View key={i} style={[styles.traitRow, skillStyles.borderOnly]}>
                                            <View style={[styles.traitNameCol, skillStyles.borderOnly]}>
                                                <Text style={{ fontSize: 7 }}>{trait.name}</Text>
                                            </View>
                                            <View style={styles.traitRatingCol}>
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <View key={n} style={[styles.ratingBox, skillStyles.borderOnly]}>
                                                        {renderRatingCheck(trait.rating, n, skillStyles.checkmarkColor)}
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Grade Key */}
                    {showOption('showAffectiveKey') && (
                        <View style={[styles.footer, skillStyles.container, { marginTop: 0, padding: 5 }]}>
                            <Text style={[{ fontSize: 8, fontWeight: "bold", textAlign: 'center', padding: 2, marginBottom: 4, letterSpacing: 1 }, skillStyles.header]}>
                                Key To Behaviour/Skills:
                            </Text>
                            <Text style={{ fontSize: 7, textAlign: 'center' }}>
                                5 (Excellent) | 4 (Very Good) | 3 (Good) | 2 (Fair) | 1 (Poor)
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Academic Grade Key */}
            {showOption('showAcademicKey') && (
                <View style={[styles.gradeKey, skillStyles.container, { marginBottom: 10 }]}>
                    <Text style={[styles.gradeKeyTitle, skillStyles.header]}>KEY TO ACADEMIC GRADES</Text>
                    <Text style={styles.gradeKeyText}>
                        {data.gradingRules && data.gradingRules.length > 0
                            ? data.gradingRules.map(r => `${r.grade} (${r.minScore}-${r.maxScore})`).join(" | ")
                            : "A (75-100) | B (65-74) | C (50-64) | D (45-49) | E (40-44) | F (0-39)"}
                    </Text>
                </View>
            )}

            {/* Footer Comments */}
            {(config?.showComments !== false) && (
                <View style={[styles.footer, footerStyles.container]}>
                    {showOption('showTeacherSection') && (
                        <View style={[styles.footerRow, footerStyles.borderOnly, { height: 40 }]}>
                            <Text style={[styles.footerLabel, footerStyles.header]}>Class Teacher's Comment:</Text>
                            <Text style={[styles.footerText, footerStyles.borderOnly]}>
                                {showOption('showTeacherComment') ? (comments.classTeacher || "") : ""}
                            </Text>
                            {showOption('showTeacherSign') && <Text style={[styles.footerSign, footerStyles.borderOnly]}>Sign: __________</Text>}
                            {showOption('showTeacherDate') && <Text style={styles.footerDate}>{publishedDateLabel}</Text>}
                        </View>
                    )}
                    {showOption('showPrincipalSection') && (
                        <View style={[styles.footerRow, { height: 40, borderBottomWidth: 0 }]}>
                            <Text style={[styles.footerLabel, footerStyles.header]}>Principal's Comment:</Text>
                            <Text style={[styles.footerText, footerStyles.borderOnly]}>
                                {showOption('showPrincipalComment') ? (comments.principal || "") : ""}
                            </Text>
                            {showOption('showPrincipalSign') && (
                                <View style={[styles.footerSign, footerStyles.borderOnly, { alignItems: 'center', justifyContent: 'center' }]}>
                                    {school.principalSignatureUrl ? (
                                        <Image src={school.principalSignatureUrl} style={{ width: 60, height: 30, objectFit: 'contain' }} />
                                    ) : (
                                        <Text>Sign: __________</Text>
                                    )}
                                </View>
                            )}
                            {showOption('showPrincipalDate') && <Text style={styles.footerDate}>{publishedDateLabel}</Text>}
                        </View>
                    )}
                </View>
            )}

            {showOption('showPromotionStatus') && (
                <View style={[styles.promotionStatus, footerStyles.header, { borderTopWidth: footerStyles.container.borderWidth, borderLeftWidth: footerStyles.container.borderWidth, borderRightWidth: footerStyles.container.borderWidth, borderBottomWidth: footerStyles.container.borderWidth }]}>
                    <Text>PROMOTION STATUS: {comments.promotionStatus || ""}</Text>
                </View>
            )}

        </View>
    );
};

export default StandardTemplate;
