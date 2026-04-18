import React from "react";
import { Text, View, Image } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ProfessionalStyles";
import { formatScore } from "../../scoreFormatting";
import { formatStudentFullName } from "../../formatStudentFullName";

interface StudentProfileProps {
    student: ReportCardData["student"];
    term: ReportCardData["term"];
    attendance: ReportCardData["attendance"];
    summary: ReportCardData["academic"]["summary"];
}

const ProfessionalStudentProfile: React.FC<StudentProfileProps & { config?: any }> = ({
    student,
    term,
    attendance,
    summary,
    config
}) => {
    const studentFullName = formatStudentFullName(student);

    return (
        <View style={styles.gridContainer}>
            {/* 1. Student Personal Data Table (Left) */}
            <View style={[styles.gridBox, { flex: 1.5 }]}>
                <View style={styles.gridBoxHeader}>
                    <Text style={styles.gridBoxHeaderText}>STUDENT'S PERSONAL DATA</Text>
                </View>
                <View style={styles.gridCol}>
                    <View style={styles.gridRow}>
                        <View style={styles.gridLabel}><Text>Name</Text></View>
                        <View style={styles.gridValue}><Text>{studentFullName}</Text></View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.gridLabel}><Text>Date of Birth</Text></View>
                        <View style={styles.gridValue}><Text>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "-"}</Text></View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.gridLabel}><Text>Sex</Text></View>
                        <View style={styles.gridValue}><Text>{student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1).toLowerCase() : "FEMALE"}</Text></View>
                    </View>
                    <View style={styles.gridRow}>
                        <View style={styles.gridLabel}><Text>Class</Text></View>
                        <View style={styles.gridValue}><Text>{student.className}</Text></View>
                    </View>
                    <View style={[styles.gridRow, styles.gridRowLast]}>
                        <View style={styles.gridLabel}><Text>Admission No.</Text></View>
                        <View style={styles.gridValue}><Text>{student.admissionNumber}</Text></View>
                    </View>
                </View>
            </View>

            {/* 2. Passport Photo (Center-Left) */}
            <View style={{ width: 85, marginHorizontal: 2 }}>
                {student.photoUrl ? (
                    <Image style={{ width: "100%", height: "100%", borderWidth: 1, borderColor: "#000" }} src={student.photoUrl} />
                ) : (
                    <View style={{ width: "100%", height: "100%", borderWidth: 1, borderColor: "#000", backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontSize: 6 }}>PASSPORT</Text>
                    </View>
                )}
            </View>

            {/* 3. Attendance & Duration (Center-Right) */}
            <View style={{ flex: 1.8, gap: 3 }}>
                {/* Attendance */}
                <View style={[styles.gridBox, { flex: 1 }]}>
                    <View style={styles.gridBoxHeader}>
                        <Text style={styles.gridBoxHeaderText}>ATTENDANCE</Text>
                    </View>
                    <View style={{ flexDirection: "row", flex: 1 }}>
                        <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: "#047857", alignItems: "center", justifyContent: "center", padding: 1 }}>
                            <Text style={{ fontSize: 4.5, textAlign: "center", marginBottom: 1 }}>No. of Times School Opened</Text>
                            <Text style={{ fontSize: 7, fontWeight: "bold", fontFamily: "Helvetica-Bold" }}>{attendance.totalSchoolDays}</Text>
                        </View>
                        <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: "#047857", alignItems: "center", justifyContent: "center", padding: 1 }}>
                            <Text style={{ fontSize: 4.5, textAlign: "center", marginBottom: 1 }}>No. of Times Present</Text>
                            <Text style={{ fontSize: 7, fontWeight: "bold", fontFamily: "Helvetica-Bold" }}>{attendance.daysPresent}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 1 }}>
                            <Text style={{ fontSize: 4.5, textAlign: "center", marginBottom: 1 }}>No. of Times Absent</Text>
                            <Text style={{ fontSize: 7, fontWeight: "bold", fontFamily: "Helvetica-Bold" }}>{attendance.daysAbsent}</Text>
                        </View>
                    </View>
                </View>

                {/* Duration */}
                <View style={[styles.gridBox, { flex: 1 }]}>
                    <View style={styles.gridBoxHeader}>
                        <Text style={styles.gridBoxHeaderText}>TERMINAL DURATION (13 WEEKS)</Text>
                    </View>
                    <View style={{ flexDirection: "row", flex: 1 }}>
                        <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: "#047857", alignItems: "center", justifyContent: "center", padding: 1 }}>
                            <Text style={{ fontSize: 4.5, textAlign: "center", marginBottom: 1 }}>Term Begins</Text>
                            <Text style={{ fontSize: 6, fontWeight: "bold" }}>{term.startDate ? new Date(term.startDate).toLocaleDateString() : "-"}</Text>
                        </View>
                        <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: "#047857", alignItems: "center", justifyContent: "center", padding: 1 }}>
                            <Text style={{ fontSize: 4.5, textAlign: "center", marginBottom: 1 }}>Term Ends</Text>
                            <Text style={{ fontSize: 6, fontWeight: "bold" }}>{term.endDate ? new Date(term.endDate).toLocaleDateString() : "-"}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 1 }}>
                            <Text style={{ fontSize: 4.5, textAlign: "center", marginBottom: 1 }}>Next Term Begins</Text>
                            <Text style={{ fontSize: 6, fontWeight: "bold" }}>{term.nextTermStartDate ? new Date(term.nextTermStartDate).toLocaleDateString() : "-"}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 4. Performance Summary (Right Sidebar) */}
            <View style={[styles.gridBox, { flex: 1 }]}>
                <View style={[styles.gridRow, { height: 20 }]}>
                    <View style={[styles.gridLabel, { width: "65%" }]}><Text style={{ fontSize: 5, fontWeight: "bold" }}>TOTAL SCORE OBTAINABLE</Text></View>
                    <View style={[styles.gridValue, { width: "35%" }]}><Text>{formatScore(summary.totalObtainable)}</Text></View>
                </View>
                <View style={[styles.gridRow, { height: 20 }]}>
                    <View style={[styles.gridLabel, { width: "65%" }]}><Text style={{ fontSize: 5, fontWeight: "bold" }}>TOTAL SCORE OBTAINED</Text></View>
                    <View style={[styles.gridValue, { width: "35%" }]}><Text>{formatScore(summary.totalScore)}</Text></View>
                </View>
                <View style={[styles.gridRow, { height: 20 }]}>
                    <View style={[styles.gridLabel, { width: "65%" }]}><Text style={{ fontSize: 5, fontWeight: "bold" }}>AVERAGE PERCENTAGE</Text></View>
                    <View style={[styles.gridValue, { width: "35%" }]}><Text>{formatScore(summary.average)}</Text></View>
                </View>
                <View style={{ flexDirection: "row", flex: 1, borderTopWidth: 0.5, borderTopColor: "#000" }}>
                    <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: "#047857", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 5, fontWeight: "bold" }}>No. in Class</Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold", marginTop: 2 }}>{summary.classSize}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 5, fontWeight: "bold" }}>Position</Text>
                        <Text style={{ fontSize: 8, fontWeight: "bold", marginTop: 2 }}>{summary.classPosition || "-"}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default ProfessionalStudentProfile;
