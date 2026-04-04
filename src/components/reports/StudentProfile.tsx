import React from "react";
import { Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./styles";
import { formatScore } from "./scoreFormatting";
import { formatStudentFullName } from "./formatStudentFullName";

interface StudentProfileProps {
    student: ReportCardData["student"];
    term: ReportCardData["term"];
    attendance: ReportCardData["attendance"];
    summary: ReportCardData["academic"]["summary"];
}

const customStyles = StyleSheet.create({
    container: {
        flexDirection: "row",
        gap: 5,
        marginBottom: 5,
    },
    box: {
        borderWidth: 1,
        borderColor: "#000",
    },
    boxTitle: {
        fontSize: 8,
        fontWeight: "bold",
        backgroundColor: "#f0f0f0",
        textAlign: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        textTransform: "uppercase",
        padding: 2,
    },
    gridRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        minHeight: 12,
        alignItems: "center",
    },
    labelCol: {
        width: "40%",
        borderRightWidth: 1,
        borderRightColor: "#000",
        padding: 2,
    },
    valueCol: {
        width: "60%",
        padding: 2,
    },
    labelText: {
        fontSize: 7,
        fontWeight: "bold",
    },
    valueText: {
        fontSize: 7,
    },
    photoBox: {
        width: 100,
        height: 100,
        borderWidth: 1,
        borderColor: "#000",
        justifyContent: "center",
        alignItems: "center",
    },
    photo: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
});

const StudentProfile: React.FC<StudentProfileProps & { config?: any }> = ({ student, term, attendance, summary, config }) => {
    const studentFullName = formatStudentFullName(student);

    return (
        <View style={customStyles.container}>
            {/* Personal Data */}
            <View style={[customStyles.box, { flex: 2 }]}>
                <Text style={customStyles.boxTitle}>Student Personal Data</Text>
                {[
                    { label: "Name", value: studentFullName },
                    { label: "Date of Birth", value: "N/A" },
                    { label: "Sex", value: "N/A" },
                    { label: "Class", value: student.className },
                    { label: "Admission No.", value: student.admissionNumber },
                ].map((row, i, arr) => (
                    <View key={i} style={[customStyles.gridRow, i === arr.length - 1 ? styles.borderBottomNone : {}]}>
                        <View style={customStyles.labelCol}>
                            <Text style={customStyles.labelText}>{row.label}</Text>
                        </View>
                        <View style={customStyles.valueCol}>
                            <Text style={customStyles.valueText}>{row.value}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Photo */}
            <View style={customStyles.photoBox}>
                {student.photoUrl ? (
                    <Image style={customStyles.photo} src={student.photoUrl} />
                ) : (
                    <Text style={{ fontSize: 8 }}>PASSPORT</Text>
                )}
            </View>

            {/* Attendance & Duration */}
            <View style={{ flex: 1.5, gap: 5 }}>
                <View style={[customStyles.box]}>
                    <Text style={customStyles.boxTitle}>Attendance</Text>
                    <View style={customStyles.gridRow}>
                        <View style={[customStyles.labelCol, { width: "33%" }]}><Text style={[customStyles.labelText, { textAlign: "center" }]}>Opened</Text></View>
                        <View style={[customStyles.labelCol, { width: "33%" }]}><Text style={[customStyles.labelText, { textAlign: "center" }]}>Present</Text></View>
                        <View style={[customStyles.labelCol, { width: "34%", borderRightWidth: 0 }]}><Text style={[customStyles.labelText, { textAlign: "center" }]}>Absent</Text></View>
                    </View>
                    <View style={[customStyles.gridRow, styles.borderBottomNone]}>
                        <View style={[customStyles.labelCol, { width: "33%" }]}><Text style={[customStyles.valueText, { textAlign: "center" }]}>{attendance.totalSchoolDays}</Text></View>
                        <View style={[customStyles.labelCol, { width: "33%" }]}><Text style={[customStyles.valueText, { textAlign: "center" }]}>{attendance.daysPresent}</Text></View>
                        <View style={[customStyles.labelCol, { width: "34%", borderRightWidth: 0 }]}><Text style={[customStyles.valueText, { textAlign: "center" }]}>{attendance.daysAbsent}</Text></View>
                    </View>
                </View>

                <View style={[customStyles.box]}>
                    <Text style={customStyles.boxTitle}>Terminal Duration</Text>
                    <View style={customStyles.gridRow}>
                        <View style={[customStyles.labelCol, { width: "33%" }]}><Text style={[customStyles.labelText, { textAlign: "center" }]}>Begins</Text></View>
                        <View style={[customStyles.labelCol, { width: "33%" }]}><Text style={[customStyles.labelText, { textAlign: "center" }]}>Ends</Text></View>
                        <View style={[customStyles.labelCol, { width: "34%", borderRightWidth: 0 }]}><Text style={[customStyles.labelText, { textAlign: "center" }]}>Resumes</Text></View>
                    </View>
                    <View style={[customStyles.gridRow, styles.borderBottomNone]}>
                        <View style={[customStyles.labelCol, { width: "33%" }]}><Text style={[customStyles.valueText, { textAlign: "center" }]}>{new Date(term.startDate).toLocaleDateString()}</Text></View>
                        <View style={[customStyles.labelCol, { width: "33%" }]}><Text style={[customStyles.valueText, { textAlign: "center" }]}>{new Date(term.endDate).toLocaleDateString()}</Text></View>
                        <View style={[customStyles.labelCol, { width: "34%", borderRightWidth: 0 }]}><Text style={[customStyles.valueText, { textAlign: "center" }]}>{term.nextTermStartDate ? new Date(term.nextTermStartDate).toLocaleDateString() : "TBA"}</Text></View>
                    </View>
                </View>
            </View>

            {/* Global Summary */}
            <View style={[customStyles.box, { flex: 1 }]}>
                <View style={customStyles.gridRow}>
                    <View style={[customStyles.labelCol, { width: "70%" }]}><Text style={customStyles.labelText}>OBTAINABLE</Text></View>
                    <View style={[customStyles.valueCol, { width: "30%" }]}><Text style={customStyles.valueText}>{formatScore(summary.totalObtainable)}</Text></View>
                </View>
                <View style={customStyles.gridRow}>
                    <View style={[customStyles.labelCol, { width: "70%" }]}><Text style={customStyles.labelText}>OBTAINED</Text></View>
                    <View style={[customStyles.valueCol, { width: "30%" }]}><Text style={customStyles.valueText}>{formatScore(summary.totalScore)}</Text></View>
                </View>
                <View style={customStyles.gridRow}>
                    <View style={[customStyles.labelCol, { width: "70%" }]}><Text style={customStyles.labelText}>AVERAGE %</Text></View>
                    <View style={[customStyles.valueCol, { width: "30%" }]}><Text style={customStyles.valueText}>{formatScore(summary.average)}</Text></View>
                </View>
                <View style={[customStyles.gridRow, styles.borderBottomNone]}>
                    <View style={[customStyles.labelCol, { width: "50%" }]}><Text style={customStyles.labelText}>POSITION</Text></View>
                    <View style={[customStyles.valueCol, { width: "50%" }]}><Text style={customStyles.valueText}>{summary.classPosition || "-"}</Text></View>
                </View>
            </View>
        </View>
    );
};

export default StudentProfile;
