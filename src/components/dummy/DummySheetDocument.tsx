import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { DummySheetData, DummySheetSubjectPage } from "./types";

interface DummySheetDocumentProps {
    data: DummySheetData;
}

const MIN_ROWS_PER_PAGE = 18;

const styles = StyleSheet.create({
    page: {
        paddingTop: 18,
        paddingBottom: 18,
        paddingHorizontal: 18,
        fontFamily: "Helvetica",
        fontSize: 9,
        color: "#111827",
        backgroundColor: "#ffffff",
    },
    pageContent: {
        flex: 1,
        flexDirection: "column",
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    logoBox: {
        width: 70,
        height: 52,
        borderWidth: 1,
        borderColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    logoImage: {
        width: 64,
        height: 46,
        objectFit: "contain",
    },
    logoText: {
        fontSize: 8,
    },
    schoolCenter: {
        flex: 1,
        alignItems: "center",
    },
    schoolName: {
        fontSize: 16,
        fontWeight: "bold",
        textTransform: "uppercase",
        textAlign: "center",
    },
    schoolAddress: {
        marginTop: 2,
        fontSize: 8,
        textAlign: "center",
    },
    metaStack: {
        width: 180,
        alignItems: "flex-start",
        gap: 4,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
    },
    metaLabel: {
        width: 82,
        fontWeight: "bold",
        textTransform: "uppercase",
        fontSize: 8,
    },
    metaValue: {
        flex: 1,
        borderBottomWidth: 1,
        borderColor: "#111827",
        paddingBottom: 2,
        fontSize: 8,
    },
    title: {
        marginTop: 4,
        marginBottom: 8,
        fontSize: 16,
        fontWeight: "bold",
        textTransform: "uppercase",
        textDecoration: "underline",
    },
    table: {
        borderWidth: 1,
        borderColor: "#111827",
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#f3f4f6",
    },
    tableRow: {
        flexDirection: "row",
    },
    snCol: {
        width: 36,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 24,
        paddingHorizontal: 2,
    },
    nameCol: {
        flex: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#111827",
        justifyContent: "center",
        minHeight: 24,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    scoreCol: {
        width: 60,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#111827",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 24,
        paddingHorizontal: 2,
    },
    lastScoreCol: {
        borderRightWidth: 0,
    },
    headerText: {
        fontSize: 8,
        fontWeight: "bold",
        textTransform: "uppercase",
        textAlign: "center",
    },
    cellText: {
        fontSize: 9,
        textAlign: "center",
    },
    nameText: {
        fontSize: 9,
    },
    footer: {
        marginTop: "auto",
        paddingTop: 12,
        gap: 8,
    },
    approvalRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    approvalLabel: {
        width: 155,
        fontSize: 9,
    },
    signatureZone: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    signatureText: {
        fontSize: 9,
        fontWeight: "bold",
    },
    signatureLine: {
        flex: 1,
        borderBottomWidth: 1,
        borderColor: "#111827",
        height: 10,
    },
    approverName: {
        width: 140,
        borderBottomWidth: 1,
        borderColor: "#111827",
        textAlign: "center",
        paddingBottom: 2,
        fontSize: 9,
    },
});

function buildPageRows(subject: DummySheetSubjectPage) {
    return Array.from({ length: Math.max(subject.students.length, MIN_ROWS_PER_PAGE) }, (_, index) => subject.students[index] || null);
}

function SubjectSheetPage({ data, subject }: { data: DummySheetData; subject: DummySheetSubjectPage }) {
    const rows = buildPageRows(subject);
    const classTeacherName = data.classArm.classTeacherName || "Class Teacher";

    return (
        <Page size="A4" style={styles.page}>
            <View style={styles.pageContent}>
                <View style={styles.headerTop}>
                    <View style={styles.logoBox}>
                        {data.school.logoUrl ? (
                            <Image src={data.school.logoUrl} style={styles.logoImage} />
                        ) : (
                            <Text style={styles.logoText}>School Logo</Text>
                        )}
                    </View>

                    <View style={styles.schoolCenter}>
                        <Text style={styles.schoolName}>{data.school.name}</Text>
                        {data.school.address ? <Text style={styles.schoolAddress}>{data.school.address}</Text> : null}
                        <Text style={styles.title}>Dummy</Text>
                    </View>

                    <View style={styles.metaStack}>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Academic Session</Text>
                            <Text style={styles.metaValue}>{data.session.name}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Term</Text>
                            <Text style={styles.metaValue}>{data.term.name}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ marginBottom: 8, gap: 4 }}>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Subject</Text>
                        <Text style={styles.metaValue}>{subject.subjectName}</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Class</Text>
                        <Text style={styles.metaValue}>{data.classArm.className} {data.classArm.armName}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                        <View style={styles.snCol}>
                            <Text style={styles.headerText}>S/N</Text>
                        </View>
                        <View style={styles.nameCol}>
                            <Text style={styles.headerText}>Student Name</Text>
                        </View>
                        <View style={styles.scoreCol}>
                            <Text style={styles.headerText}>CA 1</Text>
                        </View>
                        <View style={styles.scoreCol}>
                            <Text style={styles.headerText}>CA 2</Text>
                        </View>
                        <View style={styles.scoreCol}>
                            <Text style={styles.headerText}>Exam</Text>
                        </View>
                        <View style={[styles.scoreCol, styles.lastScoreCol]}>
                            <Text style={styles.headerText}>Total</Text>
                        </View>
                    </View>

                    {rows.map((row, index) => (
                        <View style={styles.tableRow} key={row?.id || `blank-${index}`}>
                            <View style={styles.snCol}>
                                <Text style={styles.cellText}>{row?.serialNumber || ""}</Text>
                            </View>
                            <View style={styles.nameCol}>
                                <Text style={styles.nameText}>{row?.fullName || ""}</Text>
                            </View>
                            <View style={styles.scoreCol}>
                                <Text style={styles.cellText}></Text>
                            </View>
                            <View style={styles.scoreCol}>
                                <Text style={styles.cellText}></Text>
                            </View>
                            <View style={styles.scoreCol}>
                                <Text style={styles.cellText}></Text>
                            </View>
                            <View style={[styles.scoreCol, styles.lastScoreCol]}>
                                <Text style={styles.cellText}></Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.footer}>
                    {["CA1", "CA2", "EXAM"].map((label) => (
                        <View style={styles.approvalRow} key={label}>
                            <Text style={styles.approvalLabel}>Check and Approve {label}</Text>
                            <View style={styles.signatureZone}>
                                <Text style={styles.signatureText}>Sign</Text>
                                <View style={styles.signatureLine} />
                            </View>
                            <Text style={styles.approverName}>{classTeacherName}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Page>
    );
}

const DummySheetDocument: React.FC<DummySheetDocumentProps> = ({ data }) => {
    const subjects = data.subjects.length > 0
        ? data.subjects
        : [{ subjectId: "empty", subjectName: "No Subject Enrollments Found", students: [] }];

    return (
        <Document>
            {subjects.map((subject) => (
                <SubjectSheetPage key={subject.subjectId} data={data} subject={subject} />
            ))}
        </Document>
    );
};

export default DummySheetDocument;
